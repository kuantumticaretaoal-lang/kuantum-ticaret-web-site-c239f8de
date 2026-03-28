import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ShoppingCart, Mail, RefreshCw } from "lucide-react";

export const AdminAbandonedCarts = () => {
  const { toast } = useToast();
  const [abandonedCarts, setAbandonedCarts] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get abandoned carts (carts older than 24h with user_id)
    const { data: carts } = await (supabase as any)
      .from("cart")
      .select(`*, products (title, price, discounted_price), profiles:user_id (first_name, last_name, email)`)
      .lt("updated_at", twentyFourHoursAgo)
      .not("user_id", "is", null);

    // Get sent reminders
    const { data: reminderData } = await (supabase as any)
      .from("abandoned_cart_reminders")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(50);

    setAbandonedCarts(carts || []);
    setReminders(reminderData || []);
    setLoading(false);
  };

  const sendReminders = async () => {
    setSending(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await supabase.functions.invoke("abandoned-cart-email", {
        body: { checkAll: true },
      });

      if (res.error) {
        toast({ variant: "destructive", title: "Hata", description: "E-posta gönderilemedi" });
      } else {
        const data = res.data;
        await logAdminActivity("abandoned_cart_reminder", `${data?.emailsSent || 0} terk edilmiş sepet hatırlatması gönderildi`, "cart");
        toast({
          title: "Başarılı",
          description: `${data?.emailsSent || 0} kullanıcıya hatırlatma e-postası gönderildi.`,
        });
        loadData();
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Hata", description: "İstek başarısız oldu" });
    }
    setSending(false);
  };

  // Group carts by user
  const userGroups = abandonedCarts.reduce((acc: Record<string, any[]>, cart) => {
    const uid = cart.user_id;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(cart);
    return acc;
  }, {});

  if (loading) return <p className="text-center py-8">Yükleniyor...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Terk Edilmiş Sepetler ({Object.keys(userGroups).length} kullanıcı)
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Yenile
            </Button>
            <Button size="sm" onClick={sendReminders} disabled={sending || Object.keys(userGroups).length === 0}>
              <Mail className="h-4 w-4 mr-1" /> {sending ? "Gönderiliyor..." : "Toplu Hatırlatma Gönder"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(userGroups).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Terk edilmiş sepet bulunamadı.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Ürünler</TableHead>
                    <TableHead>Toplam</TableHead>
                    <TableHead>Son Güncelleme</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(userGroups).map(([userId, items]: [string, any[]]) => {
                    const profile = items[0]?.profiles;
                    const total = items.reduce((sum, item) => {
                      const price = parseFloat(item.products?.discounted_price || item.products?.price || 0);
                      return sum + price * item.quantity;
                    }, 0);
                    const oldestUpdate = items.reduce((oldest, item) => {
                      const d = new Date(item.updated_at);
                      return d < oldest ? d : oldest;
                    }, new Date());

                    return (
                      <TableRow key={userId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{profile ? `${profile.first_name} ${profile.last_name}` : "—"}</p>
                            <p className="text-xs text-muted-foreground">{profile?.email || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {items.map((item, i) => (
                            <Badge key={i} variant="outline" className="mr-1 mb-1 text-xs">
                              {item.products?.title} x{item.quantity}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell className="font-medium">₺{total.toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{format(oldestUpdate, "dd MMM yyyy HH:mm", { locale: tr })}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {reminders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Son Gönderilen Hatırlatmalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reminders.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <span>{r.user_id?.slice(0, 8)}...</span>
                  <Badge variant={r.email_sent ? "default" : "outline"}>
                    {r.email_sent ? "Gönderildi" : "Beklemede"}
                  </Badge>
                  <span className="text-muted-foreground">
                    {r.sent_at ? format(new Date(r.sent_at), "dd MMM HH:mm", { locale: tr }) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
