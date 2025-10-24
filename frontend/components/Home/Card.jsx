import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function NFTMarketCards() {
  return (
    <div className="flex flex-col md:flex-row justify-center items-center gap-6 p-6">
      {/* Left Card */}
      <div className="h-96 relative bg-white rounded-2xl overflow-hidden w-full md:w-1/2 shadow-lg">
        <div className="absolute inset-0 bg-opacity-40">
          <Image
            src="/bg1.jpg"
            alt="NFT Marketplace"
            width={600}
            height={800}
            className="object-cover w-full h-full absolute inset-0 border"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <div className="relative p-8 text-white flex flex-col justify-end h-96 border">
          <div className="absolute top-0 left-0 flex justify-between w-full px-6 py-6">
            <button className="bg-white/70 text-gray-800 text-[12px] font-bold rounded-full px-4 py-1 w-fit mb-3">
              Discover NFTs
            </button>
            <ArrowUpRight className="text-black bg-white rounded-full p-1 w-7 h-7" />
          </div>

          <div>
            <h2 className="text-2xl font-bold leading-snug">
              Explore Unique NFTs <br /> on the Marketplace
            </h2>
            <p className="text-sm mt-2 opacity-90">
              Collect, trade, and mint exclusive digital assets.
            </p>
            <button  className="mt-5 bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-200 transition w-44">
              <Link href={"/marketplace"}>Start Exploring</Link>
            </button>
          </div>
        </div>
      </div>

      {/* Right Card */}
      <div className="bg-[#4E56C0] h-96 rounded-2xl w-full md:w-1/2 p-8 text-white shadow-lg flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 border-4 border-white border-opacity-30 rounded-full translate-x-10 -translate-y-10"></div>

        <div className="absolute top-0 left-0 flex justify-between w-full px-6 py-6">
          <button className="bg-white/70 text-gray-800 text-[12px] font-bold rounded-full px-4 py-1 w-fit mb-3">
            Mint Your NFT
          </button>
        </div>

        <div className="mt-44">
          <h2 className="text-2xl font-bold">Create & Sell Your NFTs</h2>
          <p className="text-sm mt-2 opacity-90">
            // Turn your digital art into blockchain assets.
          </p>

          <div className="mt-6 bg-white rounded-full flex items-center justify-between p-2 w-full md:w-4/5">
            <input
              type="text"
              placeholder="NFT Name"
              className="text-gray-600 text-sm px-3 py-1 w-1/3 focus:outline-none"
            />
            <div className="w-px h-6 bg-gray-300"></div>
            <Link href="/profile" className="bg-[#4E56C0] text-white text-sm px-4 py-2 rounded-full hover:bg-[#2f3dbf] transition">
              Mint →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
