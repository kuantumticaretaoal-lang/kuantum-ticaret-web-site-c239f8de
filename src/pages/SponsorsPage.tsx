import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import Sponsors from "@/components/Sponsors";
import Footer from "@/components/Footer";

const SponsorsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sponsorlarımız ve İş Ortaklarımız"
        description="Kuantum Ticaret'in iş ortakları, sponsorları ve anlaşmalı kargo firmaları."
        path="/sponsors"
      />
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">Sponsorlarımız</h1>
        <Sponsors />
      </div>
      <Footer />
    </div>
  );
};

export default SponsorsPage;
