import { ethers, upgrades } from "hardhat"
import { updateDeployedAddresses } from "../lib/utils"
const { NETWORK_DEPLOYED_ADDRESSES, ZERO_ADDRESS, GNOSIS_SAFE_ABI } = require(`../lib/constants/common`)
const { NETWORK, MULTISIG_ADDRESS } = require("../lib/env")

async function main() {
  if (MULTISIG_ADDRESS === "" || MULTISIG_ADDRESS === ZERO_ADDRESS)
    throw new Error("Provide a multisig address")

  const [deployer] = await ethers.getSigners(),
    gnosisSafeContract = new ethers.Contract(MULTISIG_ADDRESS, GNOSIS_SAFE_ABI, ethers.provider),
    isOwner = await gnosisSafeContract.isOwner(deployer.address)

  if (!isOwner) throw new Error("Deployer is not an owner of the multisig")

  await upgrades.admin.transferProxyAdminOwnership(MULTISIG_ADDRESS)
  console.log(`Transferred proxy admin ownership to ${MULTISIG_ADDRESS}`)

  NETWORK_DEPLOYED_ADDRESSES["MultisigProxyAdmin"] = MULTISIG_ADDRESS
  console.log(NETWORK_DEPLOYED_ADDRESSES)
  updateDeployedAddresses(NETWORK_DEPLOYED_ADDRESSES, NETWORK)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
