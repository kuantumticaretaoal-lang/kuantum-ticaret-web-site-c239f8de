import { Button } from "@/components/ui/button";
import { User, Settings, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarUserMenuProps {
  user: any;
  isAdmin: boolean;
  handleSignOut: () => void;
  t: (key: string, fallback: string) => string;
}

const NavbarUserMenu = ({ user, isAdmin, handleSignOut, t }: NavbarUserMenuProps) => {
  const navigate = useNavigate();

  if (!user) {
    return (
      <>
        <Link to="/login" className="hidden lg:block">
          <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20 text-sm lg:text-base">
            {t("nav.login", "Giriş Yap")}
          </Button>
        </Link>
        <Link to="/register" className="hidden lg:block">
          <Button className="bg-secondary hover:bg-secondary/90 text-white text-sm lg:text-base">
            {t("nav.register", "Kayıt Ol")}
          </Button>
        </Link>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="text-white hover:text-white hover:bg-white/20 text-sm lg:text-base hidden lg:flex">
          <User className="h-4 w-4 mr-2" />
          {t("nav.account", "Hesabım")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => navigate("/account")}>
          <Settings className="h-4 w-4 mr-2" />
          {t("nav.settings", "Hesap Ayarları")}
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/admin")}>
              <Shield className="h-4 w-4 mr-2" />
              {t("nav.admin", "Admin Paneli")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          {t("nav.logout", "Çıkış Yap")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavbarUserMenu;
