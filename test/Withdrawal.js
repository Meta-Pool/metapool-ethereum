"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const chai_1 = require("chai");
const ethers_1 = require("ethers");
const hardhat_1 = require("hardhat");
const utils_1 = require("../lib/utils");
const utils_2 = require("./utils");
const { DEPOSIT_CONTRACT_ADDRESS, DEPOSIT_ABI } = require(`../lib/constants/common`);
const provider = hardhat_1.ethers.provider;
describe("Withdrawal", function () {
    var staking, withdrawal, owner, user, activator, depositContract = new hardhat_1.ethers.Contract(DEPOSIT_CONTRACT_ADDRESS, DEPOSIT_ABI, provider), withdrawalCredentials;
    beforeEach(async () => {
        ;
        ({ owner, withdrawal, user, staking, activator, withdrawalCredentials } = await (0, hardhat_network_helpers_1.loadFixture)(utils_2.deployTest));
    });
    describe("Epoch", function () {
        const oneWeek = 7 * 24 * 60 * 60;
        it("First zero epoch", async () => {
            (0, chai_1.expect)(await withdrawal.getEpoch()).to.eq(0);
        });
        it("Time until next epoch", async () => {
            const startTimestamp = Number(await withdrawal.startTimestamp());
            const currentEpoch = await withdrawal.getEpoch();
            const epochTimeLeft = startTimestamp +
                (currentEpoch + 1) * oneWeek -
                (await provider.getBlock("latest")).timestamp;
            (0, chai_1.expect)(await withdrawal.getEpochTimeLeft()).to.eq(epochTimeLeft);
        });
        it("Advance epoch", async () => {
            const epochTimeLeft = await withdrawal.getEpochTimeLeft();
            await hardhat_network_helpers_1.time.increase(epochTimeLeft);
            (0, chai_1.expect)(await withdrawal.getEpoch()).to.eq(1);
            (0, chai_1.expect)(await withdrawal.getEpochTimeLeft()).to.eq(oneWeek);
        });
    });
    describe("Withdraw", function () {
        it("Revert request withdraw before withdrawalsStartEpoch", async () => {
            const depositAmount = (0, utils_1.toEthers)(32);
            await staking.connect(user).depositETH(user.address, { value: depositAmount });
            await staking.connect(user).approve(staking.address, depositAmount);
            (0, chai_1.expect)(staking.connect(user).redeem(depositAmount, user.address, user.address))
                .to.be.revertedWithCustomError(withdrawal, "WithdrawalsNotStarted")
                .withArgs(0, 8);
        });
        it("Request withdraw with mpETH/ETH 1:1", async () => {
            await withdrawal.setWithdrawalsStartEpoch(0);
            const mpETHPrice = await staking.convertToAssets((0, utils_1.toEthers)(1));
            const depositAmount = (0, utils_1.toEthers)(32);
            await staking.connect(user).depositETH(user.address, { value: depositAmount });
            await staking.connect(user).approve(staking.address, depositAmount);
            await staking.connect(user).redeem(depositAmount, user.address, user.address);
            const unlockEpoch = ethers_1.BigNumber.from((await withdrawal.pendingWithdraws(user.address)).unlockEpoch);
            (0, chai_1.expect)(await staking.balanceOf(user.address)).to.eq(0);
            (0, chai_1.expect)((await withdrawal.pendingWithdraws(user.address)).amount).to.eq(depositAmount);
            (0, chai_1.expect)((await withdrawal.pendingWithdraws(user.address)).unlockEpoch).to.eq(unlockEpoch);
            (0, chai_1.expect)(await staking.convertToAssets((0, utils_1.toEthers)(1))).to.eq(mpETHPrice);
        });
        it("Revert complete withdraw before unlock time", async () => {
            await withdrawal.setWithdrawalsStartEpoch(0);
            const depositAmount = (0, utils_1.toEthers)(32);
            await staking.connect(user).depositETH(user.address, { value: depositAmount });
            await staking.connect(user).approve(staking.address, depositAmount);
            await staking.connect(user).redeem(depositAmount, user.address, user.address);
            await staking
                .connect(activator)
                .pushToBeacon([(0, utils_2.getValidator)(withdrawalCredentials)], 0, 0, await depositContract.get_deposit_root());
            await (0, chai_1.expect)(withdrawal.connect(user).completeWithdraw()).to.be.revertedWithCustomError(withdrawal, "ClaimTooSoon");
        });
        it("Revert complete withdraw before validator disassemble time", async () => {
            await withdrawal.setWithdrawalsStartEpoch(0);
            const depositAmount = (0, utils_1.toEthers)(32);
            await staking.connect(user).depositETH(user.address, { value: depositAmount });
            await staking.connect(user).approve(staking.address, depositAmount);
            await staking.connect(user).redeem(depositAmount, user.address, user.address);
            await staking
                .connect(activator)
                .pushToBeacon([(0, utils_2.getValidator)(withdrawalCredentials)], 0, 0, await depositContract.get_deposit_root());
            await hardhat_network_helpers_1.time.increase(await withdrawal.getEpochTimeLeft());
            const validatorsDisassembleTime = await withdrawal.validatorsDisassembleTime();
            const epochPlusDisassembleTime = (await provider.getBlock("latest")).timestamp + validatorsDisassembleTime;
            await (0, chai_1.expect)(withdrawal.connect(user).completeWithdraw())
                .to.be.revertedWithCustomError(withdrawal, "ClaimTooSoon")
                .withArgs(epochPlusDisassembleTime);
        });
        it("Revert complete withdraw with insufficient balance", async () => {
            await withdrawal.setWithdrawalsStartEpoch(0);
            const depositAmount = (0, utils_1.toEthers)(32);
            await staking.connect(user).depositETH(user.address, { value: depositAmount });
            await staking.connect(user).approve(staking.address, depositAmount);
            await staking.connect(user).redeem(depositAmount, user.address, user.address);
            await staking
                .connect(activator)
                .pushToBeacon([(0, utils_2.getValidator)(withdrawalCredentials)], 0, 0, await depositContract.get_deposit_root());
            const validatorsDisassembleTime = await withdrawal.validatorsDisassembleTime();
            await hardhat_network_helpers_1.time.increase((await withdrawal.getEpochTimeLeft()).add(validatorsDisassembleTime));
            await (0, chai_1.expect)(withdrawal.connect(user).completeWithdraw()).to.be.revertedWith("Address: insufficient balance");
        });
        it("Complete withdraw with mpETH/ETH 1:1", async () => {
            const mpETHPrice = await staking.convertToAssets((0, utils_1.toEthers)(1));
            const totalAssets = await staking.totalAssets();
            await withdrawal.setWithdrawalsStartEpoch(0);
            const depositAmount = (0, utils_1.toEthers)(32);
            await staking.connect(user).depositETH(user.address, { value: depositAmount });
            await staking.connect(user).approve(staking.address, depositAmount);
            await staking.connect(user).redeem(depositAmount, user.address, user.address);
            await staking
                .connect(activator)
                .pushToBeacon([(0, utils_2.getValidator)(withdrawalCredentials)], 0, 0, await depositContract.get_deposit_root());
            const validatorsDisassembleTime = await withdrawal.validatorsDisassembleTime();
            await hardhat_network_helpers_1.time.increase((await withdrawal.getEpochTimeLeft()).add(validatorsDisassembleTime));
            await owner.sendTransaction({
                to: withdrawal.address,
                value: (await withdrawal.pendingWithdraws(user.address)).amount,
            });
            await withdrawal.connect(user).completeWithdraw();
            (0, chai_1.expect)((await withdrawal.pendingWithdraws(user.address)).amount).to.eq(0);
            (0, chai_1.expect)((await withdrawal.pendingWithdraws(user.address)).unlockEpoch).to.eq(0);
            (0, chai_1.expect)(await withdrawal.totalPendingWithdraw()).to.eq(0);
            (0, chai_1.expect)(await staking.convertToAssets((0, utils_1.toEthers)(1))).to.eq(mpETHPrice);
            (0, chai_1.expect)(await staking.totalAssets()).to.eq(totalAssets);
        });
        // TODO: Test request and complete withdraws with estimatedRewardsPerSecond > 0 and < 0
    });
    describe("Activate validator with ETH from Withdrawal", async () => {
        it("Revert push with 0 ETH on Withdrawal", async () => {
            await (0, chai_1.expect)(staking
                .connect(activator)
                .pushToBeacon([(0, utils_2.getValidator)(withdrawalCredentials)], 0, (0, utils_1.toEthers)(32), await depositContract.get_deposit_root())).to.be.revertedWithCustomError(withdrawal, "NotEnoughETHtoStake");
        });
        it("Revert push with pending withdraw gt balance", async () => {
            const depositAmount = (0, utils_1.toEthers)(16);
            await staking.connect(user).depositETH(user.address, { value: depositAmount });
            await staking.connect(user).approve(staking.address, depositAmount);
            await withdrawal.setWithdrawalsStartEpoch(0);
            await staking.connect(user).withdraw(depositAmount, user.address, user.address);
            (0, chai_1.expect)(await withdrawal.totalPendingWithdraw()).to.eq(depositAmount);
            await owner.sendTransaction({
                to: withdrawal.address,
                value: depositAmount,
            });
            await (0, chai_1.expect)(staking
                .connect(activator)
                .pushToBeacon([(0, utils_2.getValidator)(withdrawalCredentials)], 0, (0, utils_1.toEthers)(32), await depositContract.get_deposit_root())).to.be.revertedWithCustomError(withdrawal, "NotEnoughETHtoStake");
        });
        it("Push remaining ETH. Half staking, half withdrawal", async () => {
            const depositAmount = (0, utils_1.toEthers)(16);
            await staking.connect(user).depositETH(user.address, { value: depositAmount });
            await owner.sendTransaction({
                to: withdrawal.address,
                value: depositAmount,
            });
            (0, chai_1.expect)(await provider.getBalance(withdrawal.address)).eq(depositAmount);
            (0, chai_1.expect)(await provider.getBalance(staking.address)).eq(depositAmount);
            (0, chai_1.expect)(await staking.totalUnderlying()).eq(depositAmount);
            const mpETHPrice = await staking.convertToAssets((0, utils_1.toEthers)(1));
            await staking
                .connect(activator)
                .pushToBeacon([(0, utils_2.getValidator)(withdrawalCredentials)], 0, depositAmount, await depositContract.get_deposit_root());
            (0, chai_1.expect)(await provider.getBalance(withdrawal.address)).eq(0);
            (0, chai_1.expect)(await provider.getBalance(staking.address)).eq(0);
            (0, chai_1.expect)(await staking.totalUnderlying()).eq(depositAmount);
            (0, chai_1.expect)(await staking.convertToAssets((0, utils_1.toEthers)(1))).to.eq(mpETHPrice);
        });
    });
    describe("Owner functions", async () => {
        describe("Withdrawals start epoch", async () => {
            it("Revert setWithdrawalsStartEpoch from non owner", async () => {
                await (0, chai_1.expect)(withdrawal.connect(user).setWithdrawalsStartEpoch(1)).to.be.revertedWith("Ownable: caller is not the owner");
            });
            it("Revert setWithdrawalsStartEpoch with epoch > 32", async () => {
                await (0, chai_1.expect)(withdrawal.connect(owner).setWithdrawalsStartEpoch(33))
                    .to.be.revertedWithCustomError(withdrawal, "InvalidConfig")
                    .withArgs(33, 32);
            });
            it("Withdrawals start epoch starts at 8", async () => {
                (0, chai_1.expect)(await withdrawal.withdrawalsStartEpoch()).to.eq(8);
            });
            it("Set withdrawals start epoch to 32", async () => {
                await withdrawal.connect(owner).setWithdrawalsStartEpoch(32);
                (0, chai_1.expect)(await withdrawal.withdrawalsStartEpoch()).to.eq(32);
            });
        });
    });
});
