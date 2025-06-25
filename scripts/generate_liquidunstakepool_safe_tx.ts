import { ethers } from "hardhat";
import { readFileSync } from "fs";

async function main() {
    console.log("Generating Safe transaction for LiquidUnstakePool upgrade...");

    // Read current deployment addresses
    const deploys = JSON.parse(readFileSync("./deploys.json", "utf8"));
    const LIQUIDUNSTAKEPOOL_PROXY = deploys.ethereum.LiquidUnstakePoolProxy;
    const LIQUIDUNSTAKEPOOL_IMPL = deploys.ethereum.LiquidUnstakePoolImpl;
    const PROXY_ADMIN = deploys.ethereum.MultisigProxyAdmin;

    console.log("LiquidUnstakePool Proxy:", LIQUIDUNSTAKEPOOL_PROXY);
    console.log("New LiquidUnstakePool Implementation:", LIQUIDUNSTAKEPOOL_IMPL);
    console.log("Proxy Admin:", PROXY_ADMIN);

    // Get ProxyAdmin interface
    const proxyAdminAbi = [
        "function upgrade(address proxy, address implementation) external"
    ];

    const proxyAdminInterface = new ethers.utils.Interface(proxyAdminAbi);

    // Encode the upgrade call
    const upgradeCalldata = proxyAdminInterface.encodeFunctionData("upgrade", [
        LIQUIDUNSTAKEPOOL_PROXY,
        LIQUIDUNSTAKEPOOL_IMPL
    ]);

    console.log("\n📋 Safe Transaction Data for LiquidUnstakePool Upgrade:");
    console.log("========================================================");
    console.log("To:", PROXY_ADMIN);
    console.log("Value: 0");
    console.log("Data:", upgradeCalldata);
    console.log("");

    // Also provide the raw transaction data for manual verification
    console.log("🔍 Transaction Details:");
    console.log("Function: upgrade(address,address)");
    console.log("Proxy Address:", LIQUIDUNSTAKEPOOL_PROXY);
    console.log("New Implementation:", LIQUIDUNSTAKEPOOL_IMPL);
    console.log("");

    console.log("📝 Manual Safe Transaction Creation:");
    console.log("1. Go to https://app.safe.global/");
    console.log("2. Connect to your Safe multisig");
    console.log("3. Click 'New Transaction' → 'Contract Interaction'");
    console.log("4. Enter the following:");
    console.log("   - To:", PROXY_ADMIN);
    console.log("   - Value: 0");
    console.log("   - Data:", upgradeCalldata);
    console.log("5. Review and submit the transaction");
    console.log("6. Collect signatures from other Safe owners");
    console.log("7. Execute the transaction");
    console.log("");

    console.log("⚠️  VERIFICATION STEPS:");
    console.log("Before executing, verify:");
    console.log("1. Proxy address is correct:", LIQUIDUNSTAKEPOOL_PROXY);
    console.log("2. New implementation is correct:", LIQUIDUNSTAKEPOOL_IMPL);
    console.log("3. Proxy admin is correct:", PROXY_ADMIN);
    console.log("4. The new implementation has the latest security fixes");

    // Generate verification script
    const verificationScript = `
// Verification commands to run AFTER upgrade:
// 1. Verify the upgrade was successful:
const liquidPool = await ethers.getContractAt("LiquidUnstakePool", "${LIQUIDUNSTAKEPOOL_PROXY}");
console.log("Contract accessible:", await liquidPool.totalAssets());

// 2. Check implementation address:
const proxyAdmin = await ethers.getContractAt("IProxyAdmin", "${PROXY_ADMIN}");
const currentImpl = await proxyAdmin.getProxyImplementation("${LIQUIDUNSTAKEPOOL_PROXY}");
console.log("Current implementation:", currentImpl);
console.log("Expected implementation:", "${LIQUIDUNSTAKEPOOL_IMPL}");
console.log("Upgrade successful:", currentImpl.toLowerCase() === "${LIQUIDUNSTAKEPOOL_IMPL}".toLowerCase());
`;

    console.log("\n🧪 Post-Upgrade Verification Script:");
    console.log(verificationScript);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
