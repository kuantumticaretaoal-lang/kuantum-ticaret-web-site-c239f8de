import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User, Settings, Shield, ShoppingCart } from "lucide-react";
import logo from "@/assets/logo.jpg";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth";
import { getCartItems, getSessionId } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => checkAdminStatus(session.user.id), 0);
      } else {
        setIsAdmin(false);
      }
      setTimeout(loadCartCount, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => checkAdminStatus(session.user.id), 0);
      }
    });

    loadCartCount();

    const cartChannel = supabase
      .channel("navbar-cart-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cart" }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        const sessionId = getSessionId();
        
        if (
          (user && (payload.new as any)?.user_id === user.id) ||
          (!user && (payload.new as any)?.session_id === sessionId) ||
          (payload.old as any)?.user_id === user?.id ||
          (payload.old as any)?.session_id === sessionId
        ) {
          setTimeout(loadCartCount, 0);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(cartChannel);
    };
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const loadCartCount = async () => {
    const items = await getCartItems();
    const total = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    setCartCount(total);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Çıkış yapılırken bir hata oluştu",
      });
    } else {
      toast({
        title: "Çıkış Başarılı",
        description: "Görüşmek üzere!",
      });
      navigate("/");
    }
  };

  return (
    <nav className="bg-gradient-to-r from-primary via-primary-glow to-secondary text-white py-4 sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Kuantum Ticaret" className="h-10 w-auto bg-white p-1 rounded" />
            <span className="font-bold text-lg hidden sm:block">KUANTUM TİCARET</span>
          </Link>
          
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Input 
                placeholder="Ürün ara..." 
                className="bg-white/90 text-foreground border-0 pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            <Link to="/products" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden sm:block">
              Ürünler
            </Link>
            <Link to="/contact" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden sm:block">
              İletişim
            </Link>
            <Link to="/sponsors" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden md:block">
              Sponsorlarımız
            </Link>
            <Link to="/follow" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden lg:block">
              Bizi Takip Edin!
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white hover:text-white hover:bg-white/20"
              onClick={() => navigate("/cart")}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary">
                  {cartCount}
                </Badge>
              )}
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20 text-sm lg:text-base">
                    <User className="h-4 w-4 mr-2" />
                    Hesabım
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/account")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Hesap Ayarları
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin")}>
                        <Shield className="h-4 w-4 mr-2" />
                        Admin Paneli
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20 text-sm lg:text-base">
                    Giriş Yap
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-secondary hover:bg-secondary/90 text-white text-sm lg:text-base">
                    Kayıt Ol
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
