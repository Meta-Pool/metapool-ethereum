import { ethers } from "hardhat"

async function main() {
  const [deployer] = await ethers.getSigners();

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