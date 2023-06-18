import hre from "hardhat"
require("dotenv").config()

export = {
  BLOCK_NUMBER: process.env.BLOCK_NUMBER ? parseInt(process.env.BLOCK_NUMBER) : 0,
  BOT_ADDRESS: process.env.BOT_ADDRESS,
  NETWORK: hre.network.name,
}
