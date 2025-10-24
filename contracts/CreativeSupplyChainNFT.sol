// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract CreativeSupplyChainNFT is 
    Initializable,
    ERC721URIStorageUpgradeable, 
    OwnableUpgradeable,
    UUPSUpgradeable 
{
    uint256 private _tokenIds;

    // ✅ JANGAN UBAH: Struktur ownership record LAMA (untuk compatibility)
    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
        uint256 price;
        uint256 platformFee;
        uint256 creatorRoyalty;
    }

    // ✅ JANGAN UBAH: Struktur artwork info LAMA
    struct ArtworkInfo {
        address originalCreator;
        string creatorName;
        uint256 creationTimestamp;
        uint256 currentPrice;
        bool isForSale;
    }

    // ✅ JANGAN UBAH: Mapping yang sudah ada (urutan harus sama!)
    mapping(uint256 => ArtworkInfo) public artworkInfo;
    mapping(uint256 => OwnershipRecord[]) public ownershipHistory;
    mapping(address => uint256) public creatorRoyalties;

    // ✅ JANGAN HAPUS: Variable lama harus tetap ada (meski tidak dipakai)
    uint256 public platformFeePercentage;
    uint256 public creatorRoyaltyPercentage; // ← TETAP ADA, tapi tidak dipakai lagi
    uint256 public constant PERCENTAGE_BASE = 10000;
    uint256 public totalPlatformFees;

    // ✅ TAMBAHKAN DI AKHIR: Variable baru harus setelah variable lama
    // Struct baru untuk auction
    struct Auction {
        address seller;
        uint256 startPrice;
        uint256 currentBid;
        address highestBidder;
        uint256 endTime;
        bool active;
    }
    
    // Mapping tokenId ke custom royalty percentage (basis 10000)
    mapping(uint256 => uint256) public tokenRoyaltyPercentage;
    
    // Mapping tokenId ke auction info
    mapping(uint256 => Auction) public auctions;
    
    // Mapping untuk sale type tracking (untuk backward compatibility)
    mapping(uint256 => mapping(uint256 => string)) public ownershipSaleType;
    
    // Constants baru
    uint256 public constant MAX_ROYALTY = 2000; // Max 20%

    // Events (events tidak masalah ditambah/ubah)
    event ArtworkMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string creatorName,
        string tokenURI,
        uint256 price,
        uint256 royaltyPercentage
    );

    event ArtworkSold(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 price,
        uint256 platformFee,
        uint256 creatorRoyalty,
        string saleType
    );

    event ArtworkListedForSale(uint256 indexed tokenId, uint256 price);
    event ArtworkUnlisted(uint256 indexed tokenId);
    event RoyaltyPaid(uint256 indexed tokenId, address indexed creator, uint256 amount);

    event AuctionCreated(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 startPrice,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed tokenId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionEnded(
        uint256 indexed tokenId,
        address indexed winner,
        uint256 finalPrice
    );

    event AuctionCancelled(uint256 indexed tokenId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC721_init("Creative Supply Chain NFT", "CSCNFT");
        __ERC721URIStorage_init();
        __Ownable_init();
        __UUPSUpgradeable_init();

        platformFeePercentage = 100; // 1%
        creatorRoyaltyPercentage = 100; // Default lama (tidak dipakai lagi)
        _tokenIds = 0;
    }

    /**
     * @dev Mint NFT LAMA (untuk backward compatibility)
     */
    function mintArtwork(
        string memory tokenURI,
        string memory creatorName,
        uint256 price
    ) public returns (uint256) {
        // Default royalty 1% untuk mint lama
        return mintArtworkWithRoyalty(tokenURI, creatorName, price, 100);
    }

    /**
     * @dev Mint NFT BARU dengan custom royalty
     */
    function mintArtworkWithRoyalty(
        string memory tokenURI,
        string memory creatorName,
        uint256 price,
        uint256 royaltyPercentage
    ) public returns (uint256) {
        require(royaltyPercentage <= MAX_ROYALTY, "Royalty too high (max 20%)");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        // Simpan informasi artwork (struktur lama)
        artworkInfo[newTokenId] = ArtworkInfo({
            originalCreator: msg.sender,
            creatorName: creatorName,
            creationTimestamp: block.timestamp,
            currentPrice: price,
            isForSale: price > 0
        });

        // Simpan custom royalty di mapping terpisah
        tokenRoyaltyPercentage[newTokenId] = royaltyPercentage;

        // Catat ownership pertama (struktur lama)
        ownershipHistory[newTokenId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            price: 0,
            platformFee: 0,
            creatorRoyalty: 0
        }));
        
        // Track sale type di mapping terpisah
        ownershipSaleType[newTokenId][0] = "mint";

        emit ArtworkMinted(newTokenId, msg.sender, creatorName, tokenURI, price, royaltyPercentage);

        return newTokenId;
    }

    /**
     * @dev List NFT untuk dijual
     */
    function listForSale(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");
        require(!auctions[tokenId].active, "Auction is active");

        artworkInfo[tokenId].currentPrice = price;
        artworkInfo[tokenId].isForSale = true;

        emit ArtworkListedForSale(tokenId, price);
    }

    /**
     * @dev Unlist NFT dari penjualan
     */
    function unlistFromSale(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        artworkInfo[tokenId].isForSale = false;
        emit ArtworkUnlisted(tokenId);
    }

    /**
     * @dev Beli NFT yang sedang dijual
     */
    function buyArtwork(uint256 tokenId) public payable {
        ArtworkInfo storage artwork = artworkInfo[tokenId];
        require(artwork.isForSale, "Artwork not for sale");
        require(msg.value >= artwork.currentPrice, "Insufficient payment");
        require(!auctions[tokenId].active, "Use auction instead");

        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "Cannot buy your own artwork");

        uint256 actualPrice = artwork.currentPrice;
        _processSale(tokenId, seller, msg.sender, actualPrice, "direct");

        // Refund kelebihan pembayaran
        if (msg.value > actualPrice) {
            payable(msg.sender).transfer(msg.value - actualPrice);
        }
    }

    /**
     * @dev Buat auction untuk NFT
     */
    function createAuction(
        uint256 tokenId,
        uint256 startPrice,
        uint256 durationInHours
    ) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(startPrice > 0, "Start price must be greater than 0");
        require(durationInHours > 0 && durationInHours <= 168, "Duration must be 1-168 hours");
        require(!auctions[tokenId].active, "Auction already active");

        uint256 endTime = block.timestamp + (durationInHours * 1 hours);

        auctions[tokenId] = Auction({
            seller: msg.sender,
            startPrice: startPrice,
            currentBid: 0,
            highestBidder: address(0),
            endTime: endTime,
            active: true
        });

        // Unlist dari direct sale
        artworkInfo[tokenId].isForSale = false;

        emit AuctionCreated(tokenId, msg.sender, startPrice, endTime);
    }

    /**
     * @dev Place bid pada auction
     */
    function placeBid(uint256 tokenId) public payable {
        Auction storage auction = auctions[tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.sender != auction.seller, "Seller cannot bid");
        
        uint256 minBid = auction.currentBid == 0 
            ? auction.startPrice 
            : auction.currentBid + (auction.currentBid * 5 / 100);
        
        require(msg.value >= minBid, "Bid too low");

        // Refund bid sebelumnya
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.currentBid);
        }

        auction.currentBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    /**
     * @dev End auction
     */
    function endAuction(uint256 tokenId) public {
        Auction storage auction = auctions[tokenId];
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended yet");

        auction.active = false;

        if (auction.highestBidder != address(0)) {
            _processSale(
                tokenId,
                auction.seller,
                auction.highestBidder,
                auction.currentBid,
                "auction"
            );
            emit AuctionEnded(tokenId, auction.highestBidder, auction.currentBid);
        } else {
            emit AuctionCancelled(tokenId);
        }
    }

    /**
     * @dev Cancel auction
     */
    function cancelAuction(uint256 tokenId) public {
        Auction storage auction = auctions[tokenId];
        require(auction.active, "Auction not active");
        require(auction.seller == msg.sender, "Not the seller");
        require(auction.highestBidder == address(0), "Auction has bids");

        auction.active = false;
        emit AuctionCancelled(tokenId);
    }

    /**
     * @dev Internal function untuk proses penjualan
     */
    function _processSale(
        uint256 tokenId,
        address seller,
        address buyer,
        uint256 price,
        string memory saleType
    ) internal {
        ArtworkInfo storage artwork = artworkInfo[tokenId];

        // Hitung fee dan royalty (gunakan custom royalty per token)
        uint256 platformFee = (price * platformFeePercentage) / PERCENTAGE_BASE;
        uint256 creatorRoyalty = 0;
        
        // Royalty hanya jika bukan penjualan pertama dari creator
        if (seller != artwork.originalCreator) {
            uint256 royaltyPerc = tokenRoyaltyPercentage[tokenId];
            if (royaltyPerc == 0) {
                royaltyPerc = creatorRoyaltyPercentage; // Fallback ke default lama
            }
            creatorRoyalty = (price * royaltyPerc) / PERCENTAGE_BASE;
        }
        
        uint256 sellerAmount = price - platformFee - creatorRoyalty;

        // Transfer NFT
        _transfer(seller, buyer, tokenId);

        // Transfer pembayaran
        payable(seller).transfer(sellerAmount);

        // Transfer royalty
        if (creatorRoyalty > 0) {
            payable(artwork.originalCreator).transfer(creatorRoyalty);
            creatorRoyalties[artwork.originalCreator] += creatorRoyalty;
            emit RoyaltyPaid(tokenId, artwork.originalCreator, creatorRoyalty);
        }

        // Platform fee
        totalPlatformFees += platformFee;

        // Update status
        artwork.isForSale = false;
        artwork.currentPrice = price;

        // Catat ownership baru (struktur lama)
        uint256 historyIndex = ownershipHistory[tokenId].length;
        ownershipHistory[tokenId].push(OwnershipRecord({
            owner: buyer,
            timestamp: block.timestamp,
            price: price,
            platformFee: platformFee,
            creatorRoyalty: creatorRoyalty
        }));
        
        // Track sale type di mapping terpisah
        ownershipSaleType[tokenId][historyIndex] = saleType;

        emit ArtworkSold(tokenId, seller, buyer, price, platformFee, creatorRoyalty, saleType);
    }

    /**
     * @dev Update harga artwork
     */
    function updatePrice(uint256 tokenId, uint256 newPrice) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(newPrice > 0, "Price must be greater than 0");
        require(!auctions[tokenId].active, "Auction is active");
        artworkInfo[tokenId].currentPrice = newPrice;
    }

    /**
     * @dev Get artwork info (backward compatible)
     */
    function getArtworkInfo(uint256 tokenId) public view returns (
        address originalCreator,
        string memory creatorName,
        uint256 creationTimestamp,
        uint256 currentPrice,
        bool isForSale,
        address currentOwner
    ) {
        ArtworkInfo memory artwork = artworkInfo[tokenId];
        return (
            artwork.originalCreator,
            artwork.creatorName,
            artwork.creationTimestamp,
            artwork.currentPrice,
            artwork.isForSale,
            ownerOf(tokenId)
        );
    }

    /**
     * @dev Get artwork info dengan royalty (fungsi baru)
     */
    function getArtworkInfoWithRoyalty(uint256 tokenId) public view returns (
        address originalCreator,
        string memory creatorName,
        uint256 creationTimestamp,
        uint256 currentPrice,
        bool isForSale,
        address currentOwner,
        uint256 royaltyPercentage
    ) {
        ArtworkInfo memory artwork = artworkInfo[tokenId];
        uint256 royalty = tokenRoyaltyPercentage[tokenId];
        if (royalty == 0) {
            royalty = creatorRoyaltyPercentage; // Fallback
        }
        return (
            artwork.originalCreator,
            artwork.creatorName,
            artwork.creationTimestamp,
            artwork.currentPrice,
            artwork.isForSale,
            ownerOf(tokenId),
            royalty
        );
    }

    /**
     * @dev Get auction info
     */
    function getAuctionInfo(uint256 tokenId) public view returns (
        address seller,
        uint256 startPrice,
        uint256 currentBid,
        address highestBidder,
        uint256 endTime,
        bool active,
        uint256 timeRemaining
    ) {
        Auction memory auction = auctions[tokenId];
        uint256 remaining = auction.endTime > block.timestamp 
            ? auction.endTime - block.timestamp 
            : 0;
        
        return (
            auction.seller,
            auction.startPrice,
            auction.currentBid,
            auction.highestBidder,
            auction.endTime,
            auction.active,
            remaining
        );
    }

    /**
     * @dev Get ownership history (backward compatible)
     */
    function getOwnershipHistory(uint256 tokenId) public view returns (OwnershipRecord[] memory) {
        return ownershipHistory[tokenId];
    }

    /**
     * @dev Get ownership history dengan sale type
     */
    function getOwnershipHistoryWithType(uint256 tokenId) public view returns (
        OwnershipRecord[] memory records,
        string[] memory saleTypes
    ) {
        records = ownershipHistory[tokenId];
        saleTypes = new string[](records.length);
        
        for (uint256 i = 0; i < records.length; i++) {
            saleTypes[i] = ownershipSaleType[tokenId][i];
        }
        
        return (records, saleTypes);
    }

    function getCreatorRoyalties(address creator) public view returns (uint256) {
        return creatorRoyalties[creator];
    }

    function getTotalSupply() public view returns (uint256) {
        return _tokenIds;
    }

    function withdrawPlatformFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        totalPlatformFees = 0;
        payable(owner()).transfer(balance);
    }

    function updatePlatformFee(uint256 newFeePercentage) public onlyOwner {
        require(newFeePercentage <= 1000, "Fee too high");
        platformFeePercentage = newFeePercentage;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}
}