// import { ethers } from "hre";
import { task } from "hardhat/config";
import { BLOCK_NUMBER } from "../lib/env";
require("dotenv").config();

task("eth_balance", "Prints the ETH balance on the current block")
  .addPositionalParam("addressTarget", "Add target address")
  .setAction(async (args) => {
    const timestamp = (await ethers.provider.getBlock(BLOCK_NUMBER)).timestamp;
    const date = new Date(timestamp * 1000);
    const balance = await ethers.provider.getBalance(args.addressTarget);

    console.log("ETH balance of", args.addressTarget);
    console.log("At", date, "block", BLOCK_NUMBER);
    console.log(ethers.utils.formatEther(balance), "ETH");
  });
