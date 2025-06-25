import { ethers } from "hardhat";
import { readFileSync } from "fs";

async function main() {
    console.log("Checking pending withdrawals in Withdrawal contract...");

    // Configuration
    const USER_ADDRESS = process.env.USER_ADDRESS; // Optional - if provided, check specific user

    // Read deployment addresses
    const deploys = JSON.parse(readFileSync("./deploys.json", "utf8"));
    const WITHDRAWAL_PROXY = deploys.ethereum.WithdrawalProxy;

    console.log("Withdrawal Proxy:", WITHDRAWAL_PROXY);

    // Get the Withdrawal contract instance
    const withdrawal = await ethers.getContractAt("Withdrawal", WITHDRAWAL_PROXY);

    try {
        // Get general contract info
        console.log("\n📊 Contract Information:");
        console.log("========================");

        const owner = await withdrawal.owner();
        console.log("Owner:", owner);

        const totalPendingWithdraw = await withdrawal.totalPendingWithdraw();
        console.log("Total Pending Withdraw:", ethers.utils.formatEther(totalPendingWithdraw), "ETH");

        const currentEpoch = await withdrawal.getEpoch();
        console.log("Current Epoch:", currentEpoch.toString());

        const contractBalance = await ethers.provider.getBalance(WITHDRAWAL_PROXY);
        console.log("Contract ETH Balance:", ethers.utils.formatEther(contractBalance), "ETH");

        const startTimestamp = await withdrawal.startTimestamp();
        const startDate = new Date(startTimestamp.toNumber() * 1000);
        console.log("Start Timestamp:", startDate.toISOString());

        // Check specific user if provided
        if (USER_ADDRESS && USER_ADDRESS !== "0x") {
            console.log("\n👤 User Specific Information:");
            console.log("============================");
            console.log("User Address:", USER_ADDRESS);

            const pendingWithdraw = await withdrawal.pendingWithdraws(USER_ADDRESS);

            if (pendingWithdraw.amount.eq(0)) {
                console.log("❌ User has no pending withdrawal");
            } else {
                console.log("✅ User has pending withdrawal:");
                console.log("- Amount:", ethers.utils.formatEther(pendingWithdraw.amount), "ETH");
                console.log("- Unlock Epoch:", pendingWithdraw.unlockEpoch.toString());
                console.log("- Receiver:", pendingWithdraw.receiver);

                // Calculate when it can be claimed
                const unlockTime = await withdrawal.getEpochStartTime(pendingWithdraw.unlockEpoch);
                const validatorsDisassembleTime = await withdrawal.validatorsDisassembleTime();
                const claimableTime = unlockTime.add(validatorsDisassembleTime);
                const claimableDate = new Date(claimableTime.toNumber() * 1000);

                console.log("- Claimable after:", claimableDate.toISOString());

                const now = Math.floor(Date.now() / 1000);
                if (claimableTime.toNumber() <= now) {
                    console.log("- Status: ✅ CLAIMABLE NOW");
                } else {
                    const timeLeft = claimableTime.toNumber() - now;
                    const daysLeft = Math.floor(timeLeft / (24 * 60 * 60));
                    const hoursLeft = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
                    console.log(`- Status: ⏳ PENDING (${daysLeft}d ${hoursLeft}h remaining)`);
                }
            }
        }

        // Show contract configuration
        console.log("\n⚙️  Contract Configuration:");
        console.log("===========================");

        const withdrawalsStartEpoch = await withdrawal.withdrawalsStartEpoch();
        console.log("Withdrawals Start Epoch:", withdrawalsStartEpoch.toString());

        const validatorsDisassembleTime = await withdrawal.validatorsDisassembleTime();
        const disassembleDays = Math.floor(Number(validatorsDisassembleTime) / (24 * 60 * 60));
        console.log("Validators Disassemble Time:", disassembleDays, "days");

        const mpETH = await withdrawal.mpETH();
        console.log("mpETH Contract:", mpETH);

        console.log("\n💡 Usage Examples:");
        console.log("==================");
        console.log("To check a specific user:");
        console.log("USER_ADDRESS=0x... npx hardhat run scripts/check_pending_withdrawals.ts --network ethereum");
        console.log("");
        console.log("To remove a user's pending withdrawal (owner only):");
        console.log("USER_ADDRESS=0x... npx hardhat run scripts/remove_pending_withdraw.ts --network ethereum");

    } catch (error: any) {
        console.error("❌ Error reading contract:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
