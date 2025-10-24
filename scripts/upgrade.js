// scripts/upgrade.js
const { ethers, upgrades } = require("hardhat");

// ⚠️ GANTI dengan proxy address hasil deploy pertama Anda
const PROXY_ADDRESS = "0xAd6972b4446594318B03939aD646D0952ec57fBc";

async function main() {
  console.log("🚀 Upgrading CreativeSupplyChainNFT...");
  console.log("📍 Current proxy address:", PROXY_ADDRESS);

  // ✅ PERBAIKAN 1: Nama contract yang benar (tanpa V2)
  const CreativeSupplyChainNFT = await ethers.getContractFactory("CreativeSupplyChainNFT");
  
  console.log("⏳ Deploying new implementation...");
  
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, CreativeSupplyChainNFT);
  
  // ✅ PERBAIKAN 2: Gunakan getAddress() untuk ethers v6
  const proxyAddress = await upgraded.getAddress();
  
  // Get implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n✅ Upgrade successful!");
  console.log("📍 Proxy address (tetap sama):", proxyAddress);
  console.log("📍 New implementation address:", implementationAddress);
  
  // ✅ TAMBAHAN: Verify fitur baru berfungsi
  console.log("\n🔍 Verifying new features...");
  
  try {
    const contract = await ethers.getContractAt("CreativeSupplyChainNFT", proxyAddress);
    
    // Test constant baru
    const maxRoyalty = await contract.MAX_ROYALTY();
    console.log("✓ MAX_ROYALTY constant:", maxRoyalty.toString(), "(20%)");
    
    // Test function signature baru
    const platformFee = await contract.platformFeePercentage();
    console.log("✓ Platform fee:", platformFee.toString(), "basis points");
    
    console.log("\n🎉 All checks passed! Contract ready to use.");
    console.log("\n📝 Next steps:");
    console.log("1. Update your frontend ABI with new functions");
    console.log("2. Test minting with custom royalty");
    console.log("3. Test auction features");
    console.log(`4. Keep using the same address in your .env: ${proxyAddress}`);
    
  } catch (error) {
    console.error("⚠️ Verification failed:", error.message);
    console.log("Contract upgraded but verification failed. Please check manually.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Upgrade failed:", error);
    process.exit(1);
  });