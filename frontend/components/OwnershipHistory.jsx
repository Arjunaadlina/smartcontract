'use client';

import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import { X, Briefcase, Palette, User, Package, Calendar, TrendingUp, DollarSign } from 'lucide-react';

export default function OwnershipHistory({ tokenId, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [artworkInfo, setArtworkInfo] = useState(null);
  const [totalStats, setTotalStats] = useState({
    totalPlatformFees: 0,
    totalCreatorRoyalties: 0,
    totalVolume: 0
  });

  const modalRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, [tokenId]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const loadHistory = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // Load artwork info
      const info = await contract.getArtworkInfo(tokenId);
      setArtworkInfo({
        originalCreator: info[0],
        creatorName: info[1]
      });

      // Load ownership history
      const historyData = await contract.getOwnershipHistory(tokenId);
      
      const records = historyData.map((record) => ({
        owner: record.owner,
        timestamp: Number(record.timestamp),
        price: ethers.formatEther(record.price),
        platformFee: ethers.formatEther(record.platformFee),
        creatorRoyalty: ethers.formatEther(record.creatorRoyalty)
      }));

      // Filter: Gabungkan address yang sama berturut-turut, ambil yang tertua
      const filteredRecords = [];
      for (let i = 0; i < records.length; i++) {
        const currentRecord = records[i];
        
        if (i < records.length - 1 && 
            records[i + 1].owner.toLowerCase() === currentRecord.owner.toLowerCase()) {
          continue;
        }
        
        filteredRecords.push(currentRecord);
      }

      // Calculate total stats
      let totalPlatformFees = 0;
      let totalCreatorRoyalties = 0;
      let totalVolume = 0;

      records.forEach(record => {
        totalPlatformFees += parseFloat(record.platformFee);
        totalCreatorRoyalties += parseFloat(record.creatorRoyalty);
        if (parseFloat(record.price) > 0) {
          totalVolume += parseFloat(record.price);
        }
      });

      setTotalStats({
        totalPlatformFees,
        totalCreatorRoyalties,
        totalVolume
      });

      setHistory(filteredRecords);
    } catch (error) {
      console.error('Error loading history:', error);
    }
    setLoading(false);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEth = (value) => {
    return parseFloat(value).toFixed(6);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#4E56C0]">
              Riwayat Kepemilikan NFT #{tokenId}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={28} />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#9B5DE0] border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Memuat riwayat...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Tidak ada riwayat</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Financial Summary - Platform & Creator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Platform Fees */}
                <div className="bg-[#9B5DE0] rounded-xl p-4 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase size={24} />
                    <h3 className="font-semibold text-sm">Total Platform Fee (Admin)</h3>
                  </div>
                  <p className="text-3xl font-bold">{formatEth(totalStats.totalPlatformFees)} ETH</p>
                  <p className="text-xs opacity-90 mt-1">Fee 1% dari setiap transaksi</p>
                </div>

                {/* Creator Royalties */}
                <div className="bg-[#D78FEE] rounded-xl p-4 text-white shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette size={24} />
                    <h3 className="font-semibold text-sm">Total Royalty Creator</h3>
                  </div>
                  <p className="text-3xl font-bold">{formatEth(totalStats.totalCreatorRoyalties)} ETH</p>
                </div>
              </div>

              {/* Creator Info */}
              {artworkInfo && (
                <div className="bg-[#F3E8FF] border-2 border-[#D78FEE] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Palette size={20} className="text-[#9B5DE0]" />
                    <h3 className="font-bold text-[#4E56C0]">Pembuat Asli NFT</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Nama:</strong> {artworkInfo.creatorName}
                  </p>
                  <p className="text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded">
                    {artworkInfo.originalCreator}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp size={14} className="text-[#9B5DE0]" />
                    <p className="text-xs text-[#4E56C0]">
                      Creator mendapat royalty setiap kali NFT ini dijual oleh pemilik lain
                    </p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="relative">
                {history.map((record, index) => {
                  const hasPlatformFee = parseFloat(record.platformFee) > 0;
                  const hasRoyalty = parseFloat(record.creatorRoyalty) > 0;
                  
                  return (
                    <div key={index} className="relative pl-8 pb-8 last:pb-0">
                      {/* Timeline line */}
                      {index < history.length - 1 && (
                        <div className="absolute left-2 top-8 bottom-0 w-0.5 bg-[#D78FEE]"></div>
                      )}

                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-1 w-4 h-4 rounded-full ${
                        index === 0 
                          ? 'bg-[#9B5DE0]' 
                          : 'bg-[#D78FEE]'
                      }`}></div>

                      {/* Content */}
                      <div className={`rounded-lg p-4 ${
                        index === 0 
                          ? 'bg-[#F3E8FF] border-2 border-[#9B5DE0]' 
                          : 'bg-gray-50 border border-gray-200'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                                index === 0 
                                  ? 'bg-[#9B5DE0] text-white' 
                                  : index === history.length - 1
                                  ? 'bg-[#4E56C0] text-white'
                                  : 'bg-[#D78FEE] text-white'
                              }`}>
                                {index === history.length - 1 ? (
                                  <>
                                    <Palette size={14} />
                                    Pembuat Asli
                                  </>
                                ) : index === 0 ? (
                                  <>
                                    <User size={14} />
                                    Pemilik Saat Ini
                                  </>
                                ) : (
                                  <>
                                    <Package size={14} />
                                    Transfer #{history.length - index - 1}
                                  </>
                                )}
                              </span>
                            </div>
                            
                            <p className="font-mono text-sm text-gray-800">
                              {record.owner.substring(0, 10)}...{record.owner.substring(34)}
                            </p>
                          </div>

                          {parseFloat(record.price) > 0 && (
                            <div className="text-right">
                              <p className="text-xs text-gray-600">Harga Jual</p>
                              <p className="font-bold text-[#9B5DE0] text-lg">
                                {record.price} ETH
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Fee & Royalty Breakdown */}
                        {(hasPlatformFee || hasRoyalty) && (
                          <div className="bg-white rounded-lg p-3 mb-3 space-y-2 border border-gray-200">
                            <div className="flex items-center gap-1 mb-2">
                              <DollarSign size={14} className="text-gray-700" />
                              <p className="text-xs font-semibold text-gray-700">Distribusi Pembayaran:</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {hasPlatformFee && (
                                <div className="bg-[#F3E8FF] border border-[#9B5DE0] rounded px-2 py-1">
                                  <p className="text-[#9B5DE0] font-medium">Platform Fee (1%)</p>
                                  <p className="font-bold text-[#4E56C0]">{formatEth(record.platformFee)} ETH</p>
                                </div>
                              )}
                              
                              {hasRoyalty && (
                                <div className="bg-[#FDF4FF] border border-[#D78FEE] rounded px-2 py-1">
                                  <p className="text-[#D78FEE] font-medium">Creator Royalty (1%)</p>
                                  <p className="font-bold text-[#9B5DE0]">{formatEth(record.creatorRoyalty)} ETH</p>
                                </div>
                              )}
                              
                              {parseFloat(record.price) > 0 && (
                                <div className="bg-[#E8EEFF] border border-[#4E56C0] rounded px-2 py-1 col-span-2">
                                  <p className="text-[#4E56C0] font-medium">Seller Received (98%)</p>
                                  <p className="font-bold text-[#9B5DE0]">
                                    {formatEth(
                                      parseFloat(record.price) - 
                                      parseFloat(record.platformFee) - 
                                      parseFloat(record.creatorRoyalty)
                                    )} ETH
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar size={14} />
                          {formatDate(record.timestamp)}
                        </div>

                        {index === history.length - 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-start gap-1">
                              <TrendingUp size={14} className="text-[#9B5DE0] mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-600">
                                Ini adalah alamat wallet pembuat asli NFT. Informasi ini tercatat permanen di blockchain.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overall Summary */}
              <div className="bg-[#4E56C0] rounded-lg p-4 text-white">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <TrendingUp size={20} />
                  <h3 className="font-bold text-center">Ringkasan Keseluruhan</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{history.length}</p>
                    <p className="text-xs opacity-90">Unique Owners</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {history.filter(r => parseFloat(r.price) > 0).length}
                    </p>
                    <p className="text-xs opacity-90">Transaksi Jual</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatEth(totalStats.totalVolume)}
                    </p>
                    <p className="text-xs opacity-90">Total Volume (ETH)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}