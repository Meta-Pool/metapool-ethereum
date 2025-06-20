import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber, Contract } from "ethers"
import { ethers, network } from "hardhat"
import { toEthers } from "../lib/utils"
import { deployTest } from "./utils"
import { getValidator } from "./utils"
const { DEPOSIT_CONTRACT_ADDRESS, DEPOSIT_ABI } = require(`../lib/constants/common`)

const provider = ethers.provider

describe("Staking", () => {
  var staking: Contract,
    liquidUnstakePool: Contract,
    withdrawal: Contract,
    owner: SignerWithAddress,
    activator: SignerWithAddress,
    updater: SignerWithAddress,
    user: SignerWithAddress,
    treasury: SignerWithAddress,
    wethC: Contract,
    depositContract: Contract = new ethers.Contract(
      DEPOSIT_CONTRACT_ADDRESS,
      DEPOSIT_ABI,
      provider
    ),
    withdrawalCredentials: string

  beforeEach(async () => {
    ;({
      owner,
      activator,
      user,
      staking,
      liquidUnstakePool,
      updater,
      withdrawal,
      treasury,
      wethC,
      withdrawalCredentials,
    } = await loadFixture(deployTest))
  })

  describe("Deposit", () => {
    it("depositETH < 0.01 ETH must revert with minAmount", async () => {
      let value = toEthers(0.0099)
      await expect(staking.depositETH(owner.address, { value })).to.be.revertedWithCustomError(
        staking,
        "DepositTooLow"
      )
    })

    it("deposit < 0.01 wETH must revert with minAmount", async () => {
      let value = toEthers(0.0099)
      await wethC.connect(owner).deposit({ value })
      await wethC.connect(owner).approve(staking.address, value)
      await expect(staking.deposit(value, owner.address)).to.be.revertedWithCustomError(
        staking,
        "DepositTooLow"
      )
    })

    it("mint < 0.01 wETH must revert with minAmount", async () => {
      let value = toEthers(0.0099)
      await wethC.connect(owner).deposit({ value })
      await wethC.connect(owner).approve(staking.address, value)
      await expect(staking.mint(value, owner.address)).to.be.revertedWithCustomError(
        staking,
        "DepositTooLow"
      )
    })

    it("Deposit ETH", async () => {
      const value = toEthers(32)
      const originalBalance = await provider.getBalance(owner.address)
      await staking.depositETH(owner.address, { value })
      expect(await staking.balanceOf(owner.address)).to.eq(value)
      expect(await provider.getBalance(staking.address)).to.eq(value)

      // Check that the owner's balance is reduced by the deposit amount (considering gas fees)
      expect(await provider.getBalance(owner.address)).to.lessThan(originalBalance.sub(value))
      // TODO: Check totalAssets, mpETHPrice, stakingBalance
    })

    it("Deposit WETH", async () => {
      const value = toEthers(32)
      await wethC.connect(owner).deposit({ value })
      await wethC.connect(owner).approve(staking.address, value)
      expect(await wethC.connect(owner).balanceOf(owner.address)).to.eq(value)
      await staking.deposit(value, owner.address)
      expect(await staking.balanceOf(owner.address)).to.eq(value)

      // Check that the owner's balance is reduced by the deposit amount.
      expect(await wethC.connect(owner).balanceOf(owner.address)).to.equal(0)
      // TODO: Check totalAssets, mpETHPrice, stakingBalance
    })

    it("Mint WETH", async () => {
      const value = toEthers(32)
      await wethC.connect(owner).deposit({ value })
      await wethC.connect(owner).approve(staking.address, value)
      expect(await wethC.connect(owner).balanceOf(owner.address)).to.eq(value)
      await staking.mint(value, owner.address)
      expect(await staking.balanceOf(owner.address)).to.eq(value)

      // Check that the owner's balance is reduced by the deposit amount.
      expect(await wethC.connect(owner).balanceOf(owner.address)).to.equal(0)
      // TODO: Check totalAssets, mpETHPrice, stakingBalance
    })

    it("Deposit ETH through receive", async () => {
      const value = toEthers(32)
      await owner.sendTransaction({
        to: staking.address,
        value,
      })
      expect(await staking.balanceOf(owner.address)).to.eq(value)
      expect(await provider.getBalance(staking.address)).to.eq(value)
      // TODO: Check totalAssets, mpETHPrice, stakingBalance
    })

    it("Deposit ETH with depositFee", async () => {
      const MAX_DEPOSIT_FEE = await staking.MAX_DEPOSIT_FEE()
      await staking.connect(owner).updateDepositFee(MAX_DEPOSIT_FEE)
      expect(await staking.depositFee()).to.eq(MAX_DEPOSIT_FEE)
      const value = toEthers(32)
      const fee = value.mul(MAX_DEPOSIT_FEE).div(10000)
      const treasurympETHBefore = await staking.balanceOf(treasury.address)
      await staking.depositETH(owner.address, { value })
      expect(await provider.getBalance(staking.address)).to.eq(value)
      expect(await staking.balanceOf(owner.address)).to.eq(value.sub(fee))
      expect(await staking.balanceOf(treasury.address)).to.eq(treasurympETHBefore.add(fee))
    })

    it("Deposit wETH with depositFee", async () => {
      const MAX_DEPOSIT_FEE = await staking.MAX_DEPOSIT_FEE()
      await staking.connect(owner).updateDepositFee(MAX_DEPOSIT_FEE)
      expect(await staking.depositFee()).to.eq(MAX_DEPOSIT_FEE)
      const value = toEthers(32)
      const fee = value.mul(MAX_DEPOSIT_FEE).div(10000)
      await wethC.connect(owner).deposit({ value })
      await wethC.connect(owner).approve(staking.address, value)
      const treasurympETHBefore = await staking.balanceOf(treasury.address)
      await staking.deposit(value, owner.address)
      expect(await provider.getBalance(staking.address)).to.eq(value)
      expect(await staking.balanceOf(owner.address)).to.eq(value.sub(fee))
      expect(await staking.balanceOf(treasury.address)).to.eq(treasurympETHBefore.add(fee))
    })

    it("Deposit ETH and get mpETH from LiquidUnstakePool", async () => {
      // Owner fund LiquidUnstakePool with mpETH
      const value = toEthers(1)
      await liquidUnstakePool.connect(owner).depositETH(owner.address, { value })
      await staking.connect(owner).depositETH(owner.address, { value })
      await staking.connect(owner).approve(liquidUnstakePool.address, value)
      const { amountOut: minOut, feeAmount: totalFee } = await liquidUnstakePool.getAmountOut(value)
      await liquidUnstakePool.swapmpETHforETH(value, minOut)
      const treasuryFee = totalFee.mul(2500).div(10000)
      const poolmpETHBalanceBefore = await staking.balanceOf(liquidUnstakePool.address)
      expect(poolmpETHBalanceBefore).to.eq(value.sub(treasuryFee))
      const mpETHTotalSupplyBefore = await staking.totalSupply()

      // User get mpETH from LiquidUnstakePool instead of staking
      await staking.connect(user).depositETH(user.address, { value: value.sub(treasuryFee) })
      expect(await staking.balanceOf(liquidUnstakePool.address)).to.eq(0)
      expect(await staking.totalSupply()).to.eq(mpETHTotalSupplyBefore)
    })

    it("Deposit wETH and get mpETH from LiquidUnstakePool", async () => {
      // Owner fund LiquidUnstakePool with mpETH
      const value = toEthers(1)
      await liquidUnstakePool.connect(owner).depositETH(owner.address, { value })
      await staking.connect(owner).depositETH(owner.address, { value })
      await staking.connect(owner).approve(liquidUnstakePool.address, value)
      const { amountOut: minOut, feeAmount: totalFee } = await liquidUnstakePool.getAmountOut(value)
      await liquidUnstakePool.swapmpETHforETH(value, minOut)
      const treasuryFee = totalFee.mul(2500).div(10000)
      const poolmpETHBalanceBefore = await staking.balanceOf(liquidUnstakePool.address)
      expect(poolmpETHBalanceBefore).to.eq(value.sub(treasuryFee))
      const mpETHTotalSupplyBefore = await staking.totalSupply()

      // User get mpETH from LiquidUnstakePool instead of staking
      await wethC.connect(user).deposit({ value: value.sub(treasuryFee) })
      await wethC.connect(user).approve(staking.address, value.sub(treasuryFee))
      await staking.connect(user).deposit(value.sub(treasuryFee), user.address)
      expect(await staking.balanceOf(liquidUnstakePool.address)).to.eq(0)
      expect(await staking.totalSupply()).to.eq(mpETHTotalSupplyBefore)
    })
  })

  describe("Activate validator", () => {
    it("Push more than owned balance must revert", async () => {
      expect(await staking.totalUnderlying()).to.eq(toEthers(0))
      await expect(
        staking
          .connect(activator)
          .pushToBeacon(
            [getValidator(withdrawalCredentials)],
            0,
            0,
            await depositContract.get_deposit_root()
          )
      ).to.be.revertedWithCustomError(staking, "NotEnoughETHtoStake")
    })

    it("Push without permissions must revert", async () => {
      const ACTIVATOR_ROLE = await staking.ACTIVATOR_ROLE()
      await expect(
        staking
          .connect(user)
          .pushToBeacon(
            [getValidator(withdrawalCredentials)],
            0,
            0,
            await depositContract.get_deposit_root()
          )
      ).to.be.revertedWith(
        `AccessControl: account ${user.address.toLowerCase()} is missing role ${ACTIVATOR_ROLE}`
      )
    })

    // Avoid deposit front-run attack
    it("Deposit in same block must revert", async () => {
      try {
        await owner.sendTransaction({
          to: staking.address,
          value: toEthers(32),
        })
        const validator = getValidator(withdrawalCredentials),
          userSigner = ethers.provider.getSigner(user.address),
          activatorSigner = ethers.provider.getSigner(activator.address)

        await network.provider.send("evm_setAutomine", [false])

        await userSigner.sendTransaction({
          to: depositContract.address,
          value: toEthers(32),
          data: depositContract.interface.encodeFunctionData("deposit", [
            validator.pubkey,
            withdrawalCredentials,
            validator.signature,
            validator.depositDataRoot,
          ]),
        })
        await activatorSigner.sendTransaction({
          to: staking.address,
          data: staking.interface.encodeFunctionData("pushToBeacon", [
            [validator],
            0,
            0,
            await depositContract.get_deposit_root(),
          ]),
        })

        await network.provider.send("evm_mine")
        throw new Error("Should have reverted but it didn't")
      } catch (e: any) {
        await network.provider.send("evm_setAutomine", [true])
        expect(e.message).to.contain("DepositRootMismatch")
      }
    })

    it("Push 32 ETH", async () => {
      await staking.depositETH(owner.address, { value: toEthers(32) })
      await staking
        .connect(activator)
        .pushToBeacon(
          [getValidator(withdrawalCredentials)],
          0,
          0,
          await depositContract.get_deposit_root()
        )
      expect(await staking.totalUnderlying()).to.eq(toEthers(32))
      expect(await staking.totalNodesActivated()).to.eq(1)
      // Check: stakingBalance, totalAssets, mpETHPrice
    })

    it("Push using half ETH from LiquidUnstakePool", async () => {
      const value = toEthers(32)
      await staking.depositETH(owner.address, { value })
      await liquidUnstakePool.depositETH(owner.address, { value })
      expect(await provider.getBalance(liquidUnstakePool.address)).to.eq(value)
      expect(await liquidUnstakePool.ethBalance()).to.eq(value)
      expect(await staking.totalUnderlying()).to.eq(value)
      await staking
        .connect(activator)
        .pushToBeacon(
          [getValidator(withdrawalCredentials)],
          value.div(2),
          0,
          await depositContract.get_deposit_root()
        )
      expect(await provider.getBalance(liquidUnstakePool.address)).to.eq(value.div(2))
      expect(await liquidUnstakePool.ethBalance()).to.eq(value.div(2))
      expect(await staking.totalUnderlying()).to.eq(value.add(value.div(2)))
      expect(await staking.totalNodesActivated()).to.eq(1)
      // Check: stakingBalance / 2, totalAssets, mpETHPrice
    })

    it("Revert push requesting to LiquidUnstakePool with ETH/mpETH proportion", async () => {
      const value = toEthers(32)
      await liquidUnstakePool.depositETH(owner.address, { value })
      expect(await provider.getBalance(liquidUnstakePool.address)).to.eq(value)
      expect(await liquidUnstakePool.ethBalance()).to.eq(value)
      await expect(
        staking
          .connect(activator)
          .pushToBeacon(
            [getValidator(withdrawalCredentials)],
            value,
            0,
            await depositContract.get_deposit_root()
          )
      ).to.be.revertedWithCustomError(liquidUnstakePool, "RequestedETHReachMinProportion")
    })

    it("Push using ETH only from LiquidUnstakePool", async () => {
      const value = toEthers(32)
        .mul(10000)
        .div(await liquidUnstakePool.minETHPercentage())
      await liquidUnstakePool.depositETH(owner.address, { value })
      expect(await provider.getBalance(liquidUnstakePool.address)).to.eq(value)
      expect(await liquidUnstakePool.ethBalance()).to.eq(value)
      const stakingBalanceBefore = await staking.totalUnderlying()
      await staking
        .connect(activator)
        .pushToBeacon(
          [getValidator(withdrawalCredentials)],
          toEthers(32),
          0,
          await depositContract.get_deposit_root()
        )
      expect(await provider.getBalance(liquidUnstakePool.address)).to.eq(value.div(2))
      expect(await liquidUnstakePool.ethBalance()).to.eq(value.div(2))
      expect(await staking.totalUnderlying()).to.eq(stakingBalanceBefore.add(toEthers(32)))
      expect(await staking.totalNodesActivated()).to.eq(1)
    })

    // TODO: Test push with withdrawal
  })

  describe("Report epochs results", () => {
    const depositValue = BigNumber.from(toEthers(64)),
      newNodes = parseInt(depositValue.div(toEthers(32)).toString()),
      nodesBalance = BigNumber.from(newNodes).mul(toEthers(32)),
      onePercent = BigNumber.from(nodesBalance).mul(100).div(10000),
      newNodesBalance = nodesBalance.add(onePercent),
      defaultReport = {
        from: 0,
        to: 1,
        rewards: onePercent,
        penalties: 0,
      }

    it("Revert without permissions", async () => {
      const UPDATER_ROLE = await staking.UPDATER_ROLE()
      await staking.depositETH(owner.address, { value: depositValue })
      await staking.connect(activator).pushToBeacon(
        [...Array(newNodes).keys()].map((_) => getValidator(withdrawalCredentials)),
        0,
        0,
        await depositContract.get_deposit_root()
      )
      expect(await staking.totalUnderlying()).to.eq(nodesBalance)
      await expect(staking.reportEpochs(defaultReport, 0)).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${UPDATER_ROLE}`
      )
    })

    it("Revert before timelock", async () => {
      await staking.connect(owner).depositETH(owner.address, { value: depositValue })
      await staking.connect(activator).pushToBeacon(
        [...Array(newNodes).keys()].map((_) => getValidator(withdrawalCredentials)),
        0,
        0,
        await depositContract.get_deposit_root()
      )
      await staking.connect(updater).reportEpochs(defaultReport, 0)
      await expect(
        staking.connect(updater).reportEpochs(defaultReport, 0)
      ).to.be.revertedWithCustomError(staking, "SubmitReportTimelocked")
    })

    it("Revert with rewards + penalties more than 1%", async () => {
      await staking.connect(owner).depositETH(owner.address, { value: depositValue })
      await staking.connect(activator).pushToBeacon(
        [...Array(newNodes).keys()].map((_) => getValidator(withdrawalCredentials)),
        0,
        0,
        await depositContract.get_deposit_root()
      )
      const invalidRewardsReport = { ...defaultReport }
      invalidRewardsReport.rewards = onePercent.add(1)
      await expect(staking.connect(updater).reportEpochs(invalidRewardsReport, 0))
        .to.be.revertedWithCustomError(staking, "UpdateTooBig")
        .withArgs(
          nodesBalance,
          newNodesBalance.add(1),
          newNodesBalance.add(1).sub(nodesBalance),
          nodesBalance.div(100)
        )
    })

    it("Report with rewards as 1% of totalUnderlying and mint mpETH for treasury", async () => {
      await staking.connect(owner).depositETH(owner.address, { value: depositValue })
      await staking.connect(activator).pushToBeacon(
        [...Array(newNodes).keys()].map((_) => getValidator(withdrawalCredentials)),
        0,
        0,
        await depositContract.get_deposit_root()
      )
      const stakingFee = await staking.rewardsFee()
      const expectedFee = onePercent.mul(stakingFee).div(10000)
      await staking.connect(updater).reportEpochs(defaultReport, 0)
      expect(await staking.balanceOf(treasury.address)).to.eq(expectedFee)
      expect(await staking.totalUnderlying()).to.eq(newNodesBalance)
      expect(await staking.totalAssets()).to.eq(newNodesBalance)
      // Check: mpETHPrice, estimatedRewardsPerSecond
    })

    it("Report rewards and penalties as zero", async () => {
      await staking.connect(owner).depositETH(owner.address, { value: depositValue })
      await staking.connect(activator).pushToBeacon(
        [...Array(newNodes).keys()].map((_) => getValidator(withdrawalCredentials)),
        0,
        0,
        await depositContract.get_deposit_root()
      )
      const reportEmptyRewards = { ...defaultReport }
      reportEmptyRewards.rewards = BigNumber.from(0)
      await staking.connect(updater).reportEpochs(reportEmptyRewards, 0)
      expect(await staking.totalUnderlying()).to.eq(nodesBalance)
      expect(await staking.totalAssets()).to.eq(depositValue)
      expect(await staking.convertToAssets(toEthers(1))).to.eq(toEthers(1))
      await time.increaseTo(await staking.submitReportUnlockTime())
      reportEmptyRewards.from = reportEmptyRewards.to + 1
      reportEmptyRewards.to = reportEmptyRewards.from + 1
      await staking.connect(updater).reportEpochs(reportEmptyRewards, 0)
      expect(await staking.totalUnderlying()).to.eq(nodesBalance)
      expect(await staking.totalAssets()).to.eq(depositValue)
      expect(await staking.convertToAssets(toEthers(1))).to.eq(toEthers(1))
    })

    it("Nodes balance grows by estimatedRewardsPerSecond as expected", async () => {
      const [stakingBalance, nodesAndWithdrawalTotalBalance, estimatedRewardsPerSecond] =
        await Promise.all([
          staking.totalUnderlying(),
          staking.totalUnderlying(),
          staking.estimatedRewardsPerSecond(),
        ])
      let increaseTime = 1
      await time.increase(increaseTime)
      expect(await staking.totalAssets()).to.eq(
        stakingBalance
          .add(nodesAndWithdrawalTotalBalance)
          .add(estimatedRewardsPerSecond.mul(increaseTime))
      )
      const oneHour = 86400
      increaseTime += oneHour
      await time.increase(oneHour)
      expect(await staking.totalAssets()).to.eq(
        stakingBalance
          .add(nodesAndWithdrawalTotalBalance)
          .add(estimatedRewardsPerSecond.mul(increaseTime))
      )
      // Check: mpETHPrice
    })
  })

  describe("Withdraw and redeem", () => {
    it("Withdraw must revert with max withdraw", async () => {
      await expect(staking.withdraw(1, owner.address, owner.address)).to.be.revertedWith(
        "ERC4626: withdraw more than max"
      )
    })

    it("Redeem must revert with max redeem", async () => {
      await expect(staking.redeem(1, owner.address, owner.address)).to.be.revertedWith(
        "ERC4626: redeem more than max"
      )
    })

    it("Withdraw must not revert", async () => {
      await withdrawal.setWithdrawalsStartEpoch(0)
      await staking.withdraw(0, owner.address, owner.address)
    })

    it("Redeem must not revert", async () => {
      await withdrawal.setWithdrawalsStartEpoch(0)
      await staking.redeem(0, owner.address, owner.address)
    })
  })

  describe("Privileged functions", () => {
    describe("Admin functions", async () => {
      describe("Whitelisting", () => {
        it("Enable whitelisting", async () => {
          expect(await staking.whitelistEnabled()).to.be.false
          await staking.toggleWhitelistEnabled()
          expect(await staking.whitelistEnabled()).to.be.true
        })

        it("Revert deposit from non whitelisted", async () => {
          await staking.toggleWhitelistEnabled()
          await expect(
            staking.depositETH(owner.address, { value: toEthers(32) })
          ).to.be.revertedWithCustomError(staking, "UserNotWhitelisted")
        })

        it("Whitelist account and deposit", async () => {
          await staking.toggleWhitelistEnabled()
          await staking.addToWhitelist([owner.address])
          expect(await staking.whitelistedAccounts(owner.address)).to.be.true
          await staking.depositETH(owner.address, { value: toEthers(32) })
        })

        it("Remove from whitelist", async () => {
          await staking.toggleWhitelistEnabled()
          await staking.addToWhitelist([owner.address])
          expect(await staking.whitelistedAccounts(owner.address)).to.be.true
          await staking.removeFromWhitelist([owner.address])
          expect(await staking.whitelistedAccounts(owner.address)).to.be.false
          await expect(
            staking.depositETH(owner.address, { value: toEthers(32) })
          ).to.be.revertedWithCustomError(staking, "UserNotWhitelisted")
        })
      })

      describe("rewardsFee", () => {
        it("Revert update without permissions", async () => {
          const DEFAULT_ADMIN_ROLE = await staking.DEFAULT_ADMIN_ROLE()
          await expect(staking.connect(user).updateRewardsFee(100)).to.be.revertedWith(
            `AccessControl: account ${user.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
          )
        })

        it("Revert update to MAX_REWARDS_FEE + 1", async () => {
          const MAX_REWARDS_FEE = await staking.MAX_REWARDS_FEE()
          await expect(staking.connect(owner).updateRewardsFee(MAX_REWARDS_FEE + 1))
            .to.be.revertedWithCustomError(staking, "FeeSentTooBig")
            .withArgs(MAX_REWARDS_FEE + 1, MAX_REWARDS_FEE)
        })

        it("Update to MAX_REWARDS_FEE", async () => {
          const MAX_REWARDS_FEE = await staking.MAX_REWARDS_FEE()
          await staking.connect(owner).updateRewardsFee(MAX_REWARDS_FEE)
          expect(await staking.rewardsFee()).to.eq(MAX_REWARDS_FEE)
        })

        it("Update to 0%", async () => {
          await staking.connect(owner).updateRewardsFee(0)
          expect(await staking.rewardsFee()).to.eq(0)
        })
      })

      describe("depositFee", () => {
        it("Revert update without permissions", async () => {
          const DEFAULT_ADMIN_ROLE = await staking.DEFAULT_ADMIN_ROLE()
          await expect(staking.connect(user).updateDepositFee(100)).to.be.revertedWith(
            `AccessControl: account ${user.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
          )
        })

        it("Revert update to MAX_DEPOSIT_FEE + 1", async () => {
          const MAX_DEPOSIT_FEE = await staking.MAX_DEPOSIT_FEE()
          await expect(
            staking.connect(owner).updateDepositFee(MAX_DEPOSIT_FEE + 1)
          ).to.be.revertedWithCustomError(staking, "FeeSentTooBig")
        })

        it("Update to MAX_DEPOSIT_FEE", async () => {
          const MAX_DEPOSIT_FEE = await staking.MAX_DEPOSIT_FEE()
          await staking.connect(owner).updateDepositFee(MAX_DEPOSIT_FEE)
          expect(await staking.depositFee()).to.eq(MAX_DEPOSIT_FEE)
        })

        it("Update to 0%", async () => {
          await staking.connect(owner).updateDepositFee(0)
          expect(await staking.depositFee()).to.eq(0)
        })
      })
    })

    describe("Updater functions", async () => {
      describe("estimatedRewardsPerSecond", () => {
        it("Update without permissions must revert", async () => {
          const UPDATER_ROLE = await staking.UPDATER_ROLE()
          await expect(staking.connect(user).updateEstimatedRewardsPerSecond(0)).to.be.revertedWith(
            `AccessControl: account ${user.address.toLowerCase()} is missing role ${UPDATER_ROLE}`
          )
        })

        it("Revert update with totalAssets * 0,00001% + 1", async () => {
          const totalAssets = await staking.totalAssets()
          const maxRewardsPerSecond = totalAssets.div(10000000)
          await expect(
            staking.connect(updater).updateEstimatedRewardsPerSecond(maxRewardsPerSecond.add(1))
          )
            .to.be.revertedWithCustomError(staking, "RewardsPerSecondTooBig")
            .withArgs(maxRewardsPerSecond.add(1), maxRewardsPerSecond)
        })

        it("Revert update with -(totalAssets * 0,00001% - 1)", async () => {
          const totalAssets = await staking.totalAssets()
          const minRewardsPerSecond = totalAssets.div(10000000).mul(-1)
          await expect(
            staking.connect(updater).updateEstimatedRewardsPerSecond(minRewardsPerSecond.sub(1))
          )
            .to.be.revertedWithCustomError(staking, "RewardsPerSecondTooBig")
            .withArgs(minRewardsPerSecond.sub(1), minRewardsPerSecond)
        })

        it("Update estimatedRewardsPerSecond", async () => {
          const totalAssets = await staking.totalAssets()
          const maxRewardsPerSecond = totalAssets.div(10000000)
          await staking.connect(updater).updateEstimatedRewardsPerSecond(maxRewardsPerSecond)
          expect(await staking.estimatedRewardsPerSecond()).to.eq(maxRewardsPerSecond)
        })
      })

      describe("requestEthFromLiquidPoolToWithdrawal", async () => {
        it("Revert without updater role", async () => {
          const UPDATER_ROLE = await staking.UPDATER_ROLE()
          await expect(
            staking.connect(user).requestEthFromLiquidPoolToWithdrawal(toEthers(1))
          ).to.be.revertedWith(
            `AccessControl: account ${user.address.toLowerCase()} is missing role ${UPDATER_ROLE}`
          )
        })

        it("Revert request max available ETH + 1", async () => {
          const maxAvailableETH = await liquidUnstakePool.getAvailableEthForValidator()
          await expect(
            staking.connect(updater).requestEthFromLiquidPoolToWithdrawal(maxAvailableETH.add(1))
          )
            .to.be.revertedWithCustomError(liquidUnstakePool, "RequestedETHReachMinProportion")
            .withArgs(maxAvailableETH.add(1), maxAvailableETH)
        })

        it("requestEthFromLiquidPoolToWithdrawal > 0", async () => {
          const value = toEthers(32)
            .mul(10000)
            .div(await liquidUnstakePool.minETHPercentage())
          await liquidUnstakePool.depositETH(owner.address, { value })
          const maxAvailableETH = await liquidUnstakePool.getAvailableEthForValidator()
          const requestedETH = maxAvailableETH.sub(1)
          await staking.connect(updater).requestEthFromLiquidPoolToWithdrawal(requestedETH)
          expect(await provider.getBalance(liquidUnstakePool.address)).to.eq(
            value.sub(requestedETH)
          )
          expect(await provider.getBalance(withdrawal.address)).to.eq(requestedETH)
        })
      })
    })
  })
})
