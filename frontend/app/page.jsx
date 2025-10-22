
import JobCards from "@/components/Home/Card";
import BenefitsSection from "@/components/Home/Benefit";
import AboutNFT from "@/components/Home/AboutNft";
export default function Home() {
  return (
    <div>
      <main className="px-4 md:px-[72px]">
        <JobCards />
        <BenefitsSection />
        <AboutNFT />
      </main>
    </div>
  );
}
