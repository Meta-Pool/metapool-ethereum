import hre from "hardhat";
import axios from "axios";
import { readFileSync } from "fs";

/**
 * Script to verify Staking.sol implementation contracts on Etherscan
 *
 * This script:
 * 1. Checks if the Staking implementation contracts are already verified
 * 2. Verifies them if they're not already verified
 * 3. Supports both StakingV1 and StakingV2 implementations
 *
 * Usage:
 * npx hardhat run scripts/verify_staking.ts --network ethereum
 *
 * Environment variables:
 * - ETHERSCAN_API_KEY: Your Etherscan API key
 * - CONTRACT_NAME: Optional, specify "StakingImpl" or "StakingV2Impl" to verify specific contract
 */

interface ContractToVerify {
    name: string;
    address: string;
    contractName: string;
}

async function main() {
    console.log("🔍 Starting Staking contract verification on Etherscan...");

    // Get network information
    const network = await hre.ethers.provider.getNetwork();
    const networkName = network.name === "homestead" ? "ethereum" : network.name;
    console.log(`📡 Network: ${networkName} (chainId: ${network.chainId})`);

    // Read deployment addresses
    const deploys = JSON.parse(readFileSync("./deploys.json", "utf8"));

    if (!deploys[networkName]) {
        console.error(`❌ No deployments found for network: ${networkName}`);
        process.exit(1);
    }

    const deployments = deploys[networkName];

    // Get Etherscan API key
    const { ETHERSCAN_API_KEY } = require("../lib/env");
    if (!ETHERSCAN_API_KEY) {
        console.error("❌ ETHERSCAN_API_KEY environment variable is required");
        process.exit(1);
    }

    // Define contracts to verify
    const contractsToVerify: ContractToVerify[] = [];

    // Check which contracts to verify based on environment variable
    const specificContract = process.env.CONTRACT_NAME;

    //   if (!specificContract || specificContract === "StakingImpl") {
    //     if (deployments.StakingImpl) {
    //       contractsToVerify.push({
    //         name: "StakingImpl",
    //         address: deployments.StakingImpl,
    //         contractName: "Staking"
    //       });
    //     }
    //   }

    if (!specificContract || specificContract === "StakingV2Impl") {
        if (deployments.StakingV2Impl) {
            contractsToVerify.push({
                name: "StakingV2Impl",
                address: deployments.StakingV2Impl,
                contractName: "Staking"
            });
        }
    }

    if (contractsToVerify.length === 0) {
        console.error("❌ No Staking implementation contracts found in deployments");
        console.log("Available deployments:", Object.keys(deployments));
        process.exit(1);
    }

    console.log(`\n📋 Found ${contractsToVerify.length} Staking implementation(s) to verify:`);
    contractsToVerify.forEach(contract => {
        console.log(`   ${contract.name}: ${contract.address}`);
    });

    // Verify each contract
    for (const contract of contractsToVerify) {
        console.log(`\n🔍 Checking verification status for ${contract.name}...`);

        try {
            // Check if already verified
            const isVerified = await checkIfVerified(contract.address, networkName, ETHERSCAN_API_KEY);

            if (isVerified) {
                console.log(`✅ ${contract.name} at ${contract.address} is already verified`);
                console.log(`🔗 View on Etherscan: https://${networkName === 'ethereum' ? '' : networkName + '.'}etherscan.io/address/${contract.address}#code`);
            } else {
                console.log(`⏳ ${contract.name} at ${contract.address} is not verified. Starting verification...`);
                await verifyContract(contract);
            }
        } catch (error) {
            console.error(`❌ Error processing ${contract.name} at ${contract.address}:`);
            console.error(error);
        }
    }

    console.log("\n🎉 Staking contract verification process completed!");
}

/**
 * Check if a contract is already verified on Etherscan
 */
async function checkIfVerified(address: string, networkName: string, apiKey: string): Promise<boolean> {
    try {
        const baseUrl = networkName === "ethereum" ? "https://api.etherscan.io" : `https://api-${networkName}.etherscan.io`;
        const url = `${baseUrl}/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;

        console.log(`   Checking: ${url}`);

        const response = await axios.get(url);

        if (response.data.status !== "1") {
            console.log(`   ⚠️  API response status: ${response.data.status}, message: ${response.data.message}`);
            return false;
        }

        const sourceCode = response.data.result[0].SourceCode;
        const isVerified = sourceCode !== "";

        if (isVerified) {
            console.log(`   ✅ Contract is verified`);
            console.log(`   📄 Contract name: ${response.data.result[0].ContractName}`);
            console.log(`   🔧 Compiler version: ${response.data.result[0].CompilerVersion}`);
        } else {
            console.log(`   ❌ Contract is not verified`);
        }

        return isVerified;
    } catch (error) {
        console.error(`   ❌ Error checking verification status: ${error}`);
        return false;
    }
}

/**
 * Verify a contract on Etherscan using Hardhat
 */
async function verifyContract(contract: ContractToVerify): Promise<void> {
    console.log(`   🔧 Verifying ${contract.name} (${contract.contractName}) at ${contract.address}...`);

    try {
        await hre.run("verify:verify", {
            address: contract.address,
            constructorArguments: [], // Implementation contracts typically have no constructor args
            contract: `contracts/${contract.contractName}.sol:${contract.contractName}`
        });

        console.log(`   ✅ Successfully verified ${contract.name}`);

        // Get network name for URL
        const network = await hre.ethers.provider.getNetwork();
        const networkName = network.name === "homestead" ? "ethereum" : network.name;
        console.log(`   🔗 View on Etherscan: https://${networkName === 'ethereum' ? '' : networkName + '.'}etherscan.io/address/${contract.address}#code`);

    } catch (error: any) {
        if (error.message?.includes("Already Verified")) {
            console.log(`   ✅ ${contract.name} was already verified`);
        } else if (error.message?.includes("does not have bytecode")) {
            console.error(`   ❌ Address ${contract.address} does not contain a contract`);
        } else if (error.message?.includes("Fail - Unable to verify")) {
            console.error(`   ❌ Verification failed - this might be due to compilation settings mismatch`);
            console.error(`   💡 Try verifying manually on Etherscan with the flattened source code`);
        } else {
            console.error(`   ❌ Verification failed: ${error.message}`);
        }
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Verification script failed:", error);
            process.exit(1);
        });
}

export { main };
