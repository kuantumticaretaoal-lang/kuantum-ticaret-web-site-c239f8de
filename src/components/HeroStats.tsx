import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Package, Users, Truck, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const useCounter = (target: number, inView: boolean, duration = 1500) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, inView, duration]);
  return value;
};

const Stat = ({
  icon: Icon, label, target, suffix = "+", inView, decimals = 0,
}: { icon: any; label: string; target: number; suffix?: string; inView: boolean; decimals?: number }) => {
  const v = useCounter(Math.round(target * Math.pow(10, decimals)), inView);
  const display = decimals > 0 ? (v / Math.pow(10, decimals)).toFixed(decimals) : v.toLocaleString("tr-TR");
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl md:text-3xl font-bold leading-none">
          {display}{suffix}
        </div>
        <div className="text-xs md:text-sm text-white/80 mt-1">{label}</div>
      </div>
    </div>
  );
};

const HeroStats = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [orders, setOrders] = useState<number | null>(null);
  const [customers, setCustomers] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [avgDelivery, setAvgDelivery] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [ordersRes, deliveredOrdersRes, reviewsRes] = await Promise.all([
          (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
          (supabase as any).from("orders").select("user_id").eq("status", "delivered"),
          (supabase as any).from("product_reviews").select("rating"),
        ]);

        if (typeof ordersRes.count === "number") setOrders(ordersRes.count);

        if (Array.isArray(deliveredOrdersRes.data)) {
          const unique = new Set(
            deliveredOrdersRes.data.map((r: any) => r.user_id).filter(Boolean)
          );
          setCustomers(unique.size);
        }

        if (Array.isArray(reviewsRes.data) && reviewsRes.data.length > 0) {
          const sum = reviewsRes.data.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0);
          setRating(sum / reviewsRes.data.length);
        }

        // shipping settings avg delivery
        const { data: ship } = await (supabase as any)
          .from("shipping_settings")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (ship) {
          const candidate =
            ship.avg_delivery_days ??
            ship.delivery_days ??
            ship.estimated_days ??
            null;
          if (candidate) setAvgDelivery(Number(candidate));
        }
      } catch {}
    })();
  }, []);

  const stats = [
    orders !== null && orders > 0 && { icon: Package, label: "Teslim edilen sipariş", target: orders, suffix: "+" },
    customers !== null && customers > 0 && { icon: Users, label: "Mutlu müşteri", target: customers, suffix: "+" },
    avgDelivery !== null && avgDelivery > 0 && { icon: Truck, label: "Ortalama teslim (gün)", target: avgDelivery, suffix: "" },
    rating !== null && { icon: Star, label: "Ortalama puan", target: rating, suffix: "/5", decimals: 1 },
  ].filter(Boolean) as any[];

  if (stats.length === 0) return null;

  const cols = stats.length >= 4 ? "md:grid-cols-4" : stats.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className={`grid grid-cols-2 ${cols} gap-4 mt-10 pt-8 border-t border-white/20`}
    >
      {stats.map((s, i) => (
        <Stat key={i} {...s} inView={inView} />
      ))}
    </motion.div>
  );
};

export default HeroStats;
