import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Package, Info } from "lucide-react";

const OrderTracking = () => {
  const { toast } = useToast();
  const [orderCode, setOrderCode] = useState("");
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Bekleyen",
      confirmed: "Onaylandı",
      preparing: "Hazırlanıyor",
      ready: "Hazır",
      in_delivery: "Teslimde",
      delivered: "Teslim Edildi",
      rejected: "Reddedildi"
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-blue-500",
      confirmed: "bg-green-500",
      preparing: "bg-yellow-500",
      ready: "bg-purple-500",
      in_delivery: "bg-orange-500",
      delivered: "bg-green-600",
      rejected: "bg-red-500"
    };
    return colors[status] || "bg-gray-500";
  };

  const trackOrder = async () => {
    if (!orderCode.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen sipariş kodunu girin",
      });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("status")
      .eq("order_code", orderCode.trim().toUpperCase())
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sipariş bulunamadı. Lütfen kodu kontrol edin.",
      });
      setOrderStatus(null);
      return;
    }

    setOrderStatus(data.status);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Sipariş Takibi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Sipariş kodunuzu <strong>Sepetim</strong> sekmesinde, <strong>Geçmiş Siparişlerim</strong> menüsünden öğrenebilirsiniz.
          </p>
        </div>

        <div>
          <Label htmlFor="orderCode">Sipariş Kodu</Label>
          <div className="flex gap-2 mt-2">
            <Input
              id="orderCode"
              placeholder="XXX-XXXX-XXXX"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
              maxLength={14}
            />
            <Button onClick={trackOrder} disabled={loading}>
              {loading ? "Kontrol Ediliyor..." : "Sorgula"}
            </Button>
          </div>
        </div>

        {orderStatus && (
          <div className="mt-6 p-6 border rounded-lg bg-card">
            <h3 className="text-lg font-semibold mb-4">Sipariş Durumu</h3>
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor(orderStatus)} text-white px-4 py-2 text-base`}>
                {getStatusLabel(orderStatus)}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderTracking;
