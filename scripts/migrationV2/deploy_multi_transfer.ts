import { ethers } from "hardhat"
import { updateDeployedAddresses } from "../../lib/utils"
const { NETWORK_DEPLOYED_ADDRESSES } = require(`../../lib/constants/common`)
import hre from "hardhat"

async function main() {
  // TODO LOG network from hardhat console.log(`Network:${NETWORK}`)
  const NETWORK =  hre.network.name;
  console.log(NETWORK);
  const [deployer] = await ethers.getSigners()
  console.log("Deploying the contract with the account:", await deployer.getAddress())

  const MultiTransfer = await ethers.getContractFactory("MultiTransfer");

  const multi = await MultiTransfer.deploy();
  await multi.deployed()

  console.log(`MultiTransfer to ${multi.address}`)

  NETWORK_DEPLOYED_ADDRESSES.MultiTransfer = multi.address

  updateDeployedAddresses(NETWORK_DEPLOYED_ADDRESSES, NETWORK)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})