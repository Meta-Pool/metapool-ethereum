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

  console.log("Owner address: ", deployer.address);
  console.log("balance: ", await hre.ethers.provider.getBalance(deployer.address));

  const StakingV2Proxy = NETWORK_DEPLOYED_ADDRESSES['StakingV2Proxy'];

  const StakingV2 = await hre.ethers.getContractAt("Staking", StakingV2Proxy);

  console.log("StakingV2 total supply: ", await StakingV2.totalSupply());
  console.log("StakingV2 total assets: ", await StakingV2.totalAssets());

  console.log("Distributor balance: ", await StakingV2.balanceOf(deployer.address));

  console.log("LPool balance: ", await StakingV2.balanceOf("0xdf261f967e87b2aa44e18a22f4ace5d7f74f03cc"));
  console.log("Safe balance: ", await StakingV2.balanceOf("0xc0a9a14ace68a3eb4f8672e8aaab8ac4fe8037f1"));
  console.log("Safe balance: ", await StakingV2.balanceOf("0x8e3b0600c06bb4b99f5eab33d3a25e338818fbe2"));
  console.log("EOA balance: ", await StakingV2.balanceOf("0x4be9601477b1417c591f63447282ec6e385ab537"));
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})