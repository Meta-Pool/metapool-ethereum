"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
const utils_1 = require("../lib/utils");
const { NETWORK_DEPLOYED_ADDRESSES, ZERO_ADDRESS } = require(`../lib/constants/common`);
const { NETWORK, TARGET, MULTISIG_ADDRESS } = require("../lib/env");
async function main() {
    if (TARGET === "")
        throw new Error("Provide a TARGET");
    if (MULTISIG_ADDRESS === "" || MULTISIG_ADDRESS === ZERO_ADDRESS)
        throw new Error("Provide a multisig address");
    const [deployer] = await hardhat_1.ethers.getSigners();
    const proxyName = `${TARGET}Proxy`;
    const implName = `${TARGET}Impl`;
    const implementation = await hardhat_1.ethers.getContractFactory(TARGET, deployer);
    const contractAddress = NETWORK_DEPLOYED_ADDRESSES[proxyName];
    console.log("Preparing proposal...");
    const proposal = await hardhat_1.defender.proposeUpgrade(contractAddress, implementation, {
        title: `Propose Upgrade to ${proxyName}`,
        multisig: MULTISIG_ADDRESS,
    });
    console.log("Upgrade proposal created at:", proposal.url);
    const newImplAddress = proposal.metadata.newImplementationAddress;
    NETWORK_DEPLOYED_ADDRESSES[implName] = newImplAddress;
    (0, utils_1.updateDeployedAddresses)(NETWORK_DEPLOYED_ADDRESSES, NETWORK);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
