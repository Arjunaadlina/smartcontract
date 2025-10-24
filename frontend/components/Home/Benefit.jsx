import { ShoppingBag, Coins, Upload, TrendingUp } from "lucide-react";
import Link from "next/link";

const benefits = [
  {
    icon: <ShoppingBag size={32} />,
    title: "Own Your Marketplace",
    desc: "Trade digital collectibles and showcase your NFT creations with full control.",
  },
  {
    icon: <Upload size={32} />,
    title: "Mint Effortlessly",
    desc: "Upload your artwork and turn it into an NFT in just a few clicks.",
  },
  {
    icon: <TrendingUp size={32} />,
    title: "Grow Your Value",
    desc: "Watch your NFT collection increase in demand and market worth.",
  },
  {
    icon: <Coins size={32} />,
    title: "Earn Royalties",
    desc: "Receive automatic royalties every time your NFT is resold on the blockchain.",
  },
];

export default function BenefitsSection() {
  return (
    <section className="bg-white px-6 pt-8 mb-12">
      <div className="flex justify-between items-center flex-wrap gap-6 mb-12">
        <h2 className="text-3xl font-bold text-gray-900">
          Explore the Benefits of Joining <br className="hidden md:block" />
          <span className="text-[#9B5DE0]"> Our NFT Marketplace</span>
        </h2>

        <button className="bg-[#9B5DE0] hover:bg-[#D78FEE] transition text-white px-5 py-2 rounded-full text-sm font-semibold">
          <Link href={"/profile"}>Start Minting!</Link>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {benefits.map((item, index) => (
          <div key={index} className="flex flex-col gap-3 border p-4 rounded-2xl">
            <div className="bg-[#4E56C0] text-white p-4 rounded-xl w-14 h-14 flex items-center justify-center">
              {item.icon}
            </div>
            <h3 className="font-semibold text-lg text-gray-900">{item.title}</h3>
            <p className="text-gray-500 text-sm max-w-[220px] mt-[-5px]">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
