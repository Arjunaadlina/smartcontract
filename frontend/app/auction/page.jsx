'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import NFTCard from '@/components/NFTCards';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import Image from 'next/image';
import { Gavel, RefreshCcw, Timer, Wallet } from 'lucide-react';

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

export default function AuctionPage() {
  const [account, setAccount] = useState('');
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Load auctions on mount (tanpa perlu login)
  useEffect(() => {
    loadAuctions();
    checkWalletConnection();
    
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('chainChanged', () => window.location.reload());
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) setAccount(accounts[0]);
        else setAccount('');
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('chainChanged');
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  // Listen to auction events
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;

    const setupEventListeners = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

        contract.on('AuctionCreated', (tokenId) => {
          console.log('🔨 Auction Created:', tokenId.toString());
          loadAuctions();
        });

        contract.on('BidPlaced', (tokenId) => {
          console.log('💰 Bid Placed:', tokenId.toString());
          loadAuctions();
        });

        contract.on('AuctionEnded', (tokenId) => {
          console.log('✅ Auction Ended:', tokenId.toString());
          loadAuctions();
        });

        contract.on('AuctionCancelled', (tokenId) => {
          console.log('❌ Auction Cancelled:', tokenId.toString());
          loadAuctions();
        });

        return () => {
          contract.removeAllListeners();
        };
      } catch (error) {
        console.error('Error setting up event listeners:', error);
      }
    };

    const cleanup = setupEventListeners();
    
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, []);

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
      setNetworkError('');
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/jqxs4FDAjl-R22YGcIFIp'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
          setNetworkError('');
          return true;
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError);
          setNetworkError('Gagal menambahkan Sepolia network');
          return false;
        }
      } else {
        console.error('Error switching to Sepolia:', switchError);
        setNetworkError('Gagal switch ke Sepolia network');
        return false;
      }
    }
  };

  const checkNetwork = async (provider) => {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    if (chainId !== SEPOLIA_CHAIN_ID_DECIMAL) {
      setNetworkError(`⚠️ Anda terhubung ke network yang salah. Silakan switch ke Sepolia Testnet.`);
      return false;
    }
    
    setNetworkError('');
    return true;
  };

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const isCorrectNetwork = await checkNetwork(provider);
          if (isCorrectNetwork) {
            setAccount(accounts[0].address);
          } else {
            await switchToSepolia();
            setAccount(accounts[0].address);
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const switched = await switchToSepolia();
        
        if (!switched) {
          alert('Mohon switch ke Sepolia Testnet untuk melanjutkan');
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        const isCorrectNetwork = await checkNetwork(provider);
        
        if (isCorrectNetwork) {
          setAccount(address);
          console.log('✅ Connected to Sepolia:', address);
        } else {
          alert('Mohon switch ke Sepolia Testnet');
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Gagal menghubungkan wallet');
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  const loadAuctions = async () => {
    if (!refreshing) {
      setLoading(true);
    }
    setRefreshing(true);
    
    try {
      // Gunakan public RPC provider untuk read-only access
      const provider = new ethers.JsonRpcProvider(
        'https://eth-sepolia.g.alchemy.com/v2/jqxs4FDAjl-R22YGcIFIp'
      );
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const totalSupply = await contract.getTotalSupply();
      const auctionList = [];

      console.log(`📊 Checking ${totalSupply} NFTs for active auctions...`);

      for (let i = 1; i <= Number(totalSupply); i++) {
        try {
          const tokenURI = await contract.tokenURI(i);
          const artworkInfo = await contract.getArtworkInfo(i);
          const auctionInfo = await contract.getAuctionInfo(i);
          
          // Filter: Hanya tampilkan NFT yang sedang di-auction
          if (auctionInfo.active) {
            auctionList.push({
              tokenId: i,
              tokenURI,
              originalCreator: artworkInfo[0],
              creatorName: artworkInfo[1],
              creationTimestamp: Number(artworkInfo[2]),
              currentPrice: ethers.formatEther(artworkInfo[3]),
              isForSale: artworkInfo[4],
              currentOwner: artworkInfo[5],
              // Auction specific data
              auctionActive: true,
              auctionStartPrice: auctionInfo.startPrice,
              auctionCurrentBid: auctionInfo.currentBid,
              auctionHighestBidder: auctionInfo.highestBidder,
              auctionEndTime: Number(auctionInfo.endTime),
              auctionTimeRemaining: Number(auctionInfo.timeRemaining)
            });
          }
        } catch (error) {
          console.error(`Error loading NFT ${i}:`, error);
        }
      }

      // Sort by time remaining (ending soon first)
      auctionList.sort((a, b) => a.auctionTimeRemaining - b.auctionTimeRemaining);

      console.log(`✅ Found ${auctionList.length} active auctions`);
      setAuctions(auctionList);
    } catch (error) {
      console.error('Error loading auctions:', error);
    }
    setLoading(false);
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-white">

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#9B5DE0] border-t-transparent mb-4"></div>
              <p className="text-gray-600">Loading auctions...</p>
            </div>
          </div>
        ) : auctions.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-8xl mb-6">
                <Gavel className="mx-auto text-gray-400" width={100} height={100} />
              </div>
              <h2 className="text-3xl font-bold mb-4">No Active Auctions</h2>
              <p className="text-gray-600 mb-8">
                There are no active auctions at the moment. Check back later or create your own auction!
              </p>
              {account ? (
                <a
                  href="/profile"
                  className="inline-block bg-gradient-to-r from-[#9B5DE0] to-[#D78FEE] text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  Create Auction
                </a>
              ) : (
                <button
                  onClick={connectWallet}
                  className="inline-block bg-gradient-to-r from-[#9B5DE0] to-[#4E56C0] text-white px-8 py-3 rounded-xl font-semibold hover:shadow-xl transition-all"
                >
                  Connect Wallet to Create
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-gray-600">
                  {auctions.length} active auction{auctions.length !== 1 ? 's' : ''}
                  {refreshing && <span className="ml-2 text-[#9B5DE0] animate-pulse">• updating...</span>}
                </p>
              </div>
              <button 
                onClick={loadAuctions}
                disabled={refreshing}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              >
                <span className={`${refreshing ? 'animate-spin' : ''} cursor-pointer`}>
                  <RefreshCcw />
                </span>
                <span className="font-semibold">Refresh</span>
              </button>
            </div>


            {/* Auction Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {auctions.map((nft) => (
                <NFTCard
                  key={nft.tokenId}
                  nft={nft}
                  currentAccount={account}
                  onUpdate={loadAuctions}
                  onNeedLogin={connectWallet}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}