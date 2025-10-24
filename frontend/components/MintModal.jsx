'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// ABI Contract (updated with V2 compatible functions)
const CONTRACT_ABI = [
  "function mintArtwork(string memory tokenURI, string memory creatorName, uint256 price) public returns (uint256)",
  "function mintArtworkWithRoyalty(string memory tokenURI, string memory creatorName, uint256 price, uint256 royaltyPercentage) public returns (uint256)",
  "function getTotalSupply() public view returns (uint256)",
  "event ArtworkMinted(uint256 indexed tokenId, address indexed creator, string creatorName, string tokenURI, uint256 price, uint256 royaltyPercentage)"
];

export default function MintModal({ onClose, onSuccess, account }) {
  const [title, setTitle] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [royaltyPercentage, setRoyaltyPercentage] = useState('5'); // Default 5%
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [minting, setMinting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI3MWY2MjRjOC04YWViLTQ4ODgtYWNhMy04NDIxZDUzNTIyOTgiLCJlbWFpbCI6ImFyanVuYWFkbGluYW1hcnRoYUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZjk0MWZhNWM5YmNlYTNkNzI3YTUiLCJzY29wZWRLZXlTZWNyZXQiOiIzMGEzMGJlMjhmNGViYzIwODkzOWU4MjdmODQxZTYwMGYzNTFkOGJkZmY4MmEwNGNjNGNlM2Q4NGJjZjY3MmQ5IiwiZXhwIjoxNzkyNTU1NTEzfQ.AX9APoTo_mwAQYjYcpAPXZiQCkCRsX-7mknq-ikzSY0";
  const PINATA_GATEWAY = "gateway.pinata.cloud";

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran file maksimal 10MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar');
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result.toString());
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToPinata = async (file) => {
    try {
      setUploadProgress('Mengunggah gambar ke IPFS...');
      
      const formData = new FormData();
      formData.append('file', file);

      const metadata = JSON.stringify({
        name: file.name,
      });
      formData.append('pinataMetadata', metadata);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pinata error: ${error}`);
      }

      const data = await response.json();
      console.log('Image uploaded to IPFS:', data.IpfsHash);
      return data.IpfsHash;
    } catch (error) {
      console.error('Error uploading to Pinata:', error);
      throw new Error('Gagal upload gambar ke IPFS: ' + error.message);
    }
  };

  const uploadMetadataToPinata = async (metadata) => {
    try {
      setUploadProgress('Membuat metadata NFT...');

      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Pinata error: ${error}`);
      }

      const data = await response.json();
      console.log('Metadata uploaded to IPFS:', data.IpfsHash);
      return data.IpfsHash;
    } catch (error) {
      console.error('Error uploading metadata to Pinata:', error);
      throw new Error('Gagal upload metadata ke IPFS: ' + error.message);
    }
  };

  const handleMint = async () => {
    // Validasi input
    if (!title.trim()) {
      alert('Masukkan judul karya');
      return;
    }

    if (!creatorName.trim()) {
      alert('Masukkan nama pembuat');
      return;
    }

    if (!imageFile) {
      alert('Pilih gambar untuk di-mint');
      return;
    }

    if (!price || parseFloat(price) < 0) {
      alert('Masukkan harga yang valid (0 untuk tidak dijual)');
      return;
    }

    const royaltyNum = parseFloat(royaltyPercentage);
    if (isNaN(royaltyNum) || royaltyNum < 0 || royaltyNum > 20) {
      alert('Royalty harus antara 0-20%');
      return;
    }

    setMinting(true);
    setUploadProgress('Memulai proses minting...');

    try {
      // 1. Upload gambar ke IPFS
      const imageHash = await uploadImageToPinata(imageFile);
      const imageUrl = `ipfs://${imageHash}`;
      
      console.log('Image URL:', imageUrl);

      // 2. Buat metadata NFT (standar ERC721)
      const metadata = {
        name: title,
        description: description || `Original artwork "${title}" created by ${creatorName}`,
        image: imageUrl,
        attributes: [
          {
            trait_type: "Creator",
            value: creatorName
          },
          {
            trait_type: "Original Creator Address",
            value: account
          },
          {
            trait_type: "Creator Royalty",
            value: `${royaltyPercentage}%`
          },
          {
            trait_type: "Creation Date",
            value: new Date().toISOString()
          }
        ]
      };

      // 3. Upload metadata ke IPFS
      const metadataHash = await uploadMetadataToPinata(metadata);
      const tokenURI = `ipfs://${metadataHash}`;
      
      console.log('Token URI:', tokenURI);

      setUploadProgress('Menunggu konfirmasi transaksi...');

      // 4. Connect ke contract dan mint NFT
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const network = await provider.getNetwork();
      console.log('Network:', network.chainId.toString());
      console.log('Contract Address:', CONTRACT_ADDRESS);
      console.log('Signer Address:', await signer.getAddress());

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const priceInWei = ethers.parseEther(price || '0');
      
      // Convert royalty percentage to basis points (1% = 100 basis points)
      const royaltyBasisPoints = Math.floor(royaltyNum * 100);
      
      console.log('Minting with params:', {
        tokenURI,
        creatorName,
        price: priceInWei.toString(),
        royaltyBasisPoints
      });

      try {
        const gasEstimate = await contract.mintArtwork.estimateGas(
          tokenURI,
          creatorName,
          priceInWei,
          royaltyBasisPoints
        );
        console.log('Estimated gas:', gasEstimate.toString());
      } catch (gasError) {
        console.error('Gas estimation error:', gasError);
        throw new Error('Estimasi gas gagal. Pastikan contract address benar dan Anda terhubung ke network yang tepat.');
      }

      const tx = await contract.mintArtwork(
        tokenURI,
        creatorName,
        priceInWei,
        royaltyBasisPoints,
        {
          gasLimit: 500000
        }
      );

      setUploadProgress('Menunggu konfirmasi blockchain...');
      console.log('Transaction hash:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      setUploadProgress('');
      alert(`🎉 NFT berhasil di-mint!\n\nRoyalty: ${royaltyPercentage}%\nTransaction Hash: ${tx.hash}`);
      
      // Reset form
      setTitle('');
      setCreatorName('');
      setDescription('');
      setPrice('');
      setRoyaltyPercentage('5');
      setImageFile(null);
      setImagePreview('');
      
      onSuccess();
    } catch (error) {
      console.error('Error minting NFT:', error);
      
      let errorMessage = 'Gagal mint NFT: ';
      
      if (error.message.includes('user rejected')) {
        errorMessage = 'Transaksi dibatalkan oleh user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Saldo ETH tidak cukup untuk gas fee';
      } else if (error.message.includes('Pinata')) {
        errorMessage = error.message;
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Error jaringan. Pastikan Anda terhubung ke network yang benar';
      } else {
        errorMessage += error.message || 'Unknown error';
      }
      
      alert(errorMessage);
      setUploadProgress('');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              Mint NFT Baru
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              disabled={minting}
            >
              ×
            </button>
          </div>

          {/* Progress Indicator */}
          {uploadProgress && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <p className="text-sm text-blue-800">{uploadProgress}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gambar Karya Seni *
              </label>
              
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview('');
                    }}
                    disabled={minting}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-all">
                  <div className="text-center">
                    <div className="text-5xl mb-2">🖼️</div>
                    <p className="text-sm text-gray-600">
                      Klik untuk upload gambar
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Max 10MB (JPG, PNG, GIF)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={minting}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Judul Karya *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Sunset di Pantai Kuta"
                disabled={minting}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              />
            </div>

            {/* Creator Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nama Pembuat / Artis *
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                disabled={minting}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nama ini akan tercatat sebagai pembuat asli NFT
              </p>
            </div>

            {/* Description (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Deskripsi (Opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ceritakan tentang karya seni Anda..."
                disabled={minting}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 resize-none"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Harga (ETH) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.01"
                disabled={minting}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Masukkan 0 jika tidak ingin langsung dijual
              </p>
            </div>

            {/* Royalty Percentage - NEW */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Royalty untuk Creator (%) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={royaltyPercentage}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (val >= 0 && val <= 20) {
                      setRoyaltyPercentage(e.target.value);
                    }
                  }}
                  placeholder="5"
                  disabled={minting}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  %
                </span>
              </div>
              
              {/* Slider untuk UX lebih baik */}
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={royaltyPercentage}
                onChange={(e) => setRoyaltyPercentage(e.target.value)}
                disabled={minting}
                className="w-full mt-2"
              />
              
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span className="font-semibold text-purple-600">{royaltyPercentage}%</span>
                <span>20%</span>
              </div>
              
              <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                <p className="text-xs text-gray-700">
                  <strong>💰 Royalty Anda:</strong> Setiap kali NFT ini dijual ulang (secondary market), 
                  Anda akan mendapat <span className="font-bold text-purple-600">{royaltyPercentage}%</span> dari harga jual secara otomatis!
                </p>
                {parseFloat(royaltyPercentage) > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Contoh: Jika NFT dijual seharga 1 ETH, Anda dapat {(parseFloat(royaltyPercentage) / 100).toFixed(3)} ETH
                  </p>
                )}
              </div>
            </div>

            {/* Creator Address Info */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Alamat Wallet Anda</p>
              <p className="text-sm font-mono text-gray-800 break-all">
                {account.substring(0, 10)}...{account.substring(34)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Alamat ini akan tercatat sebagai pembuat asli NFT dan penerima royalty
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleMint}
              disabled={minting || uploading || !imageFile || !title || !creatorName || !price || !royaltyPercentage}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {minting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
                </span>
              ) : (
                'Mint NFT'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}