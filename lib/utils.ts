import { ethers } from "hardhat"
import { BigNumber } from "ethers"
import fs from "fs"
const { DEPLOYED_ADDRESSES_FILE, DEPLOYED_ADDRESSES } = require(`./constants/common`)

const toEthers = (amount: Number): BigNumber =>
  BigNumber.from(ethers.utils.parseEther(amount.toString()))

const updateDeployedAddresses = (deployedAddresses: Object, network: string) => {
  DEPLOYED_ADDRESSES[network] = deployedAddresses
  fs.writeFileSync(DEPLOYED_ADDRESSES_FILE, JSON.stringify(DEPLOYED_ADDRESSES, null, 2))
}

export { toEthers, updateDeployedAddresses }
