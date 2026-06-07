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
  icon: Icon, label, target, suffix = "+", inView,
}: { icon: any; label: string; target: number; suffix?: string; inView: boolean }) => {
  const v = useCounter(target, inView);
  return (
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-bold leading-none">
          {v.toLocaleString("tr-TR")}{suffix}
        </div>
        <div className="text-xs md:text-sm text-white/80 mt-1">{label}</div>
      </div>
    </div>
  );
};

const HeroStats = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const [orders, setOrders] = useState(120);
  const [customers, setCustomers] = useState(80);

  useEffect(() => {
    (async () => {
      try {
        const [o, c] = await Promise.all([
          (supabase as any).from("orders").select("id", { count: "exact", head: true }).eq("status", "delivered"),
          (supabase as any).from("profiles").select("id", { count: "exact", head: true }),
        ]);
        if (typeof o.count === "number") setOrders(Math.max(o.count, 50));
        if (typeof c.count === "number") setCustomers(Math.max(c.count, 30));
      } catch {}
    })();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-8 border-t border-white/20"
    >
      <Stat icon={Package} label="Teslim edilen sipariş" target={orders} inView={inView} />
      <Stat icon={Users} label="Mutlu müşteri" target={customers} inView={inView} />
      <Stat icon={Truck} label="Hızlı kargo (saat)" target={24} suffix="" inView={inView} />
      <Stat icon={Star} label="Ortalama puan" target={5} suffix="/5" inView={inView} />
    </motion.div>
  );
};

export default HeroStats;
