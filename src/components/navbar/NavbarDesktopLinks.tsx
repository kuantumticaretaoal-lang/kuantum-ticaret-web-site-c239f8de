import { Link } from "react-router-dom";
import { Crown } from "lucide-react";

interface NavbarDesktopLinksProps {
  t: (key: string, fallback: string) => string;
}

const NavbarDesktopLinks = ({ t }: NavbarDesktopLinksProps) => {
  return (
    <>
      <Link to="/products" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden lg:block">
        {t("nav.products", "Ürünler")}
      </Link>
      <Link to="/contact" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden lg:block">
        {t("nav.contact", "İletişim")}
      </Link>
      <Link to="/sponsors" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden lg:block">
        {t("nav.sponsors", "Sponsorlarımız")}
      </Link>
      <Link to="/follow" className="text-white hover:text-white/80 transition-colors text-sm lg:text-base hidden lg:block">
        {t("nav.follow", "Bizi Takip Edin!")}
      </Link>
      <Link to="/premium" className="text-accent hover:text-accent/80 transition-colors hidden lg:flex" title={t("nav.premium", "Premium")}>
        <Crown className="h-4 w-4" />
      </Link>
    </>
  );
};

export default NavbarDesktopLinks;
