'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import NFTCard from '@/components/NFTCards';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import Image from 'next/image';
import { ImageIcon, RefreshCcw } from 'lucide-react';

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

export default function Marketplace() {
  const [account, setAccount] = useState('');
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState('');
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkWalletConnection();
    
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('chainChanged', (chainId) => {
        window.location.reload();
      });
      
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount('');
        }
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('chainChanged');
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  useEffect(() => {
    if (account) {
      loadNFTs();
    }
  }, [account]);


  // Listen to smart contract events untuk real-time updates
  useEffect(() => {
    if (!account || typeof window.ethereum === 'undefined') return;

    const setupEventListeners = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

        // Listen untuk event listing/unlisting
        contract.on('ArtworkListedForSale', (tokenId, price) => {
          console.log('🟢 NFT Listed:', tokenId.toString());
          loadNFTs(); // Auto refresh ketika ada NFT di-list
        });

        contract.on('ArtworkUnlisted', (tokenId) => {
          console.log('🔴 NFT Unlisted:', tokenId.toString());
          loadNFTs(); // Auto refresh ketika ada NFT di-unlist
        });

        contract.on('ArtworkSold', (tokenId, from, to, price) => {
          console.log('💰 NFT Sold:', tokenId.toString());
          loadNFTs(); // Auto refresh ketika ada NFT terjual
        });

        contract.on('ArtworkMinted', (tokenId, creator, creatorName, tokenURI, price) => {
          console.log('✨ NFT Minted:', tokenId.toString());
          loadNFTs(); // Auto refresh ketika ada NFT baru
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
  }, [account]);


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

  const loadNFTs = async () => {
    // Jangan set loading true jika ini auto-refresh
    if (!refreshing) {
      setLoading(true);
    }
    setRefreshing(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const isCorrectNetwork = await checkNetwork(provider);
      if (!isCorrectNetwork) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const totalSupply = await contract.getTotalSupply();
      const nftList = [];

      console.log(`📊 Loading ${totalSupply} NFTs from blockchain...`);

      for (let i = 1; i <= Number(totalSupply); i++) {
        try {
          const tokenURI = await contract.tokenURI(i);
          const artworkInfo = await contract.getArtworkInfo(i);
          
          // FILTER: Hanya tampilkan NFT yang isForSale = true
          const isForSale = artworkInfo[4];
          
          console.log(`NFT #${i}: isForSale = ${isForSale}`);
          
          if (isForSale) {
            nftList.push({
              tokenId: i,
              tokenURI,
              originalCreator: artworkInfo[0],
              creatorName: artworkInfo[1],
              creationTimestamp: Number(artworkInfo[2]),
              currentPrice: ethers.formatEther(artworkInfo[3]),
              isForSale: artworkInfo[4],
              currentOwner: artworkInfo[5]
            });
          }
        } catch (error) {
          console.error(`Error loading NFT ${i}:`, error);
        }
      }

      console.log(`✅ Loaded ${nftList.length} NFTs for sale`);
      setNfts(nftList);
    } catch (error) {
      console.error('Error loading NFTs:', error);
    }
    setLoading(false);
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-white">

      <main className="container mx-auto px-4 py-8">
        {!account ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-8xl mb-6 flex items-center justify-center">
                <Image src="/agawayan1.png" alt="Logo" width={200} height={200} />
              </div>
              <p className="text-gray-600 mb-8">
                Platform NFT marketplace dengan transparansi penuh tentang pembuat asli dan riwayat kepemilikan setiap karya seni digital.
              </p>
              <button
                onClick={connectWallet}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-3 rounded-xl font-semibold hover:shadow-xl transition-all transform hover:scale-105"
              >
                Hubungkan Wallet untuk Memulai
              </button>
              <p className="text-xs text-gray-500 mt-4">
                * Pastikan MetaMask terhubung ke Sepolia Testnet
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600">Memuat NFT...</p>
            </div>
          </div>
        ) : nfts.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="text-8xl mb-6">
                <ImageIcon className="mx-auto" width={100} height={100} />
              </div>
              <h2 className="text-3xl font-bold mb-4">Belum Ada NFT Dijual</h2>
              <p className="text-gray-600 mb-8">
                Belum ada NFT yang sedang dijual di marketplace. Jadilah yang pertama membuat dan menjual karya seni digital!
              </p>
              <a
                href="/profile"
                className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-3 rounded-xl font-semibold hover:shadow-xl transition-all"
              >
                Buat NFT di Profil
              </a>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-gray-600">
                  {nfts.length} artwork{nfts.length !== 1 ? 's' : ''} available for sale
                  {refreshing && <span className="ml-2 text-purple-600 animate-pulse">• updating...</span>}
                </p>
              </div>
              <button 
                onClick={loadNFTs}
                disabled={refreshing}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              >
                <span className={`${refreshing ? 'animate-spin' : ''} cursor-pointer`}>
                  <RefreshCcw />
                </span>
                <span className="font-semibold">Refresh</span>
              </button>
            </div>

            {/* Bento Grid Layout - Pinterest Style */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6">
              {nfts.map((nft) => (
                <div key={nft.tokenId} className="break-inside-avoid mb-6">
                  <NFTCard
                    nft={nft}
                    currentAccount={account}
                    onUpdate={loadNFTs}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}