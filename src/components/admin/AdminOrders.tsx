import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { formatPhoneNumber, formatProvince, formatDistrict } from "@/lib/formatters";
import { exportToExcel, formatDateForExport, formatCurrencyForExport } from "@/lib/excel-export";
import { Download, MessageSquare, Send, DollarSign, Eye, FileDown } from "lucide-react";
 import { Badge } from "@/components/ui/badge";

// Custom Photo Viewer with signed URL support
const CustomPhotoViewer = ({ photoUrl }: { photoUrl: string }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getSignedUrl = async () => {
    setLoading(true);
    try {
      // Extract path from the URL
      const urlParts = photoUrl.split("/custom-photos/");
      if (urlParts.length < 2) {
        // Try custom-files bucket
        const filesParts = photoUrl.split("/custom-files/");
        if (filesParts.length >= 2) {
          const path = filesParts[1];
          const { data, error } = await supabase.storage
            .from("custom-files")
            .createSignedUrl(path, 3600);
          if (!error && data) {
            setSignedUrl(data.signedUrl);
          }
        }
        return;
      }
      
      const path = urlParts[1];
      const { data, error } = await supabase.storage
        .from("custom-photos")
        .createSignedUrl(path, 3600); // 1 hour expiry
      
      if (error) {
        console.error("Signed URL error:", error);
        return;
      }
      
      setSignedUrl(data.signedUrl);
    } catch (err) {
      console.error("Error getting signed URL:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!signedUrl) {
      await getSignedUrl();
    }
    if (signedUrl) {
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = "custom-photo";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          if (!signedUrl) await getSignedUrl();
          if (signedUrl) window.open(signedUrl, "_blank");
        }}
        disabled={loading}
        className="text-xs h-6 px-2"
      >
        <Eye className="h-3 w-3 mr-1" />
        {loading ? "Yükleniyor..." : "Görüntüle"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={downloadFile}
        disabled={loading}
        className="text-xs h-6 px-2"
      >
        <FileDown className="h-3 w-3 mr-1" />
        İndir
      </Button>
    </div>
  );
};

export const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadOrders();

    const channel = (supabase as any)
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      (supabase as any).removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    const { data: ordersData, error: ordersError } = await (supabase as any)
      .from("orders")
      .select(`
        *,
        order_items(
          *,
          products(title, price)
        )
      `)
      .eq("trashed", false)
      .order("created_at", { ascending: false });

    if (ordersError) {
      logger.error("Failed to load orders", ordersError);
      return;
    }

    if (!ordersData || ordersData.length === 0) {
      setOrders([]);
      return;
    }

    // Fetch profiles separately for each order
    const ordersWithProfiles = await Promise.all(
      ordersData.map(async (order: any) => {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("first_name, last_name, email, phone, address, district, province")
          .eq("id", order.user_id)
          .maybeSingle();

        return {
          ...order,
          profiles: profile ? {
            ...profile,
            phone: formatPhoneNumber(profile.phone),
            province: formatProvince(profile.province),
            district: formatDistrict(profile.district),
          } : null,
        };
      })
    );

    setOrders(ordersWithProfiles);
  };

  const updateOrderStatus = async (orderId: string, status: string, prepTime?: number, prepUnit?: string) => {
    // Get current order status before updating
    const { data: currentOrder } = await (supabase as any)
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    const updateData: any = { status };
    if (prepTime && prepUnit) {
      updateData.preparation_time = prepTime;
      updateData.preparation_unit = prepUnit;
    }

    const { error } = await (supabase as any)
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sipariş güncellenemedi",
      });
    } else {
      // If changing from delivered to rejected, restore stock
      if (currentOrder?.status === "delivered" && status === "rejected") {
        try {
          const { data: items } = await (supabase as any)
            .from("order_items")
            .select("quantity, product_id")
            .eq("order_id", orderId);

          // Restore stock for each item
          for (const item of items || []) {
            const { data: product } = await (supabase as any)
              .from("products")
              .select("stock_quantity")
              .eq("id", item.product_id)
              .single();

            if (product && product.stock_quantity !== null) {
              const newStock = product.stock_quantity + item.quantity;
              await (supabase as any)
                .from("products")
                .update({ 
                  stock_quantity: newStock,
                  stock_status: newStock > 0 ? 'in_stock' : 'out_of_stock'
                })
                .eq("id", item.product_id);
            }
          }

          // Remove the income entry
          await (supabase as any)
            .from("expenses")
            .delete()
            .eq("order_id", orderId);

        } catch (e) {
          logger.error("Failed to restore stock", e);
        }
      }

      // If delivered, automatically log income and decrease stock
      if (status === "delivered" && currentOrder?.status !== "delivered") {
        try {
          const { data: existing } = await (supabase as any)
            .from("expenses")
            .select("id")
            .eq("order_id", orderId)
            .maybeSingle();

          if (!existing) {
              const { data: orderForAmount } = await (supabase as any)
                .from("orders")
                .select("total_amount, order_code")
                .eq("id", orderId)
                .maybeSingle();

            const { data: items } = await (supabase as any)
              .from("order_items")
              .select("price, quantity, product_id")
              .eq("order_id", orderId);

              const fallbackTotal = (items || []).reduce(
                (sum: number, it: any) => sum + (Number(it.price) * it.quantity),
                0
              );
              const total = Number(orderForAmount?.total_amount) || fallbackTotal;

            if (total > 0) {
              await (supabase as any).from("expenses").insert({
                type: "income",
                amount: total,
                  description: `Sipariş (${orderForAmount?.order_code || orderId.slice(0, 8)})`,
                order_id: orderId,
              });
            }

            // Decrease stock for each item
            for (const item of items || []) {
              const { data: product } = await (supabase as any)
                .from("products")
                .select("stock_quantity")
                .eq("id", item.product_id)
                .single();

              if (product && product.stock_quantity !== null) {
                const newStock = Math.max(0, product.stock_quantity - item.quantity);
                await (supabase as any)
                  .from("products")
                  .update({ 
                    stock_quantity: newStock,
                    stock_status: newStock === 0 ? 'out_of_stock' : 'in_stock'
                  })
                  .eq("id", item.product_id);
              }
            }
          }
        } catch (e) {
          logger.error("Failed to add income or update stock", e);
        }
      }

      toast({
        title: "Başarılı",
        description: "Sipariş durumu güncellendi",
      });
      loadOrders();
    }
  };

  const rejectOrder = async (orderId: string, reason: string) => {
    const { error } = await (supabase as any)
      .from("orders")
      .update({ status: "rejected", rejection_reason: reason })
      .eq("id", orderId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sipariş reddedilemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Sipariş reddedildi",
      });
      loadOrders();
    }
  };

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

  const filterOrders = (status: string) => {
    if (status === "all") return orders;
    if (status === "trash") return orders.filter((order) => order.trashed === true);
    return orders.filter((order) => order.status === status);
  };

  const moveToTrash = async (orderId: string) => {
    // Get current order status before trashing
    const { data: currentOrder } = await (supabase as any)
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    const { error } = await (supabase as any)
      .from("orders")
      .update({ trashed: true })
      .eq("id", orderId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sipariş çöp kutusuna taşınamadı",
      });
    } else {
      // If the order was delivered, restore stock and remove income
      if (currentOrder?.status === "delivered") {
        try {
          const { data: items } = await (supabase as any)
            .from("order_items")
            .select("quantity, product_id")
            .eq("order_id", orderId);

          // Restore stock for each item
          for (const item of items || []) {
            const { data: product } = await (supabase as any)
              .from("products")
              .select("stock_quantity")
              .eq("id", item.product_id)
              .single();

            if (product && product.stock_quantity !== null) {
              const newStock = product.stock_quantity + item.quantity;
              await (supabase as any)
                .from("products")
                .update({ 
                  stock_quantity: newStock,
                  stock_status: newStock > 0 ? 'in_stock' : 'out_of_stock'
                })
                .eq("id", item.product_id);
            }
          }

          // Remove the income entry
          await (supabase as any)
            .from("expenses")
            .delete()
            .eq("order_id", orderId);

        } catch (e) {
          logger.error("Failed to restore stock on trash", e);
        }
      }

      toast({
        title: "Başarılı",
        description: "Sipariş çöp kutusuna taşındı",
      });
      loadOrders();
    }
  };

  const exportOrders = (status: string = "all") => {
    const filteredOrders = filterOrders(status);
    const exportData = filteredOrders.flatMap(order => 
      (order.order_items || []).map((item: any) => ({
        "Sipariş Kodu": order.order_code,
        "Sipariş No": order.id.slice(0, 8),
        "Müşteri": order.profiles ? `${order.profiles.first_name} ${order.profiles.last_name}` : '-',
        "Telefon": order.profiles?.phone || '-',
        "Ürün": item.products?.title || '-',
        "Adet": item.quantity,
        "Fiyat": formatCurrencyForExport(item.price),
        "Özel İsim": item.custom_name || '-',
        "Beden": item.selected_size || '-',
        "Durum": getStatusText(order.status),
        "Teslimat": order.delivery_type === "home_delivery" ? "Adrese Teslim" : "Yerinden Teslim",
        "Adres": order.profiles?.address || '-',
        "İlçe": order.profiles?.district || '-',
        "İl": order.profiles?.province || '-',
        "Sipariş Tarihi": formatDateForExport(order.created_at),
      }))
    );
    const fileName = status === "all" ? "tum-siparisler" : `siparisler-${status}`;
    exportToExcel(exportData, fileName, 'Siparişler');
    toast({
      title: "Başarılı",
      description: "Sipariş raporu Excel olarak indirildi",
    });
  };

  const loadTrashedOrders = async () => {
    const { data: ordersData } = await (supabase as any)
      .from("orders")
      .select(`
        *,
        order_items(
          *,
          products(title, price)
        )
      `)
      .eq("trashed", true)
      .order("created_at", { ascending: false });

    if (ordersData) {
      const ordersWithProfiles = await Promise.all(
        ordersData.map(async (order: any) => {
          const { data: profile } = await (supabase as any)
            .from("profiles")
            .select("first_name, last_name, email, phone, address, district, province")
            .eq("id", order.user_id)
            .maybeSingle();

          return {
            ...order,
            profiles: profile ? {
              ...profile,
              phone: formatPhoneNumber(profile.phone),
              province: formatProvince(profile.province),
              district: formatDistrict(profile.district),
            } : null,
          };
        })
      );
      return ordersWithProfiles;
    }
    return [];
  };

  const TrashTable = () => {
    const [trashedOrders, setTrashedOrders] = useState<any[]>([]);

    useEffect(() => {
      loadTrashedOrders().then(setTrashedOrders);
    }, [orders]);

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sipariş Kodu</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Ürünler</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Tarih</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trashedOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Çöp kutusunda sipariş yok
              </TableCell>
            </TableRow>
          ) : (
            trashedOrders.map((order) => {
              const orderTotal = order.order_items?.reduce(
                (sum: number, item: any) => sum + (parseFloat(item.price) * item.quantity), 0
              ) || 0;
              return (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.order_code}</TableCell>
                <TableCell>
                  {order.profiles?.first_name} {order.profiles?.last_name}
                </TableCell>
                <TableCell>
                  {order.order_items?.map((item: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      {item.products?.title} x{item.quantity}
                    </div>
                  )) || "-"}
                </TableCell>
                <TableCell className="font-bold text-primary">
                  ₺{orderTotal.toFixed(2)}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Çöp Kutusu
                  </span>
                </TableCell>
                <TableCell>{new Date(order.created_at).toLocaleString("tr-TR")}</TableCell>
              </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    );
  };

  const OrdersTable = ({ ordersList, showCount = true }: { ordersList: any[], showCount?: boolean }) => (
    <>
      {showCount && (
        <div className="mb-4 text-sm font-medium text-muted-foreground">
          Bu sekmedeki toplam sipariş sayısı: {ordersList.length}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sipariş Kodu</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Ürünler</TableHead>
            <TableHead>Tutar</TableHead>
           <TableHead>Kupon/Premium</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Teslimat</TableHead>
            <TableHead>Adres</TableHead>
            <TableHead>İlçe</TableHead>
            <TableHead>İl</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead>İşlemler</TableHead>
          </TableRow>
        </TableHeader>
      <TableBody>
        {ordersList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
              Bu sekmede sipariş yok
            </TableCell>
          </TableRow>
        ) : (
          ordersList.map((order) => {
            // Use saved order totals if available, otherwise calculate from items
            const savedTotal = order.total_amount ? parseFloat(order.total_amount) : null;
            const savedSubtotal = order.subtotal_amount ? parseFloat(order.subtotal_amount) : null;
            const savedDiscount = order.discount_amount ? parseFloat(order.discount_amount) : 0;
            
            const calculatedTotal = order.order_items?.reduce(
              (sum: number, item: any) => sum + (parseFloat(item.price) * item.quantity), 0
            ) || 0;
            
            const displayTotal = savedTotal !== null ? savedTotal : calculatedTotal;
            const displaySubtotal = savedSubtotal !== null ? savedSubtotal : calculatedTotal;
            
            return (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">{order.order_code}</TableCell>
              <TableCell>
                {order.profiles?.first_name} {order.profiles?.last_name}
              </TableCell>
              <TableCell>{order.profiles?.phone || "-"}</TableCell>
              <TableCell>
                {order.order_items?.map((item: any, idx: number) => (
                  <div key={idx} className="text-sm space-y-1">
                    <div className="font-medium">{item.products?.title} x{item.quantity}</div>
                    {item.custom_name && (
                      <div className="text-muted-foreground">İsim: {item.custom_name}</div>
                    )}
                    {item.selected_size && (
                      <div className="text-muted-foreground">Beden: {item.selected_size}</div>
                    )}
                    {item.custom_photo_url && (
                      <CustomPhotoViewer photoUrl={item.custom_photo_url} />
                    )}
                  </div>
                )) || "-"}
              </TableCell>
            <TableCell>
              <div className="space-y-1">
                {savedDiscount > 0 && (
                  <div className="text-xs text-muted-foreground line-through">
                    ₺{displaySubtotal.toFixed(2)}
                  </div>
                )}
                <div className="font-bold text-primary">
                  ₺{displayTotal.toFixed(2)}
                </div>
              </div>
            </TableCell>
           <TableCell>
             {order.applied_coupon_code && (
               <div className="text-xs">
                 <Badge variant="secondary" className="mb-1">
                   Kupon: {order.applied_coupon_code}
                 </Badge>
               </div>
             )}
             {savedDiscount > 0 && (
               <div className="text-xs text-green-600 font-medium">
                 -₺{savedDiscount.toFixed(2)} indirim
               </div>
             )}
             {!order.applied_coupon_code && savedDiscount > 0 && (
               <div className="text-xs text-muted-foreground">
                 (Premium indirim)
               </div>
             )}
           </TableCell>
            <TableCell>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                order.status === "confirmed" ? "bg-green-100 text-green-800" :
                order.status === "rejected" ? "bg-red-100 text-red-800" :
                order.status === "pending" ? "bg-blue-100 text-blue-800" :
                "bg-accent text-accent-foreground"
              }`}>
                {getStatusText(order.status)}
              </span>
            </TableCell>
            <TableCell>
              {order.delivery_type === "home_delivery" ? "Adrese Teslim" : "Yerinden Teslim"}
            </TableCell>
            <TableCell>
              {order.profiles?.address || order.delivery_address?.split(",")[0]?.trim() || "-"}
            </TableCell>
            <TableCell>
              {order.profiles?.district || order.delivery_address?.split(",")[1]?.trim() || "-"}
            </TableCell>
            <TableCell>
              {order.profiles?.province || order.delivery_address?.split(",")[2]?.trim() || "-"}
            </TableCell>
            <TableCell>{new Date(order.created_at).toLocaleString("tr-TR")}</TableCell>
            <TableCell>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">Yönet</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sipariş Yönetimi</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Durum Değiştir</Label>
                      <Select
                        defaultValue={order.status}
                        onValueChange={(value) => updateOrderStatus(order.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Durum seç" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Bekleyen</SelectItem>
                          <SelectItem value="confirmed">Onaylandı</SelectItem>
                          <SelectItem value="preparing">Hazırlanıyor</SelectItem>
                          <SelectItem value="ready">Hazır</SelectItem>
                          <SelectItem value="in_delivery">Teslimde</SelectItem>
                          <SelectItem value="delivered">Teslim Edildi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Ek Kargo Ücreti - Sadece adrese teslim için */}
                    {order.delivery_type === "home_delivery" && (
                      <div>
                        <Label>Ek Kargo Ücreti (₺)</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={order.shipping_fee || 0}
                            id={`shipping-${order.id}`}
                            placeholder="0.00"
                          />
                          <Button 
                            variant="outline"
                            onClick={async () => {
                              const feeInput = document.getElementById(`shipping-${order.id}`) as HTMLInputElement;
                              const fee = parseFloat(feeInput.value) || 0;
                              const { error } = await (supabase as any)
                                .from("orders")
                                .update({ shipping_fee: fee })
                                .eq("id", order.id);
                              if (error) {
                                toast({
                                  variant: "destructive",
                                  title: "Hata",
                                  description: "Kargo ücreti güncellenemedi",
                                });
                              } else {
                                toast({
                                  title: "Başarılı",
                                  description: `Kargo ücreti ₺${fee.toFixed(2)} olarak güncellendi`,
                                });
                                loadOrders();
                              }
                            }}
                          >
                            Güncelle
                          </Button>
                        </div>
                        {order.shipping_fee > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Mevcut kargo ücreti: ₺{parseFloat(order.shipping_fee).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <Label>Ret Nedeni</Label>
                      <Textarea 
                        placeholder="Ret sebebini açıklayın..."
                        id={`reject-${order.id}`}
                      />
                      <Button 
                        className="mt-2" 
                        variant="destructive"
                        onClick={() => {
                          const reason = (document.getElementById(`reject-${order.id}`) as HTMLTextAreaElement).value;
                          if (reason) {
                            rejectOrder(order.id, reason);
                          }
                        }}
                       >
                        Siparişi Reddet
                      </Button>
                    </div>
                    {order.status === "rejected" && (
                      <div>
                        <Button 
                          className="mt-2 w-full" 
                          variant="outline"
                          onClick={() => moveToTrash(order.id)}
                        >
                          Çöp Kutusuna Taşı
                        </Button>
                      </div>
                    )}
                    
                    {/* Ek Ücret Talep Et */}
                    <div className="pt-4 border-t">
                      <Label className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4" />
                        Ek Ücret Talep Et
                      </Label>
                      {order.extra_fee > 0 && (
                        <div className="text-sm mb-2 p-2 bg-muted rounded">
                          <p className="font-medium">Mevcut Ek Ücret: ₺{parseFloat(order.extra_fee).toFixed(2)}</p>
                          {order.extra_fee_reason && <p className="text-muted-foreground">{order.extra_fee_reason}</p>}
                          <p className="text-xs text-muted-foreground">
                            Durum: {order.extra_fee_paid ? "Ödendi ✓" : "Ödenmedi"}
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Ek ücret miktarı (TL)"
                          id={`extra-fee-${order.id}`}
                        />
                        <Textarea
                          placeholder="Ek ücret açıklaması (müşteriye gönderilecek)"
                          id={`extra-fee-reason-${order.id}`}
                        />
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={async () => {
                            const feeInput = document.getElementById(`extra-fee-${order.id}`) as HTMLInputElement;
                            const reasonInput = document.getElementById(`extra-fee-reason-${order.id}`) as HTMLTextAreaElement;
                            const fee = parseFloat(feeInput.value) || 0;
                            const reason = reasonInput.value.trim();
                            
                            if (fee <= 0) {
                              toast({
                                variant: "destructive",
                                title: "Hata",
                                description: "Geçerli bir ücret girin",
                              });
                              return;
                            }
                            
                            const { error: updateError } = await (supabase as any)
                              .from("orders")
                              .update({ 
                                extra_fee: fee, 
                                extra_fee_reason: reason,
                                extra_fee_requested_at: new Date().toISOString(),
                                extra_fee_paid: false
                              })
                              .eq("id", order.id);
                            
                            if (updateError) {
                              toast({
                                variant: "destructive",
                                title: "Hata",
                                description: "Ek ücret kaydedilemedi",
                              });
                              return;
                            }
                            
                            // Send notification to user
                            await supabase
                              .from("notifications")
                              .insert({
                                user_id: order.user_id,
                                message: `Sipariş #${order.order_code} için ₺${fee.toFixed(2)} tutarında ek ücret talep edildi. ${reason ? "Açıklama: " + reason : ""}`,
                              });
                            
                            toast({
                              title: "Başarılı",
                              description: "Ek ücret talebi gönderildi",
                            });
                            feeInput.value = "";
                            reasonInput.value = "";
                            loadOrders();
                          }}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Ek Ücret Talep Et
                        </Button>
                      </div>
                    </div>

                    {/* Müşteriye mesaj gönder */}
                    <div className="pt-4 border-t">
                      <Label className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4" />
                        Müşteriye Bildirim Gönder
                      </Label>
                      <Textarea 
                        placeholder="Müşteriye göndermek istediğiniz mesajı yazın..."
                        id={`message-${order.id}`}
                        className="mb-2"
                      />
                      <Button 
                        className="w-full" 
                        variant="secondary"
                        onClick={async () => {
                          const messageInput = document.getElementById(`message-${order.id}`) as HTMLTextAreaElement;
                          const message = messageInput.value.trim();
                          if (!message) {
                            toast({
                              variant: "destructive",
                              title: "Hata",
                              description: "Lütfen bir mesaj girin",
                            });
                            return;
                          }
                          
                          const { error } = await supabase
                            .from("notifications")
                            .insert({
                              user_id: order.user_id,
                              message: `Sipariş #${order.order_code}: ${message}`,
                            });
                          
                          if (error) {
                            toast({
                              variant: "destructive",
                              title: "Hata",
                              description: "Bildirim gönderilemedi",
                            });
                          } else {
                            toast({
                              title: "Başarılı",
                              description: "Müşteriye bildirim gönderildi",
                            });
                            messageInput.value = "";
                          }
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Bildirim Gönder
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </TableCell>
          </TableRow>
          );
        })
        )}
      </TableBody>
    </Table>
    </>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Siparişler</span>
          <Button onClick={() => exportOrders("all")} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel İndir (Tümü)
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Tümü</TabsTrigger>
            <TabsTrigger value="pending">Bekleyen</TabsTrigger>
            <TabsTrigger value="confirmed">Onaylanan</TabsTrigger>
            <TabsTrigger value="preparing">Hazırlanıyor</TabsTrigger>
            <TabsTrigger value="ready">Hazır</TabsTrigger>
            <TabsTrigger value="in_delivery">Teslimde</TabsTrigger>
            <TabsTrigger value="delivered">Teslim Edildi</TabsTrigger>
            <TabsTrigger value="rejected">Reddedilen</TabsTrigger>
            <TabsTrigger value="trash">Çöp Kutusu</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <OrdersTable ordersList={orders} />
          </TabsContent>

          <TabsContent value="pending">
            <OrdersTable ordersList={filterOrders("pending")} />
          </TabsContent>

          <TabsContent value="confirmed">
            <OrdersTable ordersList={filterOrders("confirmed")} />
          </TabsContent>

          <TabsContent value="preparing">
            <OrdersTable ordersList={filterOrders("preparing")} />
          </TabsContent>

          <TabsContent value="ready">
            <OrdersTable ordersList={filterOrders("ready")} />
          </TabsContent>

          <TabsContent value="in_delivery">
            <OrdersTable ordersList={filterOrders("in_delivery")} />
          </TabsContent>

          <TabsContent value="delivered">
            <OrdersTable ordersList={filterOrders("delivered")} />
          </TabsContent>

          <TabsContent value="rejected">
            <OrdersTable ordersList={filterOrders("rejected")} />
          </TabsContent>

          <TabsContent value="trash">
            <TrashTable />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
