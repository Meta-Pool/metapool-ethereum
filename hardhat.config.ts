import "@openzeppelin/hardhat-upgrades"
import "@nomicfoundation/hardhat-toolbox"
import "@openzeppelin/hardhat-defender"
import "hardhat-gas-reporter"

require("dotenv").config()

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
        url: String(process.env.RPC_ENDPOINT),
        blockNumber: Number(process.env.BLOCK_NUMBER),
        enabled: true,
      },
    },
    goerli: {
      url: String(process.env.RPC_ENDPOINT),
      accounts: [String(process.env.PRIVATE_KEY)],
    },
    ethereum: {
      url: String(process.env.RPC_ENDPOINT),
      accounts: [String(process.env.PRIVATE_KEY)],
    },
  },
  gasReporter: {
    enabled: JSON.parse(process.env.REPORT_GAS || "false"),
  },
  etherscan: {
    apiKey: String(process.env.API_KEY),
  },
  defender: {
    apiKey: process.env.DEFENDER_API_KEY,
    apiSecret: process.env.DEFENDER_SECRET_KEY,
  },
}
