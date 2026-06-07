import { Truck, ShieldCheck, RefreshCw, Headphones, CreditCard } from "lucide-react";

const items = [
  { icon: Truck, title: "Aynı Gün Kargo", desc: "14:00'a kadar verilen siparişler" },
  { icon: ShieldCheck, title: "Güvenli Ödeme", desc: "SSL ile korunan altyapı" },
  { icon: RefreshCw, title: "14 Gün İade", desc: "Koşulsuz iade hakkı" },
  { icon: Headphones, title: "7/24 Destek", desc: "Canlı destek & WhatsApp" },
  { icon: CreditCard, title: "Tüm Kartlar", desc: "Taksit imkânı" },
];

const TrustStrip = () => {
  return (
    <section className="bg-card border-y border-border">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {items.map((it, i) => (
            <div
              key={i}
              className="flex items-center gap-3 group hover:bg-muted/40 rounded-lg p-2 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <it.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{it.title}</div>
                <div className="text-xs text-muted-foreground truncate">{it.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustStrip;
