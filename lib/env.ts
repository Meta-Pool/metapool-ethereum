import * as os from "os"
import * as path from "path"
import * as fs from "fs"

require("dotenv").config()
const NETWORK = process.env.NETWORK || "sepolia"
require("dotenv").config({ path: `.env.${NETWORK}` })

const TESTNETS = ["sepolia", "hardhat"]

const mnemonic = fs.readFileSync(path.join(os.homedir(), ".config/mp-eth-mnemonic.txt")).toString()

export = {
  BLOCK_NUMBER: process.env.BLOCK_NUMBER ? parseInt(process.env.BLOCK_NUMBER) : null,
  BOT_ADDRESS: process.env.BOT_ADDRESS,
  NETWORK,
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
  TARGET: process.env.TARGET,
  MULTISIG_ADDRESS: process.env.MULTISIG_ADDRESS,
  RPC_ENDPOINT: process.env.RPC_ENDPOINT,
  MNEMONIC: mnemonic,
  DEFENDER_API_KEY: process.env.DEFENDER_API_KEY,
  DEFENDER_SECRET_KEY: process.env.DEFENDER_SECRET_KEY,
  REPORT_GAS: process.env.REPORT_GAS || "false",
  IS_TESTNET: TESTNETS.includes(NETWORK),
}
