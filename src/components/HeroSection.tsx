import { Button } from "@/components/ui/button";
import { ShoppingBag, MessageSquare, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import HeroStats from "@/components/HeroStats";
import HeroProductShowcase from "@/components/HeroProductShowcase";

const HeroSection = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primary-glow to-secondary text-white py-16 md:py-20 lg:py-28 overflow-hidden">
      {/* Aurora / mesh background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-white/25 blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-secondary/50 blur-3xl animate-pulse"
          style={{ animationDelay: "1.2s" }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-primary-glow/20 blur-3xl animate-pulse"
          style={{ animationDelay: "2.4s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-4 py-1.5 mb-6 text-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              <span>Kişiselleştirilebilir ürünler • Hızlı kargo</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 md:mb-6 leading-[1.05] tracking-tight">
              <span className="block">Kuantum Ticaret'e</span>
              <span className="block bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
                Hoş Geldiniz
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 md:mb-8 max-w-xl">
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
                className="relative overflow-hidden bg-white text-primary hover:bg-white/95 text-base md:text-lg px-6 md:px-8 group shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 font-semibold"
              >
                <Link to="/products">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <ShoppingBag className="mr-2 h-5 w-5 relative" />
                  <span className="relative">Ürünleri İncele</span>
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-2 border-white/50 hover:bg-white/20 text-base md:text-lg px-6 md:px-8 transition-all hover:-translate-y-0.5 backdrop-blur-sm"
              >
                <Link to="/contact">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  İletişime Geç
                </Link>
              </Button>
            </motion.div>
            <HeroStats />
          </motion.div>

          <HeroProductShowcase />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

