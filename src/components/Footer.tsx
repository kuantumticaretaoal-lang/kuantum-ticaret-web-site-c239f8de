import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Mail, Phone } from "lucide-react";

const Footer = () => {
  const [settings, setSettings] = useState<any>(null);

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
      console.error("Error loading settings:", error);
    }
  };
  return (
    <footer className="bg-[#1e3a5f] text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-3">Kuantum Ticaret</h3>
            <p className="text-white/80">Kaliteli ürünler, güvenilir hizmet</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-3">Hızlı Linkler</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-white/80 hover:text-white transition-colors">
                  Ana Sayfa
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-white/80 hover:text-white transition-colors">
                  Ürünler
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-white/80 hover:text-white transition-colors">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-bold mb-3">İletişim</h3>
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
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 pt-6 text-center text-white/70">
          <p>© 2025 Kuantum Ticaret. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
