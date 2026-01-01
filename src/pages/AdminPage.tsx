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

const AdminPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    // Retry with exponential backoff instead of arbitrary delay
    const maxAttempts = 5;
    const baseDelay = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      // Success - user is admin
      if (data) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // Real error (not just missing data)
      if (error && error.code !== 'PGRST116') {
        logger.error('Error checking admin role', error);
        navigate("/");
        return;
      }

      // Wait before retry with exponential backoff
      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // After all attempts, user is not admin
    navigate("/");
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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Paneli</h1>
        
        {isMobile ? (
          <div className="space-y-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sekme Seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orders">Siparişler</SelectItem>
                <SelectItem value="order-stats">Sipariş İstatistikleri</SelectItem>
                <SelectItem value="users">Kullanıcılar</SelectItem>
                <SelectItem value="user-stats">Kullanıcı İstatistikleri</SelectItem>
                <SelectItem value="products">Ürünler</SelectItem>
                <SelectItem value="categories">Kategoriler</SelectItem>
                <SelectItem value="questions">Sorular</SelectItem>
                <SelectItem value="contact">İletişim</SelectItem>
                <SelectItem value="social">Sosyal Medya</SelectItem>
                <SelectItem value="sponsors">Sponsorlar</SelectItem>
                <SelectItem value="analytics">Ziyaretçiler</SelectItem>
                <SelectItem value="finances">Gelir-Gider</SelectItem>
                <SelectItem value="messages">Mesajlar</SelectItem>
                <SelectItem value="notifications">Bildirimler</SelectItem>
                <SelectItem value="managers">Yöneticiler</SelectItem>
                <SelectItem value="coupons">Kuponlar</SelectItem>
                <SelectItem value="about">Hakkımızda</SelectItem>
                <SelectItem value="banners">Kampanya Bannerları</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="policies">Politikalar</SelectItem>
                <SelectItem value="languages">Diller</SelectItem>
                <SelectItem value="urgency">Aciliyet Ayarları</SelectItem>
              </SelectContent>
            </Select>

            {activeTab === "orders" && <AdminOrders />}
            {activeTab === "order-stats" && <AdminOrderStats />}
            {activeTab === "users" && <AdminUsers />}
            {activeTab === "user-stats" && <AdminUserStats />}
            {activeTab === "products" && <AdminProducts />}
            {activeTab === "categories" && <AdminCategories />}
            {activeTab === "questions" && <AdminProductQuestions />}
            {activeTab === "contact" && <AdminContact />}
            {activeTab === "social" && <AdminSocialMedia />}
            {activeTab === "sponsors" && <AdminSponsors />}
            {activeTab === "analytics" && <AdminAnalytics />}
            {activeTab === "finances" && <AdminFinances />}
            {activeTab === "messages" && <AdminMessages />}
            {activeTab === "notifications" && <AdminNotifications />}
            {activeTab === "managers" && <AdminManagers />}
            {activeTab === "coupons" && <AdminCoupons />}
            {activeTab === "about" && <AdminAbout />}
            {activeTab === "banners" && <AdminCampaignBanners />}
            {activeTab === "premium" && <AdminPremium />}
            {activeTab === "policies" && <AdminPolicies />}
            {activeTab === "languages" && <AdminLanguages />}
            {activeTab === "urgency" && <AdminUrgencySettings />}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto min-w-full flex-wrap">
                <TabsTrigger value="orders" className="min-w-[100px]">Siparişler</TabsTrigger>
                <TabsTrigger value="order-stats" className="min-w-[130px]">Sipariş İstatistikleri</TabsTrigger>
                <TabsTrigger value="users" className="min-w-[100px]">Kullanıcılar</TabsTrigger>
                <TabsTrigger value="user-stats" className="min-w-[130px]">Kullanıcı İstatistikleri</TabsTrigger>
                <TabsTrigger value="products" className="min-w-[100px]">Ürünler</TabsTrigger>
                <TabsTrigger value="categories" className="min-w-[100px]">Kategoriler</TabsTrigger>
                <TabsTrigger value="questions" className="min-w-[100px]">Sorular</TabsTrigger>
                <TabsTrigger value="contact" className="min-w-[100px]">İletişim</TabsTrigger>
                <TabsTrigger value="social" className="min-w-[100px]">Sosyal Medya</TabsTrigger>
                <TabsTrigger value="sponsors" className="min-w-[100px]">Sponsorlar</TabsTrigger>
                <TabsTrigger value="analytics" className="min-w-[100px]">Ziyaretçiler</TabsTrigger>
                <TabsTrigger value="finances" className="min-w-[100px]">Gelir-Gider</TabsTrigger>
                <TabsTrigger value="messages" className="min-w-[100px]">Mesajlar</TabsTrigger>
                <TabsTrigger value="notifications" className="min-w-[100px]">Bildirimler</TabsTrigger>
                <TabsTrigger value="managers" className="min-w-[100px]">Yöneticiler</TabsTrigger>
                <TabsTrigger value="coupons" className="min-w-[100px]">Kuponlar</TabsTrigger>
                <TabsTrigger value="about" className="min-w-[100px]">Hakkımızda</TabsTrigger>
                <TabsTrigger value="banners" className="min-w-[130px]">Kampanya Bannerları</TabsTrigger>
                <TabsTrigger value="premium" className="min-w-[100px]">Premium</TabsTrigger>
                <TabsTrigger value="policies" className="min-w-[100px]">Politikalar</TabsTrigger>
                <TabsTrigger value="languages" className="min-w-[100px]">Diller</TabsTrigger>
                <TabsTrigger value="urgency" className="min-w-[130px]">Aciliyet Ayarları</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="orders">
              <AdminOrders />
            </TabsContent>

            <TabsContent value="order-stats">
              <AdminOrderStats />
            </TabsContent>

            <TabsContent value="users">
              <AdminUsers />
            </TabsContent>

            <TabsContent value="user-stats">
              <AdminUserStats />
            </TabsContent>

            <TabsContent value="products">
              <AdminProducts />
            </TabsContent>

            <TabsContent value="categories">
              <AdminCategories />
            </TabsContent>

            <TabsContent value="questions">
              <AdminProductQuestions />
            </TabsContent>

            <TabsContent value="contact">
              <AdminContact />
            </TabsContent>

            <TabsContent value="social">
              <AdminSocialMedia />
            </TabsContent>

            <TabsContent value="sponsors">
              <AdminSponsors />
            </TabsContent>

            <TabsContent value="analytics">
              <AdminAnalytics />
            </TabsContent>

            <TabsContent value="finances">
              <AdminFinances />
            </TabsContent>

            <TabsContent value="notifications">
              <AdminNotifications />
            </TabsContent>

            <TabsContent value="messages">
              <AdminMessages />
            </TabsContent>

            <TabsContent value="managers">
              <AdminManagers />
            </TabsContent>

            <TabsContent value="coupons">
              <AdminCoupons />
            </TabsContent>

            <TabsContent value="about">
              <AdminAbout />
            </TabsContent>

            <TabsContent value="banners">
              <AdminCampaignBanners />
            </TabsContent>

            <TabsContent value="premium">
              <AdminPremium />
            </TabsContent>

            <TabsContent value="policies">
              <AdminPolicies />
            </TabsContent>

            <TabsContent value="languages">
              <AdminLanguages />
            </TabsContent>

            <TabsContent value="urgency">
              <AdminUrgencySettings />
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminPage;
