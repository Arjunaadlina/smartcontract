'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import NFTCard from '@/components/NFTCards';
import MintModal from '@/components/MintModal';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/contract';
import Link from 'next/link';
import { User, Image as ImageIcon, Wallet, ImagesIcon } from 'lucide-react';
import Image from 'next/image';

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const SEPOLIA_CHAIN_ID_DECIMAL = 11155111;

export default function Profile() {
    const [account, setAccount] = useState('');
    const [myNfts, setMyNfts] = useState([]);
    const [createdNfts, setCreatedNfts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showMintModal, setShowMintModal] = useState(false);
    const [networkError, setNetworkError] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('owned');
    const [balance, setBalance] = useState('0');

    useEffect(() => {
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

    useEffect(() => {
        if (account) {
            loadMyNFTs();
            loadBalance();
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

    const loadBalance = async () => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const balance = await provider.getBalance(account);
            setBalance(ethers.formatEther(balance));
        } catch (error) {
            console.error('Error loading balance:', error);
        }
    };

    const loadMyNFTs = async () => {
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
            const ownedList = [];
            const createdList = [];

            for (let i = 1; i <= Number(totalSupply); i++) {
                try {
                    const tokenURI = await contract.tokenURI(i);
                    const artworkInfo = await contract.getArtworkInfo(i);

                    const nftData = {
                        tokenId: i,
                        tokenURI,
                        originalCreator: artworkInfo[0],
                        creatorName: artworkInfo[1],
                        creationTimestamp: Number(artworkInfo[2]),
                        currentPrice: ethers.formatEther(artworkInfo[3]),
                        isForSale: artworkInfo[4],
                        currentOwner: artworkInfo[5],
                    };

                    if (artworkInfo[5].toLowerCase() === account.toLowerCase()) {
                        ownedList.push(nftData);
                    }

                    if (artworkInfo[0].toLowerCase() === account.toLowerCase()) {
                        createdList.push(nftData);
                    }
                } catch (error) {
                    console.error(`Error loading NFT ${i}:`, error);
                }
            }

            setMyNfts(ownedList);
            setCreatedNfts(createdList);
        } catch (error) {
            console.error('Error loading NFTs:', error);
        }
        setLoading(false);
    };

    return (
<div className="min-h-screen bg-white">

    {/* Main Content */}
    <main className="container mx-auto px-4 py-8">
        {!account ? (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                    <div className="text-8xl mb-6 flex items-center justify-center">
                        <Image src="/agawayan1.png" alt="Logo" width={200} height={200} />
                    </div>
                    <p className="text-gray-600 mb-8">
                        An NFT marketplace platform offering full transparency about the original creator
                        and ownership history of each digital artwork.
                    </p>
                    <button
                        onClick={connectWallet}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-3 rounded-xl font-semibold hover:shadow-xl transition-all transform hover:scale-105"
                    >
                        Connect Wallet to Get Started
                    </button>
                    <p className="text-xs text-gray-500 mt-4">
                        * Make sure MetaMask is connected to the Sepolia Testnet
                    </p>
                </div>
            </div>
        ) : (
            <>
                {/* Profile Header */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-12 h-12 text-white" />
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
                            <p className="text-gray-600 font-mono text-sm mb-3">{account}</p>
                            <div className="flex items-center gap-4 justify-center md:justify-start">
                                <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                                    <Wallet className="w-4 h-4 text-purple-600" />
                                    <span className="font-semibold">
                                        {parseFloat(balance).toFixed(4)} ETH
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                                    <ImageIcon className="w-4 h-4 text-blue-600" />
                                    <span className="font-semibold">{myNfts.length} NFT</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowMintModal(true)}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all font-semibold"
                        >
                            + Mint New NFT
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex gap-4 border-b">
                        <button
                            onClick={() => setActiveTab('owned')}
                            className={`pb-3 px-4 font-semibold transition-all ${
                                activeTab === 'owned'
                                    ? 'border-b-2 border-purple-600 text-purple-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            My NFTs ({myNfts.length})
                        </button>

                        <button
                            onClick={() => setActiveTab('created')}
                            className={`pb-3 px-4 font-semibold transition-all ${
                                activeTab === 'created'
                                    ? 'border-b-2 border-purple-600 text-purple-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Created NFTs ({createdNfts.length})
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
                        <p className="mt-4 text-gray-600">Loading NFTs...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'owned' && (
                            <>
                                {myNfts.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                                            <div className="text-6xl mb-4">
                                                <ImagesIcon className="mx-auto" width={100} height={100} />
                                            </div>
                                            <h2 className="text-2xl font-bold mb-4">No NFTs Yet</h2>
                                            <p className="text-gray-600 mb-6">
                                                You don’t own any NFTs yet. Mint your first NFT or buy one from the marketplace!
                                            </p>
                                            <div className="flex gap-3 justify-center">
                                                <button
                                                    onClick={() => setShowMintModal(true)}
                                                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
                                                >
                                                    Mint NFT
                                                </button>
                                                <Link
                                                    href="/"
                                                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-all"
                                                >
                                                    Go to Marketplace
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {myNfts.map((nft) => (
                                            <NFTCard
                                                key={nft.tokenId}
                                                nft={nft}
                                                currentAccount={account}
                                                onUpdate={loadMyNFTs}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'created' && (
                            <>
                                {createdNfts.length === 0 ? (
                                    <div className="text-center py-20">
                                        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                                            <div className="text-6xl mb-4">
                                                <ImagesIcon className="mx-auto" width={100} height={100} />
                                            </div>
                                            <h2 className="text-2xl font-bold mb-4">No Creations Yet</h2>
                                            <p className="text-gray-600 mb-6">
                                                You haven’t created any NFTs yet. Start creating now!
                                            </p>
                                            <button
                                                onClick={() => setShowMintModal(true)}
                                                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all"
                                            >
                                                Create Your First NFT
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {createdNfts.map((nft) => (
                                            <div key={nft.tokenId} className="relative">
                                                <NFTCard
                                                    nft={nft}
                                                    currentAccount={account}
                                                    onUpdate={loadMyNFTs}
                                                />
                                                {nft.originalCreator.toLowerCase() ===
                                                    account.toLowerCase() && (
                                                    <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-4 py-2 rounded-full font-semibold shadow-lg">
                                                        Creator
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </>
        )}
    </main>

    {/* Mint Modal */}
    {showMintModal && (
        <MintModal
            onClose={() => setShowMintModal(false)}
            onSuccess={() => {
                setShowMintModal(false);
                loadMyNFTs();
            }}
            account={account}
        />
    )}
</div>

    );
}
