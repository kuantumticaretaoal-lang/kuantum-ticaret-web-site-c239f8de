import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Truck, Save } from "lucide-react";

interface ShippingSetting {
  id: string;
  delivery_type: string;
  base_fee: number;
  is_active: boolean;
}

const AdminShipping = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ShippingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from("shipping_settings")
      .select("*")
      .order("delivery_type");

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kargo ayarları yüklenemedi",
      });
    } else if (data) {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleUpdate = async (id: string, updates: Partial<ShippingSetting>) => {
    const updatedSettings = settings.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    setSettings(updatedSettings);
  };

  const saveSettings = async () => {
    setSaving(true);

    for (const setting of settings) {
      const { error } = await supabase
        .from("shipping_settings")
        .update({
          base_fee: setting.base_fee,
          is_active: setting.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", setting.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Ayarlar kaydedilemedi",
        });
        setSaving(false);
        return;
      }
    }

    toast({
      title: "Başarılı",
      description: "Kargo ayarları güncellendi",
    });
    setSaving(false);
  };

  const getDeliveryTypeLabel = (type: string) => {
    switch (type) {
      case "home_delivery":
        return "Adrese Teslim";
      case "pickup":
        return "Yerinden Alma";
      default:
        return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" />
          Kargo Ayarları
        </h2>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>

      <div className="grid gap-4">
        {settings.map((setting) => (
          <Card key={setting.id}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {getDeliveryTypeLabel(setting.delivery_type)}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`active-${setting.id}`} className="text-sm text-muted-foreground">
                    Aktif
                  </Label>
                  <Switch
                    id={`active-${setting.id}`}
                    checked={setting.is_active}
                    onCheckedChange={(checked) => handleUpdate(setting.id, { is_active: checked })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`fee-${setting.id}`}>Kargo Ücreti (₺)</Label>
                  <Input
                    id={`fee-${setting.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={setting.base_fee}
                    onChange={(e) =>
                      handleUpdate(setting.id, { base_fee: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    {setting.delivery_type === "home_delivery"
                      ? "Adrese teslim siparişlerde uygulanacak kargo ücreti. Premium üyeler için ücretsiz olabilir."
                      : "Yerinden alma seçeneği için ek ücret (genellikle 0)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Bilgi</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Premium üyeler için ücretsiz kargo seçeneği planlardan ayarlanır</li>
            <li>• Kargo ücreti sepet sayfasında otomatik olarak hesaplanır</li>
            <li>• Aktif olmayan teslimat seçenekleri müşterilere gösterilmez</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminShipping;
