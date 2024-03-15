"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const fs_1 = __importDefault(require("fs"));
const { NETWORK } = require("../env");
const constants = require(`./network/${NETWORK}`);
constants.DEPLOYED_ADDRESSES_FILE = "deploys.json";
const deployments = JSON.parse(fs_1.default.readFileSync(constants.DEPLOYED_ADDRESSES_FILE).toString());
constants.DEPLOYED_ADDRESSES = deployments ? deployments : {};
constants.NETWORK_DEPLOYED_ADDRESSES = deployments[NETWORK] ? { ...deployments[NETWORK] } : {};
constants.DEPOSIT_ABI = require("../abi/DepositContract.json");
constants.WETH_ABI = require("../abi/WETH.json");
constants.ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
constants.GNOSIS_SAFE_ABI = require("../abi/GnosisSafe.json");
module.exports = {
    ...constants,
};
