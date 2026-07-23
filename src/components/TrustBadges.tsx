import { ShieldCheck, RefreshCw, Truck, Lock, Award, Headphones } from "lucide-react";

const BADGES = [
  {
    icon: ShieldCheck,
    title: "Güvenli Alışveriş",
    desc: "SSL sertifikası ile korunan ödeme",
  },
  {
    icon: RefreshCw,
    title: "14 Gün İade",
    desc: "Standart ürünlerde koşulsuz iade",
  },
  {
    icon: Truck,
    title: "Hızlı Kargo",
    desc: "1-2 iş gününde kargoda",
  },
  {
    icon: Lock,
    title: "KVKK Uyumlu",
    desc: "Verileriniz güvende",
  },
  {
    icon: Award,
    title: "Kalite Garantisi",
    desc: "Titizlikle seçilmiş ürünler",
  },
  {
    icon: Headphones,
    title: "7/24 Destek",
    desc: "Canlı destek her an yanınızda",
  },
];

const TrustBadges = () => {
  return (
    <section className="py-12 border-y bg-background" aria-label="Güvence rozetleri">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {BADGES.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                className="flex flex-col items-center text-center gap-2 p-4 rounded-xl hover:bg-muted/40 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
