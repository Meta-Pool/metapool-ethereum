import { ethers, upgrades } from "hardhat"
import { getContractAddress } from "ethers/lib/utils"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
const { DEPOSIT_CONTRACT_ADDRESS, ADDRESSES, NATIVE } = require(`../lib/constants/common`)
import { BigNumber } from "ethers";

const deployProtocol = async (
  deployer: SignerWithAddress,
  updater: string,
  activator: string,
  treasury: string
) => {
  updater = updater || deployer.address
  activator = activator || deployer.address
  const [Staking, LiquidUnstakePool, Withdrawal, deployerNonce] = await Promise.all([
    ethers.getContractFactory("Staking"),
    ethers.getContractFactory("LiquidUnstakePool"),
    ethers.getContractFactory("Withdrawal"),
    ethers.provider.getTransactionCount(deployer.address),
  ])

  // First time deploying a proxy, nonce are 4 and 6
  const [nonceToLiquidPool, nonceToWithdrawal] = [4, 6]

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

  const liquidUnstakePool = await upgrades.deployProxy(
    LiquidUnstakePool,
    [staking.address, ADDRESSES[NATIVE], deployer.address],
    {
      initializer: "initialize",
    }
  )
  await liquidUnstakePool.deployed()

  const withdrawal = await upgrades.deployProxy(Withdrawal, [staking.address], {
    initializer: "initialize",
  })
  await withdrawal.deployed()

  if (liquidUnstakePool.address !== expectedLiquidPoolAddress) {
    console.log(
      "LiquidUnstakePool address is not as expected, updating to effective deployed address"
    )
    console.log("Expected: ", expectedLiquidPoolAddress)
    console.log("Deployed: ", liquidUnstakePool.address)
    await staking.updateLiquidPool(liquidUnstakePool.address)
  }
  if (withdrawal.address !== expectedWithdrawalAddress) {
    console.log(
      "LiquidUnstakePool address is not as expected, updating to effective deployed address"
    )
    console.log("Expected: ", expectedWithdrawalAddress)
    console.log("Deployed: ", withdrawal.address)
    await staking.updateWithdrawal(withdrawal.address)
  }

  await staking.addToWhitelist([liquidUnstakePool.address])

  return {
    staking,
    liquidUnstakePool,
    withdrawal,
  }
}

// Staking (Liquid Staking Token): deploy a new proxy with a new implementation.
const deployStakingV2 = async (
  deployer: SignerWithAddress,
  currentLiquidPoolAddress: string,
  currentWithdrawalAddress: string,
  updater: string,
  activator: string,
  treasury: string,
  trustedDistributor: string,
  initialTokensToDistribute: BigNumber,
  totalUnderlying: BigNumber,
) => {
  updater = updater || deployer.address
  activator = activator || deployer.address
  const [Staking] = await Promise.all([ethers.getContractFactory("Staking")])

  const staking = await upgrades.deployProxy(
    Staking,
    [
      currentLiquidPoolAddress,
      currentWithdrawalAddress,
      DEPOSIT_CONTRACT_ADDRESS,
      ADDRESSES[NATIVE], // weth
      treasury,
      updater,
      activator,
      trustedDistributor,
      initialTokensToDistribute,
      totalUnderlying
    ],
    {
      initializer: "initialize",
    }
  )
  await staking.deployed()

  await staking.addToWhitelist([currentLiquidPoolAddress])

  return { staking }
}

export { deployProtocol, deployStakingV2 }
