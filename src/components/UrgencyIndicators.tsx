import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Eye, ShoppingCart, AlertTriangle, Users, TrendingUp } from "lucide-react";

interface UrgencyIndicatorsProps {
  productId: string;
  stockQuantity: number | null;
  stockStatus: string | null;
}

interface UrgencySettings {
  low_stock: { enabled: boolean; threshold: number; text: string };
  view_count: { enabled: boolean; threshold: number; text: string };
  cart_count: { enabled: boolean; threshold: number; text: string };
}

interface ProductAnalytics {
  view_count: number;
  cart_add_count: number;
}

export const UrgencyIndicators = ({ productId, stockQuantity, stockStatus }: UrgencyIndicatorsProps) => {
  const [settings, setSettings] = useState<UrgencySettings | null>(null);
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);

  useEffect(() => {
    loadData();
    incrementViewCount();
  }, [productId]);

  const loadData = async () => {
    // Aciliyet ayarlarını yükle
    const { data: settingsData } = await supabase
      .from("urgency_settings")
      .select("*");

    if (settingsData) {
      const parsed: UrgencySettings = {
        low_stock: { enabled: false, threshold: 5, text: "" },
        view_count: { enabled: false, threshold: 50, text: "" },
        cart_count: { enabled: false, threshold: 10, text: "" },
      };

      settingsData.forEach((s) => {
        if (s.setting_key === "low_stock") {
          parsed.low_stock = { 
            enabled: s.is_enabled || false, 
            threshold: s.threshold || 5, 
            text: s.display_text || "" 
          };
        } else if (s.setting_key === "view_count") {
          parsed.view_count = { 
            enabled: s.is_enabled || false, 
            threshold: s.threshold || 50, 
            text: s.display_text || "" 
          };
        } else if (s.setting_key === "cart_count") {
          parsed.cart_count = { 
            enabled: s.is_enabled || false, 
            threshold: s.threshold || 10, 
            text: s.display_text || "" 
          };
        }
      });

      setSettings(parsed);
    }

    // Ürün analitiğini yükle
    const { data: analyticsData } = await (supabase as any)
      .from("product_analytics")
      .select("view_count, cart_add_count")
      .eq("product_id", productId)
      .maybeSingle();

    if (analyticsData) {
      setAnalytics(analyticsData);
    }
  };

  const incrementViewCount = async () => {
    await supabase.rpc("increment_product_view", { p_product_id: productId });
  };

  if (!settings) return null;

  const indicators = [];

  // Düşük stok uyarısı
  if (
    settings.low_stock.enabled &&
    stockStatus !== "out_of_stock" &&
    stockQuantity !== null &&
    stockQuantity > 0 &&
    stockQuantity <= settings.low_stock.threshold
  ) {
    indicators.push(
      <Badge key="low-stock" variant="destructive" className="gap-1.5 animate-pulse">
        <AlertTriangle className="h-3.5 w-3.5" />
        {settings.low_stock.text.replace("{count}", stockQuantity.toString()) || `Son ${stockQuantity} adet kaldı!`}
      </Badge>
    );
  }

  // Görüntülenme sayısı
  if (
    settings.view_count.enabled &&
    analytics?.view_count &&
    analytics.view_count >= settings.view_count.threshold
  ) {
    indicators.push(
      <Badge key="view-count" variant="secondary" className="gap-1.5">
        <Eye className="h-3.5 w-3.5" />
        {settings.view_count.text.replace("{count}", analytics.view_count.toString()) || `${analytics.view_count} kez görüntülendi`}
      </Badge>
    );
  }

  // Sepete eklenme sayısı
  if (
    settings.cart_count.enabled &&
    analytics?.cart_add_count &&
    analytics.cart_add_count >= settings.cart_count.threshold
  ) {
    indicators.push(
      <Badge key="cart-count" variant="secondary" className="gap-1.5">
        <ShoppingCart className="h-3.5 w-3.5" />
        {settings.cart_count.text.replace("{count}", analytics.cart_add_count.toString()) || `${analytics.cart_add_count} kişi sepetine ekledi`}
      </Badge>
    );
  }

  if (indicators.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
      <TrendingUp className="h-4 w-4 text-muted-foreground" />
      {indicators}
    </div>
  );
};
