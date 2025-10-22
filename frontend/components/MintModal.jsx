'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// ABI Contract
const CONTRACT_ABI = [
  "function mintArtwork(string memory tokenURI, string memory creatorName, uint256 price) public returns (uint256)",
  "function getTotalSupply() public view returns (uint256)",
  "event ArtworkMinted(uint256 indexed tokenId, address indexed creator, string creatorName, string tokenURI, uint256 price)"
];

export default function MintModal({ onClose, onSuccess, account }) {
  const [title, setTitle] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
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
      
      console.log('Minting with params:', {
        tokenURI,
        creatorName,
        price: priceInWei.toString()
      });

      try {
        const gasEstimate = await contract.mintArtwork.estimateGas(
          tokenURI,
          creatorName,
          priceInWei
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
        {
          gasLimit: 500000
        }
      );

      setUploadProgress('Menunggu konfirmasi blockchain...');
      console.log('Transaction hash:', tx.hash);

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      setUploadProgress('');
      alert('🎉 NFT berhasil di-mint!\n\nTransaction Hash: ' + tx.hash);
      
      // Reset form
      setTitle('');
      setCreatorName('');
      setDescription('');
      setPrice('');
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

            {/* Creator Address Info */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Alamat Wallet Anda</p>
              <p className="text-sm font-mono text-gray-800 break-all">
                {account.substring(0, 10)}...{account.substring(34)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Alamat ini akan tercatat sebagai pembuat asli NFT
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ Transparansi Supply Chain:</strong>
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4">
                <li>• Gambar disimpan di IPFS (decentralized)</li>
                <li>• Metadata NFT permanen dan tidak bisa diubah</li>
                <li>• Nama dan alamat pembuat asli tercatat</li>
                <li>• Riwayat lengkap kepemilikan tersimpan on-chain</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleMint}
              disabled={minting || uploading || !imageFile || !title || !creatorName || !price}
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