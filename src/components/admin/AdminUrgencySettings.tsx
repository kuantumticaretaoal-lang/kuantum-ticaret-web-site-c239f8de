import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertTriangle, Eye, ShoppingCart, Package } from "lucide-react";

interface UrgencySetting {
  id: string;
  setting_key: string;
  is_enabled: boolean;
  display_text: string | null;
  threshold: number | null;
}

export const AdminUrgencySettings = () => {
  const [settings, setSettings] = useState<UrgencySetting[]>([]);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('urgency_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      toast.error('Ayarlar yüklenirken hata oluştu');
      return;
    }

    setSettings(data || []);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSetting = async (id: string, updates: Partial<UrgencySetting>) => {
    const { error } = await supabase
      .from('urgency_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Ayar güncellenirken hata oluştu');
      return;
    }

    toast.success('Ayar güncellendi');
    loadSettings();
  };

  const getSettingInfo = (key: string) => {
    switch (key) {
      case 'low_stock_warning':
        return {
          title: 'Düşük Stok Uyarısı',
          description: 'Stok belirli bir seviyenin altına düştüğünde uyarı göster',
          icon: <Package className="h-5 w-5 text-orange-500" />,
          placeholder: 'Son {count} ürün!',
          hasThreshold: true,
        };
      case 'view_count_display':
        return {
          title: 'Görüntülenme Sayısı',
          description: 'Ürünün kaç kişi tarafından görüntülendiğini göster',
          icon: <Eye className="h-5 w-5 text-blue-500" />,
          placeholder: 'Bugün {count} kişi görüntüledi',
          hasThreshold: false,
        };
      case 'cart_add_count':
        return {
          title: 'Sepete Ekleme Sayısı',
          description: 'Ürünün kaç kişi tarafından sepete eklendiğini göster',
          icon: <ShoppingCart className="h-5 w-5 text-green-500" />,
          placeholder: '{count} kişi sepete ekledi',
          hasThreshold: false,
        };
      default:
        return {
          title: key,
          description: '',
          icon: <AlertTriangle className="h-5 w-5" />,
          placeholder: '',
          hasThreshold: false,
        };
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-orange-500" />
        Stok & Aciliyet Psikolojisi
      </h2>

      <p className="text-muted-foreground">
        Bu ayarlar müşterilerin satın alma kararını hızlandırmak için kullanılır. 
        Hepsiburada ve Trendyol gibi büyük e-ticaret sitelerinin "gizli silahı"dır.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settings.map((setting) => {
          const info = getSettingInfo(setting.setting_key);
          return (
            <Card key={setting.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {info.icon}
                    <CardTitle className="text-lg">{info.title}</CardTitle>
                  </div>
                  <Switch
                    checked={setting.is_enabled}
                    onCheckedChange={(checked) => updateSetting(setting.id, { is_enabled: checked })}
                  />
                </div>
                <CardDescription>{info.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Gösterilecek Metin</Label>
                  <Input
                    value={setting.display_text || ''}
                    onChange={(e) => updateSetting(setting.id, { display_text: e.target.value })}
                    placeholder={info.placeholder}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {'{count}'} yerine gerçek sayı yazılır
                  </p>
                </div>

                {info.hasThreshold && (
                  <div>
                    <Label>Eşik Değeri</Label>
                    <Input
                      type="number"
                      value={setting.threshold || ''}
                      onChange={(e) => updateSetting(setting.id, { threshold: parseInt(e.target.value) || null })}
                      placeholder="Örn: 3 (Son 3 ürün için)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Stok bu sayının altına düşünce uyarı gösterilir
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {settings.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aciliyet ayarları yükleniyor...
          </CardContent>
        </Card>
      )}
    </div>
  );
};
