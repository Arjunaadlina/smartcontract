const hre = require("hardhat");

async function main() {
  console.log("Deploying CreativeSupplyChainNFT contract...");

  const CreativeSupplyChainNFT = await hre.ethers.getContractFactory("CreativeSupplyChainNFT");
  const nftContract = await CreativeSupplyChainNFT.deploy();

  await nftContract.waitForDeployment();

  const contractAddress = await nftContract.getAddress();
  
  console.log("CreativeSupplyChainNFT deployed to:", contractAddress);
  console.log("\nSave this address to your .env file:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`);
  
  console.log("\nWaiting for block confirmations...");
  await nftContract.deploymentTransaction().wait(6);
  
  console.log("\nVerifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("Contract verified successfully!");
  } catch (error) {
    console.log("Verification failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });