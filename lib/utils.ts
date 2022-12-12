import { ethers } from "hardhat";

const toEthers = (amount: string) => ethers.utils.parseEther(amount)

export {
    toEthers
}