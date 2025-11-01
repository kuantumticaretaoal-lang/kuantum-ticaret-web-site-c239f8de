import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Sponsors from "@/components/Sponsors";
import Features from "@/components/Features";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
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
