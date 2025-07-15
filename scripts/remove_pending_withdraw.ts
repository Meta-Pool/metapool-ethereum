import { ethers } from "hardhat";
import { readFileSync } from "fs";

async function main() {
    console.log("Script to execute removePendingWithdraw from Withdrawal contract...");

    // Configuration - EDIT THESE VALUES
    const USER_ADDRESS = process.env.USER_ADDRESS || "0x"; // Address of user to remove pending withdrawal

    if (!USER_ADDRESS || USER_ADDRESS === "0x") {
        console.log("❌ Error: Please set USER_ADDRESS environment variable");
        console.log("Usage: USER_ADDRESS=0x... npx hardhat run scripts/remove_pending_withdraw.ts --network ethereum");
        process.exit(1);
    }

    // Read deployment addresses
    const deploys = JSON.parse(readFileSync("./deploys.json", "utf8"));
    const WITHDRAWAL_PROXY = deploys.ethereum.WithdrawalProxy;

    console.log("Withdrawal Proxy:", WITHDRAWAL_PROXY);
    console.log("User Address:", USER_ADDRESS);

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

        // Check if user has pending withdrawal
        console.log("\n🔍 Checking user's pending withdrawal...");
        const pendingWithdraw = await withdrawal.pendingWithdraws(USER_ADDRESS);

        if (pendingWithdraw.amount.eq(0)) {
            console.log("❌ User has no pending withdrawal to remove");
            console.log("Amount:", ethers.utils.formatEther(pendingWithdraw.amount), "ETH");
            process.exit(1);
        }

        console.log("✅ User has pending withdrawal:");
        console.log("- Amount:", ethers.utils.formatEther(pendingWithdraw.amount), "ETH");
        console.log("- Unlock Epoch:", pendingWithdraw.unlockEpoch.toString());
        console.log("- Receiver:", pendingWithdraw.receiver);

        // Get current total pending withdraw
        const totalPendingBefore = await withdrawal.totalPendingWithdraw();
        console.log("- Total pending before:", ethers.utils.formatEther(totalPendingBefore), "ETH");

        // Execute removePendingWithdraw
        console.log("\n🔄 Executing removePendingWithdraw...");

        // Estimate gas
        const gasEstimate = await withdrawal.estimateGas.removePendingWithdraw(USER_ADDRESS);
        console.log("Estimated gas:", gasEstimate.toString());

        // Execute transaction
        const tx = await withdrawal.removePendingWithdraw(USER_ADDRESS, {
            gasLimit: gasEstimate.mul(120).div(100) // Add 20% buffer
        });

        console.log("Transaction sent:", tx.hash);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!");
        console.log("Block number:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());

        // Verify the removal
        console.log("\n✅ Verifying removal...");
        const pendingWithdrawAfter = await withdrawal.pendingWithdraws(USER_ADDRESS);
        const totalPendingAfter = await withdrawal.totalPendingWithdraw();

        console.log("User pending withdrawal after:");
        console.log("- Amount:", ethers.utils.formatEther(pendingWithdrawAfter.amount), "ETH");
        console.log("- Unlock Epoch:", pendingWithdrawAfter.unlockEpoch.toString());
        console.log("- Receiver:", pendingWithdrawAfter.receiver);

        console.log("Total pending after:", ethers.utils.formatEther(totalPendingAfter), "ETH");
        console.log("Removed amount:", ethers.utils.formatEther(totalPendingBefore.sub(totalPendingAfter)), "ETH");

        if (pendingWithdrawAfter.amount.eq(0)) {
            console.log("🎉 Successfully removed pending withdrawal for user:", USER_ADDRESS);
        } else {
            console.log("❌ Error: Pending withdrawal still exists");
        }

    } catch (error: any) {
        console.error("❌ Error executing removePendingWithdraw:", error.message);

        if (error.message.includes("UserDontHavePendingWithdraw")) {
            console.log("User has no pending withdrawal to remove");
        } else if (error.message.includes("Ownable: caller is not the owner")) {
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
