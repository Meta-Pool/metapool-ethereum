import { HardhatUserConfig } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";
import "./tasks/eth_balance";

require("dotenv").config();

const config: HardhatUserConfig = {
  solidity: "0.8.17",
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
  },
  gasReporter: {
    enabled: true,
  },
  etherscan: {
    apiKey: String(process.env.API_KEY),
  },
};

export default config;
