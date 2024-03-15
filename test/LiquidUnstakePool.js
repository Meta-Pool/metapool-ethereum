"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_network_helpers_1 = require("@nomicfoundation/hardhat-network-helpers");
const chai_1 = require("chai");
const hardhat_1 = require("hardhat");
const utils_1 = require("../lib/utils");
const utils_2 = require("./utils");
const provider = hardhat_1.ethers.provider;
describe("LiquidUnstakePool", function () {
    describe("Deposit", function () {
        let staking, liquidUnstakePool, owner, wethC;
        it("Deposit < 0.01 ETH must revert with minAmount", async () => {
            ({ owner, staking, wethC, liquidUnstakePool } = await (0, hardhat_network_helpers_1.loadFixture)(utils_2.deployTest));
            let value = (0, utils_1.toEthers)(0.0099);
            await (0, chai_1.expect)(liquidUnstakePool.depositETH(owner.address, { value })).to.be.revertedWithCustomError(liquidUnstakePool, "DepositTooLow");
        });
        it("Deposit < 0.01 wETH must revert with minAmount", async () => {
            let value = (0, utils_1.toEthers)(0.0099);
            await wethC.connect(owner).deposit({ value });
            await wethC.connect(owner).approve(liquidUnstakePool.address, value);
            await (0, chai_1.expect)(liquidUnstakePool.deposit(value, owner.address)).to.be.revertedWithCustomError(liquidUnstakePool, "DepositTooLow");
        });
        it("Deposit ETH", async () => {
            let value = (0, utils_1.toEthers)(32);
            (0, chai_1.expect)(await liquidUnstakePool.balanceOf(owner.address)).to.eq(0);
            await liquidUnstakePool.depositETH(owner.address, { value });
            (0, chai_1.expect)(await liquidUnstakePool.balanceOf(owner.address)).to.eq(value);
            value = (0, utils_1.toEthers)(9.51);
            // Add values instead of hardcoded
            await liquidUnstakePool.depositETH(owner.address, { value });
            (0, chai_1.expect)(await liquidUnstakePool.balanceOf(owner.address)).to.eq((0, utils_1.toEthers)(41.51));
            (0, chai_1.expect)(await provider.getBalance(liquidUnstakePool.address)).to.eq((0, utils_1.toEthers)(41.51));
            // TODO: Check totalAssets, mpETHPrice, stakingBalance
        });
        it("Deposit WETH", async () => {
            let value = (0, utils_1.toEthers)(4);
            await wethC.connect(owner).deposit({ value });
            await wethC.connect(owner).approve(liquidUnstakePool.address, value);
            await liquidUnstakePool.deposit(value, owner.address);
            (0, chai_1.expect)(await liquidUnstakePool.balanceOf(owner.address)).to.eq((0, utils_1.toEthers)(45.51));
            // Add values instead of hardcoded
            value = (0, utils_1.toEthers)(22.49);
            await wethC.connect(owner).deposit({ value });
            await wethC.connect(owner).approve(liquidUnstakePool.address, value);
            await liquidUnstakePool.deposit(value, owner.address);
            (0, chai_1.expect)(await liquidUnstakePool.balanceOf(owner.address)).to.eq((0, utils_1.toEthers)(68));
            // TODO: Check totalAssets, mpETHPrice, stakingBalance
        });
    });
    describe("Swap", function () {
        let staking, liquidUnstakePool, owner, wethC;
        it("Deposit ETH", async () => {
            ({ owner, staking, wethC, liquidUnstakePool } = await (0, hardhat_network_helpers_1.loadFixture)(utils_2.deployTest));
            let value = (0, utils_1.toEthers)(32);
            (0, chai_1.expect)(await liquidUnstakePool.balanceOf(owner.address)).to.eq(0);
            await liquidUnstakePool.depositETH(owner.address, { value });
            (0, chai_1.expect)(await liquidUnstakePool.balanceOf(owner.address)).to.eq(value);
            value = (0, utils_1.toEthers)(9.51);
            await liquidUnstakePool.depositETH(owner.address, { value });
            (0, chai_1.expect)(await liquidUnstakePool.balanceOf(owner.address)).to.eq((0, utils_1.toEthers)(41.51));
            (0, chai_1.expect)(await provider.getBalance(liquidUnstakePool.address)).to.eq((0, utils_1.toEthers)(41.51));
        });
        it("Swap 1 mpETH for ETH", async () => {
            let value = (0, utils_1.toEthers)(1);
            (0, chai_1.expect)(await staking.balanceOf(owner.address)).to.eq(0);
            await staking.depositETH(owner.address, { value });
            (0, chai_1.expect)(await staking.balanceOf(owner.address)).to.eq(value);
            (0, chai_1.expect)(await provider.getBalance(staking.address)).to.eq((0, utils_1.toEthers)(1));
            await staking.approve(liquidUnstakePool.address, value);
            await liquidUnstakePool.swapmpETHforETH(value, 0);
            // TODO
        });
        // TODO: Add additional tests for swap with estimatedRewardsPerSecond increasing the price
    });
});
