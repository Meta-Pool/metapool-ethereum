import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

//   const MockDeposit = await ethers.getContractFactory("MockDeposit");

  const STAKING_PROXY_SEPOLIA = "0xe50339fE67402Cd59c32656D679479801990579f";

  const VotingPowerContract = await ethers.getContractAt("Staking", STAKING_PROXY_SEPOLIA);

  // Summary
  console.log("Staking: ", await VotingPowerContract.address);
  console.log("Withdrawal: ", await VotingPowerContract.withdrawal());
  console.log("UnstakePool: ", await VotingPowerContract.liquidUnstakePool());
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})