import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const CallToAction = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-primary via-primary-glow to-secondary text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Hemen Alışverişe Başlayın
        </h2>
        <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto">
          Özel tasarım ürünlerimizi keşfedin ve siparişinizi verin
        </p>
        <Button 
          asChild
          size="lg"
          className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6"
        >
          <Link to="/products">
            <ShoppingCart className="mr-2 h-5 w-5" />
            Ürünleri Görüntüle
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default CallToAction;
