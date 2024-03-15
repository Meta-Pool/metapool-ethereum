"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
require("dotenv").config();
const NETWORK = process.env.NETWORK || "sepolia";
require("dotenv").config({ path: `.env.${NETWORK}` });
const TESTNETS = ["sepolia", "hardhat"];
const mnemonic = fs.readFileSync(path.join(os.homedir(), ".config/mp-eth-mnemonic.txt")).toString();
module.exports = {
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
};
