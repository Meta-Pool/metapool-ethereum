const { expect } = require("chai");
const hre = require("hardhat");
import { ethers, upgrades } from "hardhat";
const { NETWORK_DEPLOYED_ADDRESSES } = require(`../lib/constants/common`)

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Network: %s", hre.network.name);
  console.log(NETWORK_DEPLOYED_ADDRESSES);

  const StakingProxy = NETWORK_DEPLOYED_ADDRESSES['StakingProxy'];
  const LiquidUnstakePoolProxy = NETWORK_DEPLOYED_ADDRESSES['LiquidUnstakePoolProxy'];
  const WithdrawalProxy = NETWORK_DEPLOYED_ADDRESSES['WithdrawalProxy'];

  // StakingProxy
  const StakingProxyImplementation = await upgrades.erc1967.getImplementationAddress(StakingProxy);
  const adminProxyStakingProxy = await upgrades.erc1967.getAdminAddress(StakingProxy);
  console.log("StakingProxy: ", StakingProxy);
  console.log("StakingProxyImplementation: ", StakingProxyImplementation);
  console.log("adminProxyStakingProxy: ", adminProxyStakingProxy);
  // expect(StakingProxyImplementation).to.be.equal(NETWORK_DEPLOYED_ADDRESSES['StakingImpl']);

  // LiquidUnstakePoolProxy
  const LiquidUnstakePoolProxyImplementation = await upgrades.erc1967.getImplementationAddress(LiquidUnstakePoolProxy);
  const adminProxyLiquidUnstakePoolProxy = await upgrades.erc1967.getAdminAddress(LiquidUnstakePoolProxy);
  console.log("LiquidUnstakePoolProxy: ", LiquidUnstakePoolProxy);
  console.log("LiquidUnstakePoolProxyImplementation: ", LiquidUnstakePoolProxyImplementation);
  console.log("adminProxyLiquidUnstakePoolProxy: ", adminProxyLiquidUnstakePoolProxy);
  // expect(LiquidUnstakePoolProxyImplementation).to.be.equal(NETWORK_DEPLOYED_ADDRESSES['LiquidUnstakePoolImpl']);

  // WithdrawalProxy
  const WithdrawalProxyImplementation = await upgrades.erc1967.getImplementationAddress(WithdrawalProxy);
  const adminProxyWithdrawalProxy = await upgrades.erc1967.getAdminAddress(WithdrawalProxy);
  console.log("WithdrawalProxy: ", WithdrawalProxy);
  console.log("WithdrawalProxyImplementation: ", WithdrawalProxyImplementation);
  console.log("adminProxyWithdrawalProxy: ", adminProxyWithdrawalProxy);
  // expect(WithdrawalProxyImplementation).to.be.equal(NETWORK_DEPLOYED_ADDRESSES['WithdrawalImpl']);
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})