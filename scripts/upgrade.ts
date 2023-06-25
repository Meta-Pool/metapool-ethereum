import { ethers, upgrades } from "hardhat"
import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import fs from "fs"
import { NETWORK } from "../lib/env"

async function main() {
  const contractName = process.env.contractName ? process.env.contractName : ""
  if (contractName === "") throw new Error("Provide a contractName")
  const deploys = JSON.parse(fs.readFileSync("deploys.json").toString())
  const proxyName = `${contractName}Proxy`
  const implName = `${contractName}Impl`
  const implementation = await ethers.getContractFactory(contractName)
  const contractAddress = deploys[NETWORK][proxyName]
  const oldImplAddress = deploys[NETWORK][implName]
  console.log(`Upgrading ${contractName} at ${contractAddress}`)
  const upgrade = await upgrades.upgradeProxy(contractAddress, implementation)
  await upgrade.deployed()
  const newImplAddress = await getImplementationAddress(ethers.provider, upgrade.address)
  console.log(`Upgraded implementation`)
  console.log(`from ${oldImplAddress}`)
  console.log(`to ${newImplAddress}`)
  deploys[NETWORK][implName] = newImplAddress
  fs.writeFileSync("deploys.json", JSON.stringify(deploys, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
