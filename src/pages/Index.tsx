import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import { CampaignBanner } from "@/components/CampaignBanner";
import { useTranslations } from "@/hooks/use-translations";

const Sponsors = lazy(() => import("@/components/Sponsors"));
const ShippingInfo = lazy(() => import("@/components/ShippingInfo"));
const Features = lazy(() => import("@/components/Features"));
const CallToAction = lazy(() => import("@/components/CallToAction"));

const Index = () => {
  const { t } = useTranslations();
  
  return (
    <div className="min-h-screen">
      <CampaignBanner currentPage="homepage" />
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <Sponsors showTitle={true} />
        <ShippingInfo />
        <Features />
        <CallToAction />
      </Suspense>
      <Footer />
    </div>
  );
};

export default Index;
