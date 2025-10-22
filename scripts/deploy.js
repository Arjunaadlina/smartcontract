const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Deploying upgradeable CreativeSupplyChainNFT...");
  console.log("Network:", hre.network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  const CreativeSupplyChainNFT = await ethers.getContractFactory("CreativeSupplyChainNFT");

  console.log("\n⏳ Deploying proxy contract...");
  const nftProxy = await upgrades.deployProxy(CreativeSupplyChainNFT, [], {
    initializer: "initialize",
  });

  await nftProxy.waitForDeployment();
  const proxyAddress = await nftProxy.getAddress();

  console.log("\n✅ Proxy deployed to:", proxyAddress);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${proxyAddress}`);

  // Wait for confirmations
  if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
    console.log("\n⏳ Waiting for 6 block confirmations...");
    const receipt = await nftProxy.deploymentTransaction().wait(6);
    console.log("✅ Confirmed in block:", receipt.blockNumber);
  }

  console.log("\n🎉 Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
