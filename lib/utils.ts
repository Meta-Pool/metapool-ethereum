import { ethers } from "hardhat";

const toEthers = (amount: Number) => ethers.utils.parseEther(amount.toString());

export { toEthers };
