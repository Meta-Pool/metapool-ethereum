import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Bytes, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import * as depositData from "../test_deposit_data.json";
const { NETWORK } = require("../lib/env");

const {
  DEPOSIT_CONTRACT_ADDRESS,
  ADDRESSES,
  WETH_ABI,
  NATIVE,
} = require(`../lib/constants/${NETWORK}`);
import { toEthers } from "../lib/utils";

const getNextValidator = () =>
  Object.values(
    (({ pubkey, withdrawal_credentials, signature, deposit_data_root }) => ({
      pubkey,
      withdrawal_credentials,
      signature,
      deposit_data_root,
    }))(depositData.default.pop())
  );

describe("Staking", function () {
  async function deployTest() {
    const [owner, updater, activator, treasury, otherAccount] =
      await ethers.getSigners();
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await upgrades.deployProxy(
      Staking,
      [
        DEPOSIT_CONTRACT_ADDRESS,
        ADDRESSES[NATIVE],
        treasury.address,
        updater.address,
        activator.address,
      ],
      {
        initializer: "initialize",
      }
    );
    await staking.deployed();

    const LiquidUnstakePool = await ethers.getContractFactory(
      "LiquidUnstakePool"
    );
    const liquidUnstakePool = await upgrades.deployProxy(
      LiquidUnstakePool,
      [staking.address, ADDRESSES[NATIVE], treasury.address],
      {
        initializer: "initialize",
      }
    );
    await liquidUnstakePool.deployed();

    await staking.updateLiquidPool(liquidUnstakePool.address);
    const wethC = new ethers.Contract(ADDRESSES[NATIVE], WETH_ABI);
    const UPDATER_ROLE = await staking.UPDATER_ROLE();
    const ACTIVATOR_ROLE = await staking.ACTIVATOR_ROLE();

    return {
      staking,
      owner,
      updater,
      activator,
      otherAccount,
      treasury,
      wethC,
      liquidUnstakePool,
      UPDATER_ROLE,
      ACTIVATOR_ROLE,
    };
  }

  describe("Deposit", function () {
    var staking: Contract, owner: SignerWithAddress, wethC: Contract;

    it("Deposit < 0.01 ETH must revert with minAmount", async () => {
      ({ owner, staking, wethC } = await loadFixture(deployTest));
      let value = toEthers(0.0099);
      await expect(
        staking.depositETH(owner.address, { value })
      ).to.be.rejectedWith("Deposit at least 0.01 ETH");
    });

    it("Deposit < 0.01 wETH must revert with minAmount", async () => {
      let value = toEthers(0.0099);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(staking.address, value);
      await expect(staking.deposit(value, owner.address)).to.be.rejectedWith(
        "Deposit at least 0.01 ETH"
      );
    });

    it("Deposit ETH", async () => {
      let value = toEthers(32);
      expect(await staking.balanceOf(owner.address)).to.eq(0);
      await staking.depositETH(owner.address, { value });
      expect(await staking.balanceOf(owner.address)).to.eq(value);
      value = toEthers(9.51);
      await staking.depositETH(owner.address, { value });
      expect(await staking.balanceOf(owner.address)).to.eq(toEthers(41.51));
    });

    it("Deposit WETH", async () => {
      let value = toEthers(4);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(staking.address, value);
      await staking.deposit(value, owner.address);
      expect(await staking.balanceOf(owner.address)).to.eq(toEthers(45.51));
      value = toEthers(22.49);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(staking.address, value);
      await staking.deposit(value, owner.address);
      expect(await staking.balanceOf(owner.address)).to.eq(toEthers(68));
    });
  });

  describe("Activate validator", function () {
    var staking: Contract,
      owner: SignerWithAddress,
      activator: SignerWithAddress,
      otherAccount: SignerWithAddress,
      ACTIVATOR_ROLE: Bytes;

    it("Stake more than owned balance must revert", async () => {
      ({ owner, activator, otherAccount, staking, ACTIVATOR_ROLE } =
        await loadFixture(deployTest));
      expect(await staking.nodesTotalBalance()).to.eq(toEthers(0));
      await expect(
        staking.connect(activator).pushToBeacon([getNextValidator()], 0)
      ).to.be.revertedWith("Not enough balance");
    });

    it("Stake without permissions must revert", async () => {
      await staking.depositETH(owner.address, { value: toEthers(32) });
      await expect(
        staking.connect(otherAccount).pushToBeacon([getNextValidator()], 0)
      ).to.be.revertedWith(
        `AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ACTIVATOR_ROLE}`
      );
    });

    it("Stake 32 ETH", async () => {
      await staking.connect(activator).pushToBeacon([getNextValidator()], 0);
      expect(await staking.nodesTotalBalance()).to.eq(toEthers(32));
    });
  });

  describe("Update nodes balance", function () {
    var staking: Contract,
      owner: SignerWithAddress,
      updater: SignerWithAddress,
      treasury: SignerWithAddress,
      activator: SignerWithAddress,
      UPDATER_ROLE: Bytes;

    const depositValue = BigNumber.from(toEthers(950)),
      newNodes = parseInt(depositValue.div(toEthers(32)).toString()),
      nodesBalance = BigNumber.from(newNodes).mul(toEthers(32)),
      onePercent = BigNumber.from(nodesBalance).mul(10).div(10000),
      newNodesBalance = nodesBalance.add(onePercent);

    it("Update without permissions must revert", async () => {
      ({ owner, updater, activator, staking, UPDATER_ROLE, treasury } =
        await loadFixture(deployTest));
      await staking.depositETH(owner.address, { value: depositValue });
      await staking.connect(activator).pushToBeacon(
        [...Array(newNodes).keys()].map((_) => getNextValidator()),
        0
      );
      expect(await staking.nodesTotalBalance()).to.eq(nodesBalance);
      await expect(
        staking.updateNodesBalance(newNodesBalance)
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${UPDATER_ROLE}`
      );
    });

    it("Update balance more than 0.1% must revert", async () => {
      await expect(
        staking.connect(updater).updateNodesBalance(newNodesBalance.add(1))
      ).to.be.revertedWith("Difference greater than 0.1%");
    });

    it("Update nodes balance to same amount", async () => {
      await staking.connect(updater).updateNodesBalance(nodesBalance);
      expect(await staking.nodesTotalBalance()).to.eq(nodesBalance);
      expect(await staking.totalAssets()).to.eq(depositValue);
    });

    it("Update before timelock must revert", async () => {
      await expect(
        staking.connect(updater).updateNodesBalance(newNodesBalance)
      ).to.be.rejectedWith("Unlock time not reached");
    });

    it("Update nodes balance and mint mpETH for treasury", async () => {
      const timelock = await staking.UPDATE_BALANCE_TIMELOCK();
      await time.increase(timelock);
      const stakingFee = await staking.rewardsFee();
      const expectedFee = onePercent.mul(stakingFee).div(10000);
      await staking.connect(updater).updateNodesBalance(newNodesBalance);
      expect(await staking.balanceOf(treasury.address)).to.eq(expectedFee);
      expect(await staking.nodesTotalBalance()).to.eq(newNodesBalance);
      expect(await staking.totalAssets()).to.eq(depositValue.add(onePercent));
    });

    it("Nodes balance grows by estimatedRewardsPerSecond as expected", async () => {
      const [stakingBalance, nodesTotalBalance, estimatedRewardsPerSecond] =
        await Promise.all([
          staking.stakingBalance(),
          staking.nodesTotalBalance(),
          staking.estimatedRewardsPerSecond(),
        ]);
      let increaseTime = 1;
      await time.increase(increaseTime);
      expect(await staking.totalAssets()).to.eq(
        stakingBalance
          .add(nodesTotalBalance)
          .add(estimatedRewardsPerSecond.mul(increaseTime))
      );
      const oneHour = 86400;
      increaseTime += oneHour;
      await time.increase(oneHour);
      expect(await staking.totalAssets()).to.eq(
        stakingBalance
          .add(nodesTotalBalance)
          .add(estimatedRewardsPerSecond.mul(increaseTime))
      );
    });
  });

  describe("Withdraw and redeem", function () {
    var staking: Contract, owner: SignerWithAddress;

    it("Withdraw must revert with max withdraw", async () => {
      ({ owner, staking } = await loadFixture(deployTest));
      await expect(
        staking.withdraw(1, owner.address, owner.address)
      ).to.be.revertedWith("ERC4626: withdraw more than max");
    });

    it("Redeem must revert with max redeem", async () => {
      await expect(
        staking.redeem(1, owner.address, owner.address)
      ).to.be.revertedWith("ERC4626: redeem more than max");
    });

    it("Withdraw must revert with not implemented", async () => {
      await expect(
        staking.withdraw(0, owner.address, owner.address)
      ).to.be.revertedWith("Withdraw not implemented");
    });

    it("Redeem must revert with not implemented", async () => {
      await expect(
        staking.redeem(0, owner.address, owner.address)
      ).to.be.revertedWith("Withdraw not implemented");
    });
  });
});
