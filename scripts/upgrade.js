"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const upgrades_core_1 = require("@openzeppelin/upgrades-core");
const utils_1 = require("../lib/utils");
const { NETWORK_DEPLOYED_ADDRESSES } = require(`../lib/constants/common`);
const { NETWORK, TARGET } = require("../lib/env");
async function main() {
    if (TARGET === "")
        throw new Error("Provide a TARGET");
    const proxyName = `${TARGET}Proxy`, implName = `${TARGET}Impl`, implementation = await hardhat_1.ethers.getContractFactory(TARGET), contractAddress = NETWORK_DEPLOYED_ADDRESSES[proxyName], oldImplAddress = NETWORK_DEPLOYED_ADDRESSES[implName], upgrade = await hardhat_1.upgrades.upgradeProxy(contractAddress, implementation);
    console.log(`Upgrading ${TARGET} at ${contractAddress}`);
    await upgrade.deployed();
    const newImplAddress = await (0, upgrades_core_1.getImplementationAddress)(hardhat_1.ethers.provider, upgrade.address);
    console.log(`Upgraded implementation`);
    console.log(`from ${oldImplAddress}`);
    console.log(`to ${newImplAddress}`);
    NETWORK_DEPLOYED_ADDRESSES[implName] = newImplAddress;
    (0, utils_1.updateDeployedAddresses)(NETWORK_DEPLOYED_ADDRESSES, NETWORK);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
