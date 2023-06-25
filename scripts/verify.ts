import hre from "hardhat"
import fs from "fs"
import { NETWORK } from "../lib/env"

type contractToVerify = {
  name: string
  address: string
}

async function main() {
  const deploys = JSON.parse(fs.readFileSync("deploys.json").toString())
  let contracts: contractToVerify[] = []
  for (const contractName in deploys[NETWORK]) {
    contracts.push({
      name: contractName,
      address: deploys[NETWORK][contractName],
    })
  }

  for (const contract of contracts) {
    await verifyContract(contract)
  }
}

const verifyContract = async (contract: contractToVerify) => {
  console.log(`Verifying ${contract.name} at ${contract.address}`)
  try {
    await hre.run("verify:verify", {
      address: contract.address,
      constructorArguments: [],
    })
  } catch (e) {}
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
