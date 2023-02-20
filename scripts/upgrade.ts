import { ethers, upgrades } from "hardhat";

async function main() {
  const proxy: string = "";
  const implementationName: string = "";
  const implementation = await ethers.getContractFactory(implementationName);
  console.log("Deploying for new implementation");
  const dep = await upgrades.upgradeProxy(proxy, implementation);

  await dep.deployed();
  console.log(
    `Upgraded proxy to implementation ${implementationName}`,
    dep.address
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
