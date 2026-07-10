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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border md:hidden safe-area-bottom shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)]">
      <div className="flex items-end justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "absolute inset-x-2 inset-y-1 rounded-2xl transition-all duration-300",
                  isActive
                    ? "bg-primary/10 scale-100 opacity-100"
                    : "scale-75 opacity-0"
                )}
              />
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isActive ? "scale-110" : "group-hover:scale-105"
                  )}
                />
                {item.path === "/cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1 animate-in zoom-in">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium relative transition-all",
                isActive ? "font-bold" : ""
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full shadow-[0_0_8px_hsl(var(--primary))]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
