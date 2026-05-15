import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  productId: string;
  stockQuantity: number | null | undefined;
}

const StockNotificationButton = ({ productId, stockQuantity }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  if ((stockQuantity ?? 0) > 0) return null;

  const subscribe = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ variant: "destructive", title: "Giriş gerekli", description: "Bildirim için giriş yapın" });
      setLoading(false);
      return;
    }
    const { error } = await (supabase as any).from("stock_notifications").insert({
      product_id: productId,
      user_id: user.id,
      email: user.email,
    });
    if (error) {
      if (error.code === "23505") setSubscribed(true);
      else toast({ variant: "destructive", title: "Hata", description: error.message });
    } else {
      setSubscribed(true);
      toast({ title: "Bildirim açıldı", description: "Ürün stoka girince haber vereceğiz." });
    }
    setLoading(false);
  };

  return (
    <Button onClick={subscribe} disabled={loading || subscribed} variant="outline" className="w-full gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : subscribed ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {subscribed ? "Bildirim açık" : "Stoka Girince Haber Ver"}
    </Button>
  );
};

export default StockNotificationButton;
