import { Button } from "@/components/ui/button";
import { ShoppingBag, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-primary via-primary-glow to-secondary text-white py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <img 
              src="/logo.jpg" 
              alt="Kuantum Ticaret Logo" 
              width={97}
              height={80}
              className="mb-8 bg-white p-3 rounded-lg"
              style={{ width: 97, height: 80 }}
              loading="eager"
            />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Kuantum Ticaret'e Hoş Geldiniz
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Kaliteli ürünler, güvenilir hizmet. Size özel tasarlanmış ürünlerimizi keşfedin.
            </p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
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
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="flex justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          >
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md" style={{ minHeight: 297, minWidth: 320 }}>
              <img 
                src="/logo.jpg" 
                alt="Kuantum Ticaret Logo" 
                width={304}
                height={233}
                className="w-full h-auto"
                style={{ aspectRatio: '304/233' }}
                // @ts-ignore
                loading="eager"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
