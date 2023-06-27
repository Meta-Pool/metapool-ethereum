import hre from "hardhat"
import fs from "fs"
import axios from "axios"
import { NETWORK, ETHERSCAN_API_KEY } from "../lib/env"

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
    try {
      // TODO: API url to constants and select by network
      const response = await axios.get(
        `https://api-goerli.etherscan.io/api?module=contract&action=getsourcecode&address=${contract.address}&apikey=${ETHERSCAN_API_KEY}`
      )
      const isVerified = response.data.result[0].SourceCode !== ""
      if (isVerified) {
        console.log(`${contract.name} at ${contract.address} already verified`)
      } else {
        console.log(`${contract.name} at ${contract.address} not verified`)
        await verifyContract(contract)
      }
    } catch (error) {
      console.log(`Error checking verification for ${contract.name} at ${contract.address}`)
      console.error(error)
    }
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
