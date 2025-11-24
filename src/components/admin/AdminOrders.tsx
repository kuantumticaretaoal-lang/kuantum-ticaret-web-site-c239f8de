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
            const { data: items } = await (supabase as any)
              .from("order_items")
              .select("price, quantity, product_id")
              .eq("order_id", orderId);

            const total = (items || []).reduce((sum: number, it: any) => sum + (parseFloat(it.price) * it.quantity), 0);

            if (total > 0) {
              await (supabase as any).from("expenses").insert({
                type: "income",
                amount: total,
                description: `Sipariş No: ${orderId.slice(0, 8)}`,
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
      toast({
        title: "Başarılı",
        description: "Sipariş çöp kutusuna taşındı",
      });
      loadOrders();
    }
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
            <TableHead>Sipariş No</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Ürünler</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Tarih</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trashedOrders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Çöp kutusunda sipariş yok
              </TableCell>
            </TableRow>
          ) : (
            trashedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id.slice(0, 8)}</TableCell>
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
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Çöp Kutusu
                  </span>
                </TableCell>
                <TableCell>{new Date(order.created_at).toLocaleString("tr-TR")}</TableCell>
              </TableRow>
            ))
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
            <TableHead>Sipariş No</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Telefon</TableHead>
            <TableHead>Ürünler</TableHead>
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
            <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
              Bu sekmede sipariş yok
            </TableCell>
          </TableRow>
        ) : (
          ordersList.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.id.slice(0, 8)}</TableCell>
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
                      <div>
                        <a 
                          href={item.custom_photo_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Özel Fotoğrafı Görüntüle
                        </a>
                      </div>
                    )}
                  </div>
                )) || "-"}
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
                  </div>
                </DialogContent>
              </Dialog>
            </TableCell>
          </TableRow>
        ))
        )}
      </TableBody>
    </Table>
    </>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Siparişler</CardTitle>
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
