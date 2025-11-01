import { Button } from "@/components/ui/button";
import { ShoppingBag, MessageSquare } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-primary via-primary-glow to-secondary text-white py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <img 
              src={logo} 
              alt="Kuantum Ticaret Logo" 
              className="h-20 w-auto mb-8 bg-white p-3 rounded-lg"
            />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Kuantum Ticaret'e Hoş Geldiniz
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Kaliteli ürünler, güvenilir hizmet. Size özel tasarlanmış ürünlerimizi keşfedin.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                asChild
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-white text-lg px-8"
              >
                <Link to="/products">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Ürünleri İncele
                </Link>
              </Button>
              <Button 
                asChild
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-2 border-white/50 hover:bg-white/20 text-lg px-8"
              >
                <Link to="/contact">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  İletişime Geç
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="flex justify-center lg:justify-end">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md">
              <img 
                src={logo} 
                alt="Kuantum Ticaret Logo" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
