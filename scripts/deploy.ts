import { ethers } from "hardhat"
import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { deployProtocol } from "../lib/deploy"
import { updateDeployedAddresses } from "../lib/utils"
const { NETWORK, BOT_ADDRESS } = require("../lib/env")
const { NETWORK_DEPLOYED_ADDRESSES } = require(`../lib/constants/common`)

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log("Deploying the contracts with the account:", await deployer.getAddress())

  const { staking, liquidUnstakePool, withdrawal } = await deployProtocol(
    deployer,
    deployer.address,
    BOT_ADDRESS,
    BOT_ADDRESS
  )

  const [stakingImplAddress, liquidUnstakePoolImplAddress, withdrawalImplAddress] =
    await Promise.all([
      getImplementationAddress(ethers.provider, staking.address),
      getImplementationAddress(ethers.provider, liquidUnstakePool.address),
      getImplementationAddress(ethers.provider, withdrawal.address),
    ])

  console.log(`Staking deployed to ${staking.address}`)
  console.log(`with implementation ${stakingImplAddress}`)
  NETWORK_DEPLOYED_ADDRESSES.StakingProxy = staking.address
  NETWORK_DEPLOYED_ADDRESSES.StakingImpl = stakingImplAddress

  console.log(`LiquidUnstakePool deployed to ${liquidUnstakePool.address}`)
  console.log(`with implementation ${liquidUnstakePoolImplAddress}`)
  NETWORK_DEPLOYED_ADDRESSES.LiquidUnstakePoolProxy = liquidUnstakePool.address
  NETWORK_DEPLOYED_ADDRESSES.LiquidUnstakePoolImpl = liquidUnstakePoolImplAddress

  console.log(`Withdrawal deployed to ${withdrawal.address}`)
  console.log(`with implementation ${withdrawalImplAddress}`)
  NETWORK_DEPLOYED_ADDRESSES.WithdrawalProxy = withdrawal.address
  NETWORK_DEPLOYED_ADDRESSES.WithdrawalImpl = withdrawalImplAddress

  updateDeployedAddresses(NETWORK_DEPLOYED_ADDRESSES, NETWORK)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
