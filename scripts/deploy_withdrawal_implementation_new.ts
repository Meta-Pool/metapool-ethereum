import { ethers } from "hardhat";
import hre from "hardhat";
import { writeFileSync, readFileSync } from "fs";

async function main() {
    console.log("Deploying new Withdrawal implementation...");

    // Deploy new implementation
    const WithdrawalFactory = await ethers.getContractFactory("Withdrawal");

    console.log("Deploying Withdrawal implementation...");
    const withdrawalImpl = await WithdrawalFactory.deploy();
    await withdrawalImpl.deployed();

    console.log("Withdrawal implementation deployed to:", withdrawalImpl.address);

    // Update deploys.json
    const deploysPath = "./deploys.json";
    let deploys;
    try {
        deploys = JSON.parse(readFileSync(deploysPath, "utf8"));
    } catch (error) {
        deploys = {};
    }

    if (!deploys.ethereum) {
        deploys.ethereum = {};
    }

    deploys.ethereum.WithdrawalImpl = withdrawalImpl.address;

    writeFileSync(deploysPath, JSON.stringify(deploys, null, 2));
    console.log("Updated deploys.json with new Withdrawal implementation");

    // Verify on Etherscan
    console.log("\nVerifying on Etherscan...");
    try {
        await hre.run("verify:verify", {
            address: withdrawalImpl.address,
            constructorArguments: [],
        });
        console.log("✅ Withdrawal implementation verified on Etherscan");
    } catch (error: any) {
        console.log("❌ Verification failed:", error.message);
        console.log("You can verify manually later using:");
        console.log(`npx hardhat verify --network ethereum ${withdrawalImpl.address}`);
    }

    console.log("\n📋 Deployment Summary:");
    console.log("======================");
    console.log("New Withdrawal Implementation:", withdrawalImpl.address);
    console.log("Withdrawal Proxy:", "0xE55E5fDe6C25ac4AD75D867817D2d8a45836Af49");
    console.log("Proxy Admin:", "0x24D9664Ba8384D94499d6698ab285b69E879D971");
    console.log("\n🔄 Next steps:");
    console.log("1. Run generate_withdrawal_safe_tx.ts to create the Safe transaction");
    console.log("2. Execute the Safe transaction to upgrade the proxy");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
