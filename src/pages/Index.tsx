import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import { useTranslations } from "@/hooks/use-translations";
import { BackToTop } from "@/components/BackToTop";

const CampaignBanner = lazy(() => import("@/components/CampaignBanner").then(m => ({ default: m.CampaignBanner })));
const Sponsors = lazy(() => import("@/components/Sponsors"));
const ShippingInfo = lazy(() => import("@/components/ShippingInfo"));
const Features = lazy(() => import("@/components/Features"));
const CallToAction = lazy(() => import("@/components/CallToAction"));

const Index = () => {
  const { t } = useTranslations();
  
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Suspense fallback={null}>
        <CampaignBanner currentPage="homepage" />
      </Suspense>
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <Sponsors showTitle={true} />
        <ShippingInfo />
        <Features />
        <CallToAction />
      </Suspense>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Index;
