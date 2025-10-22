// NFTCard.tsx - Simplified & Elegant Card with Detail Modal
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import OwnershipHistory from './OwnershipHistory';
import { History, LinkIcon } from 'lucide-react';

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export default function NFTCard({ nft, currentAccount, onUpdate }) {
  const [buying, setBuying] = useState(false);
  const [listing, setListing] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  const isOwner = nft.currentOwner.toLowerCase() === currentAccount.toLowerCase();

  const convertIpfsUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '');
      return `${IPFS_GATEWAY}${hash}`;
    }
    return `${IPFS_GATEWAY}${url}`;
  };

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoading(true);
        const metadataUrl = convertIpfsUrl(nft.tokenURI);
        const response = await fetch(metadataUrl);
        if (!response.ok) throw new Error('Failed to fetch metadata');
        
        const metadataJson = await response.json();
        setMetadata(metadataJson);
        
        if (metadataJson.image) {
          const imgUrl = convertIpfsUrl(metadataJson.image);
          setImageUrl(imgUrl);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading metadata:', error);
        setLoading(false);
        const directUrl = convertIpfsUrl(nft.tokenURI);
        setImageUrl(directUrl);
      }
    };
    loadMetadata();
  }, [nft.tokenURI]);

  const buyNFT = async () => {
    setBuying(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.buyArtwork(nft.tokenId, {
        value: ethers.parseEther(nft.currentPrice)
      });
      
      await tx.wait();
      alert('NFT berhasil dibeli!');
      setShowDetail(false);
      onUpdate();
    } catch (error) {
      console.error('Error buying NFT:', error);
      alert('Gagal membeli NFT: ' + (error.message || 'Unknown error'));
    }
    setBuying(false);
  };

  const listForSale = async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) {
      alert('Masukkan harga yang valid');
      return;
    }

    setListing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.listForSale(nft.tokenId, ethers.parseEther(newPrice));
      await tx.wait();
      
      alert('NFT berhasil di-list untuk dijual!');
      setNewPrice('');
      onUpdate();
    } catch (error) {
      console.error('Error listing NFT:', error);
      alert('Gagal list NFT: ' + (error.message || 'Unknown error'));
    }
    setListing(false);
  };

  const unlistFromSale = async () => {
    setListing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.unlistFromSale(nft.tokenId);
      await tx.wait();
      
      alert('NFT berhasil di-unlist!');
      onUpdate();
    } catch (error) {
      console.error('Error unlisting NFT:', error);
      alert('Gagal unlist NFT: ' + (error.message || 'Unknown error'));
    }
    setListing(false);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      {/* Simplified Card */}
      <div 
        onClick={() => setShowDetail(true)}
        className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={metadata?.name || `NFT #${nft.tokenId}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="30" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-6xl">🖼️</div>
            </div>
          )}
          
          {/* Status Badge */}
          {nft.isForSale && (
            <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
              For Sale
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg truncate">
              {metadata?.name || `NFT #${nft.tokenId}`}
            </h3>
            {nft.isForSale && (
              <span className="text-purple-600 font-bold whitespace-nowrap ml-2">
                {nft.currentPrice} ETH
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full"></div>
            <span className="truncate">{nft.creatorName}</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDetail(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image Section */}
              <div className="relative bg-gradient-to-br from-purple-100 to-pink-100 md:max-h-[90vh]">
                <button
                  onClick={() => setShowDetail(false)}
                  className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                >
                  <span className="text-xl">✕</span>
                </button>
                <div className="h-full flex items-center justify-center p-8">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={metadata?.name || `NFT #${nft.tokenId}`}
                      className="w-full h-auto max-h-full object-contain rounded-2xl shadow-2xl"
                    />
                  ) : (
                    <div className="text-8xl">🖼️</div>
                  )}
                </div>
              </div>

              {/* Details Section */}
              <div className="p-8 overflow-y-auto max-h-[90vh]">
                {/* Header */}
                <div className="mb-6">
                  <div className="text-sm text-gray-500 mb-2">Token ID #{nft.tokenId}</div>
                  <h1 className="text-4xl font-bold mb-4">
                    {metadata?.name || `Artwork #${nft.tokenId}`}
                  </h1>
                  
                  {isOwner ? (
                    <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold">
                      <span>👑</span>
                      <span>You own this NFT</span>
                    </div>
                  ) : nft.isForSale ? (
                    <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Available for Sale
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm font-semibold">
                      Not for Sale
                    </div>
                  )}
                </div>

                {/* Description */}
                {metadata?.description && (
                  <div className="mb-6">
                    <div className="text-sm text-gray-500 mb-2">Description</div>
                    <p className="text-gray-700 leading-relaxed">{metadata.description}</p>
                  </div>
                )}

                {/* Price Section */}
                {nft.isForSale && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6">
                    <div className="text-sm text-gray-600 mb-1">Current Price</div>
                    <div className="text-3xl font-bold text-purple-600">{nft.currentPrice} ETH</div>
                  </div>
                )}

                {/* Creator & Owner Info */}
                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-2">Original Creator</div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full"></div>
                      <div>
                        <div className="font-semibold">{nft.creatorName}</div>
                        <div className="text-sm text-gray-500 font-mono">
                          {nft.originalCreator.substring(0, 6)}...{nft.originalCreator.substring(38)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-2">Current Owner</div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-mono text-sm">
                          {nft.currentOwner.substring(0, 6)}...{nft.currentOwner.substring(38)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-sm text-gray-500 mb-1">Created</div>
                    <div className="font-medium">{formatDate(nft.creationTimestamp)}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 mb-6">
                  {isOwner ? (
                    <>
                      {!nft.isForSale ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Set Price (ETH)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step="0.001"
                              placeholder="0.00"
                              value={newPrice}
                              onChange={(e) => setNewPrice(e.target.value)}
                              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                            />
                            <button
                              onClick={listForSale}
                              disabled={listing}
                              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                            >
                              {listing ? '...' : 'List'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={unlistFromSale}
                          disabled={listing}
                          className="w-full bg-red-500 text-white py-4 rounded-xl font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {listing ? 'Processing...' : 'Remove from Sale'}
                        </button>
                      )}
                    </>
                  ) : nft.isForSale ? (
                    <button
                      onClick={buyNFT}
                      disabled={buying}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50"
                    >
                      {buying ? 'Processing...' : `Buy Now for ${nft.currentPrice} ETH`}
                    </button>
                  ) : null}

                  <button
                    onClick={() => setShowHistory(true)}
                    className="flex justify-center items-center gap-2 w-full border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                  <History className="text-black bg-white rounded-full p-1 w-7 h-7" />
                  <p>View Ownership History</p>
                    
                  </button>

                  <a
                    href={convertIpfsUrl(nft.tokenURI)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-2 block w-full text-center border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <LinkIcon className="text-black bg-white rounded-full p-1 w-7 h-7" />
                    <p>View on IPFS</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ownership History Modal */}
      {showHistory && (
        <OwnershipHistory
          tokenId={nft.tokenId}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
}