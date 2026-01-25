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
import { useTranslations } from "@/hooks/use-translations";
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

interface PremiumBenefits {
  isPremium: boolean;
  discountPercent: number;
  freeShipping: boolean;
}

interface ShippingSetting {
  delivery_type: string;
  base_fee: number;
  is_active: boolean;
}

const CartPage = () => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryType, setDeliveryType] = useState<"home_delivery" | "pickup">("home_delivery");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [shippingSettings, setShippingSettings] = useState<ShippingSetting[]>([]);
  const [premiumBenefits, setPremiumBenefits] = useState<PremiumBenefits>({
    isPremium: false,
    discountPercent: 0,
    freeShipping: false,
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, formatPrice, currencyCode, convertPrice } = useTranslations();

  useEffect(() => {
    loadCart();
    loadOrders();
    loadPremiumStatus();
    loadShippingSettings();

    const channel = supabase
      .channel("cart-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cart" }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        const sessionId = getSessionId();
        
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

  const loadShippingSettings = async () => {
    const { data } = await supabase
      .from("shipping_settings")
      .select("*")
      .eq("is_active", true);
    if (data) setShippingSettings(data);
  };

  const loadCart = async () => {
    setLoading(true);
    const items = await getCartItems();
    setCartItems(items);
    setLoading(false);
  };

  const loadPremiumStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await (supabase as any)
      .from("premium_memberships")
      .select(`
        *,
        premium_plans (
          discount_percent,
          free_shipping
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (membership && membership.premium_plans) {
      setPremiumBenefits({
        isPremium: true,
        discountPercent: membership.premium_plans.discount_percent || 0,
        freeShipping: membership.premium_plans.free_shipping || false,
      });
    }
  };

  const loadOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from("orders")
      .select(`
        *,
        order_items(*, products(title, price, discounted_price))
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setOrders(data);
    }
  };

  const handleUpdateQuantity = async (cartId: string, newQuantity: number) => {
    const cartItem = cartItems.find(item => item.id === cartId);
    if (!cartItem) return;

    const { data: product } = await (supabase as any)
      .from("products")
      .select("stock_quantity, stock_status")
      .eq("id", cartItem.product_id)
      .single();

    if (product) {
      if (product.stock_status === 'out_of_stock') {
        toast({
          variant: "destructive",
          title: t("common.out_of_stock", "Stok Tükendi"),
          description: t("cart.out_of_stock_message", "Bu ürün stokta kalmadı"),
        });
        return;
      }

      if (product.stock_quantity !== null && newQuantity > product.stock_quantity) {
        toast({
          variant: "destructive",
          title: t("cart.insufficient_stock", "Stok Yetersiz"),
          description: `${t("cart.max_quantity", "Bu üründen maksimum")} ${product.stock_quantity} ${t("cart.pieces", "adet ekleyebilirsiniz")}`,
        });
        return;
      }
    }

    const { error } = await updateCartQuantity(cartId, newQuantity);
    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error", "Hata"),
        description: error.message || t("cart.update_error", "Miktar güncellenemedi"),
      });
    }
  };

  const handleRemove = async (cartId: string) => {
    const { error } = await removeFromCart(cartId);
    if (error) {
      toast({
        variant: "destructive",
        title: t("common.error", "Hata"),
        description: t("cart.remove_error", "Ürün silinemedi"),
      });
    } else {
      toast({
        title: t("common.success", "Başarılı"),
        description: t("cart.remove_success", "Ürün sepetten çıkarıldı"),
      });
    }
  };

  // Use discounted price if available
  const getItemPrice = (item: any) => {
    return item.products.discounted_price 
      ? parseFloat(item.products.discounted_price) 
      : parseFloat(item.products.price);
  };

  // Get display price (original price for display purposes)
  const getDisplayPrice = (item: any) => {
    return parseFloat(item.products.price);
  };

  // Check if item has discount
  const hasDiscount = (item: any) => {
    return item.products.discounted_price && parseFloat(item.products.discounted_price) < parseFloat(item.products.price);
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0
  );

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? (subtotal * appliedCoupon.discount_value) / 100
      : Math.min(appliedCoupon.discount_value, subtotal)
    : 0;

  const premiumDiscount = premiumBenefits.isPremium 
    ? ((subtotal - couponDiscount) * premiumBenefits.discountPercent) / 100 
    : 0;

  const totalDiscount = couponDiscount + premiumDiscount;

  // Kargo ücreti hesaplama
  const getShippingCost = (): number => {
    if (premiumBenefits.freeShipping) return 0;
    
    const setting = shippingSettings.find(s => s.delivery_type === deliveryType);
    if (!setting) return 0;
    
    return setting.base_fee;
  };

  const shippingCost = getShippingCost();
  const total = Math.max(0, subtotal - totalDiscount + shippingCost);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({
        variant: "destructive",
        title: t("common.error", "Hata"),
        description: t("cart.enter_coupon", "Kupon kodu giriniz"),
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        variant: "destructive",
        title: t("auth.login_required", "Giriş Gerekli"),
        description: t("cart.login_for_coupon", "Kupon kullanmak için giriş yapmalısınız"),
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
        title: t("common.error", "Hata"),
        description: t("cart.coupon_validate_error", "Kupon doğrulanamadı"),
      });
      return;
    }

    const result = data?.[0];
    if (!result?.is_valid) {
      toast({
        variant: "destructive",
        title: t("cart.invalid_coupon", "Geçersiz Kupon"),
        description: result?.error_message || t("cart.coupon_not_applied", "Kupon uygulanamadı"),
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
      title: t("cart.coupon_applied", "Kupon Uygulandı"),
      description: `${couponCode.toUpperCase()} ${t("cart.coupon_applied_message", "kodlu kupon uygulandı")}`,
    });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast({
      title: t("cart.coupon_removed", "Kupon Kaldırıldı"),
      description: t("cart.discount_removed", "İndirim kodu kaldırıldı"),
    });
  };

  const handleCheckout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: t("auth.login_required", "Giriş Gerekli"),
        description: t("cart.login_for_order", "Sipariş vermek için giriş yapmalısınız"),
      });
      navigate("/login");
      return;
    }

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("address, district, province")
      .eq("id", user.id)
      .single();

    if (deliveryType === "home_delivery" && (!profile?.address || !profile?.district || !profile?.province)) {
      toast({
        variant: "destructive",
        title: t("cart.address_missing", "Adres Bilgisi Eksik"),
        description: t("cart.complete_address", "Adrese teslim için adres bilgilerinizi tamamlayın"),
      });
      navigate("/account");
      return;
    }

    try {
      // Calculate final amounts with all discounts in TRY
      const finalSubtotal = subtotal;
      const finalTotalDiscount = totalDiscount;
      const finalTotal = total;

      const { data: order, error: orderError } = await (supabase as any)
        .from("orders")
        .insert({
          user_id: user.id,
          delivery_type: deliveryType,
          delivery_address: deliveryType === "home_delivery" ? `${profile.address}, ${profile.district}, ${profile.province}` : null,
          status: "pending",
          shipping_fee: shippingCost,
          subtotal_amount: finalSubtotal,
          discount_amount: finalTotalDiscount,
          total_amount: finalTotal,
          applied_coupon_code: appliedCoupon?.code || null,
          currency_code: currencyCode,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: getItemPrice(item), // Use the already calculated discounted price
        custom_name: item.custom_name || null,
        selected_size: item.selected_size || null,
        custom_photo_url: item.custom_photo_url || null,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      if (appliedCoupon) {
        await supabase.from("coupon_usages").insert({
          coupon_id: appliedCoupon.id,
          user_id: user.id,
          order_id: order.id,
        });

        await supabase.rpc("increment_coupon_usage", {
          p_coupon_id: appliedCoupon.id,
        });
      }

      const { error: clearError } = await (supabase as any)
        .from("cart")
        .delete()
        .eq("user_id", user.id);

      if (clearError) throw clearError;

      setAppliedCoupon(null);

      toast({
        title: t("cart.order_created", "Sipariş Oluşturuldu"),
        description: t("cart.order_success", "Siparişiniz başarıyla oluşturuldu. Hesabım sayfasından takip edebilirsiniz."),
      });
      
      navigate("/account");
    } catch (error) {
      logger.error("Sipariş oluşturma hatası", error);
      toast({
        variant: "destructive",
        title: t("common.error", "Hata"),
        description: t("cart.order_error", "Sipariş oluşturulurken bir hata oluştu"),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>{t("common.loading", "Yükleniyor...")}</p>
        </div>
        <Footer />
      </div>
    );
  }

  const getStatusText = (status: string) => {
    const statusKey = `order.${status}`;
    const statuses: Record<string, string> = {
      pending: t(statusKey, "Beklemede"),
      confirmed: t(statusKey, "Onaylandı"),
      preparing: t(statusKey, "Hazırlanıyor"),
      ready: t(statusKey, "Hazır"),
      in_delivery: t(statusKey, "Teslim Edilmek Üzere"),
      delivered: t(statusKey, "Teslim Edildi"),
      rejected: t(statusKey, "Reddedildi"),
    };
    return statuses[status] || status;
  };

  const calculateOrderTotal = (order: any) => {
    // Use saved total_amount if available
    if (order.total_amount) {
      return parseFloat(order.total_amount);
    }
    // Fallback to calculating from items
    const itemsTotal = order.order_items?.reduce(
      (sum: number, item: any) => sum + (item.quantity * parseFloat(item.price)),
      0
    ) || 0;
    return itemsTotal + (order.shipping_fee || 0);
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
        <h1 className="text-4xl font-bold mb-8">{t("cart.title", "Sepetim")}</h1>

        <Tabs defaultValue="cart" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="cart">{t("cart.title", "Sepetim")}</TabsTrigger>
            <TabsTrigger value="orders">{t("cart.orders_history", "Geçmiş Siparişler")}</TabsTrigger>
          </TabsList>

          <TabsContent value="cart">
            {cartItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">{t("cart.empty", "Sepetiniz boş")}</p>
                  <Button onClick={() => navigate("/products")}>
                    {t("cart.browse_products", "Ürünlere Göz At")}
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
                                {t("cart.name", "İsim")}: <span className="font-medium">{item.custom_name}</span>
                              </p>
                            )}
                            {item.selected_size && (
                              <p className="text-sm text-muted-foreground mb-1">
                                {t("cart.size", "Beden")}: <span className="font-medium">{item.selected_size}</span>
                              </p>
                            )}
                            {item.custom_photo_url && (
                              <p className="text-sm text-muted-foreground mb-1">
                                <span className="font-medium">{t("cart.custom_photo", "Özel fotoğraf yüklendi")} ✓</span>
                              </p>
                            )}
                            <div className="mb-4">
                              {hasDiscount(item) ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-primary">
                                    {formatPrice(getItemPrice(item))}
                                  </span>
                                  <span className="text-sm text-muted-foreground line-through">
                                    {formatPrice(getDisplayPrice(item))}
                                  </span>
                                  <Badge variant="destructive" className="text-xs">
                                    %{Math.round((1 - getItemPrice(item) / getDisplayPrice(item)) * 100)} {t("cart.discount", "İndirim")}
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-lg font-bold text-primary">
                                  {formatPrice(getItemPrice(item))}
                                </span>
                              )}
                            </div>
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
                      <CardTitle>{t("cart.order_summary", "Sipariş Özeti")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>{t("cart.delivery_type", "Teslimat Seçeneği")}</Label>
                        <Select value={deliveryType} onValueChange={(v: any) => setDeliveryType(v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t("common.select", "Seçiniz")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="home_delivery">{t("cart.home_delivery", "Adrese Teslim")}</SelectItem>
                            <SelectItem value="pickup">{t("cart.pickup", "Yerinden Alma")}</SelectItem>
                          </SelectContent>
                        </Select>
                        {deliveryType === "home_delivery" && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {t("cart.delivery_note", "Not: Adrese teslim her bölgede mevcut olmayabilir ve ek ücret talep edilebilir.")}
                          </p>
                        )}
                      </div>

                      {/* Kupon Kodu */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          {t("cart.coupon", "İndirim Kodu")}
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
                                  : formatPrice(appliedCoupon.discount_value)}
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
                              {couponLoading ? "..." : t("cart.apply", "Uygula")}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span>{t("cart.subtotal", "Ara Toplam")}:</span>
                          <span>{formatPrice(subtotal)}</span>
                        </div>
                        {appliedCoupon && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>{t("cart.coupon_discount", "Kupon İndirimi")} ({appliedCoupon.code}):</span>
                            <span>-{formatPrice(couponDiscount)}</span>
                          </div>
                        )}
                        {premiumBenefits.isPremium && premiumDiscount > 0 && (
                          <div className="flex justify-between text-sm text-purple-600">
                            <span>{t("cart.premium_discount", "Premium İndirim")} (%{premiumBenefits.discountPercent}):</span>
                            <span>-{formatPrice(premiumDiscount)}</span>
                          </div>
                        )}
                        {shippingCost > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>{t("cart.shipping", "Kargo Ücreti")}:</span>
                            <span>{formatPrice(shippingCost)}</span>
                          </div>
                        )}
                        {premiumBenefits.isPremium && premiumBenefits.freeShipping && deliveryType === "home_delivery" && (
                          <div className="flex justify-between text-sm text-purple-600">
                            <span>{t("cart.free_shipping", "Ücretsiz Kargo")}:</span>
                            <span>✓ {t("cart.premium_benefit", "Premium Avantaj")}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                          <span>{t("cart.total", "Toplam")}:</span>
                          <span className="text-primary">{formatPrice(total)}</span>
                        </div>
                        {premiumBenefits.isPremium && (
                          <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md text-xs text-purple-700 dark:text-purple-300 text-center">
                            ✨ {t("cart.premium_applied", "Premium üye indirimleri uygulandı")}
                          </div>
                        )}
                      </div>
                      <Button className="w-full" size="lg" onClick={handleCheckout}>{t("cart.checkout", "Sipariş Ver")}</Button>
                      <Button variant="outline" className="w-full" onClick={() => navigate("/products")}>
                        {t("cart.continue", "Alışverişe Devam Et")}
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
                  <p className="text-muted-foreground mb-4">{t("cart.no_orders", "Henüz siparişiniz yok")}</p>
                  <Button onClick={() => navigate("/products")}>
                    {t("cart.browse_products", "Ürünlere Göz At")}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>{t("cart.total_spending", "Toplam Harcama")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-primary">
                      {formatPrice(calculateAllOrdersTotal())}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {orders.filter((o) => o.status === "delivered").length} {t("cart.delivered_orders", "teslim edilmiş sipariş")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ({t("cart.only_delivered", "Sadece teslim edilmiş siparişler dahildir")})
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("cart.order_history", "Sipariş Geçmişi")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("cart.order_no", "Sipariş No")}</TableHead>
                          <TableHead>{t("cart.date", "Tarih")}</TableHead>
                          <TableHead>{t("cart.status", "Durum")}</TableHead>
                          <TableHead>{t("cart.products", "Ürünler")}</TableHead>
                          <TableHead>{t("cart.shipping", "Kargo")}</TableHead>
                          <TableHead>{t("cart.total", "Toplam")}</TableHead>
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
                                order.status === "delivered" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                                order.status === "rejected" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                                "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
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
                            <TableCell>
                              {order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : "-"}
                            </TableCell>
                            <TableCell className="font-bold text-primary">
                              {formatPrice(calculateOrderTotal(order))}
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
