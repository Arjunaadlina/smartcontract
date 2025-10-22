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
    // Ganti CountersUpgradeable dengan uint256 biasa
    uint256 private _tokenIds;

    // Struktur untuk menyimpan informasi creator dan ownership history
    struct ArtworkInfo {
        address originalCreator;
        string creatorName;
        uint256 creationTimestamp;
        uint256 currentPrice;
        bool isForSale;
    }

    // Struktur untuk ownership history
    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
        uint256 price;
        uint256 platformFee;
        uint256 creatorRoyalty;
    }

    // Mapping tokenId ke informasi artwork
    mapping(uint256 => ArtworkInfo) public artworkInfo;
    
    // Mapping tokenId ke array ownership history
    mapping(uint256 => OwnershipRecord[]) public ownershipHistory;

    // Mapping untuk melacak total royalty per creator
    mapping(address => uint256) public creatorRoyalties;

    // Platform fee dan royalty - JANGAN set nilai di sini
    uint256 public platformFeePercentage;
    uint256 public creatorRoyaltyPercentage;
    uint256 public constant PERCENTAGE_BASE = 10000;

    // Total platform fees yang terkumpul
    uint256 public totalPlatformFees;

    // Events
    event ArtworkMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string creatorName,
        string tokenURI,
        uint256 price
    );

    event ArtworkSold(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 price,
        uint256 platformFee,
        uint256 creatorRoyalty
    );

    event ArtworkListedForSale(
        uint256 indexed tokenId,
        uint256 price
    );

    event ArtworkUnlisted(uint256 indexed tokenId);

    event RoyaltyPaid(
        uint256 indexed tokenId,
        address indexed creator,
        uint256 amount
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC721_init("Creative Supply Chain NFT", "CSCNFT");
        __ERC721URIStorage_init();
        __Ownable_init();
        __UUPSUpgradeable_init();

        // Set nilai di sini
        platformFeePercentage = 100; // 1%
        creatorRoyaltyPercentage = 100; // 1%
        _tokenIds = 0;
    }

    /**
     * @dev Mint NFT baru dengan informasi creator
     */
    function mintArtwork(
        string memory tokenURI,
        string memory creatorName,
        uint256 price
    ) public returns (uint256) {
        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        // Simpan informasi artwork
        artworkInfo[newTokenId] = ArtworkInfo({
            originalCreator: msg.sender,
            creatorName: creatorName,
            creationTimestamp: block.timestamp,
            currentPrice: price,
            isForSale: price > 0
        });

        // Catat ownership pertama
        ownershipHistory[newTokenId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            price: 0,
            platformFee: 0,
            creatorRoyalty: 0
        }));

        emit ArtworkMinted(newTokenId, msg.sender, creatorName, tokenURI, price);

        return newTokenId;
    }

    /**
     * @dev List NFT untuk dijual
     */
    function listForSale(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(price > 0, "Price must be greater than 0");

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

        address seller = ownerOf(tokenId);
        require(seller != msg.sender, "Cannot buy your own artwork");

        // Hitung fee dan royalty
        uint256 platformFee = (msg.value * platformFeePercentage) / PERCENTAGE_BASE;
        uint256 creatorRoyalty = 0;
        
        // Royalty hanya dibayarkan jika bukan penjualan pertama dari creator
        if (seller != artwork.originalCreator) {
            creatorRoyalty = (msg.value * creatorRoyaltyPercentage) / PERCENTAGE_BASE;
        }
        
        uint256 sellerAmount = msg.value - platformFee - creatorRoyalty;

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);

        // Transfer pembayaran ke seller
        payable(seller).transfer(sellerAmount);

        // Transfer royalty ke creator (jika ada)
        if (creatorRoyalty > 0) {
            payable(artwork.originalCreator).transfer(creatorRoyalty);
            creatorRoyalties[artwork.originalCreator] += creatorRoyalty;
            emit RoyaltyPaid(tokenId, artwork.originalCreator, creatorRoyalty);
        }

        // Platform fee tetap di contract
        totalPlatformFees += platformFee;

        // Update status
        artwork.isForSale = false;

        // Catat ownership baru
        ownershipHistory[tokenId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            price: msg.value,
            platformFee: platformFee,
            creatorRoyalty: creatorRoyalty
        }));

        emit ArtworkSold(tokenId, seller, msg.sender, msg.value, platformFee, creatorRoyalty);

        // Refund kelebihan pembayaran
        if (msg.value > artwork.currentPrice) {
            payable(msg.sender).transfer(msg.value - artwork.currentPrice);
        }
    }

    /**
     * @dev Update harga artwork
     */
    function updatePrice(uint256 tokenId, uint256 newPrice) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(newPrice > 0, "Price must be greater than 0");

        artworkInfo[tokenId].currentPrice = newPrice;
    }

    /**
     * @dev Dapatkan informasi lengkap artwork
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
     * @dev Dapatkan ownership history
     */
    function getOwnershipHistory(uint256 tokenId) public view returns (OwnershipRecord[] memory) {
        return ownershipHistory[tokenId];
    }

    /**
     * @dev Dapatkan total royalty yang diterima creator
     */
    function getCreatorRoyalties(address creator) public view returns (uint256) {
        return creatorRoyalties[creator];
    }

    /**
     * @dev Dapatkan jumlah total NFT yang sudah di-mint
     */
    function getTotalSupply() public view returns (uint256) {
        return _tokenIds;
    }

    /**
     * @dev Withdraw platform fee (hanya owner)
     */
    function withdrawPlatformFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        totalPlatformFees = 0;
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Update platform fee percentage (hanya owner)
     */
    function updatePlatformFee(uint256 newFeePercentage) public onlyOwner {
        require(newFeePercentage <= 1000, "Fee too high"); // Max 10%
        platformFeePercentage = newFeePercentage;
    }

    /**
     * @dev Update creator royalty percentage (hanya owner)
     */
    function updateCreatorRoyalty(uint256 newRoyaltyPercentage) public onlyOwner {
        require(newRoyaltyPercentage <= 1000, "Royalty too high"); // Max 10%
        creatorRoyaltyPercentage = newRoyaltyPercentage;
    }

    // Required untuk UUPS upgradeable
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}
}