import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: number;
  images?: { image_url: string }[];
  rating?: number | null;
};

const HeroProductShowcase = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("products")
          .select("id, name, price, product_images(image_url)")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(6);
        if (Array.isArray(data)) {
          setProducts(
            data.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: Number(p.price) || 0,
              images: p.product_images || [],
            }))
          );
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (products.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % products.length), 3800);
    return () => clearInterval(t);
  }, [products.length]);

  if (products.length === 0) {
    return (
      <div className="hidden lg:flex justify-center lg:justify-end">
        <div className="bg-white/95 dark:bg-card p-8 rounded-2xl shadow-2xl max-w-md">
          <img src="/logo.jpg" alt="Kuantum Ticaret" className="w-72 h-auto" />
        </div>
      </div>
    );
  }

  const current = products[idx];
  const img = current.images?.[0]?.image_url || "/placeholder.svg";

  return (
    <div className="hidden lg:flex justify-center lg:justify-end relative">
      <div className="relative w-[420px] h-[420px]">
        {/* Back cards for depth */}
        {[1, 2].map((offset) => {
          const p = products[(idx + offset) % products.length];
          const pImg = p?.images?.[0]?.image_url || "/placeholder.svg";
          return (
            <motion.div
              key={`back-${offset}`}
              className="absolute inset-0 rounded-3xl bg-white dark:bg-card shadow-2xl overflow-hidden"
              style={{
                transform: `translate(${offset * 22}px, ${offset * 14}px) rotate(${offset * 3}deg)`,
                zIndex: 10 - offset,
                opacity: 0.55 - offset * 0.15,
              }}
            >
              <img src={pImg} alt="" className="w-full h-full object-cover" />
            </motion.div>
          );
        })}

        {/* Front active card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 30, rotate: -5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -30, rotate: 5 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 rounded-3xl bg-white dark:bg-card shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] overflow-hidden z-20"
          >
            <Link to={`/products/${current.id}`} className="block h-full">
              <div className="relative h-3/4">
                <img
                  src={img}
                  alt={current.name}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute top-3 left-3 flex gap-1 bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1 text-white text-xs font-medium">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>Öne Çıkan</span>
                </div>
              </div>
              <div className="p-4 h-1/4 flex items-center justify-between text-foreground">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{current.name}</div>
                  <div className="text-primary font-bold text-lg">
                    ₺{current.price.toLocaleString("tr-TR")}
                  </div>
                </div>
                <div className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center shrink-0 group-hover:scale-110 transition">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50"
              }`}
              aria-label={`Ürün ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroProductShowcase;
