import { useNavigate, useLocation } from "react-router-dom";
import { Home, ShoppingBag, ShoppingCart, User, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/", icon: Home, label: "Ana Sayfa" },
  { path: "/products", icon: ShoppingBag, label: "Ürünler" },
  { path: "/favorites", icon: Heart, label: "Favoriler" },
  { path: "/cart", icon: ShoppingCart, label: "Sepet" },
  { path: "/account", icon: User, label: "Hesap" },
];

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const fetchCartCount = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { count } = await supabase
        .from("cart")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);
      setCartCount(count || 0);
    };
    fetchCartCount();

    const channel = supabase
      .channel("cart-count-mobile")
      .on("postgres_changes", { event: "*", schema: "public", table: "cart" }, fetchCartCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Hide on admin page
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.path === "/cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
