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
    // Primary query with robust relationship selection
    const { data, error } = await (supabase as any)
      .from("orders")
      .select(`
        *,
        profiles(first_name, last_name, email)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
      return;
    }

    // Fallback without join (ensures orders still render even if relation name changes)
    const { data: fallbackData } = await (supabase as any)
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (fallbackData) {
      setOrders(fallbackData);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, prepTime?: number, prepUnit?: string) => {
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
    return orders.filter((order) => order.status === status);
  };

  const OrdersTable = ({ ordersList }: { ordersList: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sipariş No</TableHead>
          <TableHead>Müşteri</TableHead>
          <TableHead>Durum</TableHead>
          <TableHead>Teslimat</TableHead>
          <TableHead>Tarih</TableHead>
          <TableHead>İşlemler</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ordersList.map((order) => (
          <TableRow key={order.id}>
            <TableCell>{order.id.slice(0, 8)}</TableCell>
            <TableCell>
              {order.profiles?.first_name} {order.profiles?.last_name}
            </TableCell>
            <TableCell>{getStatusText(order.status)}</TableCell>
            <TableCell>
              {order.delivery_type === "home_delivery" ? "Adrese Teslim" : "Yerinden Teslim"}
            </TableCell>
            <TableCell>{new Date(order.created_at).toLocaleDateString("tr-TR")}</TableCell>
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
                        onValueChange={(value) => {
                          if (value === "preparing") {
                            // Hazırlık süresi gir
                          } else {
                            updateOrderStatus(order.id, value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Durum seç" />
                        </SelectTrigger>
                        <SelectContent>
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
                  </div>
                </DialogContent>
              </Dialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
            <TabsTrigger value="rejected">Reddedilen</TabsTrigger>
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

          <TabsContent value="rejected">
            <OrdersTable ordersList={filterOrders("rejected")} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
