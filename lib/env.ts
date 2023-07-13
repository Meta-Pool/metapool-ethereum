import hre from "hardhat"
require("dotenv").config()

export = {
  BLOCK_NUMBER: process.env.BLOCK_NUMBER ? parseInt(process.env.BLOCK_NUMBER) : 0,
  BOT_ADDRESS: process.env.BOT_ADDRESS,
  NETWORK: hre.network.name !== "hardhat" ? hre.network.name : process.env.NETWORK,
  ETHERSCAN_API_KEY: process.env.API_KEY,
  TARGET: process.env.TARGET ? process.env.TARGET : "",
  MULTISIG_ADDRESS: process.env.MULTISIG_ADDRESS ? process.env.MULTISIG_ADDRESS : "",
}
