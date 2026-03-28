import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Package, TrendingUp, TrendingDown, Users, AlertTriangle, Activity, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalProducts: 0,
    totalUsers: 0,
    lowStockProducts: [] as any[],
  });
  const [dailyOrders, setDailyOrders] = useState<any[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();

      const [ordersRes, expensesRes, productsRes, usersRes, lowStockRes, recentOrdersRes, recentExpensesRes, activityRes] = await Promise.all([
        (supabase as any).from("orders").select("id, status, total_amount, created_at").eq("trashed", false),
        (supabase as any).from("expenses").select("type, amount"),
        (supabase as any).from("products").select("id"),
        (supabase as any).from("profiles").select("id"),
        (supabase as any).from("products").select("id, title, stock_quantity, stock_status").not("stock_quantity", "is", null).lte("stock_quantity", 5),
        (supabase as any).from("orders").select("id, total_amount, created_at, status").eq("trashed", false).gte("created_at", sevenDaysAgoStr),
        (supabase as any).from("expenses").select("amount, type, created_at").eq("type", "income").gte("created_at", sevenDaysAgoStr),
        (supabase as any).from("admin_activity_logs").select("action_type, action_description, created_at").order("created_at", { ascending: false }).limit(8),
      ]);

      const orders = ordersRes.data || [];
      const expenses = expensesRes.data || [];
      const pendingOrders = orders.filter((o: any) => o.status === "pending").length;

      const totalRevenue = expenses
        .filter((e: any) => e.type === "income")
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      const totalExpenses = expenses
        .filter((e: any) => e.type !== "income")
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      setStats({
        totalOrders: orders.length,
        pendingOrders,
        totalRevenue,
        totalExpenses,
        totalProducts: productsRes.data?.length || 0,
        totalUsers: usersRes.data?.length || 0,
        lowStockProducts: lowStockRes.data || [],
      });

      // Build 7-day charts
      const dayMap: Record<string, { orders: number; revenue: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dayMap[key] = { orders: 0, revenue: 0 };
      }

      (recentOrdersRes.data || []).forEach((o: any) => {
        const key = o.created_at?.split("T")[0];
        if (dayMap[key]) {
          dayMap[key].orders += 1;
        }
      });

      (recentExpensesRes.data || []).forEach((e: any) => {
        const key = e.created_at?.split("T")[0];
        if (dayMap[key]) {
          dayMap[key].revenue += Number(e.amount);
        }
      });

      const chartData = Object.entries(dayMap).map(([date, val]) => ({
        date: new Date(date).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
        sipariş: val.orders,
        gelir: val.revenue,
      }));

      setDailyOrders(chartData);
      setDailyRevenue(chartData);
      setRecentActivity(activityRes.data || []);
    } catch (e) {
      console.error("Dashboard stats error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>;
  }

  const netProfit = stats.totalRevenue - stats.totalExpenses;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Sipariş</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            {stats.pendingOrders > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <Badge variant="secondary" className="text-xs">{stats.pendingOrders} bekleyen</Badge>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Gelir</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₺{stats.totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Gider</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₺{stats.totalExpenses.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Kâr</CardTitle>
            {netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              ₺{netProfit.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Ürün</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* 7-Day Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Son 7 Gün - Sipariş Sayısı</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyOrders}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="sipariş" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Son 7 Gün - Gelir (₺)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} formatter={(value: number) => [`₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`, 'Gelir']} />
                <Line type="monotone" dataKey="gelir" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5" />
              Son Aktiviteler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz aktivite yok.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-2 rounded-md bg-muted/50">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{activity.action_description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className={stats.lowStockProducts.length > 0 ? "border-destructive/50" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Düşük Stok Uyarısı ({stats.lowStockProducts.length} ürün)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tüm ürünlerin stoğu yeterli.</p>
            ) : (
              <div className="space-y-2">
                {stats.lowStockProducts.map((product: any) => (
                  <div key={product.id} className="flex items-center justify-between p-2 rounded-md bg-destructive/5 border border-destructive/20">
                    <span className="text-sm font-medium truncate">{product.title}</span>
                    <Badge variant={product.stock_quantity === 0 ? "destructive" : "secondary"}>
                      {product.stock_quantity === 0 ? "Stokta Yok" : `${product.stock_quantity} adet`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
