// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CreativeSupplyChainNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

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
    }

    // Mapping tokenId ke informasi artwork
    mapping(uint256 => ArtworkInfo) public artworkInfo;
    
    // Mapping tokenId ke array ownership history
    mapping(uint256 => OwnershipRecord[]) public ownershipHistory;

    // Platform fee (2.5%)
    uint256 public platformFeePercentage = 250; // 250 = 2.5%
    uint256 public constant PERCENTAGE_BASE = 10000;

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
        uint256 price
    );

    event ArtworkListedForSale(
        uint256 indexed tokenId,
        uint256 price
    );

    event ArtworkUnlisted(uint256 indexed tokenId);

    constructor() ERC721("Creative Supply Chain NFT", "CSCNFT") {}


    /**
     * @dev Mint NFT baru dengan informasi creator
     */
    function mintArtwork(
        string memory tokenURI,
        string memory creatorName,
        uint256 price
    ) public returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

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
            price: 0 // Mint tidak ada harga
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

        // Hitung fee
        uint256 platformFee = (msg.value * platformFeePercentage) / PERCENTAGE_BASE;
        uint256 sellerAmount = msg.value - platformFee;

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);

        // Transfer pembayaran ke seller
        payable(seller).transfer(sellerAmount);

        // Update status
        artwork.isForSale = false;

        // Catat ownership baru
        ownershipHistory[tokenId].push(OwnershipRecord({
            owner: msg.sender,
            timestamp: block.timestamp,
            price: msg.value
        }));

        emit ArtworkSold(tokenId, seller, msg.sender, msg.value);

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
     * @dev Dapatkan jumlah total NFT yang sudah di-mint
     */
    function getTotalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }

    /**
     * @dev Withdraw platform fee (hanya owner)
     */
    function withdrawPlatformFees() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @dev Update platform fee percentage (hanya owner)
     */
    function updatePlatformFee(uint256 newFeePercentage) public onlyOwner {
        require(newFeePercentage <= 1000, "Fee too high"); // Max 10%
        platformFeePercentage = newFeePercentage;
    }
}