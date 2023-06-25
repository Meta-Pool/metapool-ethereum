import { ethers } from "hardhat"
import { NETWORK, BOT_ADDRESS } from "../lib/env"
import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import fs from "fs"
import { deployProtocol } from "../lib/deploy"

const deployFiles = "deploys.json"
async function main() {
  const deploys = JSON.parse(fs.readFileSync(deployFiles).toString())
  if (!deploys[NETWORK]) deploys[NETWORK] = {}
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
  deploys[NETWORK].StakingProxy = staking.address
  deploys[NETWORK].StakingImpl = stakingImplAddress

  console.log(`LiquidUnstakePool deployed to ${liquidUnstakePool.address}`)
  console.log(`with implementation ${liquidUnstakePoolImplAddress}`)
  deploys[NETWORK].LiquidUnstakePoolProxy = liquidUnstakePool.address
  deploys[NETWORK].LiquidUnstakePoolImpl = liquidUnstakePoolImplAddress

  console.log(`Withdrawal deployed to ${withdrawal.address}`)
  console.log(`with implementation ${withdrawalImplAddress}`)
  deploys[NETWORK].WithdrawalProxy = withdrawal.address
  deploys[NETWORK].WithdrawalImpl = withdrawalImplAddress

  if (NETWORK !== "hardhat") fs.writeFileSync(deployFiles, JSON.stringify(deploys, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
