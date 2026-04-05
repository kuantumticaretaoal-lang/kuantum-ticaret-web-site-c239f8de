import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, Package, Bell } from "lucide-react";

interface EmptyStateProps {
  type: "cart" | "favorites" | "orders" | "notifications";
  title?: string;
  description?: string;
}

const configs = {
  cart: { icon: ShoppingCart, title: "Sepetiniz boş", description: "Harika ürünler sizi bekliyor!", action: "/products", actionLabel: "Alışverişe Başla" },
  favorites: { icon: Heart, title: "Favori ürününüz yok", description: "Beğendiğiniz ürünleri favorilere ekleyin!", action: "/products", actionLabel: "Ürünleri Keşfet" },
  orders: { icon: Package, title: "Henüz siparişiniz yok", description: "İlk siparişinizi vermek için ürünlere göz atın.", action: "/products", actionLabel: "Alışverişe Başla" },
  notifications: { icon: Bell, title: "Bildirim yok", description: "Yeni bildirimleriniz burada görünecek.", action: "", actionLabel: "" },
};

export const EmptyState = ({ type, title, description }: EmptyStateProps) => {
  const navigate = useNavigate();
  const cfg = configs[type];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title || cfg.title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description || cfg.description}</p>
      {cfg.action && (
        <Button onClick={() => navigate(cfg.action)}>{cfg.actionLabel}</Button>
      )}
    </div>
  );
};
