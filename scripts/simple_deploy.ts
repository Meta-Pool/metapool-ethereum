import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  const [Staking, LiquidUnstakePool, Withdrawal, deployerNonce] = await Promise.all([
    ethers.getContractFactory("Staking"),
    ethers.getContractFactory("LiquidUnstakePool"),
    ethers.getContractFactory("Withdrawal"),
    ethers.provider.getTransactionCount(deployer.address),
  ])

  const staking = await upgrades.deployProxy(
    Staking,
    [
      expectedLiquidPoolAddress,
      expectedWithdrawalAddress,
      DEPOSIT_CONTRACT_ADDRESS,
      ADDRESSES[NATIVE],
      treasury,
      updater,
      activator,
    ],
    {
      initializer: "initialize",
    }
  )
  await staking.deployed()

  const liquidUnstakePool = await upgrades.deployProxy(
    LiquidUnstakePool,
    [staking.address, ADDRESSES[NATIVE], deployer.address],
    {
      initializer: "initialize",
    }
  )
  await liquidUnstakePool.deployed()

  const withdrawal = await upgrades.deployProxy(Withdrawal, [staking.address], {
    initializer: "initialize",
  })
  await withdrawal.deployed()

  const MockDeposit = await ethers.getContractFactory("MockDeposit");

  // Step 1 - Deploy MockDeposit contract
  const MockDepositContract = await MockDeposit.connect(deployer).deploy();
  await MockDepositContract.deployed();

  // Summary
  console.log("MockDeposit: ", MockDepositContract.address);
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})