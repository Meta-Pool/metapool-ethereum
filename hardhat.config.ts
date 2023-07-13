import "@openzeppelin/hardhat-upgrades"
import "@nomicfoundation/hardhat-toolbox"
import "@openzeppelin/hardhat-defender"
import "hardhat-gas-reporter"
const {
  RPC_ENDPOINT,
  BLOCK_NUMBER,
  MNEMONIC,
  ETHERSCAN_API_KEY,
  DEFENDER_API_KEY,
  DEFENDER_SECRET_KEY,
  REPORT_GAS,
} = require("./lib/env")

module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: String(RPC_ENDPOINT),
        blockNumber: Number(BLOCK_NUMBER),
        enabled: true,
      },
      // Uncomment this to use your own mnemonic. Make sure to keep it secret!
      // accounts: {
      //   mnemonic: MNEMONIC,
      // },
    },
  },
  gasReporter: {
    enabled: REPORT_GAS,
  },
  etherscan: {
    apiKey: String(ETHERSCAN_API_KEY),
  },
  defender: {
    apiKey: DEFENDER_API_KEY,
    apiSecret: DEFENDER_SECRET_KEY,
  },
  plugins: ["hardhat-deploy"],
}
