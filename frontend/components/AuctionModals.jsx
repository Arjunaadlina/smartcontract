// AuctionModals.jsx
'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import { X, Gavel, TrendingUp, Clock, AlertCircle } from 'lucide-react';

/**
 * Modal untuk membuat auction baru
 */
export function CreateAuctionModal({ tokenId, onClose, onSuccess, account }) {
  const [startPrice, setStartPrice] = useState('');
  const [duration, setDuration] = useState('24');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!startPrice || parseFloat(startPrice) <= 0) {
      alert('Masukkan harga awal yang valid');
      return;
    }

    const durationHours = parseInt(duration);
    if (durationHours < 1 || durationHours > 168) {
      alert('Durasi harus antara 1-168 jam (1 minggu)');
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.createAuction(
        tokenId,
        ethers.parseEther(startPrice),
        durationHours,
        { gasLimit: 300000 }
      );

      await tx.wait();
      alert('✅ Auction berhasil dibuat!');
      onSuccess();
    } catch (error) {
      console.error('Error creating auction:', error);
      alert('Gagal membuat auction: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#9B5DE0] to-[#4E56C0] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Gavel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Create Auction</h2>
              <p className="text-purple-100 text-sm">Token #{tokenId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Cara Kerja Auction:</p>
              <ul className="space-y-1 text-xs">
                <li>• Minimum bid berikutnya: +5% dari bid tertinggi</li>
                <li>• Bid sebelumnya akan di-refund otomatis</li>
                <li>• Setelah waktu habis, pemenang harus claim NFT</li>
              </ul>
            </div>
          </div>

          {/* Starting Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Starting Price
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                placeholder="0.00"
                value={startPrice}
                onChange={(e) => setStartPrice(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 focus:border-[#9B5DE0] focus:outline-none text-lg font-semibold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                ETH
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Harga minimum untuk memulai bid
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Auction Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-[#9B5DE0] focus:outline-none font-semibold"
            >
              <option value="1">1 Hour</option>
              <option value="3">3 Hours</option>
              <option value="6">6 Hours</option>
              <option value="12">12 Hours</option>
              <option value="24">24 Hours (1 Day)</option>
              <option value="48">48 Hours (2 Days)</option>
              <option value="72">72 Hours (3 Days)</option>
              <option value="168">168 Hours (1 Week)</option>
            </select>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-500">
                Auction akan berakhir setelah waktu yang dipilih
              </p>
            </div>
          </div>

          {/* Summary */}
          {startPrice && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Starting Price</span>
                <span className="font-bold">{startPrice} ETH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="font-bold">{duration}h</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-600">Min. Next Bid</span>
                <span className="font-bold text-[#9B5DE0]">
                  {(parseFloat(startPrice) * 1.05).toFixed(4)} ETH
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !startPrice}
              className="flex-1 bg-gradient-to-r from-[#9B5DE0] to-[#4E56C0] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Auction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal untuk place bid
 */
export function BidModal({ tokenId, auctionInfo, onClose, onSuccess }) {
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const minBid = auctionInfo.currentBid > 0
    ? parseFloat(ethers.formatEther(auctionInfo.currentBid)) * 1.05
    : parseFloat(ethers.formatEther(auctionInfo.startPrice));

  const handleBid = async () => {
    const amount = parseFloat(bidAmount);
    if (!bidAmount || amount < minBid) {
      alert(`Bid minimal: ${minBid.toFixed(4)} ETH`);
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.placeBid(tokenId, {
        value: ethers.parseEther(bidAmount),
        gasLimit: 300000
      });

      await tx.wait();
      alert('✅ Bid berhasil ditempatkan!');
      onSuccess();
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Gagal place bid: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#9B5DE0] to-[#4E56C0] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Place Bid</h2>
              <p className="text-purple-100 text-sm">Token #{tokenId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Current Status */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">
                {auctionInfo.currentBid > 0 ? 'Current Bid' : 'Starting Price'}
              </span>
              <span className="font-bold text-[#9B5DE0]">
                {auctionInfo.currentBid > 0
                  ? ethers.formatEther(auctionInfo.currentBid)
                  : ethers.formatEther(auctionInfo.startPrice)} ETH
              </span>
            </div>
            {auctionInfo.currentBid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Highest Bidder</span>
                <span className="font-mono text-xs">
                  {auctionInfo.highestBidder.substring(0, 6)}...{auctionInfo.highestBidder.substring(38)}
                </span>
              </div>
            )}
          </div>

          {/* Bid Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Your Bid Amount
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                placeholder={minBid.toFixed(4)}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 focus:border-[#9B5DE0] focus:outline-none text-lg font-semibold"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                ETH
              </span>
            </div>
            <p className="text-xs text-red-600 mt-1 font-semibold">
              Minimum bid: {minBid.toFixed(4)} ETH
            </p>
          </div>

          {/* Quick Bid Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setBidAmount(minBid.toFixed(4))}
              className="border-2 border-[#D78FEE] text-[#9B5DE0] py-2 rounded-lg text-sm font-semibold hover:bg-purple-50 transition-colors"
            >
              Min Bid
            </button>
            <button
              onClick={() => setBidAmount((minBid * 1.1).toFixed(4))}
              className="border-2 border-[#D78FEE] text-[#9B5DE0] py-2 rounded-lg text-sm font-semibold hover:bg-purple-50 transition-colors"
            >
              +10%
            </button>
            <button
              onClick={() => setBidAmount((minBid * 1.2).toFixed(4))}
              className="border-2 border-[#D78FEE] text-[#9B5DE0] py-2 rounded-lg text-sm font-semibold hover:bg-purple-50 transition-colors"
            >
              +20%
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-semibold mb-1">Catatan Penting:</p>
              <ul className="space-y-1">
                <li>• Jika ada bid lebih tinggi, ETH Anda akan di-refund otomatis</li>
                <li>• Jika menang, Anda harus claim NFT setelah auction berakhir</li>
              </ul>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBid}
              disabled={loading || !bidAmount || parseFloat(bidAmount) < minBid}
              className="flex-1 bg-gradient-to-r from-[#9B5DE0] to-[#4E56C0] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Placing Bid...' : (
                <>
                  <Gavel className="w-5 h-5" />
                  Place Bid
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Button untuk end auction
 */
export function EndAuctionButton({ tokenId, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleEnd = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.endAuction(tokenId, { gasLimit: 500000 });
      await tx.wait();

      alert('✅ Auction berhasil diselesaikan!');
      onSuccess();
    } catch (error) {
      console.error('Error ending auction:', error);
      alert('Gagal menyelesaikan auction: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleEnd}
      disabled={loading}
      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? 'Processing...' : (
        <>
          <Gavel className="w-5 h-5" />
          Complete Auction
        </>
      )}
    </button>
  );
}