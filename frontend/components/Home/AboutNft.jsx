'use client';
import { Palette, Shield, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";

export default function AboutNFT() {
  const features = [
    {
      icon: <Palette className="w-8 h-8" />,
      title: "Unique Digital Artwork",
      description: "Each NFT is a unique digital artwork that cannot be duplicated. Own exclusive rights to your favorite pieces of art."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Verified Ownership",
      description: "Blockchain ensures your NFT ownership is permanently and transparently recorded. No one can fake or steal your ownership."
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Investment Potential",
      description: "NFTs are not just digital collectibles, but assets that can increase in value over time. Resell your NFTs anytime on the marketplace."
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Fast & Secure Transactions",
      description: "Buy and sell NFTs quickly using cryptocurrency. All transactions are encrypted and recorded on blockchain for maximum security."
    }
  ];

  return (
    <div className="w-full py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What is <span className="text-[#4E56C0]">NFT?</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            NFT (Non-Fungible Token) is a unique digital asset stored on the blockchain. 
            Each NFT has its own distinct identity and value, making it an exclusive digital collectible.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group bg-white p-8 rounded-2xl border-2 border-gray-100 hover:border-[#9B5DE0] transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="w-16 h-16 bg-[#4E56C0] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#9B5DE0] transition-colors">
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* How It Works Section */}
        <div className="bg-gray-50 rounded-3xl p-12 mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How NFT Marketplace Works
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#4E56C0] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Connect Wallet</h4>
              <p className="text-gray-600">
                Connect your MetaMask wallet to start interacting with blockchain and purchase NFTs
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#9B5DE0] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Explore Collection</h4>
              <p className="text-gray-600">
                Browse through various unique digital artworks from talented artists on our marketplace
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#4E56C0] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Buy & Collect</h4>
              <p className="text-gray-600">
                Purchase your favorite NFTs with cryptocurrency and make them part of your digital collection
              </p>
            </div>
          </div>
        </div>


        {/* CTA Section */}
        <div className="bg-[#4E56C0] rounded-3xl p-12 text-center text-white relative overflow-hidden">
          {/* Decorative accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#9B5DE0] rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#9B5DE0] rounded-full opacity-20 blur-3xl"></div>
          
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Start Your NFT Journey?
            </h3>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of collectors and artists on our platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/marketplace"
                className="bg-white text-[#4E56C0] px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105"
              >
                Explore Marketplace
              </Link>
              <Link
                href="/profile"
                className="bg-[#9B5DE0] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-opacity-90 transition-all transform hover:scale-105"
              >
                Create Your First NFT
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}