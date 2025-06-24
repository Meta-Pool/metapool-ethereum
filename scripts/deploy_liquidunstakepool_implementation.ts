import { ethers } from "hardhat";
import hre from "hardhat";
import { writeFileSync, readFileSync } from "fs";

async function main() {
    console.log("Deploying new LiquidUnstakePool implementation...");

    // Deploy new implementation
    const LiquidUnstakePoolFactory = await ethers.getContractFactory("LiquidUnstakePool");

    console.log("Deploying LiquidUnstakePool implementation...");
    const liquidUnstakePoolImpl = await LiquidUnstakePoolFactory.deploy();
    await liquidUnstakePoolImpl.deployed();

    console.log("LiquidUnstakePool implementation deployed to:", liquidUnstakePoolImpl.address);

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

    deploys.ethereum.LiquidUnstakePoolImpl = liquidUnstakePoolImpl.address;

    writeFileSync(deploysPath, JSON.stringify(deploys, null, 2));
    console.log("Updated deploys.json with new LiquidUnstakePool implementation");

    // Verify on Etherscan
    console.log("\nVerifying on Etherscan...");
    try {
        await hre.run("verify:verify", {
            address: liquidUnstakePoolImpl.address,
            constructorArguments: [],
        });
        console.log("✅ LiquidUnstakePool implementation verified on Etherscan");
    } catch (error: any) {
        console.log("❌ Verification failed:", error.message);
        console.log("You can verify manually later using:");
        console.log(`npx hardhat verify --network ethereum ${liquidUnstakePoolImpl.address}`);
    }

    console.log("\n📋 Deployment Summary:");
    console.log("======================");
    console.log("New LiquidUnstakePool Implementation:", liquidUnstakePoolImpl.address);
    console.log("LiquidUnstakePool Proxy:", "0xdF261F967E87B2aa44e18a22f4aCE5d7f74f03Cc");
    console.log("\n🔄 Next steps:");
    console.log("1. Run generate_liquidunstakepool_safe_tx.ts to create the Safe transaction");
    console.log("2. Execute the Safe transaction to upgrade the proxy");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
