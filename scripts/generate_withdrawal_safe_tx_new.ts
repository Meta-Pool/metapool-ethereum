import { ethers } from "hardhat";
import { readFileSync } from "fs";

async function main() {
    console.log("Generating Safe transaction for Withdrawal upgrade...");

    // Read current deployment addresses
    const deploys = JSON.parse(readFileSync("./deploys.json", "utf8"));
    const WITHDRAWAL_PROXY = deploys.ethereum.WithdrawalProxy;
    const WITHDRAWAL_IMPL = deploys.ethereum.WithdrawalImpl;
    const PROXY_ADMIN = deploys.ethereum.MultisigProxyAdmin;

    console.log("Withdrawal Proxy:", WITHDRAWAL_PROXY);
    console.log("New Withdrawal Implementation:", WITHDRAWAL_IMPL);
    console.log("Proxy Admin:", PROXY_ADMIN);

    // Get ProxyAdmin interface
    const proxyAdminAbi = [
        "function upgrade(address proxy, address implementation) external"
    ];

    const proxyAdminInterface = new ethers.utils.Interface(proxyAdminAbi);

    // Encode the upgrade call
    const upgradeCalldata = proxyAdminInterface.encodeFunctionData("upgrade", [
        WITHDRAWAL_PROXY,
        WITHDRAWAL_IMPL
    ]);

    console.log("\n📋 Safe Transaction Parameters for Withdrawal Upgrade:");
    console.log("=====================================================");
    console.log("Contract Address (To):", PROXY_ADMIN);
    console.log("Value:", "0");
    console.log("Function:", "upgrade(address,address)");
    console.log("Parameters:");
    console.log("  - proxy:", WITHDRAWAL_PROXY);
    console.log("  - implementation:", WITHDRAWAL_IMPL);
    console.log("");
    console.log("Encoded Data:", upgradeCalldata);
    console.log("");

    console.log("📝 Safe Wallet UI Steps:");
    console.log("========================");
    console.log("1. Go to https://app.safe.global/");
    console.log("2. Connect to your Safe multisig");
    console.log("3. Click 'New Transaction' → 'Contract Interaction'");
    console.log("4. Enter the following:");
    console.log("   - Contract Address:", PROXY_ADMIN);
    console.log("   - Value: 0");
    console.log("   - Method: upgrade");
    console.log("   - proxy (address):", WITHDRAWAL_PROXY);
    console.log("   - implementation (address):", WITHDRAWAL_IMPL);
    console.log("5. Review and submit the transaction");
    console.log("6. Collect signatures from other Safe owners");
    console.log("7. Execute the transaction");
    console.log("");

    console.log("⚠️  PRE-EXECUTION VERIFICATION:");
    console.log("==============================");
    console.log("Before executing, verify:");
    console.log("✓ Proxy address is correct:", WITHDRAWAL_PROXY);
    console.log("✓ New implementation is correct:", WITHDRAWAL_IMPL);
    console.log("✓ Proxy admin is correct:", PROXY_ADMIN);
    console.log("✓ The new implementation maintains paused state");
    console.log("✓ All functions (requestWithdraw, completeWithdraw) remain paused");

    // Generate verification script
    const verificationScript = `
// Post-upgrade verification commands:
const withdrawal = await ethers.getContractAt("Withdrawal", "${WITHDRAWAL_PROXY}");

// 1. Test that completeWithdraw is still paused:
try {
  await withdrawal.callStatic.completeWithdraw();
  console.log("❌ ERROR: completeWithdraw should be paused!");
} catch (e) {
  console.log("✅ completeWithdraw properly paused:", e.message);
}

// 2. Check implementation address:
const proxyAdmin = await ethers.getContractAt("IProxyAdmin", "${PROXY_ADMIN}");
const currentImpl = await proxyAdmin.getProxyImplementation("${WITHDRAWAL_PROXY}");
console.log("Current implementation:", currentImpl);
console.log("Expected implementation:", "${WITHDRAWAL_IMPL}");
console.log("Upgrade successful:", currentImpl.toLowerCase() === "${WITHDRAWAL_IMPL}".toLowerCase());

// 3. Check contract state:
console.log("Total pending withdraw:", ethers.utils.formatEther(await withdrawal.totalPendingWithdraw()));
console.log("Current epoch:", (await withdrawal.getEpoch()).toString());
`;

    console.log("\n🧪 Post-Upgrade Verification Script:");
    console.log("===================================");
    console.log(verificationScript);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
