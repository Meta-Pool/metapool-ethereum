"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployProtocol = void 0;
const hardhat_1 = require("hardhat");
const utils_1 = require("ethers/lib/utils");
const { DEPOSIT_CONTRACT_ADDRESS, ADDRESSES, NATIVE } = require(`../lib/constants/common`);
const deployProtocol = async (deployer, updater, activator, treasury) => {
    updater = updater || deployer.address;
    activator = activator || deployer.address;
    const [Staking, LiquidUnstakePool, Withdrawal, deployerNonce] = await Promise.all([
        hardhat_1.ethers.getContractFactory("Staking"),
        hardhat_1.ethers.getContractFactory("LiquidUnstakePool"),
        hardhat_1.ethers.getContractFactory("Withdrawal"),
        hardhat_1.ethers.provider.getTransactionCount(deployer.address),
    ]);
    // First time deploying a proxy, nonce are 4 and 6
    const [nonceToLiquidPool, nonceToWithdrawal] = [4, 6];
    const expectedLiquidPoolAddress = (0, utils_1.getContractAddress)({
        from: deployer.address,
        nonce: deployerNonce + nonceToLiquidPool,
    });
    const expectedWithdrawalAddress = (0, utils_1.getContractAddress)({
        from: deployer.address,
        nonce: deployerNonce + nonceToWithdrawal,
    });
    const staking = await hardhat_1.upgrades.deployProxy(Staking, [
        expectedLiquidPoolAddress,
        expectedWithdrawalAddress,
        DEPOSIT_CONTRACT_ADDRESS,
        ADDRESSES[NATIVE],
        treasury,
        updater,
        activator,
    ], {
        initializer: "initialize",
    });
    await staking.deployed();
    const liquidUnstakePool = await hardhat_1.upgrades.deployProxy(LiquidUnstakePool, [staking.address, ADDRESSES[NATIVE], deployer.address], {
        initializer: "initialize",
    });
    await liquidUnstakePool.deployed();
    const withdrawal = await hardhat_1.upgrades.deployProxy(Withdrawal, [staking.address], {
        initializer: "initialize",
    });
    await withdrawal.deployed();
    if (liquidUnstakePool.address !== expectedLiquidPoolAddress) {
        console.log("LiquidUnstakePool address is not as expected, updating to effective deployed address");
        console.log("Expected: ", expectedLiquidPoolAddress);
        console.log("Deployed: ", liquidUnstakePool.address);
        await staking.updateLiquidPool(liquidUnstakePool.address);
    }
    if (withdrawal.address !== expectedWithdrawalAddress) {
        console.log("LiquidUnstakePool address is not as expected, updating to effective deployed address");
        console.log("Expected: ", expectedWithdrawalAddress);
        console.log("Deployed: ", withdrawal.address);
        await staking.updateWithdrawal(withdrawal.address);
    }
    await staking.addToWhitelist([liquidUnstakePool.address]);
    return {
        staking,
        liquidUnstakePool,
        withdrawal,
    };
};
exports.deployProtocol = deployProtocol;
