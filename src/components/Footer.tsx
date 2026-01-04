import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import { logger } from "@/lib/logger";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslations } from "@/hooks/use-translations";

const Footer = () => {
  const [settings, setSettings] = useState<any>(null);
  const { t } = useTranslations();

  useEffect(() => {
    loadSettings();

    const channel = supabase
      .channel("footer-settings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => {
        loadSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await (supabase as any).from("site_settings").select("*").single();
      if (data) setSettings(data);
    } catch (error) {
      logger.error("Settings yüklenemedi", error);
    }
  };

  return (
    <footer className="bg-[#1e3a5f] text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-3">Kuantum Ticaret</h3>
            <p className="text-white/80">Kaliteli ürünler, güvenilir hizmet!</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-3">{t("footer.quickLinks", "Hızlı Linkler")}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-white/80 hover:text-white transition-colors">
                  {t("nav.home", "Ana Sayfa")}
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-white/80 hover:text-white transition-colors">
                  {t("nav.products", "Ürünler")}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-white transition-colors">
                  {t("nav.contact", "İletişim")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-bold mb-3">{t("footer.contact", "İletişim")}</h3>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-white/80">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${settings?.email || "kuantum.ticaret.aoal@gmail.com"}`} className="hover:text-white transition-colors">
                  {settings?.email || "kuantum.ticaret.aoal@gmail.com"}
                </a>
              </li>
              <li className="flex items-center gap-2 text-white/80">
                <Phone className="h-4 w-4" />
                <a href={`tel:${settings?.phone || "+905383713923"}`} className="hover:text-white transition-colors">
                  {settings?.phone || "+90 (538) 371 39 23"}
                </a>
              </li>
              {settings?.address && (
                <li className="flex items-start gap-2 text-white/80">
                  <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                  {settings.location_url ? (
                    <a 
                      href={settings.location_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {settings.address}
                    </a>
                  ) : (
                    <span>{settings.address}</span>
                  )}
                </li>
              )}
            </ul>
          </div>

          {/* Language/Currency Selector */}
          <div>
            <h3 className="text-xl font-bold mb-3">{t("footer.language", "Dil & Para Birimi")}</h3>
            <div className="mt-2">
              <LanguageSelector variant="footer" />
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-6 text-center text-white/70">
          <p>© {new Date().getFullYear()} Kuantum Ticaret. {t("footer.rights", "Tüm hakları saklıdır")}.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
