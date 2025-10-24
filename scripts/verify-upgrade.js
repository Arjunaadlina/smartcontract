const { ethers, upgrades, run } = require("hardhat");

async function main() {
  console.log("🚀 Verifying latest implementation...");

  // Alamat proxy kamu
  const proxyAddress = "0xAd6972b4446594318B03939aD646D0952ec57fBc";

  // Dapatkan alamat implementation terbaru
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("📍 Implementation address found:", implementationAddress);

  // Jalankan verifikasi otomatis
  try {
    console.log("\n⏳ Verifying on Etherscan...");
    await run("verify:verify", {
      address: implementationAddress,
    });
    console.log("\n✅ Verification successful!");
  } catch (err) {
    console.log("\n⚠️ Verification failed:", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
