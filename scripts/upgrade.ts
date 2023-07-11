import { ethers, upgrades } from "hardhat"
import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { updateDeployedAddresses } from "../lib/utils"
const { DEPLOYED_ADDRESSES } = require(`../lib/constants/common`)
const { NETWORK, TARGET } = require("../lib/env")

async function main() {
  if (TARGET === "") throw new Error("Provide a TARGET")

  const proxyName = `${TARGET}Proxy`,
    implName = `${TARGET}Impl`,
    implementation = await ethers.getContractFactory(TARGET),
    contractAddress = DEPLOYED_ADDRESSES[proxyName],
    oldImplAddress = DEPLOYED_ADDRESSES[implName],
    upgrade = await upgrades.upgradeProxy(contractAddress, implementation)

  console.log(`Upgrading ${TARGET} at ${contractAddress}`)
  await upgrade.deployed()
  const newImplAddress = await getImplementationAddress(ethers.provider, upgrade.address)
  console.log(`Upgraded implementation`)
  console.log(`from ${oldImplAddress}`)
  console.log(`to ${newImplAddress}`)
  DEPLOYED_ADDRESSES[implName] = newImplAddress
  updateDeployedAddresses(DEPLOYED_ADDRESSES, NETWORK)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
