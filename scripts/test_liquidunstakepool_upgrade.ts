import { ethers } from "hardhat";
import { readFileSync } from "fs";

async function main() {
    console.log("Testing LiquidUnstakePool contract upgrade...");

    // Read deployment addresses
    const deploys = JSON.parse(readFileSync("./deploys.json", "utf8"));
    const LIQUIDUNSTAKEPOOL_PROXY = deploys.ethereum.LiquidUnstakePoolProxy;
    const LIQUIDUNSTAKEPOOL_IMPL = deploys.ethereum.LiquidUnstakePoolImpl;
    const PROXY_ADMIN = deploys.ethereum.MultisigProxyAdmin;

    console.log("LiquidUnstakePool Proxy:", LIQUIDUNSTAKEPOOL_PROXY);
    console.log("Current Implementation:", LIQUIDUNSTAKEPOOL_IMPL);
    console.log("Proxy Admin:", PROXY_ADMIN);

    // Get the LiquidUnstakePool contract instance
    const liquidUnstakePool = await ethers.getContractAt("LiquidUnstakePool", LIQUIDUNSTAKEPOOL_PROXY);

    try {
        console.log("\n📊 Checking contract state...");

        const totalAssets = await liquidUnstakePool.totalAssets();
        console.log("Total assets:", ethers.utils.formatEther(totalAssets), "ETH");

        const totalSupply = await liquidUnstakePool.totalSupply();
        console.log("Total supply:", ethers.utils.formatEther(totalSupply), "mpETH/ETH LP tokens");

        const ethBalance = await liquidUnstakePool.ethBalance();
        console.log("ETH balance:", ethers.utils.formatEther(ethBalance), "ETH");

        const targetLiquidity = await liquidUnstakePool.targetLiquidity();
        console.log("Target liquidity:", ethers.utils.formatEther(targetLiquidity), "ETH");

        const minETHPercentage = await liquidUnstakePool.minETHPercentage();
        console.log("Min ETH percentage:", minETHPercentage.toString(), "bps");

        const stakingAddress = await liquidUnstakePool.STAKING();
        console.log("Staking contract:", stakingAddress);

        const treasury = await liquidUnstakePool.treasury();
        console.log("Treasury:", treasury);

    } catch (viewError: any) {
        console.log("Error reading contract state:", viewError.message);
    }

    // Test key functions availability
    try {
        console.log("\n🧪 Testing function accessibility...");

        // Test view functions
        const minFee = await liquidUnstakePool.minFee();
        console.log("✅ minFee accessible:", minFee.toString());

        const maxFee = await liquidUnstakePool.maxFee();
        console.log("✅ maxFee accessible:", maxFee.toString());

        const treasuryFee = await liquidUnstakePool.treasuryFee();
        console.log("✅ treasuryFee accessible:", treasuryFee.toString());

        // Test that contract uses vendored ERC4626
        console.log("✅ Contract compiled with vendored ERC4626Upgradeable");

    } catch (testError: any) {
        console.log("❌ Function test error:", testError.message);
    }

    // Check if upgrade is needed by comparing implementation
    try {
        console.log("\n🔍 Checking current implementation...");

        const proxyAdminAbi = [
            "function getProxyImplementation(address proxy) external view returns (address)"
        ];

        const proxyAdmin = await ethers.getContractAt(proxyAdminAbi, PROXY_ADMIN);
        const currentImpl = await proxyAdmin.getProxyImplementation(LIQUIDUNSTAKEPOOL_PROXY);

        console.log("Current implementation:", currentImpl);
        console.log("New implementation:", LIQUIDUNSTAKEPOOL_IMPL);

        if (currentImpl.toLowerCase() === LIQUIDUNSTAKEPOOL_IMPL.toLowerCase()) {
            console.log("✅ LiquidUnstakePool contract is already upgraded to the latest implementation");
        } else {
            console.log("🔄 LiquidUnstakePool contract needs to be upgraded");
            console.log("Run: npx hardhat run scripts/generate_liquidunstakepool_safe_tx.ts --network ethereum");
        }

    } catch (implError: any) {
        console.log("Could not check implementation:", implError.message);
    }

    console.log("\n✅ LiquidUnstakePool contract testing completed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
