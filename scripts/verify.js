"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = __importDefault(require("hardhat"));
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../lib/env");
const { ETHERSCAN_API_KEY } = require("../lib/env");
const { NETWORK_DEPLOYED_ADDRESSES } = require(`../lib/constants/common`);
async function main() {
    let contracts = [];
    for (const contractName in NETWORK_DEPLOYED_ADDRESSES) {
        contracts.push({
            name: contractName,
            address: NETWORK_DEPLOYED_ADDRESSES[contractName],
        });
    }
    for (const contract of contracts) {
        try {
            let url = `https://api${env_1.NETWORK == "ethereum" ? "" : ("-" + env_1.NETWORK)}.etherscan.io/api?module=contract&action=getsourcecode&address=${contract.address}&apikey=${ETHERSCAN_API_KEY}`;
            console.log(url);
            // TODO: API url to constants and select by network
            const response = await axios_1.default.get(url);
            const isVerified = response.data.result[0].SourceCode !== "";
            if (isVerified) {
                console.log(`${contract.name} at ${contract.address} already verified`);
            }
            else {
                console.log(`${contract.name} at ${contract.address} not verified`);
                await verifyContract(contract);
            }
        }
        catch (error) {
            console.log(`Error checking verification for ${contract.name} at ${contract.address}`);
            console.error(error);
        }
    }
}
const verifyContract = async (contract) => {
    console.log(`Verifying ${contract.name} at ${contract.address}`);
    try {
        await hardhat_1.default.run("verify:verify", {
            address: contract.address,
            constructorArguments: [],
        });
    }
    catch (e) {
        console.error(`Error verifying ${contract.name} at ${contract.address}`);
        console.error(e);
    }
};
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
