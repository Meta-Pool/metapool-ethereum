"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const upgrades_core_1 = require("@openzeppelin/upgrades-core");
const deploy_1 = require("../lib/deploy");
const utils_1 = require("../lib/utils");
const { NETWORK, BOT_ADDRESS } = require("../lib/env");
const { NETWORK_DEPLOYED_ADDRESSES } = require(`../lib/constants/common`);
const hardhat_2 = __importDefault(require("hardhat"));
async function main() {
    // TODO LOG network from hardhat console.log(`Network:${NETWORK}`)
    const NETWORK = hardhat_2.default.network.name;
    console.log(NETWORK);
    const [deployer] = await hardhat_1.ethers.getSigners();
    console.log("Deploying the contracts with the account:", await deployer.getAddress());
    const { staking, liquidUnstakePool, withdrawal } = await (0, deploy_1.deployProtocol)(deployer, deployer.address, BOT_ADDRESS, BOT_ADDRESS);
    const [stakingImplAddress, liquidUnstakePoolImplAddress, withdrawalImplAddress] = await Promise.all([
        (0, upgrades_core_1.getImplementationAddress)(hardhat_1.ethers.provider, staking.address),
        (0, upgrades_core_1.getImplementationAddress)(hardhat_1.ethers.provider, liquidUnstakePool.address),
        (0, upgrades_core_1.getImplementationAddress)(hardhat_1.ethers.provider, withdrawal.address),
    ]);
    console.log(`Staking deployed to ${staking.address}`);
    console.log(`with implementation ${stakingImplAddress}`);
    NETWORK_DEPLOYED_ADDRESSES.StakingProxy = staking.address;
    NETWORK_DEPLOYED_ADDRESSES.StakingImpl = stakingImplAddress;
    console.log(`LiquidUnstakePool deployed to ${liquidUnstakePool.address}`);
    console.log(`with implementation ${liquidUnstakePoolImplAddress}`);
    NETWORK_DEPLOYED_ADDRESSES.LiquidUnstakePoolProxy = liquidUnstakePool.address;
    NETWORK_DEPLOYED_ADDRESSES.LiquidUnstakePoolImpl = liquidUnstakePoolImplAddress;
    console.log(`Withdrawal deployed to ${withdrawal.address}`);
    console.log(`with implementation ${withdrawalImplAddress}`);
    NETWORK_DEPLOYED_ADDRESSES.WithdrawalProxy = withdrawal.address;
    NETWORK_DEPLOYED_ADDRESSES.WithdrawalImpl = withdrawalImplAddress;
    (0, utils_1.updateDeployedAddresses)(NETWORK_DEPLOYED_ADDRESSES, NETWORK);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
