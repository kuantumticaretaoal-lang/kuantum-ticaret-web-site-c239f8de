import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Package, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle, 
  ChefHat,
  MapPin,
  ArrowLeft
} from "lucide-react";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  custom_name: string | null;
  selected_size: string | null;
  products: {
    title: string;
    product_images: { image_url: string }[];
  };
}

interface Order {
  id: string;
  order_code: string;
  status: string;
  delivery_type: string;
  delivery_address: string | null;
  created_at: string;
  updated_at: string;
  preparation_time: number | null;
  preparation_unit: string | null;
  rejection_reason: string | null;
  order_items: OrderItem[];
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Beklemede", icon: Clock, color: "text-yellow-500" },
  confirmed: { label: "Onaylandı", icon: CheckCircle2, color: "text-blue-500" },
  preparing: { label: "Hazırlanıyor", icon: ChefHat, color: "text-orange-500" },
  ready: { label: "Hazır", icon: Package, color: "text-green-500" },
  in_delivery: { label: "Teslimatta", icon: Truck, color: "text-purple-500" },
  delivered: { label: "Teslim Edildi", icon: CheckCircle2, color: "text-green-600" },
  rejected: { label: "Reddedildi", icon: XCircle, color: "text-red-500" },
};

const statusOrder = ["pending", "confirmed", "preparing", "ready", "in_delivery", "delivered"];

const OrderTrackingPage = () => {
  const { orderCode } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();

    const channel = supabase
      .channel(`order-${orderCode}`)
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "orders",
        filter: `order_code=eq.${orderCode}`
      }, () => {
        loadOrder();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderCode]);

  const loadOrder = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await (supabase as any)
      .from("orders")
      .select(`
        *,
        order_items(
          *,
          products(title, product_images(image_url))
        )
      `)
      .eq("order_code", orderCode)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      navigate("/account");
      return;
    }

    setOrder(data);
    setLoading(false);
  };

  const getStatusIndex = (status: string) => {
    if (status === "rejected") return -1;
    return statusOrder.indexOf(status);
  };

  const calculateTotal = () => {
    return order?.order_items.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Yükleniyor...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Sipariş bulunamadı</p>
        </div>
        <Footer />
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const isRejected = order.status === "rejected";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/account")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Hesabıma Dön
        </Button>

        <div className="max-w-3xl mx-auto space-y-6">
          {/* Sipariş Başlığı */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sipariş Kodu</p>
                  <CardTitle className="font-mono">{order.order_code}</CardTitle>
                </div>
                <Badge 
                  variant={isRejected ? "destructive" : order.status === "delivered" ? "default" : "secondary"}
                  className="text-sm"
                >
                  {statusConfig[order.status]?.label || order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Sipariş Tarihi</p>
                  <p className="font-medium">
                    {new Date(order.created_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Teslimat Türü</p>
                  <p className="font-medium">
                    {order.delivery_type === "home_delivery" ? "Adrese Teslim" : "Yerinden Alma"}
                  </p>
                </div>
                {order.preparation_time && (
                  <div>
                    <p className="text-muted-foreground">Tahmini Süre</p>
                    <p className="font-medium">
                      {order.preparation_time} {order.preparation_unit === "hour" ? "Saat" : "Dakika"}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Toplam</p>
                  <p className="font-medium text-primary">₺{calculateTotal().toFixed(2)}</p>
                </div>
              </div>

              {order.delivery_address && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Teslimat Adresi</p>
                      <p className="text-sm">{order.delivery_address}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sipariş Durumu</CardTitle>
            </CardHeader>
            <CardContent>
              {isRejected ? (
                <div className="text-center py-8">
                  <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-red-600 mb-2">Sipariş Reddedildi</h3>
                  {order.rejection_reason && (
                    <p className="text-muted-foreground">Sebep: {order.rejection_reason}</p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  {statusOrder.map((status, index) => {
                    const config = statusConfig[status];
                    const Icon = config.icon;
                    const isCompleted = index <= currentStatusIndex;
                    const isCurrent = index === currentStatusIndex;

                    return (
                      <div key={status} className="flex items-start gap-4 pb-8 last:pb-0">
                        {/* Line */}
                        {index < statusOrder.length - 1 && (
                          <div 
                            className={`absolute left-[18px] mt-8 w-0.5 h-[calc(100%/6-8px)] ${
                              index < currentStatusIndex ? "bg-primary" : "bg-muted"
                            }`}
                            style={{ top: `${index * (100 / 6)}%` }}
                          />
                        )}
                        
                        {/* Icon */}
                        <div className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 ${
                          isCompleted 
                            ? "bg-primary border-primary text-primary-foreground" 
                            : "bg-background border-muted text-muted-foreground"
                        } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <p className={`font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                            {config.label}
                          </p>
                          {isCurrent && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {status === "pending" && "Siparişiniz alındı, onay bekleniyor"}
                              {status === "confirmed" && "Siparişiniz onaylandı"}
                              {status === "preparing" && "Siparişiniz hazırlanıyor"}
                              {status === "ready" && "Siparişiniz hazır, teslim edilmeyi bekliyor"}
                              {status === "in_delivery" && "Siparişiniz yolda"}
                              {status === "delivered" && "Siparişiniz teslim edildi"}
                            </p>
                          )}
                        </div>

                        {/* Checkmark for completed */}
                        {isCompleted && !isCurrent && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ürünler */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sipariş Detayları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {item.products.product_images?.[0] && (
                      <img 
                        src={item.products.product_images[0].image_url}
                        alt={item.products.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.products.title}</p>
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        {item.custom_name && <p>İsim: {item.custom_name}</p>}
                        {item.selected_size && <p>Beden: {item.selected_size}</p>}
                        <p>Adet: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₺{(item.price * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">₺{item.price} x {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Toplam</span>
                <span className="text-primary">₺{calculateTotal().toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrderTrackingPage;
