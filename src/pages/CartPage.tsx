import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCartItems, updateCartQuantity, removeFromCart, getSessionId } from "@/lib/cart";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Minus, Plus, Trash2, Tag, X, Check } from "lucide-react";
import { logger } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

const CartPage = () => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryType, setDeliveryType] = useState<"home_delivery" | "pickup">("home_delivery");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCart();
    loadOrders();

    const channel = supabase
      .channel("cart-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cart" }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        const sessionId = getSessionId();
        
        // Only update if change is for current user/session
        if (
          (user && (payload.new as any)?.user_id === user.id) ||
          (!user && (payload.new as any)?.session_id === sessionId) ||
          (payload.old as any)?.user_id === user?.id ||
          (payload.old as any)?.session_id === sessionId
        ) {
          loadCart();
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCart = async () => {
    setLoading(true);
    const items = await getCartItems();
    setCartItems(items);
    setLoading(false);
  };

  const loadOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from("orders")
      .select(`
        *,
        order_items(*, products(title, price))
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setOrders(data);
    }
  };

  const handleUpdateQuantity = async (cartId: string, newQuantity: number) => {
    // Find the cart item to get product info
    const cartItem = cartItems.find(item => item.id === cartId);
    if (!cartItem) return;

    // Check stock limit before updating
    const { data: product } = await (supabase as any)
      .from("products")
      .select("stock_quantity, stock_status")
      .eq("id", cartItem.product_id)
      .single();

    if (product) {
      // Check if product is out of stock
      if (product.stock_status === 'out_of_stock') {
        toast({
          variant: "destructive",
          title: "Stok Tükendi",
          description: "Bu ürün stokta kalmadı",
        });
        return;
      }

      // Check stock quantity limit
      if (product.stock_quantity !== null && newQuantity > product.stock_quantity) {
        toast({
          variant: "destructive",
          title: "Stok Yetersiz",
          description: `Bu üründen maksimum ${product.stock_quantity} adet ekleyebilirsiniz`,
        });
        return;
      }
    }

    const { error } = await updateCartQuantity(cartId, newQuantity);
    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Miktar güncellenemedi",
      });
    }
  };

  const handleRemove = async (cartId: string) => {
    const { error } = await removeFromCart(cartId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün silinemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Ürün sepetten çıkarıldı",
      });
    }
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.products.price) * item.quantity,
    0
  );

  const discount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? (subtotal * appliedCoupon.discount_value) / 100
      : Math.min(appliedCoupon.discount_value, subtotal)
    : 0;

  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kupon kodu giriniz",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Giriş Gerekli",
        description: "Kupon kullanmak için giriş yapmalısınız",
      });
      navigate("/login");
      return;
    }

    setCouponLoading(true);

    const { data, error } = await supabase.rpc("validate_coupon", {
      p_code: couponCode.trim(),
      p_user_id: user.id,
      p_order_total: subtotal,
    });

    setCouponLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kupon doğrulanamadı",
      });
      return;
    }

    const result = data?.[0];
    if (!result?.is_valid) {
      toast({
        variant: "destructive",
        title: "Geçersiz Kupon",
        description: result?.error_message || "Kupon uygulanamadı",
      });
      return;
    }

    setAppliedCoupon({
      id: result.coupon_id,
      code: couponCode.toUpperCase(),
      discount_type: result.discount_type,
      discount_value: result.discount_value,
    });
    setCouponCode("");

    toast({
      title: "Kupon Uygulandı",
      description: `${couponCode.toUpperCase()} kodlu kupon uygulandı`,
    });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast({
      title: "Kupon Kaldırıldı",
      description: "İndirim kodu kaldırıldı",
    });
  };

  const handleCheckout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Giriş Gerekli",
        description: "Sipariş vermek için giriş yapmalısınız",
      });
      navigate("/login");
      return;
    }

    // Get user profile to check if address is filled when needed
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("address, district, province")
      .eq("id", user.id)
      .single();

    if (deliveryType === "home_delivery" && (!profile?.address || !profile?.district || !profile?.province)) {
      toast({
        variant: "destructive",
        title: "Adres Bilgisi Eksik",
        description: "Adrese teslim için adres bilgilerinizi tamamlayın",
      });
      navigate("/account");
      return;
    }

    try {
      // Create order
      const { data: order, error: orderError } = await (supabase as any)
        .from("orders")
        .insert({
          user_id: user.id,
          delivery_type: deliveryType,
          delivery_address: deliveryType === "home_delivery" ? `${profile.address}, ${profile.district}, ${profile.province}` : null,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.products.price,
        custom_name: item.custom_name || null,
        selected_size: item.selected_size || null,
        custom_photo_url: item.custom_photo_url || null,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Kupon kullanımını kaydet
      if (appliedCoupon) {
        await supabase.from("coupon_usages").insert({
          coupon_id: appliedCoupon.id,
          user_id: user.id,
          order_id: order.id,
        });

        // Kupon kullanım sayısını artır
        await supabase.rpc("increment_coupon_usage", {
          p_coupon_id: appliedCoupon.id,
        });
      }

      // Clear cart
      const { error: clearError } = await (supabase as any)
        .from("cart")
        .delete()
        .eq("user_id", user.id);

      if (clearError) throw clearError;

      setAppliedCoupon(null);

      toast({
        title: "Sipariş Oluşturuldu",
        description: "Siparişiniz başarıyla oluşturuldu. Hesabım sayfasından takip edebilirsiniz.",
      });
      
      navigate("/account");
    } catch (error) {
      logger.error("Sipariş oluşturma hatası", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sipariş oluşturulurken bir hata oluştu",
      });
    }
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

  const getStatusText = (status: string) => {
    const statuses: Record<string, string> = {
      pending: "Beklemede",
      confirmed: "Onaylandı",
      preparing: "Hazırlanıyor",
      ready: "Hazır",
      in_delivery: "Teslim Edilmek Üzere",
      delivered: "Teslim Edildi",
      rejected: "Reddedildi",
    };
    return statuses[status] || status;
  };

  const calculateOrderTotal = (order: any) => {
    return order.order_items?.reduce(
      (sum: number, item: any) => sum + (item.quantity * parseFloat(item.price)),
      0
    ) || 0;
  };

  const calculateAllOrdersTotal = () => {
    return orders
      .filter((order) => order.status === "delivered")
      .reduce((sum, order) => sum + calculateOrderTotal(order), 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Sepetim</h1>

        <Tabs defaultValue="cart" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="cart">Sepetim</TabsTrigger>
            <TabsTrigger value="orders">Geçmiş Siparişler</TabsTrigger>
          </TabsList>

          <TabsContent value="cart">
            {cartItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">Sepetiniz boş</p>
                  <Button onClick={() => navigate("/products")}>
                    Ürünlere Göz At
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {cartItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {item.products.product_images?.[0] && (
                            <img
                              src={item.products.product_images[0].image_url}
                              alt={item.products.title}
                              className="w-24 h-24 object-cover rounded cursor-pointer"
                              onClick={() => navigate(`/products/${item.products.id}`)}
                            />
                          )}
                          <div className="flex-1">
                            <h3 
                              className="font-semibold mb-2 cursor-pointer hover:text-primary"
                              onClick={() => navigate(`/products/${item.products.id}`)}
                            >
                              {item.products.title}
                            </h3>
                            {item.custom_name && (
                              <p className="text-sm text-muted-foreground mb-1">
                                İsim: <span className="font-medium">{item.custom_name}</span>
                              </p>
                            )}
                            {item.selected_size && (
                              <p className="text-sm text-muted-foreground mb-1">
                                Beden: <span className="font-medium">{item.selected_size}</span>
                              </p>
                            )}
                            {item.custom_photo_url && (
                              <p className="text-sm text-muted-foreground mb-1">
                                <span className="font-medium">Özel fotoğraf yüklendi ✓</span>
                              </p>
                            )}
                            <p className="text-lg font-bold text-primary mb-4">
                              ₺{parseFloat(item.products.price).toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (val > 0) handleUpdateQuantity(item.id, val);
                                }}
                                className="w-20 text-center"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="ml-auto"
                                onClick={() => handleRemove(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Sipariş Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Teslimat Seçeneği</Label>
                <Select value={deliveryType} onValueChange={(v: any) => setDeliveryType(v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home_delivery">Adrese Teslim</SelectItem>
                    <SelectItem value="pickup">Yerinden Alma</SelectItem>
                  </SelectContent>
                </Select>
                {deliveryType === "home_delivery" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Not: Adrese teslim her bölgede mevcut olmayabilir ve ek ücret talep edilebilir.
                  </p>
                )}
              </div>

              {/* Kupon Kodu */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  İndirim Kodu
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="font-mono font-bold text-green-700 dark:text-green-400">
                        {appliedCoupon.code}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {appliedCoupon.discount_type === "percentage"
                          ? `%${appliedCoupon.discount_value}`
                          : `₺${appliedCoupon.discount_value}`}
                      </Badge>
                    </div>
                    <Button size="sm" variant="ghost" onClick={removeCoupon}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="KUPONKODU"
                      className="font-mono"
                      maxLength={20}
                    />
                    <Button 
                      onClick={applyCoupon} 
                      disabled={couponLoading}
                      variant="outline"
                    >
                      {couponLoading ? "..." : "Uygula"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>Ara Toplam:</span>
                  <span>₺{subtotal.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>İndirim:</span>
                    <span>-₺{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Toplam:</span>
                  <span className="text-primary">₺{total.toFixed(2)}</span>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={handleCheckout}>Sipariş Ver</Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/products")}>
                Alışverişe Devam Et
              </Button>
            </CardContent>
          </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">Henüz siparişiniz yok</p>
                  <Button onClick={() => navigate("/products")}>
                    Ürünlere Göz At
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>Toplam Harcama</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">
                      ₺{calculateAllOrdersTotal().toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {orders.filter((o) => o.status === "delivered").length} teslim edilmiş sipariş
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      (Sadece teslim edilmiş siparişler dahildir)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Sipariş Geçmişi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sipariş No</TableHead>
                          <TableHead>Tarih</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Ürünler</TableHead>
                          <TableHead>Toplam</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.order_code || `#${order.id.slice(0, 8)}`}
                            </TableCell>
                            <TableCell>
                              {new Date(order.created_at).toLocaleDateString("tr-TR")}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                order.status === "delivered" ? "bg-green-100 text-green-800" :
                                order.status === "rejected" ? "bg-red-100 text-red-800" :
                                "bg-blue-100 text-blue-800"
                              }`}>
                                {getStatusText(order.status)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.order_items?.map((item: any, idx: number) => (
                                  <div key={idx} className="text-sm">
                                    {item.products?.title} x{item.quantity}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="font-bold text-primary">
                              ₺{calculateOrderTotal(order).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default CartPage;
