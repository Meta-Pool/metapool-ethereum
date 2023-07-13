require("dotenv").config()
const NETWORK = process.env.NETWORK || "goerli"
require("dotenv").config({ path: `.env.${NETWORK}` })

const TESTNETS = ["goerli", "hardhat"]

export = {
  BLOCK_NUMBER: process.env.BLOCK_NUMBER ? parseInt(process.env.BLOCK_NUMBER) : 0,
  BOT_ADDRESS: process.env.BOT_ADDRESS,
  NETWORK,
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
  TARGET: process.env.TARGET,
  MULTISIG_ADDRESS: process.env.MULTISIG_ADDRESS,
  RPC_ENDPOINT: process.env.RPC_ENDPOINT,
  MNEMONIC: process.env.MNEMONIC,
  DEFENDER_API_KEY: process.env.DEFENDER_API_KEY,
  DEFENDER_SECRET_KEY: process.env.DEFENDER_SECRET_KEY,
  REPORT_GAS: process.env.REPORT_GAS || "false",
  IS_TESTNET: TESTNETS.includes(NETWORK),
}
