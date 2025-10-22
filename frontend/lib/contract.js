export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

export const CONTRACT_ABI = [
  // Mint Functions
  "function mintArtwork(string memory tokenURI, string memory creatorName, uint256 price) public returns (uint256)",
  
  // Sale Management Functions
  "function listForSale(uint256 tokenId, uint256 price) public",
  "function unlistFromSale(uint256 tokenId) public",
  "function buyArtwork(uint256 tokenId) public payable",
  "function updatePrice(uint256 tokenId, uint256 newPrice) public",
  
  // View Functions
  "function getArtworkInfo(uint256 tokenId) public view returns (address, string, uint256, uint256, bool, address)",
  "function getOwnershipHistory(uint256 tokenId) public view returns (tuple(address owner, uint256 timestamp, uint256 price, uint256 platformFee, uint256 creatorRoyalty)[])",
  "function getCreatorRoyalties(address creator) public view returns (uint256)",
  "function getTotalSupply() public view returns (uint256)",
  "function tokenURI(uint256 tokenId) public view returns (string)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  
  // Public Variables
  "function platformFeePercentage() public view returns (uint256)",
  "function creatorRoyaltyPercentage() public view returns (uint256)",
  "function totalPlatformFees() public view returns (uint256)",
  "function creatorRoyalties(address) public view returns (uint256)",
  
  // Owner Functions
  "function withdrawPlatformFees() public",
  "function updatePlatformFee(uint256 newFeePercentage) public",
  "function updateCreatorRoyalty(uint256 newRoyaltyPercentage) public",
  
  // Events
  "event ArtworkMinted(uint256 indexed tokenId, address indexed creator, string creatorName, string tokenURI, uint256 price)",
  "event ArtworkSold(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price, uint256 platformFee, uint256 creatorRoyalty)",
  "event ArtworkListedForSale(uint256 indexed tokenId, uint256 price)",
  "event ArtworkUnlisted(uint256 indexed tokenId)",
  "event RoyaltyPaid(uint256 indexed tokenId, address indexed creator, uint256 amount)"
];