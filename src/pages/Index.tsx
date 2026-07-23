import { lazy, Suspense } from "react";
import SEO from "@/components/SEO";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import { BackToTop } from "@/components/BackToTop";

const CampaignBanner = lazy(() => import("@/components/CampaignBanner").then(m => ({ default: m.CampaignBanner })));
const TrustStrip = lazy(() => import("@/components/TrustStrip"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const Sponsors = lazy(() => import("@/components/Sponsors"));
const ShippingInfo = lazy(() => import("@/components/ShippingInfo"));
const Features = lazy(() => import("@/components/Features"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const HomeFAQ = lazy(() => import("@/components/HomeFAQ"));
const CallToAction = lazy(() => import("@/components/CallToAction"));

const Index = () => {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <SEO
        title="Kuantum Ticaret - Kaliteli Ürünler, Güvenilir Hizmet"
        description="Kuantum Ticaret'te kaliteli ürünler ve güvenilir hizmet. Kişiselleştirilebilir ürünler, hızlı kargo ve 7/24 müşteri desteği."
        path="/"
      />
      <Suspense fallback={null}>
        <CampaignBanner currentPage="homepage" />
      </Suspense>
      <Navbar />
      <HeroSection />
      <Suspense fallback={null}>
        <TrustStrip />
        <TrustBadges />
        <Sponsors showTitle={true} />
        <ShippingInfo />
        <Features />
        <Testimonials />
        <HomeFAQ />
        <CallToAction />
      </Suspense>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default Index;
