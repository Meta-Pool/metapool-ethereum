import { ethers, upgrades } from "hardhat"
import { NETWORK, BOT_ADDRESS } from "../lib/env"
const { DEPOSIT_CONTRACT_ADDRESS, ADDRESSES, NATIVE } = require(`../lib/constants/${NETWORK}`)
import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import fs from "fs"

const deployFiles = "deploys.json"
async function main() {
  const deploys = JSON.parse(fs.readFileSync(deployFiles).toString())
  if (!deploys[NETWORK]) deploys[NETWORK] = {}
  const [deployer] = await ethers.getSigners()
  console.log("Deploying the contracts with the account:", await deployer.getAddress())

  const Staking = await ethers.getContractFactory("Staking")
  const staking = await upgrades.deployProxy(
    Staking,
    [
      DEPOSIT_CONTRACT_ADDRESS,
      ADDRESSES[NATIVE],
      deployer.address,
      deployer.address,
      deployer.address,
    ],
    {
      initializer: "initialize",
    }
  )
  await staking.deployed()
  const stakingImplAddress = await getImplementationAddress(ethers.provider, staking.address)
  console.log(`Staking deployed to ${staking.address}`)
  console.log(`with implementation ${stakingImplAddress}`)
  deploys[NETWORK].StakingProxy = staking.address
  deploys[NETWORK].StakingImpl = stakingImplAddress

  const Withdrawal = await ethers.getContractFactory("Withdrawal")
  const withdrawal = await upgrades.deployProxy(Withdrawal, [staking.address], {
    initializer: "initialize",
  })
  await withdrawal.deployed()
  const withdrawalImplAddress = await getImplementationAddress(ethers.provider, withdrawal.address)
  console.log(`Withdrawal deployed to ${withdrawal.address}`)
  console.log(`with implementation ${withdrawalImplAddress}`)
  deploys[NETWORK].WithdrawalProxy = withdrawal.address
  deploys[NETWORK].WithdrawalImpl = withdrawalImplAddress

  await staking.updateWithdrawal(withdrawal.address)
  const ACTIVATOR_ROLE = await staking.ACTIVATOR_ROLE()
  const UPDATER_ROLE = await staking.UPDATER_ROLE()
  await staking.grantRole(ACTIVATOR_ROLE, BOT_ADDRESS)
  await staking.grantRole(UPDATER_ROLE, BOT_ADDRESS)

  const LiquidUnstakePool = await ethers.getContractFactory("LiquidUnstakePool")
  const liquidUnstakePool = await upgrades.deployProxy(
    LiquidUnstakePool,
    [staking.address, ADDRESSES[NATIVE], deployer.address],
    {
      initializer: "initialize",
    }
  )
  await liquidUnstakePool.deployed()
  const liquidUnstakePoolImplAddress = await getImplementationAddress(
    ethers.provider,
    liquidUnstakePool.address
  )
  console.log(`LiquidUnstakePool deployed to ${liquidUnstakePool.address}`)
  console.log(`with implementation ${liquidUnstakePoolImplAddress}`)
  deploys[NETWORK].LiquidUnstakePoolProxy = liquidUnstakePool.address
  deploys[NETWORK].LiquidUnstakePoolImpl = liquidUnstakePoolImplAddress

  if (NETWORK !== "hardhat") fs.writeFileSync(deployFiles, JSON.stringify(deploys, null, 2))

  await staking.updateLiquidPool(liquidUnstakePool.address)

  await staking.addToWhitelist([liquidUnstakePool.address])
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
