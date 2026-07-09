import { Button } from "@/components/ui/button";
import { ShoppingBag, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import HeroStats from "@/components/HeroStats";

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primary-glow to-secondary text-white py-16 md:py-20 lg:py-32 overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/20 blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-secondary/40 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>
      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
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
              className="mb-6 md:mb-8 bg-white p-3 rounded-lg"
              style={{ width: 97, height: 80 }}
              loading="eager"
            />
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 leading-tight">
              Kuantum Ticaret'e Hoş Geldiniz
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-6 md:mb-8">
              Kaliteli ürünler, güvenilir hizmet. Size özel tasarlanmış ürünlerimizi keşfedin.
            </p>
            <motion.div
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Button
                asChild
                size="lg"
                className="relative overflow-hidden bg-secondary hover:bg-secondary/90 text-white text-base md:text-lg px-6 md:px-8 group shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <Link to="/products">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <ShoppingBag className="mr-2 h-5 w-5 relative" />
                  <span className="relative">Ürünleri İncele</span>
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-2 border-white/50 hover:bg-white/20 text-base md:text-lg px-6 md:px-8 transition-all hover:-translate-y-0.5"
              >
                <Link to="/contact">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  İletişime Geç
                </Link>
              </Button>
            </motion.div>
            <HeroStats />
          </motion.div>

          <motion.div
            className="hidden lg:flex justify-center lg:justify-end"
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
