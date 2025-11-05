import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminUsers } from "@/components/admin/AdminUsers";
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

const AdminPage = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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
        
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid grid-cols-3 lg:grid-cols-13 gap-2">
            <TabsTrigger value="orders">Siparişler</TabsTrigger>
            <TabsTrigger value="users">Kullanıcılar</TabsTrigger>
            <TabsTrigger value="products">Ürünler</TabsTrigger>
            <TabsTrigger value="questions">Sorular</TabsTrigger>
            <TabsTrigger value="contact">İletişim</TabsTrigger>
            <TabsTrigger value="social">Sosyal Medya</TabsTrigger>
            <TabsTrigger value="sponsors">Sponsorlar</TabsTrigger>
            <TabsTrigger value="analytics">Ziyaretçiler</TabsTrigger>
            <TabsTrigger value="finances">Gelir-Gider</TabsTrigger>
            <TabsTrigger value="messages">Mesajlar</TabsTrigger>
            <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
            <TabsTrigger value="managers">Yöneticiler</TabsTrigger>
            <TabsTrigger value="about">Hakkımızda</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <AdminOrders />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="products">
            <AdminProducts />
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

          <TabsContent value="about">
            <AdminAbout />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AdminPage;
