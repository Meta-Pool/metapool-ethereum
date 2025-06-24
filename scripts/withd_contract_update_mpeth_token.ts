import { ethers } from "hardhat";
import { readFileSync } from "fs";

async function main() {
    console.log("Script to execute updateMPETHToken in Withdrawal contract...");

    // Configuration - EDIT THESE VALUES
    const NEW_MPETH_ADDRESS = "0xD06f6a56c5f599cB375B616DF306f32B7F6f4A0E"; // New mpETH contract address

    if (!NEW_MPETH_ADDRESS || !ethers.utils.isAddress(NEW_MPETH_ADDRESS)) {
        console.log("❌ Error: Please provide a valid NEW_MPETH_ADDRESS");
        console.log("Usage: NEW_MPETH_ADDRESS=0x... npx hardhat run scripts/update_mpeth_token.ts --network ethereum");
        console.log("");
        console.log("Example addresses:");
        console.log("- Current Staking V1:", "0x48AFbBd342F64EF8a9Ab1C143719b63C2AD81710");
        console.log("- New Staking V2:", "0xD06f6a56c5f599cB375B616DF306f32B7F6f4A0E");
        process.exit(1);
    }

    // Read deployment addresses
    const deploys = JSON.parse(readFileSync("./deploys.json", "utf8"));
    const WITHDRAWAL_PROXY = deploys.ethereum.WithdrawalProxy;

    console.log("Withdrawal Proxy:", WITHDRAWAL_PROXY);
    console.log("New mpETH Address:", NEW_MPETH_ADDRESS);

    // Get the Withdrawal contract instance
    const withdrawal = await ethers.getContractAt("Withdrawal", WITHDRAWAL_PROXY);

    // Get signer (must be the owner)
    const [signer] = await ethers.getSigners();
    console.log("Signer address:", signer.address);

    try {
        // Check current owner
        const owner = await withdrawal.owner();
        console.log("Contract owner:", owner);

        if (signer.address.toLowerCase() !== owner.toLowerCase()) {
            console.log("❌ Error: Signer is not the contract owner");
            console.log("Current signer:", signer.address);
            console.log("Required owner:", owner);
            process.exit(1);
        }

        // Get current mpETH address
        console.log("\n🔍 Current state:");
        const currentMpETH = await withdrawal.mpETH();
        console.log("Current mpETH address:", currentMpETH);
        console.log("New mpETH address:", NEW_MPETH_ADDRESS);

        if (currentMpETH.toLowerCase() === NEW_MPETH_ADDRESS.toLowerCase()) {
            console.log("⚠️  Warning: The new address is the same as the current address");
            console.log("No update needed. Exiting...");
            process.exit(0);
        }

        // Validate the new mpETH address is a contract
        const newMpETHCode = await ethers.provider.getCode(NEW_MPETH_ADDRESS);
        if (newMpETHCode === "0x") {
            console.log("❌ Error: New mpETH address is not a contract");
            process.exit(1);
        }
        console.log("✅ New mpETH address is a valid contract");

        // Try to validate it's an ERC20/mpETH contract
        try {
            const newMpETHContract = await ethers.getContractAt("IERC20", NEW_MPETH_ADDRESS);
            // const name = await newMpETHContract.name();
            // const symbol = await newMpETHContract.symbol();
            // console.log("New contract name:", name);
            // console.log("New contract symbol:", symbol);
        } catch (error) {
            console.log("⚠️  Warning: Could not verify ERC20 interface of new contract");
        }

        // Execute updateMPETHToken
        console.log("\n🔄 Executing updateMPETHToken...");

        // Estimate gas
        const gasEstimate = await withdrawal.estimateGas.updateMPETHToken(NEW_MPETH_ADDRESS);
        console.log("Estimated gas:", gasEstimate.toString());

        // Execute transaction
        const tx = await withdrawal.updateMPETHToken(NEW_MPETH_ADDRESS, {
            gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
        });

        console.log("Transaction sent:", tx.hash);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");
        console.log("Block number:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());

        // Verify the update
        console.log("\n✅ Verifying update...");
        const updatedMpETH = await withdrawal.mpETH();

        console.log("Previous mpETH address:", currentMpETH);
        console.log("Updated mpETH address:", updatedMpETH);

        if (updatedMpETH.toLowerCase() === NEW_MPETH_ADDRESS.toLowerCase()) {
            console.log("🎉 Successfully updated mpETH token address!");
        } else {
            console.log("❌ Error: mpETH address was not updated correctly");
            process.exit(1);
        }

        // Show impact summary
        console.log("\n📋 Update Summary:");
        console.log("==================");
        console.log("Function called: updateMPETHToken(address)");
        console.log("Previous address:", currentMpETH);
        console.log("New address:", updatedMpETH);
        console.log("Block number:", receipt.blockNumber);
        console.log("Transaction hash:", tx.hash);

        console.log("\n⚠️  Important Notes:");
        console.log("====================");
        console.log("- The Withdrawal contract now points to the new mpETH contract");
        console.log("- This affects future interactions with the mpETH token");
        console.log("- Existing pending withdrawals are not affected by this change");
        console.log("- The new mpETH contract should be properly configured and validated");

    } catch (error: any) {
        console.error("❌ Error executing updateMPETHToken:", error.message);

        if (error.message.includes("Ownable: caller is not the owner")) {
            console.log("Only the contract owner can call this function");
        } else {
            console.log("Full error:", error);
        }

        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
