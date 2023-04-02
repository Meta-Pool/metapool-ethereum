import { ethers, upgrades } from "hardhat";
const { NETWORK } = require("../lib/env");

const {
  DEPOSIT_CONTRACT_ADDRESS,
  ADDRESSES,
  NATIVE,
} = require(`../lib/constants/${NETWORK}`);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying the contracts with the account:", await deployer.getAddress());

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await upgrades.deployProxy(
    Staking,
    [
      DEPOSIT_CONTRACT_ADDRESS,
      ADDRESSES[NATIVE],
      deployer.address,
      deployer.address,
      deployer.address,
    ],
    {
      initializer: "initialize",
    }
  );
  await staking.deployed();
  console.log(`Staking deployed to ${staking.address}`);

  const Withdrawal = await ethers.getContractFactory("Withdrawal");
  const withdrawal = await Withdrawal.deploy(staking.address);
  await withdrawal.deployed();
  await staking.updateWithdrawal(withdrawal.address);
  console.log(`Withdrawal deployed to ${withdrawal.address}`);

  const LiquidUnstakePool = await ethers.getContractFactory("LiquidUnstakePool");
  const liquidUnstakePool = await upgrades.deployProxy(
    LiquidUnstakePool,
    [staking.address, ADDRESSES[NATIVE], deployer.address],
    {
      initializer: "initialize",
    }
  );
  await liquidUnstakePool.deployed();
  console.log(`LiquidUnstakePool deployed to ${liquidUnstakePool.address}`);

  await staking.updateLiquidPool(liquidUnstakePool.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
