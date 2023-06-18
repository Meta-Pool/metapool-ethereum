import { ethers } from "hardhat"
import { BigNumber } from "ethers"

const toEthers = (amount: Number): BigNumber =>
  BigNumber.from(ethers.utils.parseEther(amount.toString()))

export { toEthers }
