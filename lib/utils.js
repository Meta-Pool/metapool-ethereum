"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDeployedAddresses = exports.toEthers = void 0;
const hardhat_1 = require("hardhat");
const ethers_1 = require("ethers");
const fs_1 = __importDefault(require("fs"));
const { DEPLOYED_ADDRESSES_FILE, DEPLOYED_ADDRESSES } = require(`./constants/common`);
const toEthers = (amount) => ethers_1.BigNumber.from(hardhat_1.ethers.utils.parseEther(amount.toString()));
exports.toEthers = toEthers;
const updateDeployedAddresses = (deployedAddresses, network) => {
    DEPLOYED_ADDRESSES[network] = deployedAddresses;
    fs_1.default.writeFileSync(DEPLOYED_ADDRESSES_FILE, JSON.stringify(DEPLOYED_ADDRESSES, null, 2));
};
exports.updateDeployedAddresses = updateDeployedAddresses;
