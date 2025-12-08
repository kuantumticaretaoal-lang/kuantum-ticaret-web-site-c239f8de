import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { ShoppingCart, TrendingUp, Package, DollarSign, Clock, CheckCircle, XCircle, Truck } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, subMonths } from "date-fns";
import { tr } from "date-fns/locale";

interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  preparing: number;
  ready: number;
  in_delivery: number;
  delivered: number;
  rejected: number;
  totalRevenue: number;
}

interface DailyData {
  date: string;
  orders: number;
  revenue: number;
}

export const AdminOrderStats = () => {
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    in_delivery: 0,
    delivered: 0,
    rejected: 0,
    totalRevenue: 0,
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel("order-stats-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadStats();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    // Tüm siparişleri yükle
    const { data: orders } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(quantity, price)
      `)
      .eq("trashed", false);

    if (!orders) {
      setLoading(false);
      return;
    }

    // İstatistikleri hesapla
    const newStats: OrderStats = {
      total: orders.length,
      pending: orders.filter(o => o.status === "pending").length,
      confirmed: orders.filter(o => o.status === "confirmed").length,
      preparing: orders.filter(o => o.status === "preparing").length,
      ready: orders.filter(o => o.status === "ready").length,
      in_delivery: orders.filter(o => o.status === "in_delivery").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      rejected: orders.filter(o => o.status === "rejected").length,
      totalRevenue: orders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => {
          const orderTotal = o.order_items?.reduce(
            (itemSum: number, item: any) => itemSum + (item.quantity * parseFloat(item.price)),
            0
          ) || 0;
          return sum + orderTotal;
        }, 0),
    };
    setStats(newStats);

    // Günlük veri (son 14 gün)
    const last14Days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date(),
    });

    const dailyStats = last14Days.map(day => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayOrders = orders.filter(o => 
        format(new Date(o.created_at), "yyyy-MM-dd") === dayStr
      );
      const dayRevenue = dayOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => {
          const orderTotal = o.order_items?.reduce(
            (itemSum: number, item: any) => itemSum + (item.quantity * parseFloat(item.price)),
            0
          ) || 0;
          return sum + orderTotal;
        }, 0);

      return {
        date: format(day, "dd MMM", { locale: tr }),
        orders: dayOrders.length,
        revenue: dayRevenue,
      };
    });
    setDailyData(dailyStats);

    // Haftalık veri (son 8 hafta)
    const weeks = eachWeekOfInterval({
      start: subDays(new Date(), 55),
      end: new Date(),
    }, { weekStartsOn: 1 });

    const weeklyStats = weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= weekStart && orderDate <= weekEnd;
      });
      const weekRevenue = weekOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => {
          const orderTotal = o.order_items?.reduce(
            (itemSum: number, item: any) => itemSum + (item.quantity * parseFloat(item.price)),
            0
          ) || 0;
          return sum + orderTotal;
        }, 0);

      return {
        week: format(weekStart, "dd MMM", { locale: tr }),
        orders: weekOrders.length,
        revenue: weekRevenue,
      };
    });
    setWeeklyData(weeklyStats);

    // Aylık veri (son 12 ay)
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date(),
    });

    const monthlyStats = months.map(monthStart => {
      const monthEnd = endOfMonth(monthStart);
      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });
      const monthRevenue = monthOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => {
          const orderTotal = o.order_items?.reduce(
            (itemSum: number, item: any) => itemSum + (item.quantity * parseFloat(item.price)),
            0
          ) || 0;
          return sum + orderTotal;
        }, 0);

      return {
        month: format(monthStart, "MMM yyyy", { locale: tr }),
        orders: monthOrders.length,
        revenue: monthRevenue,
      };
    });
    setMonthlyData(monthlyStats);

    setLoading(false);
  };

  const statusData = [
    { name: "Beklemede", value: stats.pending, color: "#3b82f6" },
    { name: "Onaylandı", value: stats.confirmed, color: "#22c55e" },
    { name: "Hazırlanıyor", value: stats.preparing, color: "#f59e0b" },
    { name: "Hazır", value: stats.ready, color: "#06b6d4" },
    { name: "Teslimde", value: stats.in_delivery, color: "#8b5cf6" },
    { name: "Teslim Edildi", value: stats.delivered, color: "#10b981" },
    { name: "Reddedildi", value: stats.rejected, color: "#ef4444" },
  ].filter(s => s.value > 0);

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-primary" />
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-3xl font-bold">₺{stats.totalRevenue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Toplam Gelir</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-3xl font-bold">{stats.delivered}</p>
                <p className="text-sm text-muted-foreground">Teslim Edildi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-3xl font-bold">{stats.pending + stats.confirmed + stats.preparing}</p>
                <p className="text-sm text-muted-foreground">İşlemde</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Durum Kartları */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
        <Card className="bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Beklemede</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950">
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
            <p className="text-xs text-muted-foreground">Onaylandı</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-950">
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.preparing}</p>
            <p className="text-xs text-muted-foreground">Hazırlanıyor</p>
          </CardContent>
        </Card>
        <Card className="bg-cyan-50 dark:bg-cyan-950">
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <p className="text-2xl font-bold text-cyan-600">{stats.ready}</p>
            <p className="text-xs text-muted-foreground">Hazır</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950">
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.in_delivery}</p>
            <p className="text-xs text-muted-foreground">Teslimde</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950">
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.delivered}</p>
            <p className="text-xs text-muted-foreground">Teslim</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950">
          <CardContent className="pt-4 pb-3 px-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground">Reddedildi</p>
          </CardContent>
        </Card>
      </div>

      {/* Grafikler */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList>
          <TabsTrigger value="daily">Günlük</TabsTrigger>
          <TabsTrigger value="weekly">Haftalık</TabsTrigger>
          <TabsTrigger value="monthly">Aylık</TabsTrigger>
          <TabsTrigger value="status">Durum Dağılımı</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Günlük Sipariş Sayısı (Son 14 Gün)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="orders" name="Sipariş" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Günlük Gelir (Son 14 Gün)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`₺${value.toFixed(2)}`, "Gelir"]} />
                    <Line type="monotone" dataKey="revenue" name="Gelir" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weekly">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Haftalık Sipariş Sayısı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="orders" name="Sipariş" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Haftalık Gelir</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`₺${value.toFixed(2)}`, "Gelir"]} />
                    <Line type="monotone" dataKey="revenue" name="Gelir" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aylık Sipariş Sayısı (Son 12 Ay)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="orders" name="Sipariş" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aylık Gelir (Son 12 Ay)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`₺${value.toFixed(2)}`, "Gelir"]} />
                    <Line type="monotone" dataKey="revenue" name="Gelir" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sipariş Durum Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};