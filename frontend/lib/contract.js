// lib/contract.js
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

export const CONTRACT_ABI = [
  // ==================== MINT FUNCTIONS ====================
  // Mint function lama (backward compatible)
  "function mintArtwork(string memory tokenURI, string memory creatorName, uint256 price) public returns (uint256)",
  
  // Mint function baru dengan custom royalty
  "function mintArtworkWithRoyalty(string memory tokenURI, string memory creatorName, uint256 price, uint256 royaltyPercentage) public returns (uint256)",
  
  // ==================== SALE MANAGEMENT ====================
  "function listForSale(uint256 tokenId, uint256 price) public",
  "function unlistFromSale(uint256 tokenId) public",
  "function buyArtwork(uint256 tokenId) public payable",
  "function updatePrice(uint256 tokenId, uint256 newPrice) public",
  
  // ==================== AUCTION FUNCTIONS ====================
  // Create auction
  "function createAuction(uint256 tokenId, uint256 startPrice, uint256 durationInHours) public",
  
  // Place bid
  "function placeBid(uint256 tokenId) public payable",
  
  // End auction (bisa dipanggil siapa saja setelah auction berakhir)
  "function endAuction(uint256 tokenId) public",
  
  // Cancel auction (hanya bisa jika belum ada bid)
  "function cancelAuction(uint256 tokenId) public",
  
  // ==================== VIEW FUNCTIONS ====================
  // Basic artwork info (backward compatible)
  "function getArtworkInfo(uint256 tokenId) public view returns (address, string, uint256, uint256, bool, address)",
  
  // Artwork info dengan royalty (fungsi baru)
  "function getArtworkInfoWithRoyalty(uint256 tokenId) public view returns (address, string, uint256, uint256, bool, address, uint256)",
  
  // Auction info
  "function getAuctionInfo(uint256 tokenId) public view returns (address seller, uint256 startPrice, uint256 currentBid, address highestBidder, uint256 endTime, bool active, uint256 timeRemaining)",
  
  // Ownership history (backward compatible)
  "function getOwnershipHistory(uint256 tokenId) public view returns (tuple(address owner, uint256 timestamp, uint256 price, uint256 platformFee, uint256 creatorRoyalty)[])",
  
  // Ownership history dengan sale type
  "function getOwnershipHistoryWithType(uint256 tokenId) public view returns (tuple(address owner, uint256 timestamp, uint256 price, uint256 platformFee, uint256 creatorRoyalty)[], string[])",
  
  // Creator royalties
  "function getCreatorRoyalties(address creator) public view returns (uint256)",
  
  // Token functions
  "function getTotalSupply() public view returns (uint256)",
  "function tokenURI(uint256 tokenId) public view returns (string)",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  
  // ==================== PUBLIC VARIABLES ====================
  "function platformFeePercentage() public view returns (uint256)",
  "function creatorRoyaltyPercentage() public view returns (uint256)",
  "function totalPlatformFees() public view returns (uint256)",
  "function creatorRoyalties(address) public view returns (uint256)",
  "function tokenRoyaltyPercentage(uint256) public view returns (uint256)",
  
  // Auction storage
  "function auctions(uint256) public view returns (address seller, uint256 startPrice, uint256 currentBid, address highestBidder, uint256 endTime, bool active)",
  
  // Constants
  "function PERCENTAGE_BASE() public view returns (uint256)",
  "function MAX_ROYALTY() public view returns (uint256)",
  
  // ==================== OWNER FUNCTIONS ====================
  "function withdrawPlatformFees() public",
  "function updatePlatformFee(uint256 newFeePercentage) public",
  
  // ==================== EVENTS ====================
  // Mint events
  "event ArtworkMinted(uint256 indexed tokenId, address indexed creator, string creatorName, string tokenURI, uint256 price, uint256 royaltyPercentage)",
  
  // Sale events
  "event ArtworkSold(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price, uint256 platformFee, uint256 creatorRoyalty, string saleType)",
  "event ArtworkListedForSale(uint256 indexed tokenId, uint256 price)",
  "event ArtworkUnlisted(uint256 indexed tokenId)",
  "event RoyaltyPaid(uint256 indexed tokenId, address indexed creator, uint256 amount)",
  
  // Auction events
  "event AuctionCreated(uint256 indexed tokenId, address indexed seller, uint256 startPrice, uint256 endTime)",
  "event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount)",
  "event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 finalPrice)",
  "event AuctionCancelled(uint256 indexed tokenId)"
];

// Helper constants
export const PERCENTAGE_BASE = 10000;
export const MAX_ROYALTY = 2000; // 20%

/**
 * Helper function untuk format address
 */
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(38)}`;
};

/**
 * Helper function untuk format time remaining
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return 'Ended';
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Helper function untuk calculate minimum bid
 */
export const calculateMinBid = (currentBid, startPrice) => {
  if (currentBid > 0) {
    // +5% dari current bid
    return currentBid * BigInt(105) / BigInt(100);
  }
  return startPrice;
};

/**
 * Helper function untuk check if auction ended
 */
export const isAuctionEnded = (endTime) => {
  return Date.now() >= endTime * 1000;
};

/**
 * Helper function untuk format royalty percentage
 */
export const formatRoyaltyPercentage = (percentage) => {
  // percentage dalam basis 10000
  // 100 = 1%, 1000 = 10%
  return (percentage / 100).toFixed(2) + '%';
};