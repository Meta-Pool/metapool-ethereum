import { ethers } from "hardhat";
import { type LiquidUnstakePool } from "../typechain-types";

/**
 * Script to update the staked ETH token address in the LiquidUnstakePool contract
 *
 * This script:
 * 1. Connects to the LiquidUnstakePool proxy contract
 * 2. Verifies the current owner
 * 3. Checks the current STAKING token address
 * 4. Updates the STAKING token address to the new address
 * 5. Verifies the update was successful
 *
 * Usage:
 * - Set NEW_STAKING_ADDRESS environment variable with the new staking contract address
 * - Run: npx hardhat run scripts/update_staking_token.ts --network <network>
 *
 * Example:
 * NEW_STAKING_ADDRESS=0xD06f6a56c5f599cB375B616DF306f32B7F6f4A0E npx hardhat run scripts/update_staking_token.ts --network ethereum
 */

async function main() {
    console.log("🔄 Starting staking token address update script...");

    // Get network information
    const network = await ethers.provider.getNetwork();
    console.log(`📡 Connected to network: ${network.name} (chainId: ${network.chainId})`);

    // Get the new staking address from environment variable
    const newStakingAddress = "0xD06f6a56c5f599cB375B616DF306f32B7F6f4A0E";
    if (!newStakingAddress) {
        console.error("❌ NEW_STAKING_ADDRESS environment variable is required");
        console.log("Usage: NEW_STAKING_ADDRESS=0x... npx hardhat run scripts/update_staking_token.ts --network <network>");
        console.log("");
        console.log("Example addresses:");
        console.log("- Current Staking V1:", "0x48AFbBd342F64EF8a9Ab1C143719b63C2AD81710");
        console.log("- New Staking V2:", "0xD06f6a56c5f599cB375B616DF306f32B7F6f4A0E");
        process.exit(1);
    }

    // Validate the address format
    if (!ethers.utils.isAddress(newStakingAddress)) {
        console.error(`❌ Invalid address format: ${newStakingAddress}`);
        process.exit(1);
    }

    console.log(`🎯 New staking address: ${newStakingAddress}`);

    // Get the signer
    const [signer] = await ethers.getSigners();
    console.log(`👤 Signer address: ${signer.address}`);
    console.log(`💰 Signer balance: ${ethers.utils.formatEther(await signer.getBalance())} ETH`);

    // Get LiquidUnstakePool proxy address from deploys.json
    const deployments = require("../deploys.json");
    const networkName = network.name === "homestead" ? "ethereum" : network.name;

    if (!deployments[networkName] || !deployments[networkName].LiquidUnstakePoolProxy) {
        console.error(`❌ LiquidUnstakePool proxy address not found for network: ${networkName}`);
        process.exit(1);
    }

    const liquidUnstakePoolProxyAddress = deployments[networkName].LiquidUnstakePoolProxy;
    console.log(`🏦 LiquidUnstakePool proxy address: ${liquidUnstakePoolProxyAddress}`);

    // Connect to LiquidUnstakePool contract
    const liquidUnstakePoolFactory = await ethers.getContractFactory("LiquidUnstakePool");
    const liquidUnstakePool = liquidUnstakePoolFactory.attach(liquidUnstakePoolProxyAddress) as LiquidUnstakePool;

    try {
        // Check current owner
        console.log("\n📋 Checking current contract state...");
        const currentOwner = await liquidUnstakePool.owner();
        console.log(`👑 Current owner: ${currentOwner}`);

        // Verify the signer is the owner
        if (currentOwner.toLowerCase() !== signer.address.toLowerCase()) {
            console.error(`❌ Signer is not the owner!`);
            console.error(`   Owner: ${currentOwner}`);
            console.error(`   Signer: ${signer.address}`);
            process.exit(1);
        }
        console.log("✅ Verified: Signer is the contract owner");

        // Check current STAKING address
        const currentStaking = await liquidUnstakePool.STAKING();
        console.log(`🪙 Current STAKING address: ${currentStaking}`);

        if (currentStaking.toLowerCase() === newStakingAddress.toLowerCase()) {
            console.log("⚠️  New address is the same as current address. No update needed.");
            return;
        }

        // Validate the new staking address is a contract
        const newStakingCode = await ethers.provider.getCode(newStakingAddress);
        if (newStakingCode === "0x") {
            console.error("❌ Error: New staking address is not a contract");
            process.exit(1);
        }
        console.log("✅ New staking address is a valid contract");

        // Try to validate it's a staking contract by checking for common functions
        try {
            const newStakingContract = await ethers.getContractAt("Staking", newStakingAddress);
            // Try to call a view function to verify it's a staking contract
            const name = await newStakingContract.name();
            const symbol = await newStakingContract.symbol();
            console.log(`📋 New staking contract name: ${name}`);
            console.log(`📋 New staking contract symbol: ${symbol}`);
        } catch (error) {
            console.log("⚠️  Warning: Could not verify staking interface of new contract");
            console.log("   This may be expected if it's a different version of the staking contract");
        }

        // Estimate gas for the update
        console.log("\n⛽ Estimating gas...");
        const gasEstimate = await liquidUnstakePool.estimateGas.updateStakedEthToken(newStakingAddress);
        console.log(`📊 Estimated gas: ${gasEstimate.toString()}`);

        // Get current gas price
        const gasPrice = await ethers.provider.getGasPrice();
        console.log(`💨 Current gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);

        const estimatedCost = gasEstimate.mul(gasPrice);
        console.log(`💸 Estimated transaction cost: ${ethers.utils.formatEther(estimatedCost)} ETH`);

        // Ask for confirmation (in a real scenario, you might want to add a confirmation prompt)
        console.log(`\n🔄 Updating staking token address...`);
        console.log(`   From: ${currentStaking}`);
        console.log(`   To:   ${newStakingAddress}`);

        // Execute the update
        const tx = await liquidUnstakePool.updateStakedEthToken(newStakingAddress, {
            gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
        });

        console.log(`📤 Transaction submitted: ${tx.hash}`);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);

        // Verify the update
        console.log("\n🔍 Verifying update...");
        const updatedStaking = await liquidUnstakePool.STAKING();
        console.log(`🪙 Updated STAKING address: ${updatedStaking}`);

        if (updatedStaking.toLowerCase() === newStakingAddress.toLowerCase()) {
            console.log("✅ Staking token address successfully updated!");
        } else {
            console.error("❌ Update verification failed!");
            console.error(`   Expected: ${newStakingAddress}`);
            console.error(`   Actual:   ${updatedStaking}`);
            process.exit(1);
        }

        // Additional verification - check that the contract is still functional
        console.log("\n🔍 Additional contract state verification...");
        try {
            const ethBalance = await liquidUnstakePool.ethBalance();
            console.log(`📊 ETH balance: ${ethers.utils.formatEther(ethBalance)} ETH`);

            const targetLiquidity = await liquidUnstakePool.targetLiquidity();
            console.log(`🎯 Target liquidity: ${ethers.utils.formatEther(targetLiquidity)} ETH`);

            const treasury = await liquidUnstakePool.treasury();
            console.log(`🏛️ Treasury address: ${treasury}`);

            const minFee = await liquidUnstakePool.minFee();
            console.log(`💰 Min fee: ${minFee.toString()} bps`);

            console.log("✅ Contract state verification completed successfully");
        } catch (error) {
            console.warn("⚠️  Warning: Could not verify all contract state");
            console.warn(`   Error: ${error}`);
        }

        console.log("\n🎉 Staking token address update completed successfully!");
        console.log(`📄 Transaction hash: ${tx.hash}`);
        console.log(`🔗 View on Etherscan: https://etherscan.io/tx/${tx.hash}`);

    } catch (error: any) {
        console.error("❌ Error during staking token address update:");

        if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
            console.error("   Gas estimation failed - transaction would likely revert");
            console.error("   Possible reasons:");
            console.error("   - Signer is not the owner");
            console.error("   - Contract is paused or has restrictions");
            console.error("   - Invalid new staking address");
        } else if (error.code === "INSUFFICIENT_FUNDS") {
            console.error("   Insufficient funds for transaction");
        } else if (error.reason) {
            console.error(`   Revert reason: ${error.reason}`);
        } else {
            console.error(`   ${error.message}`);
        }

        process.exit(1);
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
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

export { main };
