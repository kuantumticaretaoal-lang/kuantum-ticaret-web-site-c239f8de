import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Sponsors from "@/components/Sponsors";
import Features from "@/components/Features";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import { CampaignBanner } from "@/components/CampaignBanner";

const Index = () => {
  return (
    <div className="min-h-screen">
      <CampaignBanner currentPage="homepage" />
      <Navbar />
      <HeroSection />
      <Sponsors />
      <Features />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Index;
