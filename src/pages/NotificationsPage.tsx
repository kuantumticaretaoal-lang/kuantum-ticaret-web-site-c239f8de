import { useEffect, useState, useMemo } from "react";
import SEO from "@/components/SEO";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellOff, CheckCheck, Trash2, Mail, MailOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

type Notification = {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
};

const NotificationsPage = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("notifications-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications(data || []);
    setLoading(false);
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.read);
    if (filter === "read") return notifications.filter((n) => n.read);
    return notifications;
  }, [notifications, filter]);

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any)
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    toast({ title: "Tüm bildirimler okundu olarak işaretlendi" });
    load();
  };

  const toggleRead = async (n: Notification) => {
    await (supabase as any).from("notifications").update({ read: !n.read }).eq("id", n.id);
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("notifications").delete().eq("id", id);
    toast({ title: "Bildirim silindi" });
    load();
  };

  const clearAll = async () => {
    if (!confirm("Tüm bildirimler silinsin mi?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("notifications").delete().eq("user_id", user.id);
    toast({ title: "Tümü silindi" });
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Bildirimlerim" description="Sipariş güncellemeleri, kampanya ve sistem bildirimleriniz." path="/notifications" noindex />
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Bell className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Bildirimler</h1>
            {unreadCount > 0 && <Badge variant="destructive">{unreadCount} yeni</Badge>}
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" onClick={markAllRead}>
                <CheckCheck className="h-4 w-4 mr-1" /> Tümünü Okundu İşaretle
              </Button>
            )}
            {notifications.length > 0 && (
              <Button size="sm" variant="outline" onClick={clearAll} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" /> Tümünü Sil
              </Button>
            )}
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">Tümü ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Okunmamış ({unreadCount})</TabsTrigger>
            <TabsTrigger value="read">Okunmuş ({notifications.length - unreadCount})</TabsTrigger>
          </TabsList>

          <TabsContent value={filter}>
            {loading ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Yükleniyor...</CardContent></Card>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BellOff className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Bu kategoride bildirim yok</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((n) => (
                  <Card
                    key={n.id}
                    className={`transition-all ${!n.read ? "border-l-4 border-l-primary bg-primary/5" : "opacity-75"}`}
                  >
                    <CardContent className="py-3 px-4 flex items-start gap-3">
                      <div className="mt-1">
                        {n.read ? (
                          <MailOpen className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Mail className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? "font-semibold" : "text-muted-foreground"}`}>{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: tr })}
                          {!n.read && <span className="ml-2 text-primary font-medium">• YENİ</span>}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toggleRead(n)} title={n.read ? "Okunmadı işaretle" : "Okundu işaretle"}>
                          {n.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(n.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default NotificationsPage;
