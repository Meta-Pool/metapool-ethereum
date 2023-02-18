import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Bytes, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";

const { NETWORK } = require("../lib/env");

const {
  DEPOSIT_CONTRACT_ADDRESS,
  ADDRESSES,
  WETH_ABI,
  NATIVE,
} = require(`../lib/constants/${NETWORK}`);
import { toEthers } from "../lib/utils";

// TODO: Replace generic arguments
const testArguments = [
  "0x8e1fce45a66e3b62dd853614acc4e6d76ad1b509186eb5d5da9adc0c56884d028795261d6b3e9b231e7c3ffa62d5a789",
  "0x00625cbc748a8c2e198a702988d9a8a2b69fa81681c57f4a9652f237199c55d5",
  "0xac21b206003aa9ee63b4876a68b3f7031ed3d2d0fd7a5c91e078517d6c6ff8e834a0bbca40ff9bb4096dec1cf52ba01015f2bc1f023b0ad3b4884c39858a9bbbc7883eb506034c05f2aac59cb155f27bf567d4d24679fbd38a5a9656866072a9",
  "0xbe25431a23817785f7609566275585ffcad59a19bd502ae643532bf94233822d",
];

describe("Staking", function () {
  async function deployTest() {
    const [owner, updater, activator, otherAccount] = await ethers.getSigners();
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await upgrades.deployProxy(
      Staking,
      [
        DEPOSIT_CONTRACT_ADDRESS,
        ADDRESSES[NATIVE],
        owner.address,
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
    const liquidUnstakePool = await LiquidUnstakePool.deploy(
      staking.address,
      ADDRESSES[NATIVE]
    );
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
      wethC,
      liquidUnstakePool,
      UPDATER_ROLE,
      ACTIVATOR_ROLE,
    };
  }

  describe("Staking deposit ETH and WETH", function () {
    var staking: Contract, owner: SignerWithAddress, wethC: Contract;

    it("Deploy staking and pool", async () => {
      ({ owner, staking, wethC } = await loadFixture(deployTest));
    });

    it("Deposit 32 ETH", async () => {
      expect(await staking.balanceOf(owner.address)).to.equal(toEthers(0));
      await staking.depositETH(owner.address, { value: toEthers(32) });
      expect(await staking.balanceOf(owner.address)).to.equal(toEthers(32));
    });

    it("Deposit 4 WETH", async () => {
      const value = toEthers(4);
      const ownerBalanceBefore = await staking.balanceOf(owner.address);
      await wethC.connect(owner).deposit({ value });
      await wethC.connect(owner).approve(staking.address, value);
      await staking.deposit(value, owner.address);
      const ownerBalanceAfter = await staking.balanceOf(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore.add(value));
    });
  });

  describe("Activate validator", function () {
    var staking: Contract,
      owner: SignerWithAddress,
      activator: SignerWithAddress,
      otherAccount: SignerWithAddress,
      ACTIVATOR_ROLE: Bytes;

    it("Send deposit without balance", async () => {
      ({ owner, activator, otherAccount, staking, ACTIVATOR_ROLE } =
        await loadFixture(deployTest));
      expect(await staking.nodesTotalBalance()).to.equal(toEthers(0));
      await expect(
        staking.connect(activator).pushToBacon([testArguments])
      ).to.be.revertedWith("Not enough balance");
    });

    it("Send deposit without permisions", async () => {
      await staking.depositETH(owner.address, { value: toEthers(32) });
      await expect(
        staking.connect(otherAccount).pushToBacon([testArguments])
      ).to.be.revertedWith(
        `AccessControl: account ${otherAccount.address.toLowerCase()} is missing role ${ACTIVATOR_ROLE}`
      );
    });

    it("Send deposit correctly", async () => {
      await staking.connect(activator).pushToBacon([testArguments]);
      expect(await staking.nodesTotalBalance()).to.equal(toEthers(32));
    });
  });

  describe("Update nodes balance", function () {
    var staking: Contract,
      owner: SignerWithAddress,
      updater: SignerWithAddress,
      activator: SignerWithAddress,
      UPDATER_ROLE: Bytes;

    it("Update nodes without permisions", async () => {
      ({ owner, updater, activator, staking, UPDATER_ROLE } = await loadFixture(
        deployTest
      ));
      await staking.depositETH(owner.address, { value: toEthers(32) });
      await staking.connect(activator).pushToBacon([testArguments]);
      await expect(
        staking.updateNodesBalance(toEthers(32.032))
      ).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${UPDATER_ROLE}`
      );
    });

    it("Update nodes more than 0.1%", async () => {
      await expect(
        staking.connect(updater).updateNodesBalance(toEthers(32.1))
      ).to.be.revertedWith("Difference greater than 0.1%");
    });

    it("Update nodes correctly", async () => {
      await staking.connect(updater).updateNodesBalance(toEthers(32.032));
      expect(await staking.nodesTotalBalance()).to.equal(toEthers(32.032));
    });

    it("Update nodes too early", async () => {
      await expect(
        staking.connect(updater).updateNodesBalance(toEthers(32.032))
      ).to.be.rejectedWith("Unlock time not reached");
    });
  });
});
