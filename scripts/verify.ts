import hre from "hardhat"
import axios from "axios"
const { ETHERSCAN_API_KEY } = require("../lib/env")
const { NETWORK_DEPLOYED_ADDRESSES } = require(`../lib/constants/common`)

type contractToVerify = {
  name: string
  address: string
}

async function main() {
  let contracts: contractToVerify[] = []
  for (const contractName in NETWORK_DEPLOYED_ADDRESSES) {
    contracts.push({
      name: contractName,
      address: NETWORK_DEPLOYED_ADDRESSES[contractName],
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
  } catch (e) {
    console.error(`Error verifying ${contract.name} at ${contract.address}`)
    console.error(e)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
