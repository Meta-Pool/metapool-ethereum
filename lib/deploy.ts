import { ethers, upgrades } from "hardhat"
import { getContractAddress } from "ethers/lib/utils"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

const {
  DEPOSIT_CONTRACT_ADDRESS,
  ADDRESSES,
  NATIVE,
  DEPLOYED_ADDRESSES,
} = require(`../lib/constants/common`)

const deployProtocol = async (
  deployer: SignerWithAddress,
  updater: string,
  activator: string,
  treasury: string
) => {
  const [Staking, LiquidUnstakePool, Withdrawal, deployerNonce] = await Promise.all([
    ethers.getContractFactory("Staking"),
    ethers.getContractFactory("LiquidUnstakePool"),
    ethers.getContractFactory("Withdrawal"),
    ethers.provider.getTransactionCount(deployer.address),
  ])

  // First time deploying a proxy, nonce are 4 and 6
  // Not first time. 2 and 4
  const [nonceToLiquidPool, nonceToWithdrawal] = DEPLOYED_ADDRESSES ? [2, 4] : [4, 6]

  const expectedLiquidPoolAddress = getContractAddress({
    from: deployer.address,
    nonce: deployerNonce + nonceToLiquidPool,
  })
  const expectedWithdrawalAddress = getContractAddress({
    from: deployer.address,
    nonce: deployerNonce + nonceToWithdrawal,
  })

  const staking = await upgrades.deployProxy(
    Staking,
    [
      expectedLiquidPoolAddress,
      expectedWithdrawalAddress,
      DEPOSIT_CONTRACT_ADDRESS,
      ADDRESSES[NATIVE],
      treasury,
      updater,
      activator,
    ],
    {
      initializer: "initialize",
    }
  )
  await staking.deployed()
  const [liquidPoolAddressSent, withdrawalAddressSent] = await Promise.all([
    staking.liquidUnstakePool(),
    staking.withdrawal(),
  ])

  const liquidUnstakePool = await upgrades.deployProxy(
    LiquidUnstakePool,
    [staking.address, ADDRESSES[NATIVE], deployer.address],
    {
      initializer: "initialize",
    }
  )
  await liquidUnstakePool.deployed()
  if (
    liquidUnstakePool.address !== expectedLiquidPoolAddress ||
    liquidUnstakePool.address !== liquidPoolAddressSent
  ) {
    console.log("liquidUnstakePool.address", liquidUnstakePool.address)
    console.log("expectedLiquidPoolAddress", expectedLiquidPoolAddress)
    console.log("liquidPoolAddressSent", liquidPoolAddressSent)
    throw new Error("LiquidUnstakePool address mismatch")
  }

  const withdrawal = await upgrades.deployProxy(Withdrawal, [staking.address], {
    initializer: "initialize",
  })
  await withdrawal.deployed()
  if (
    withdrawal.address !== expectedWithdrawalAddress ||
    withdrawal.address !== withdrawalAddressSent
  ) {
    console.log("withdrawal.address", withdrawal.address)
    console.log("expectedWithdrawalAddress", expectedWithdrawalAddress)
    console.log("withdrawalAddressSent", withdrawalAddressSent)
    throw new Error("Withdrawal address mismatch")
  }

  await staking.addToWhitelist([liquidUnstakePool.address])

  return {
    staking,
    liquidUnstakePool,
    withdrawal,
  }
}

export { deployProtocol }
