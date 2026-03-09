import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Settings, Shield, Heart, Crown, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavbarMobileMenuProps {
  user: any;
  isAdmin: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  handleSignOut: () => void;
  t: (key: string, fallback: string) => string;
}

const NavbarMobileMenu = ({
  user,
  isAdmin,
  mobileMenuOpen,
  setMobileMenuOpen,
  handleSignOut,
  t,
}: NavbarMobileMenuProps) => {
  const navigate = useNavigate();

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden text-white hover:text-white hover:bg-white/20">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] bg-background">
        <SheetHeader>
          <SheetTitle>{t("nav.menu", "Menü")}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          <div className="relative">
            <Input
              id="mobile-search-input"
              placeholder={t("common.search", "Ürün ara...")}
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

          <Link to="/products" className="text-foreground hover:text-primary transition-colors py-2 border-b" onClick={() => setMobileMenuOpen(false)}>
            {t("nav.products", "Ürünler")}
          </Link>
          <Link to="/contact" className="text-foreground hover:text-primary transition-colors py-2 border-b" onClick={() => setMobileMenuOpen(false)}>
            {t("nav.contact", "İletişim")}
          </Link>
          <Link to="/sponsors" className="text-foreground hover:text-primary transition-colors py-2 border-b" onClick={() => setMobileMenuOpen(false)}>
            {t("nav.sponsors", "Sponsorlarımız")}
          </Link>
          <Link to="/follow" className="text-foreground hover:text-primary transition-colors py-2 border-b" onClick={() => setMobileMenuOpen(false)}>
            {t("nav.follow", "Bizi Takip Edin!")}
          </Link>

          {user ? (
            <>
              <Link to="/premium" className="text-foreground hover:text-primary transition-colors py-2 border-b flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Crown className="h-4 w-4" />
                {t("nav.premium", "Premium")}
              </Link>
              <Link to="/favorites" className="text-foreground hover:text-primary transition-colors py-2 border-b flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Heart className="h-4 w-4" />
                {t("nav.favorites", "Favorilerim")}
              </Link>
              <Link to="/account" className="text-foreground hover:text-primary transition-colors py-2 border-b flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <Settings className="h-4 w-4" />
                {t("nav.account", "Hesabım")}
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-foreground hover:text-primary transition-colors py-2 border-b flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Shield className="h-4 w-4" />
                  {t("nav.admin", "Admin Paneli")}
                </Link>
              )}
              <Button variant="outline" className="w-full mt-2" onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
                {t("nav.logout", "Çıkış Yap")}
              </Button>
            </>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full">{t("nav.login", "Giriş Yap")}</Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">{t("nav.register", "Kayıt Ol")}</Button>
              </Link>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavbarMobileMenu;
