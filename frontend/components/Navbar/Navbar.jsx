'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import Image from 'next/image';

// Sepolia Chain ID
const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

export default function Navbar() {
  const pathname = usePathname();
  const [account, setAccount] = useState('');
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [networkError, setNetworkError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const isCorrectNetwork = await checkNetwork(provider);
      if (!isCorrectNetwork) {
        setLoading(false);
        return;
      }
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const totalSupply = await contract.getTotalSupply();
      const nftList = [];

      for (let i = 1; i <= Number(totalSupply); i++) {
        try {
          const tokenURI = await contract.tokenURI(i);
          const artworkInfo = await contract.getArtworkInfo(i);
          
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
        } catch (error) {
          console.error(`Error loading NFT ${i}:`, error);
        }
      }

      setNfts(nftList);
    } catch (error) {
      console.error('Error loading NFTs:', error);
    }
    setLoading(false);
  };

  const isActive = (path) => {
    return pathname === path;
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <Link href="/" className="flex items-center space-x-3">
          <Image 
            src="/agawayan1.png"
            alt="Logo"
            width={150}
            height={150}
          />
        </Link>
        <div className="flex md:order-2 space-x-3">
          {account ? (
            <>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-600">Terhubung</p>
                <p className="text-sm font-mono">
                  {account.substring(0, 6)}...{account.substring(38)}
                </p>
              </div>
            </>
          ) : (
            <button
              onClick={connectWallet}
              className="text-white bg-[#4E56C0] hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center"
            >
              Hubungkan Wallet
            </button>
          )}
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <span className="sr-only">Open main menu</span>
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h15M1 7h15M1 13h15"/>
            </svg>
          </button>
        </div>
        
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} items-center justify-between w-full md:flex md:w-auto md:order-1`}>
          <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 md:flex-row md:mt-0 md:border-0 md:bg-white">
            <li>
              <Link 
                href="/" 
                className={`block py-2 px-3 md:p-0 rounded ${
                  isActive('/') 
                    ? 'text-white bg-[#4E56C0] md:bg-transparent md:text-[#4E56C0]' 
                    : 'text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-[#4E56C0]'
                }`}
              >
                Home
              </Link>
            </li>
            <li>
              <Link 
                href="/marketplace" 
                className={`block py-2 px-3 md:p-0 rounded ${
                  isActive('/marketplace') 
                    ? 'text-white bg-[#4E56C0] md:bg-transparent md:text-[#4E56C0]' 
                    : 'text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-[#4E56C0]'
                }`}
              >
                Marketplace
              </Link>
            </li>
            <li>
              <Link 
                href="/auction" 
                className={`block py-2 px-3 md:p-0 rounded ${
                  isActive('/auction') 
                    ? 'text-white bg-[#4E56C0] md:bg-transparent md:text-[#4E56C0]' 
                    : 'text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-[#4E56C0]'
                }`}
              >
                Auction
              </Link>
            </li>
            <li>
              <Link 
                href="/profile" 
                className={`block py-2 px-3 md:p-0 rounded ${
                  isActive('/profile') 
                    ? 'text-white bg-[#4E56C0] md:bg-transparent md:text-[#4E56C0]' 
                    : 'text-gray-900 hover:bg-gray-100 md:hover:bg-transparent md:hover:text-[#4E56C0]'
                }`}
              >
                Profile
              </Link>
            </li>
            
          </ul>
        </div>
      </div>
      
      {/* Network Error Banner */}
      {networkError && (
        <div className="border-t border-gray-200 bg-yellow-100 px-4 py-3">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            <p className="text-yellow-700 text-sm">{networkError}</p>
            <button
              onClick={switchToSepolia}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition-all text-sm font-medium"
            >
              Switch ke Sepolia
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}