import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, upgrades } from "hardhat";
import { NETWORK } from "../lib/env";
const {
  DEPOSIT_CONTRACT_ADDRESS,
  ADDRESSES,
  WETH_ABI,
  NATIVE,
} = require(`../lib/constants/${NETWORK}`);
import { toEthers } from "../lib/utils";
import * as depositData from "../test_deposit_data.json";

const provider = ethers.provider;

const getNextValidator = () =>
  Object.values(
    (({ pubkey, withdrawal_credentials, signature, deposit_data_root }) => ({
      pubkey,
      withdrawal_credentials,
      signature,
      deposit_data_root,
    }))(depositData.default.pop())
  );

describe("Withdrawal", function () {
  async function deployTest() {
    const [owner, updater, activator, treasury, user] = await ethers.getSigners();
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

    const Withdrawal = await ethers.getContractFactory("Withdrawal");
    const withdrawal = await upgrades.deployProxy(Withdrawal, [staking.address], {
      initializer: "initialize",
    });
    await withdrawal.deployed();

    await staking.updateWithdrawal(withdrawal.address);
    const wethC = new ethers.Contract(ADDRESSES[NATIVE], WETH_ABI);
    const UPDATER_ROLE = await staking.UPDATER_ROLE();
    const ACTIVATOR_ROLE = await staking.ACTIVATOR_ROLE();

    return {
      staking,
      owner,
      updater,
      activator,
      user,
      treasury,
      wethC,
      withdrawal,
      UPDATER_ROLE,
      ACTIVATOR_ROLE,
    };
  }

  describe("Withdraw", function () {
    var staking: Contract,
      withdrawal: Contract,
      owner: SignerWithAddress,
      user: SignerWithAddress,
      updater: SignerWithAddress,
      activator: SignerWithAddress;

    it("Deposit ETH for mpETH", async () => {
      ({ user, owner, staking, withdrawal, updater, activator } = await loadFixture(deployTest));
      const depositAmount = toEthers(32);
      await staking.connect(user).depositETH(user.address, { value: depositAmount });
      await staking.connect(activator).pushToBeacon([getNextValidator()], 0, 0);
      await staking.connect(updater).updateNodesBalance(toEthers(32.032));
      const timelock = await staking.UPDATE_BALANCE_TIMELOCK();
      await time.increase(timelock);
      await staking.connect(updater).updateNodesBalance(toEthers(32.032));
      expect(await staking.estimatedRewardsPerSecond()).to.eq(0);
    });

    it("Request withdraw", async () => {
      const mpETHPrice = await staking.convertToAssets(toEthers(1));
      const userBalance = await staking.balanceOf(user.address);
      await staking.connect(user).approve(staking.address, userBalance);
      const estimatedRewardsPerSecond = await staking.estimatedRewardsPerSecond();
      await staking.connect(user).redeem(userBalance, user.address, user.address);
      const unlockEpoch = BigNumber.from(
        (await withdrawal.pendingWithdraws(user.address)).unlockEpoch
      );
      expect(await staking.balanceOf(user.address)).to.eq(0);
      expect((await withdrawal.pendingWithdraws(user.address)).amount).to.gt(userBalance.add(estimatedRewardsPerSecond));
      expect((await withdrawal.pendingWithdraws(user.address)).unlockEpoch).to.eq(
        unlockEpoch
      );
      // Almost equal for rounded values
      expect((await staking.convertToAssets(toEthers(1))).toString().substring(0, 8)).to.eq(mpETHPrice.toString().substring(0, 8))
    });

    it("Complete withdraw must revert before unlock time", async () => {
      await expect(staking.connect(user).completeWithdraw()).to.be.revertedWithCustomError(withdrawal,
        "EpochNotReached"
      );
    });

    it("Complete withdraw must revert with insufficient balance", async () => {
      await time.increase(7 * 24 * 60 * 60);
      await expect(staking.connect(user).completeWithdraw()).to.be.revertedWith(
        "Address: insufficient balance"
      );
    });

    it("Complete withdraw", async () => {
      const mpETHPrice = await staking.convertToAssets(toEthers(1));
      await owner.sendTransaction({
        to: withdrawal.address,
        value: (await withdrawal.pendingWithdraws(user.address)).amount,
      });
      await staking.connect(user).completeWithdraw();
      expect((await withdrawal.pendingWithdraws(user.address)).amount).to.eq(0);
      expect((await withdrawal.pendingWithdraws(user.address)).unlockEpoch).to.eq(0);
      expect(await withdrawal.totalPendingWithdraw()).to.eq(0);
      expect((await staking.convertToAssets(toEthers(1))).toString().substring(0, 8)).to.eq(mpETHPrice.toString().substring(0, 8))
    });
  });

  describe("Stake remaining", async () => {
    var staking: Contract,
      withdrawal: Contract,
      owner: SignerWithAddress,
      user: SignerWithAddress,
      activator: SignerWithAddress,
      updater: SignerWithAddress;
    const depositAmount = toEthers(32),
      withdrawalAmount = BigNumber.from(depositAmount).div(2);

    it("Revert stake with 0 ETH balance", async () => {
      ({ user, owner, staking, withdrawal, activator, updater } = await loadFixture(deployTest));

      await expect(
        staking.connect(activator).pushToBeacon([getNextValidator()], 0, toEthers(32))
      ).to.be.revertedWithCustomError(withdrawal, "NotEnoughETHtoStake");
    });

    it("Revert staking with pending withdraw gt balance", async () => {
      await staking.connect(user).depositETH(user.address, { value: depositAmount });
      await staking.connect(user).approve(staking.address, withdrawalAmount);
      await staking.connect(user).withdraw(withdrawalAmount, user.address, user.address);
      expect(await withdrawal.totalPendingWithdraw()).to.eq(withdrawalAmount);

      await owner.sendTransaction({
        to: withdrawal.address,
        value: withdrawalAmount,
      });

      await expect(
        staking.connect(activator).pushToBeacon([getNextValidator()], 0, toEthers(32))
      ).to.be.revertedWithCustomError(withdrawal, "NotEnoughETHtoStake");
    });

    it("Stake remaining ETH", async () => {
      await staking.connect(user).depositETH(user.address, { value: toEthers(32) });
      await staking.connect(activator).pushToBeacon([getNextValidator()], 0, 0)


      await owner.sendTransaction({
        to: withdrawal.address,
        value: withdrawalAmount,
      });
      expect(await provider.getBalance(withdrawal.address)).eq(depositAmount);
      expect(await provider.getBalance(staking.address)).eq(depositAmount);
      expect(await staking.stakingBalance()).eq(depositAmount);
      await staking.connect(updater).updateNodesBalance(toEthers(16.032));
      const timelock = await staking.UPDATE_BALANCE_TIMELOCK();
      await time.increase(timelock);
      await staking.connect(updater).updateNodesBalance(toEthers(16.032));
      const mpETHPrice = await staking.convertToAssets(toEthers(1));
      expect(await staking.estimatedRewardsPerSecond()).to.eq(0);
      await staking
        .connect(activator)
        .pushToBeacon([getNextValidator()], 0, withdrawalAmount);
      expect(await provider.getBalance(withdrawal.address)).eq(withdrawalAmount);
      expect(await provider.getBalance(staking.address)).eq(withdrawalAmount);
      expect(await staking.stakingBalance()).eq(withdrawalAmount);
      expect((await staking.convertToAssets(toEthers(1))).toString()).to.eq(mpETHPrice.toString())
    });
  });
});
