import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("notifications-page-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setNotifications(data || []);

    // mark unread as read
    await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Bildirimlerim</h1>
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">Henüz bildiriminiz yok</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <Card key={n.id} className={!n.read ? "border-primary/40" : ""}>
                <CardHeader>
                  <CardTitle className="text-base">{new Date(n.created_at).toLocaleString("tr-TR")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{n.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default NotificationsPage;
