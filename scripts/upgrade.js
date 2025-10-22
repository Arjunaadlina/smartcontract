const { ethers, upgrades } = require("hardhat");

// Ganti dengan proxy address hasil deploy pertama
const PROXY_ADDRESS = "0xYourProxyAddressHere";

async function main() {
  console.log("🚀 Upgrading CreativeSupplyChainNFT to V2...");

  const CreativeSupplyChainNFTV2 = await ethers.getContractFactory("CreativeSupplyChainNFTV2");
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, CreativeSupplyChainNFTV2);

  console.log("✅ Upgrade successful!");
  console.log("Proxy address (tetap sama):", upgraded.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Upgrade failed:", error);
    process.exit(1);
  });
