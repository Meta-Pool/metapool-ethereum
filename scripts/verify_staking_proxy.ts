import hre from "hardhat";
import axios from "axios";
import { readFileSync } from "fs";

/**
 * Script to verify Staking.sol proxy contracts on Etherscan
 *
 * This script:
 * 1. Checks if the Staking proxy contracts are already verified
 * 2. Verifies them if they're not already verified
 * 3. Handles constructor arguments for TransparentUpgradeableProxy
 * 4. Supports both StakingProxy (V1) and StakingV2Proxy
 *
 * Usage:
 * npx hardhat run scripts/verify_staking_proxy.ts --network ethereum
 *
 * Environment variables:
 * - ETHERSCAN_API_KEY: Your Etherscan API key
 * - CONTRACT_NAME: Optional, specify "StakingProxy" or "StakingV2Proxy" to verify specific contract
 */

interface ProxyToVerify {
    name: string;
    address: string;
    implementationAddress: string;
    proxyAdminAddress: string;
}

async function main() {
    console.log("🔍 Starting Staking proxy contract verification on Etherscan...");

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

    // Define proxy contracts to verify
    const proxiesToVerify: ProxyToVerify[] = [];

    // Get proxy admin address (same for all proxies)
    const proxyAdminAddress = deployments.MultisigProxyAdmin || "0x24D9664Ba8384D94499d6698ab285b69E879D971";

    // Check which contracts to verify based on environment variable
    const specificContract = process.env.CONTRACT_NAME;

    // if (!specificContract || specificContract === "StakingProxy") {
    //     if (deployments.StakingProxy && deployments.StakingImpl) {
    //         proxiesToVerify.push({
    //             name: "StakingProxy",
    //             address: deployments.StakingProxy,
    //             implementationAddress: deployments.StakingImpl,
    //             proxyAdminAddress: proxyAdminAddress
    //         });
    //     }
    // }

    if (!specificContract || specificContract === "StakingV2Proxy") {
        if (deployments.StakingV2Proxy && deployments.StakingV2Impl) {
            proxiesToVerify.push({
                name: "StakingV2Proxy",
                address: deployments.StakingV2Proxy,
                implementationAddress: deployments.StakingV2Impl,
                proxyAdminAddress: proxyAdminAddress
            });
        }
    }

    if (proxiesToVerify.length === 0) {
        console.error("❌ No Staking proxy contracts found in deployments");
        console.log("Available deployments:", Object.keys(deployments));
        process.exit(1);
    }

    console.log(`\n📋 Found ${proxiesToVerify.length} Staking proxy contract(s) to verify:`);
    proxiesToVerify.forEach(proxy => {
        console.log(`   ${proxy.name}: ${proxy.address}`);
        console.log(`     ↳ Implementation: ${proxy.implementationAddress}`);
        console.log(`     ↳ Admin: ${proxy.proxyAdminAddress}`);
    });

    // Verify each proxy contract
    for (const proxy of proxiesToVerify) {
        console.log(`\n🔍 Checking verification status for ${proxy.name}...`);

        try {
            // Check if already verified
            const isVerified = await checkIfVerified(proxy.address, networkName, ETHERSCAN_API_KEY);

            if (isVerified) {
                console.log(`✅ ${proxy.name} at ${proxy.address} is already verified`);
                console.log(`🔗 View on Etherscan: https://${networkName === 'ethereum' ? '' : networkName + '.'}etherscan.io/address/${proxy.address}#code`);
            } else {
                console.log(`⏳ ${proxy.name} at ${proxy.address} is not verified. Starting verification...`);
                await verifyProxy(proxy);
            }
        } catch (error) {
            console.error(`❌ Error processing ${proxy.name} at ${proxy.address}:`);
            console.error(error);
        }
    }

    console.log("\n🎉 Staking proxy contract verification process completed!");
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

            // Check if it's verified as a proxy
            const contractName = response.data.result[0].ContractName;
            if (contractName.toLowerCase().includes("proxy") || contractName.toLowerCase().includes("transparent")) {
                console.log(`   🔄 Detected as proxy contract`);
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
 * Verify a proxy contract on Etherscan using Hardhat
 */
async function verifyProxy(proxy: ProxyToVerify): Promise<void> {
    console.log(`   🔧 Verifying ${proxy.name} at ${proxy.address}...`);

    try {
        // Constructor arguments for TransparentUpgradeableProxy
        // constructor(address _logic, address admin_, bytes memory _data)
        const constructorArguments = [
            proxy.implementationAddress, // _logic (implementation address)
            proxy.proxyAdminAddress,     // admin_ (proxy admin address)
            "0x"                        // _data (initialization data, usually empty for our proxies)
        ];

        console.log(`   📋 Constructor arguments:`);
        console.log(`     Implementation: ${constructorArguments[0]}`);
        console.log(`     Admin: ${constructorArguments[1]}`);
        console.log(`     Data: ${constructorArguments[2]}`);

        // Try to verify as TransparentUpgradeableProxy
        await hre.run("verify:verify", {
            address: proxy.address,
            constructorArguments: constructorArguments,
            contract: "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
        });

        console.log(`   ✅ Successfully verified ${proxy.name} as TransparentUpgradeableProxy`);

        // Get network name for URL
        const network = await hre.ethers.provider.getNetwork();
        const networkName = network.name === "homestead" ? "ethereum" : network.name;
        console.log(`   🔗 View on Etherscan: https://${networkName === 'ethereum' ? '' : networkName + '.'}etherscan.io/address/${proxy.address}#code`);

    } catch (error: any) {
        if (error.message?.includes("Already Verified")) {
            console.log(`   ✅ ${proxy.name} was already verified`);
        } else if (error.message?.includes("does not have bytecode")) {
            console.error(`   ❌ Address ${proxy.address} does not contain a contract`);
        } else if (error.message?.includes("Fail - Unable to verify")) {
            console.error(`   ❌ Verification failed - trying alternative approaches...`);

            // Try with different contract paths
            await tryAlternativeVerification(proxy);

        } else {
            console.error(`   ❌ Verification failed: ${error.message}`);
            console.log(`   💡 Manual verification tips:`);
            console.log(`      - Contract: TransparentUpgradeableProxy`);
            console.log(`      - Constructor args: ["${proxy.implementationAddress}", "${proxy.proxyAdminAddress}", "0x"]`);
        }
    }
}

/**
 * Try alternative verification methods for proxies
 */
async function tryAlternativeVerification(proxy: ProxyToVerify): Promise<void> {
    const alternatives = [
        // Try without specifying contract path
        {
            name: "Standard verification",
            contract: undefined,
        },
        // Try with EIP1967Proxy (older OpenZeppelin version)
        {
            name: "EIP1967Proxy",
            contract: "@openzeppelin/contracts/proxy/EIP1967/EIP1967Proxy.sol:EIP1967Proxy",
        }
    ];

    for (const alt of alternatives) {
        try {
            console.log(`   🔄 Trying ${alt.name}...`);

            const constructorArguments = [
                proxy.implementationAddress,
                "0x" // EIP1967Proxy only takes implementation and data
            ];

            const verifyOptions: any = {
                address: proxy.address,
                constructorArguments: constructorArguments,
            };

            if (alt.contract) {
                verifyOptions.contract = alt.contract;
            }

            await hre.run("verify:verify", verifyOptions);

            console.log(`   ✅ Successfully verified ${proxy.name} using ${alt.name}`);
            return;

        } catch (error: any) {
            console.log(`   ⚠️  ${alt.name} failed: ${error.message?.split('\n')[0]}`);
        }
    }

    console.error(`   ❌ All verification methods failed for ${proxy.name}`);
    console.log(`   💡 Consider manual verification on Etherscan`);
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
            console.error("❌ Proxy verification script failed:", error);
            process.exit(1);
        });
}

export { main };
