import { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

const ALL_TABS = [
  { value: "orders", label: "Siparişler" },
  { value: "order-stats", label: "Sipariş İstatistikleri" },
  { value: "users", label: "Kullanıcılar" },
  { value: "user-stats", label: "Kullanıcı İstatistikleri" },
  { value: "products", label: "Ürünler" },
  { value: "categories", label: "Kategoriler" },
  { value: "questions", label: "Sorular" },
  { value: "contact", label: "İletişim" },
  { value: "social", label: "Sosyal Medya" },
  { value: "sponsors", label: "Sponsorlar" },
  { value: "analytics", label: "Ziyaretçiler" },
  { value: "finances", label: "Gelir-Gider" },
  { value: "messages", label: "Mesajlar" },
  { value: "notifications", label: "Bildirimler" },
  { value: "managers", label: "Yöneticiler" },
  { value: "coupons", label: "Kuponlar" },
  { value: "about", label: "Hakkımızda" },
  { value: "banners", label: "Kampanya Bannerları" },
  { value: "premium", label: "Premium" },
  { value: "policies", label: "Politikalar" },
  { value: "languages", label: "Diller" },
  { value: "translations", label: "Çeviriler" },
  { value: "urgency", label: "Aciliyet Ayarları" },
  { value: "shipping", label: "Kargo Ayarları" },
  { value: "shipping-companies", label: "Kargo Şirketleri" },
  { value: "product-translations", label: "Ürün Çevirileri" },
  { value: "live-support", label: "Canlı Destek" },
  { value: "admin-favorites", label: "Favoriler" },
  { value: "admin-cart", label: "Sepet Takibi" },
];

const AdminPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");
  const [visibilitySettings, setVisibilitySettings] = useState<Record<string, boolean>>({});
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadVisibilitySettings();
    }
  }, [isAdmin]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    const maxAttempts = 5;
    const baseDelay = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role, is_main_admin")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (data) {
        setIsAdmin(true);
        setIsMainAdmin(data.is_main_admin === true);
        setLoading(false);
        return;
      }

      if (error && error.code !== 'PGRST116') {
        logger.error('Error checking admin role', error);
        navigate("/");
        return;
      }

      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    navigate("/");
  };

  const loadVisibilitySettings = async () => {
    const { data } = await supabase
      .from("admin_visibility_settings")
      .select("setting_key, visible");
    
    if (data) {
      const settings: Record<string, boolean> = {};
      data.forEach((s: any) => {
        settings[s.setting_key] = s.visible !== false;
      });
      setVisibilitySettings(settings);
    }
  };

  const updateVisibility = async (tabKey: string, visible: boolean) => {
    const { data: existing } = await supabase
      .from("admin_visibility_settings")
      .select("id")
      .eq("setting_key", tabKey)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("admin_visibility_settings")
        .update({ visible })
        .eq("setting_key", tabKey);
    } else {
      await supabase
        .from("admin_visibility_settings")
        .insert({ setting_key: tabKey, visible });
    }

    setVisibilitySettings(prev => ({ ...prev, [tabKey]: visible }));
  };

  const isTabVisible = (tabKey: string): boolean => {
    if (isMainAdmin) return true;
    return visibilitySettings[tabKey] !== false;
  };

  const visibleTabs = ALL_TABS.filter(tab => isTabVisible(tab.value));

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

  if (!isAdmin) {
    return null;
  }

  const renderTabContent = (tabValue: string) => {
    switch (tabValue) {
      case "orders": return <AdminOrders />;
      case "order-stats": return <AdminOrderStats />;
      case "users": return <AdminUsers />;
      case "user-stats": return <AdminUserStats />;
      case "products": return <AdminProducts />;
      case "categories": return <AdminCategories />;
      case "questions": return <AdminProductQuestions />;
      case "contact": return <AdminContact />;
      case "social": return <AdminSocialMedia />;
      case "sponsors": return <AdminSponsors />;
      case "analytics": return <AdminAnalytics />;
      case "finances": return <AdminFinances />;
      case "messages": return <AdminMessages />;
      case "notifications": return <AdminNotifications />;
      case "managers": return <AdminManagers />;
      case "coupons": return <AdminCoupons />;
      case "about": return <AdminAbout />;
      case "banners": return <AdminCampaignBanners />;
      case "premium": return <AdminPremium />;
      case "policies": return <AdminPolicies />;
      case "languages": return <AdminLanguages />;
      case "translations": return <AdminTranslations />;
      case "urgency": return <AdminUrgencySettings />;
      case "shipping": return <AdminShipping />;
      case "shipping-companies": return <AdminShippingCompanies />;
      case "product-translations": return <AdminProductTranslations />;
      case "live-support": return <AdminLiveSupport />;
      case "admin-favorites": return <AdminFavorites />;
      case "admin-cart": return <AdminCart />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Admin Paneli</h1>
          {isMainAdmin && (
            <button
              onClick={() => setShowVisibilityPanel(!showVisibilityPanel)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showVisibilityPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Sekme Görünürlüğü
            </button>
          )}
        </div>

        {/* Visibility Panel for Main Admin */}
        {isMainAdmin && showVisibilityPanel && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Alt Yönetici Sekme Görünürlüğü</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {ALL_TABS.map((tab) => (
                  <div key={tab.value} className="flex items-center justify-between gap-2 p-2 rounded border">
                    <Label htmlFor={`visibility-${tab.value}`} className="text-sm cursor-pointer">
                      {tab.label}
                    </Label>
                    <Switch
                      id={`visibility-${tab.value}`}
                      checked={visibilitySettings[tab.value] !== false}
                      onCheckedChange={(checked) => updateVisibility(tab.value, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {isMobile ? (
          <div className="space-y-4">
            <Select value={activeTab} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full bg-background border-input">
                <SelectValue placeholder="Sekme Seçin" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border max-h-[60vh]">
                {visibleTabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {renderTabContent(activeTab)}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="overflow-x-auto pb-2">
              <TabsList className="inline-flex w-auto min-w-full flex-wrap">
                {visibleTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="min-w-[100px]">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {visibleTabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {renderTabContent(tab.value)}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminPage;
