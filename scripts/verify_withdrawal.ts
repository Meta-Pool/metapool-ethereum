import hre from "hardhat";
import axios from "axios";
import { readFileSync } from "fs";

/**
 * Script to verify Withdrawal.sol implementation contracts on Etherscan
 *
 * This script:
 * 1. Checks if the Withdrawal implementation contracts are already verified
 * 2. Verifies them if they're not already verified
 * 3. Supports multiple networks and handles different Withdrawal implementations
 *
 * Usage:
 * npx hardhat run scripts/verify_withdrawal.ts --network ethereum
 *
 * Environment variables:
 * - ETHERSCAN_API_KEY: Your Etherscan API key
 * - CONTRACT_ADDRESS: Optional, specify specific implementation address to verify
 */

interface ContractToVerify {
    name: string;
    address: string;
    contractName: string;
}

async function main() {
    console.log("🔍 Starting Withdrawal contract verification on Etherscan...");

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

    // Check for specific contract address from environment
    const specificAddress = process.env.CONTRACT_ADDRESS;

    if (specificAddress) {
        // Verify specific address
        if (!hre.ethers.utils.isAddress(specificAddress)) {
            console.error(`❌ Invalid contract address: ${specificAddress}`);
            process.exit(1);
        }

        contractsToVerify.push({
            name: "WithdrawalImpl (Custom)",
            address: specificAddress,
            contractName: "Withdrawal"
        });
    } else {
        // Auto-detect from deployments
        if (deployments.WithdrawalImpl) {
            contractsToVerify.push({
                name: "WithdrawalImpl",
                address: deployments.WithdrawalImpl,
                contractName: "Withdrawal"
            });
        }
    }

    if (contractsToVerify.length === 0) {
        console.error("❌ No Withdrawal implementation contracts found");
        console.log("Available deployments:", Object.keys(deployments));
        console.log("Use CONTRACT_ADDRESS environment variable to specify a specific address");
        process.exit(1);
    }

    console.log(`\n📋 Found ${contractsToVerify.length} Withdrawal implementation(s) to verify:`);
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

    console.log("\n🎉 Withdrawal contract verification process completed!");
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

            // Show additional details
            const result = response.data.result[0];
            if (result.OptimizationUsed === "1") {
                console.log(`   ⚡ Optimization: Enabled (${result.Runs} runs)`);
            }
            if (result.EVMVersion) {
                console.log(`   🔧 EVM Version: ${result.EVMVersion}`);
            }
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

        // Additional verification - check the contract details
        await verifyContractDetails(contract.address);

    } catch (error: any) {
        if (error.message?.includes("Already Verified")) {
            console.log(`   ✅ ${contract.name} was already verified`);
        } else if (error.message?.includes("does not have bytecode")) {
            console.error(`   ❌ Address ${contract.address} does not contain a contract`);
        } else if (error.message?.includes("Fail - Unable to verify")) {
            console.error(`   ❌ Verification failed - this might be due to compilation settings mismatch`);
            console.error(`   💡 Try verifying manually on Etherscan with the flattened source code`);

            // Provide manual verification guidance
            await provideManualVerificationGuidance(contract);

        } else {
            console.error(`   ❌ Verification failed: ${error.message}`);
        }
    }
}

/**
 * Verify contract details after successful verification
 */
async function verifyContractDetails(address: string): Promise<void> {
    try {
        const withdrawalContract = await hre.ethers.getContractAt("Withdrawal", address);

        console.log(`   🔍 Contract verification details:`);

        // This is an implementation contract, so these calls might fail if not initialized
        // We'll just check if the contract responds to basic calls
        try {
            const contractCode = await hre.ethers.provider.getCode(address);
            console.log(`   📦 Bytecode length: ${(contractCode.length - 2) / 2} bytes`);
        } catch (error) {
            console.log(`   ⚠️  Could not fetch bytecode details`);
        }

    } catch (error) {
        console.log(`   ⚠️  Could not verify contract details (expected for implementation contracts)`);
    }
}

/**
 * Provide guidance for manual verification
 */
async function provideManualVerificationGuidance(contract: ContractToVerify): Promise<void> {
    console.log(`\n   📋 Manual Verification Guidance for ${contract.name}:`);
    console.log(`   ========================================`);
    console.log(`   1. Go to: https://etherscan.io/address/${contract.address}#code`);
    console.log(`   2. Click "Verify and Publish"`);
    console.log(`   3. Select "Solidity (Single file)"`);
    console.log(`   4. Contract Name: ${contract.contractName}`);
    console.log(`   5. Compiler Type: Solidity (Single file)`);
    console.log(`   6. Compiler Version: v0.8.4+commit.c7e474f2`);
    console.log(`   7. License Type: MIT`);
    console.log(`   8. Optimization: Yes (200 runs)`);
    console.log(`   9. Constructor Arguments: (leave empty)`);
    console.log(`   10. Upload flattened source code:`);
    console.log(`\n   💡 To generate flattened source:`);
    console.log(`   npx hardhat flatten contracts/${contract.contractName}.sol > ${contract.contractName}_flattened.sol`);
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
