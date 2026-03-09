import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/logger";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminUserStats } from "@/components/admin/AdminUserStats";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminProductQuestions } from "@/components/admin/AdminProductQuestions";
import { AdminContact } from "@/components/admin/AdminContact";
import { AdminSocialMedia } from "@/components/admin/AdminSocialMedia";
import { AdminSponsors } from "@/components/admin/AdminSponsors";
import { AdminAnalytics } from "@/components/admin/AdminAnalytics";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminManagers } from "@/components/admin/AdminManagers";
import { AdminFinances } from "@/components/admin/AdminFinances";
import { AdminMessages } from "@/components/admin/AdminMessages";
import { AdminAbout } from "@/components/admin/AdminAbout";
import { AdminCoupons } from "@/components/admin/AdminCoupons";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminOrderStats } from "@/components/admin/AdminOrderStats";
import { AdminCampaignBanners } from "@/components/admin/AdminCampaignBanners";
import { AdminPremium } from "@/components/admin/AdminPremium";
import { AdminPolicies } from "@/components/admin/AdminPolicies";
import { AdminLanguages } from "@/components/admin/AdminLanguages";
import { AdminUrgencySettings } from "@/components/admin/AdminUrgencySettings";
import AdminShipping from "@/components/admin/AdminShipping";
import { AdminTranslations } from "@/components/admin/AdminTranslations";
import AdminShippingCompanies from "@/components/admin/AdminShippingCompanies";
import AdminProductTranslations from "@/components/admin/AdminProductTranslations";
import { AdminLiveSupport } from "@/components/admin/AdminLiveSupport";
import { AdminFavorites } from "@/components/admin/AdminFavorites";
import { AdminCart } from "@/components/admin/AdminCart";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminActivityLogs } from "@/components/admin/AdminActivityLogs";

type AdminTabKey =
  | "dashboard"
  | "orders"
  | "order-stats"
  | "users"
  | "user-stats"
  | "products"
  | "categories"
  | "questions"
  | "contact"
  | "social"
  | "sponsors"
  | "analytics"
  | "finances"
  | "messages"
  | "notifications"
  | "managers"
  | "coupons"
  | "about"
  | "banners"
  | "premium"
  | "policies"
  | "languages"
  | "translations"
  | "urgency"
  | "shipping"
  | "shipping-companies"
  | "product-translations"
  | "live-support"
  | "admin-favorites"
  | "admin-cart"
  | "activity-logs";

interface TabConfig {
  key: AdminTabKey;
  label: string;
  Component: () => JSX.Element;
}

const ADMIN_TABS: TabConfig[] = [
  { key: "orders", label: "Siparişler", Component: AdminOrders },
  { key: "order-stats", label: "Sipariş İstatistikleri", Component: AdminOrderStats },
  { key: "users", label: "Kullanıcılar", Component: AdminUsers },
  { key: "user-stats", label: "Kullanıcı İstatistikleri", Component: AdminUserStats },
  { key: "products", label: "Ürünler", Component: AdminProducts },
  { key: "categories", label: "Kategoriler", Component: AdminCategories },
  { key: "questions", label: "Sorular", Component: AdminProductQuestions },
  { key: "contact", label: "İletişim", Component: AdminContact },
  { key: "social", label: "Sosyal Medya", Component: AdminSocialMedia },
  { key: "sponsors", label: "Sponsorlar", Component: AdminSponsors },
  { key: "analytics", label: "Ziyaretçiler", Component: AdminAnalytics },
  { key: "finances", label: "Gelir-Gider", Component: AdminFinances },
  { key: "messages", label: "Mesajlar", Component: AdminMessages },
  { key: "notifications", label: "Bildirimler", Component: AdminNotifications },
  { key: "managers", label: "Yöneticiler", Component: AdminManagers },
  { key: "coupons", label: "Kuponlar", Component: AdminCoupons },
  { key: "about", label: "Hakkımızda", Component: AdminAbout },
  { key: "banners", label: "Kampanya Bannerları", Component: AdminCampaignBanners },
  { key: "premium", label: "Premium", Component: AdminPremium },
  { key: "policies", label: "Politikalar", Component: AdminPolicies },
  { key: "languages", label: "Diller", Component: AdminLanguages },
  { key: "translations", label: "Çeviriler", Component: AdminTranslations },
  { key: "urgency", label: "Aciliyet Ayarları", Component: AdminUrgencySettings },
  { key: "shipping", label: "Kargo Ayarları", Component: AdminShipping },
  { key: "shipping-companies", label: "Kargo Şirketleri", Component: AdminShippingCompanies },
  { key: "product-translations", label: "Ürün Çevirileri", Component: AdminProductTranslations },
  { key: "live-support", label: "Canlı Destek", Component: AdminLiveSupport },
  { key: "admin-favorites", label: "Favoriler", Component: AdminFavorites },
  { key: "admin-cart", label: "Sepet Takibi", Component: AdminCart },
];

const AdminPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTabKey>("orders");
  const [tabVisibility, setTabVisibility] = useState<Record<string, boolean>>({});

  const availableTabs = useMemo(() => {
    if (isMainAdmin) return ADMIN_TABS;
    return ADMIN_TABS.filter((tab) => tabVisibility[tab.key] !== false);
  }, [isMainAdmin, tabVisibility]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!availableTabs.length) return;
    const activeStillExists = availableTabs.some((t) => t.key === activeTab);
    if (!activeStillExists) {
      setActiveTab(availableTabs[0].key);
    }
  }, [availableTabs, activeTab]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as AdminTabKey);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const checkAdminAccess = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    const { data, error } = await (supabase as any)
      .from("user_roles")
      .select("role, is_main_admin")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      logger.error("Error checking admin role", error);
      navigate("/");
      return;
    }

    if (!data) {
      navigate("/");
      return;
    }

    setIsAdmin(true);
    const mainAdmin = data.is_main_admin === true;
    setIsMainAdmin(mainAdmin);

    if (!mainAdmin) {
      const { data: rows, error: visibilityError } = await (supabase as any)
        .from("admin_visibility_settings")
        .select("setting_key, visible")
        .like("setting_key", `manager:${session.user.id}:tab:%`);

      if (visibilityError) {
        logger.error("Tab visibility load failed", visibilityError);
      } else {
        const visibilityMap: Record<string, boolean> = {};
        (rows || []).forEach((row: any) => {
          const tabKey = String(row.setting_key).split(":tab:")[1];
          if (tabKey) {
            visibilityMap[tabKey] = row.visible !== false;
          }
        });
        setTabVisibility(visibilityMap);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Yükleniyor...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Paneli</h1>

        {availableTabs.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">
            Bu hesap için aktif yönetim sekmesi bulunmuyor.
          </div>
        ) : isMobile ? (
          <div className="space-y-4">
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Sekme Seçin" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border max-h-[60vh] overflow-y-auto">
                {availableTabs.map((tab) => (
                  <SelectItem key={tab.key} value={tab.key}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {availableTabs.map((tab) => {
              if (tab.key !== activeTab) return null;
              const TabComponent = tab.Component;
              return <TabComponent key={tab.key} />;
            })}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="overflow-x-auto pb-2">
              <TabsList className="inline-flex w-auto min-w-full flex-wrap">
                {availableTabs.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key} className="min-w-[120px]">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {availableTabs.map((tab) => {
              const TabComponent = tab.Component;
              return (
                <TabsContent key={tab.key} value={tab.key}>
                  <TabComponent />
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminPage;
