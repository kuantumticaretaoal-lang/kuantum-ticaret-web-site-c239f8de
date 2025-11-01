import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export const AdminContact = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();

    const channel = supabase
      .channel("site-settings-changes")
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
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    if (!settings?.id) return;
    
    const { error } = await (supabase as any)
      .from("site_settings")
      .update(settings)
      .eq("id", settings.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ayarlar güncellenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "İletişim bilgileri güncellendi",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>İletişim Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Yükleniyor...</p>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>İletişim Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Ayarlar bulunamadı.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>İletişim Bilgileri</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Telefon</Label>
            <Input
              value={settings.phone || ""}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={settings.email || ""}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
          </div>
          <div>
            <Label>Adres</Label>
            <Input
              value={settings.address || ""}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </div>
          <div>
            <Label>Konum URL</Label>
            <Input
              value={settings.location_url || ""}
              onChange={(e) => setSettings({ ...settings, location_url: e.target.value })}
              placeholder="Google Maps linki"
            />
          </div>
          <Button onClick={updateSettings} className="w-full">
            Güncelle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
