import { ethers, upgrades } from "hardhat"
import { getImplementationAddress } from "@openzeppelin/upgrades-core"
import { deployStakingV2 } from "../../lib/deploy"
import { updateDeployedAddresses } from "../../lib/utils"
const { NETWORK, BOT_ADDRESS, DISTRIBUTOR_ADDRESS } = require("../../lib/env")
const { NETWORK_DEPLOYED_ADDRESSES } = require(`../../lib/constants/common`)
import hre from "hardhat"
import { BigNumber } from "ethers";

async function main() {
  // TODO LOG network from hardhat console.log(`Network:${NETWORK}`)
  const NETWORK =  hre.network.name;
  console.log(NETWORK);
  const [deployer] = await ethers.getSigners()
  console.log("Deploying the contracts with the account:", await deployer.getAddress())

  const StakingProxy = NETWORK_DEPLOYED_ADDRESSES['StakingProxy'];
  const LiquidUnstakePoolProxy = NETWORK_DEPLOYED_ADDRESSES['LiquidUnstakePoolProxy'];
  const WithdrawalProxy = NETWORK_DEPLOYED_ADDRESSES['WithdrawalProxy'];

  let totalAssetsV1: BigNumber;
  let totalSupplyV1: BigNumber;
  if (NETWORK === "hardhat") {
    console.log("StakingProxy: ", StakingProxy);
    const StakingV1 = await hre.ethers.getContractAt("Staking", StakingProxy);
    totalAssetsV1 = await StakingV1.totalUnderlying();
    totalSupplyV1 = await StakingV1.totalSupply();
  } else {
    // Initial supply, taken from block 22720818
    console.log("[NOTICE] Using StakingV1 hardcoded values for totalAssets and totalSupply");
    totalAssetsV1 = BigNumber.from("899477138168463500000"); // 899.47 ETH
    totalSupplyV1 = BigNumber.from("814293240537538091984"); // 814.29 ETH
  }

  console.log("LiquidUnstakePoolProxy: ", LiquidUnstakePoolProxy);
  console.log("WithdrawalProxy: ", WithdrawalProxy);

  console.log("StakingV1 totalAssets: ", totalAssetsV1.toString());
  console.log("StakingV1 totalSupply: ", totalSupplyV1.toString());
  const { staking } = await deployStakingV2(
    deployer,               // deployer: SignerWithAddress
    LiquidUnstakePoolProxy, // currentLiquidPoolAddress: string
    WithdrawalProxy,        // currentWithdrawalAddress: string
    BOT_ADDRESS,            // updater: string
    BOT_ADDRESS,            // activator: string
    deployer.address,       // treasury: string
    DISTRIBUTOR_ADDRESS,    // trustedDistributor: string
    totalSupplyV1,          // initialTokensToDistribute: BigInt
    totalAssetsV1,          // totalUnderlying: BigInt
  )

  const stakingImplAddress = await upgrades.erc1967.getImplementationAddress(staking.address);
  const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(staking.address);

  console.log(`Staking deployed to ${staking.address}`)
  console.log(`with implementation ${stakingImplAddress}`)
  console.log(`with proxyADMIN `, proxyAdminAddress)

  NETWORK_DEPLOYED_ADDRESSES.StakingV2Proxy = staking.address
  NETWORK_DEPLOYED_ADDRESSES.StakingV2Impl = stakingImplAddress

  updateDeployedAddresses(NETWORK_DEPLOYED_ADDRESSES, NETWORK)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})