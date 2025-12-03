import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User, Settings, Shield, ShoppingCart, Bell, Menu, Heart } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const Navbar = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => checkAdminStatus(session.user.id), 0);
        setTimeout(loadUnreadCount, 0);
      } else {
        setIsAdmin(false);
        setUnreadCount(0);
      }
      setTimeout(loadCartCount, 0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => checkAdminStatus(session.user.id), 0);
        setTimeout(loadUnreadCount, 0);
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

    const notificationsChannel = supabase
      .channel("navbar-notifications-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const newUserId = (payload.new as any)?.user_id;
        const oldUserId = (payload.old as any)?.user_id;
        if (newUserId === user.id || oldUserId === user.id) {
          setTimeout(loadUnreadCount, 0);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(cartChannel);
      supabase.removeChannel(notificationsChannel);
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

  const loadUnreadCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("read", false);
    setUnreadCount(data?.length || 0);
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
          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-white hover:text-white hover:bg-white/20">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-background">
              <SheetHeader>
                <SheetTitle>Menü</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {/* Mobile Search */}
                <div className="relative">
                  <Input 
                    id="mobile-search-input"
                    placeholder="Ürün ara..." 
                    className="bg-background text-foreground border pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = (e.target as HTMLInputElement).value.trim();
                    navigate(q ? `/products?query=${encodeURIComponent(q)}` : '/products');
                    setMobileMenuOpen(false);
                  }
                }}
                  />
                  <Search 
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" 
                    onClick={() => {
                      const input = document.getElementById('mobile-search-input') as HTMLInputElement;
                      const q = input?.value.trim();
                      navigate(q ? `/products?query=${encodeURIComponent(q)}` : '/products');
                      setMobileMenuOpen(false);
                    }}
                  />
                </div>

                {/* Mobile Navigation Links */}
                <Link 
                  to="/products" 
                  className="text-foreground hover:text-primary transition-colors py-2 border-b"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Ürünler
                </Link>
                <Link 
                  to="/contact" 
                  className="text-foreground hover:text-primary transition-colors py-2 border-b"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  İletişim
                </Link>
                <Link 
                  to="/sponsors" 
                  className="text-foreground hover:text-primary transition-colors py-2 border-b"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sponsorlarımız
                </Link>
                <Link 
                  to="/follow" 
                  className="text-foreground hover:text-primary transition-colors py-2 border-b"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Bizi Takip Edin!
                </Link>

                {/* Mobile User Actions */}
                {user ? (
                  <>
                    <Link 
                      to="/favorites" 
                      className="text-foreground hover:text-primary transition-colors py-2 border-b flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Heart className="h-4 w-4" />
                      Favorilerim
                    </Link>
                    <Link 
                      to="/account" 
                      className="text-foreground hover:text-primary transition-colors py-2 border-b flex items-center gap-2"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Hesap Ayarları
                    </Link>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        className="text-foreground hover:text-primary transition-colors py-2 border-b flex items-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Shield className="h-4 w-4" />
                        Admin Paneli
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      Çıkış Yap
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 mt-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Giriş Yap
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full">
                        Kayıt Ol
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Kuantum Ticaret" className="h-10 w-auto bg-white p-1 rounded" />
            <span className="font-bold text-lg hidden sm:block">KUANTUM TİCARET</span>
          </Link>
          
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Input 
                id="navbar-search-input"
                placeholder="Ürün ara..." 
                className="bg-white/90 text-foreground border-0 pr-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const q = (e.target as HTMLInputElement).value.trim();
                    navigate(q ? `/products?query=${encodeURIComponent(q)}` : '/products');
                  }
                }}
              />
              <Search 
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" 
                onClick={() => {
                  const input = document.getElementById('navbar-search-input') as HTMLInputElement;
                  const q = input?.value.trim();
                  navigate(q ? `/products?query=${encodeURIComponent(q)}` : '/products');
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            <Link to="/products" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden lg:block">
              Ürünler
            </Link>
            <Link to="/contact" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden lg:block">
              İletişim
            </Link>
            <Link to="/sponsors" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden lg:block">
              Sponsorlarımız
            </Link>
            <Link to="/follow" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden lg:block">
              Bizi Takip Edin!
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white hover:text-white hover:bg-white/20"
              onClick={() => navigate("/favorites")}
            >
              <Heart className="h-5 w-5" />
            </Button>
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
            <Button
              variant="ghost"
              size="icon"
              className="relative text-white hover:text-white hover:bg-white/20"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-secondary">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20 text-sm lg:text-base hidden lg:flex">
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
                <Link to="/login" className="hidden lg:block">
                  <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20 text-sm lg:text-base">
                    Giriş Yap
                  </Button>
                </Link>
                <Link to="/register" className="hidden lg:block">
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
