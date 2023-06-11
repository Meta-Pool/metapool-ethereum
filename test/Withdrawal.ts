import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber, Contract } from "ethers"
import { ethers, upgrades } from "hardhat"
import { NETWORK } from "../lib/env"
const {
  DEPOSIT_CONTRACT_ADDRESS,
  ADDRESSES,
  WETH_ABI,
  NATIVE,
} = require(`../lib/constants/${NETWORK}`)
import { toEthers } from "../lib/utils"
import * as depositData from "../test_deposit_data.json"

const provider = ethers.provider

const getNextValidator = () =>
  Object.values(
    (({ pubkey, withdrawal_credentials, signature, deposit_data_root }) => ({
      pubkey,
      withdrawal_credentials,
      signature,
      deposit_data_root,
    }))(depositData.default.pop())
  )

describe("Withdrawal", function () {
  var staking: Contract,
    withdrawal: Contract,
    owner: SignerWithAddress,
    user: SignerWithAddress,
    activator: SignerWithAddress,
    updater: SignerWithAddress

  async function deployTest() {
    const [owner, updater, activator, treasury, user] = await ethers.getSigners()
    const Staking = await ethers.getContractFactory("Staking")
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
    )
    await staking.deployed()

    const LiquidUnstakePool = await ethers.getContractFactory("LiquidUnstakePool")
    const liquidUnstakePool = await upgrades.deployProxy(
      LiquidUnstakePool,
      [staking.address, ADDRESSES[NATIVE], treasury.address],
      {
        initializer: "initialize",
      }
    )
    await liquidUnstakePool.deployed()

    const Withdrawal = await ethers.getContractFactory("Withdrawal")
    const withdrawal = await upgrades.deployProxy(Withdrawal, [staking.address], {
      initializer: "initialize",
    })
    await withdrawal.deployed()

    await staking.updateWithdrawal(withdrawal.address)
    await staking.updateLiquidPool(liquidUnstakePool.address)
    const wethC = new ethers.Contract(ADDRESSES[NATIVE], WETH_ABI)
    const UPDATER_ROLE = await staking.UPDATER_ROLE()
    const ACTIVATOR_ROLE = await staking.ACTIVATOR_ROLE()

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
    }
  }

  beforeEach(async () => {
    ;({ owner, withdrawal, user, staking, activator, updater } = await loadFixture(deployTest))
  })

  describe("Epoch", function () {
    const oneWeek = 7 * 24 * 60 * 60

    it("First zero epoch", async () => {
      expect(await withdrawal.getEpoch()).to.eq(0)
    })

    it("Time until next epoch", async () => {
      const startTimestamp = Number(await withdrawal.startTimestamp())
      const currentEpoch = await withdrawal.getEpoch()
      const epochTimeLeft =
        startTimestamp +
        (currentEpoch + 1) * oneWeek -
        (await provider.getBlock("latest")).timestamp
      expect(await withdrawal.getEpochTimeLeft()).to.eq(epochTimeLeft)
    })

    it("Advance epoch", async () => {
      const epochTimeLeft = await withdrawal.getEpochTimeLeft()
      await time.increase(epochTimeLeft)
      expect(await withdrawal.getEpoch()).to.eq(1)
      expect(await withdrawal.getEpochTimeLeft()).to.eq(oneWeek)
    })
  })

  describe("Withdraw", function () {
    it("Revert request withdraw before withdrawalsStartEpoch", async () => {
      const depositAmount = toEthers(32)
      await staking.connect(user).depositETH(user.address, { value: depositAmount })
      await staking.connect(user).approve(staking.address, depositAmount)
      expect(staking.connect(user).redeem(depositAmount, user.address, user.address))
        .to.be.revertedWithCustomError(withdrawal, "WithdrawalsNotStarted")
        .withArgs(0, 8)
    })

    it("Request withdraw with mpETH/ETH 1:1", async () => {
      await withdrawal.setWithdrawalsStartEpoch(0)
      const mpETHPrice = await staking.convertToAssets(toEthers(1))
      const depositAmount = toEthers(32)
      await staking.connect(user).depositETH(user.address, { value: depositAmount })
      await staking.connect(user).approve(staking.address, depositAmount)
      await staking.connect(user).redeem(depositAmount, user.address, user.address)
      const unlockEpoch = BigNumber.from(
        (await withdrawal.pendingWithdraws(user.address)).unlockEpoch
      )
      expect(await staking.balanceOf(user.address)).to.eq(0)
      expect((await withdrawal.pendingWithdraws(user.address)).amount).to.eq(depositAmount)
      expect((await withdrawal.pendingWithdraws(user.address)).unlockEpoch).to.eq(unlockEpoch)
      expect(await staking.convertToAssets(toEthers(1))).to.eq(mpETHPrice)
    })

    it("Complete withdraw must revert before unlock time", async () => {
      await withdrawal.setWithdrawalsStartEpoch(0)
      const depositAmount = toEthers(32)
      await staking.connect(user).depositETH(user.address, { value: depositAmount })
      await staking.connect(user).approve(staking.address, depositAmount)
      await staking.connect(user).redeem(depositAmount, user.address, user.address)
      await staking.connect(activator).pushToBeacon([getNextValidator()], 0, 0)
      await expect(staking.connect(user).completeWithdraw()).to.be.revertedWithCustomError(
        withdrawal,
        "EpochNotReached"
      )
    })

    it("Complete withdraw must revert with insufficient balance", async () => {
      await withdrawal.setWithdrawalsStartEpoch(0)
      const depositAmount = toEthers(32)
      await staking.connect(user).depositETH(user.address, { value: depositAmount })
      await staking.connect(user).approve(staking.address, depositAmount)
      await staking.connect(user).redeem(depositAmount, user.address, user.address)
      await staking.connect(activator).pushToBeacon([getNextValidator()], 0, 0)
      await time.increase(await withdrawal.getEpochTimeLeft())
      await expect(staking.connect(user).completeWithdraw()).to.be.revertedWith(
        "Address: insufficient balance"
      )
    })

    it("Complete withdraw with mpETH/ETH 1:1", async () => {
      const mpETHPrice = await staking.convertToAssets(toEthers(1))
      const totalAssets = await staking.totalAssets()
      await withdrawal.setWithdrawalsStartEpoch(0)
      const depositAmount = toEthers(32)
      await staking.connect(user).depositETH(user.address, { value: depositAmount })
      await staking.connect(user).approve(staking.address, depositAmount)
      await staking.connect(user).redeem(depositAmount, user.address, user.address)
      await staking.connect(activator).pushToBeacon([getNextValidator()], 0, 0)
      await time.increase(await withdrawal.getEpochTimeLeft())
      await owner.sendTransaction({
        to: withdrawal.address,
        value: (await withdrawal.pendingWithdraws(user.address)).amount,
      })
      await staking.connect(user).completeWithdraw()
      expect((await withdrawal.pendingWithdraws(user.address)).amount).to.eq(0)
      expect((await withdrawal.pendingWithdraws(user.address)).unlockEpoch).to.eq(0)
      expect(await withdrawal.totalPendingWithdraw()).to.eq(0)
      expect(await staking.convertToAssets(toEthers(1))).to.eq(mpETHPrice)
      expect(await staking.totalAssets()).to.eq(totalAssets)
    })

    // TODO: Test request and complete withdraws with estimatedRewardsPerSecond > 0 and < 0
  })

  describe("Activate validator with ETH from Withdrawal", async () => {
    it("Revert push with 0 ETH on Withdrawal", async () => {
      await expect(
        staking.connect(activator).pushToBeacon([getNextValidator()], 0, toEthers(32))
      ).to.be.revertedWithCustomError(withdrawal, "NotEnoughETHtoStake")
    })

    it("Revert push with pending withdraw gt balance", async () => {
      const depositAmount = toEthers(16)
      await staking.connect(user).depositETH(user.address, { value: depositAmount })
      await staking.connect(user).approve(staking.address, depositAmount)
      await withdrawal.setWithdrawalsStartEpoch(0)
      await staking.connect(user).withdraw(depositAmount, user.address, user.address)
      expect(await withdrawal.totalPendingWithdraw()).to.eq(depositAmount)
      await owner.sendTransaction({
        to: withdrawal.address,
        value: depositAmount,
      })
      await expect(
        staking.connect(activator).pushToBeacon([getNextValidator()], 0, toEthers(32))
      ).to.be.revertedWithCustomError(withdrawal, "NotEnoughETHtoStake")
    })

    it("Push remaining ETH. Half staking, half withdrawal", async () => {
      const depositAmount = toEthers(16)
      await staking.connect(user).depositETH(user.address, { value: depositAmount })
      await owner.sendTransaction({
        to: withdrawal.address,
        value: depositAmount,
      })
      expect(await provider.getBalance(withdrawal.address)).eq(depositAmount)
      expect(await provider.getBalance(staking.address)).eq(depositAmount)
      expect(await staking.stakingBalance()).eq(depositAmount)
      const mpETHPrice = await staking.convertToAssets(toEthers(1))
      await staking.connect(activator).pushToBeacon([getNextValidator()], 0, depositAmount)
      expect(await provider.getBalance(withdrawal.address)).eq(0)
      expect(await provider.getBalance(staking.address)).eq(0)
      expect(await staking.stakingBalance()).eq(0)
      expect(await staking.convertToAssets(toEthers(1))).to.eq(mpETHPrice)
    })
  })

  describe("Owner functions", async () => {
    describe("Withdrawals start epoch", async () => {
      it("Revert setWithdrawalsStartEpoch from non owner", async () => {
        await expect(withdrawal.connect(user).setWithdrawalsStartEpoch(1)).to.be.revertedWith(
          "Ownable: caller is not the owner"
        )
      })

      it("Revert setWithdrawalsStartEpoch with epoch > 32", async () => {
        await expect(withdrawal.connect(owner).setWithdrawalsStartEpoch(33))
          .to.be.revertedWithCustomError(withdrawal, "StartEpochTooHigh")
          .withArgs(33, 32)
      })

      it("Withdrawals start epoch starts at 8", async () => {
        expect(await withdrawal.withdrawalsStartEpoch()).to.eq(8)
      })

      it("Set withdrawals start epoch to 32", async () => {
        await withdrawal.connect(owner).setWithdrawalsStartEpoch(32)
        expect(await withdrawal.withdrawalsStartEpoch()).to.eq(32)
      })
    })
  })
})
