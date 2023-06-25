import { ethers, upgrades } from "hardhat"
import { getContractAddress } from "ethers/lib/utils"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { AddressType } from "typechain"
import { NETWORK } from "../lib/env"
const { DEPOSIT_CONTRACT_ADDRESS, ADDRESSES, NATIVE } = require(`../lib/constants/${NETWORK}`)

const deployProtocol = async (
  deployer: SignerWithAddress,
  updater: AddressType,
  activator: AddressType,
  treasury: AddressType
) => {
  const [Staking, LiquidUnstakePool, Withdrawal, deployerNonce] = await Promise.all([
    ethers.getContractFactory("Staking"),
    ethers.getContractFactory("LiquidUnstakePool"),
    ethers.getContractFactory("Withdrawal"),
    ethers.provider.getTransactionCount(deployer.address),
  ])

  const expectedLiquidPoolAddress = getContractAddress({
    from: deployer.address,
    nonce: deployerNonce + 3,
  })
  const expectedWithdrawalAddress = getContractAddress({
    from: deployer.address,
    nonce: deployerNonce + 5,
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
