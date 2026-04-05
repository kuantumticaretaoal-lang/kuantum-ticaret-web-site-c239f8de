import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bell } from "lucide-react";

export const NotificationPreferences = () => {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    order_updates: true,
    promotions: true,
    stock_alerts: true,
    newsletter: true,
    push_enabled: true,
    email_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPrefs(); }, []);

  const loadPrefs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase as any)
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setPrefs({
        order_updates: data.order_updates ?? true,
        promotions: data.promotions ?? true,
        stock_alerts: data.stock_alerts ?? true,
        newsletter: data.newsletter ?? true,
        push_enabled: data.push_enabled ?? true,
        email_enabled: data.email_enabled ?? true,
      });
    }
    setLoading(false);
  };

  const updatePref = async (key: string, value: boolean) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await (supabase as any)
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...newPrefs, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) toast({ variant: "destructive", title: "Hata", description: "Tercih kaydedilemedi" });
  };

  if (loading) return null;

  const items = [
    { key: "order_updates", label: "Sipariş Güncellemeleri", desc: "Sipariş durumu değişikliklerinde bildirim" },
    { key: "promotions", label: "Kampanya & İndirimler", desc: "Yeni kampanya ve indirim duyuruları" },
    { key: "stock_alerts", label: "Stok Bildirimleri", desc: "Beklediğiniz ürünler stoğa girdiğinde" },
    { key: "newsletter", label: "Bülten", desc: "Haftalık bülten e-postaları" },
    { key: "push_enabled", label: "Push Bildirimler", desc: "Tarayıcı push bildirimleri" },
    { key: "email_enabled", label: "E-posta Bildirimleri", desc: "E-posta ile bildirimler" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="h-5 w-5" /> Bildirim Tercihleri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <Label className="font-medium">{item.label}</Label>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch
              checked={(prefs as any)[item.key]}
              onCheckedChange={(v) => updatePref(item.key, v)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
