import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Sponsors from "@/components/Sponsors";
import ShippingInfo from "@/components/ShippingInfo";
import Features from "@/components/Features";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import { CampaignBanner } from "@/components/CampaignBanner";
import { useTranslations } from "@/hooks/use-translations";

const Index = () => {
  const { t } = useTranslations();
  
  return (
    <div className="min-h-screen">
      <CampaignBanner currentPage="homepage" />
      <Navbar />
      <HeroSection />
      <Sponsors showTitle={true} />
      <ShippingInfo />
      <Features />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Index;
