import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, ShoppingCart, Heart, TrendingUp } from "lucide-react";

interface ProductPerformance {
  id: string;
  title: string;
  price: number;
  stock_quantity: number | null;
  view_count: number;
  cart_add_count: number;
  favorite_count: number;
  order_count: number;
}

export const AdminProductPerformance = () => {
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    // Fetch products with analytics
    const { data: productsData } = await (supabase as any)
      .from("products")
      .select("id, title, price, stock_quantity");

    if (!productsData) { setLoading(false); return; }

    const { data: analytics } = await (supabase as any)
      .from("product_analytics")
      .select("product_id, view_count, cart_add_count");

    const { data: favorites } = await (supabase as any)
      .from("favorites")
      .select("product_id");

    const { data: orderItems } = await (supabase as any)
      .from("order_items")
      .select("product_id, quantity");

    const analyticsMap: Record<string, any> = {};
    (analytics || []).forEach((a: any) => { analyticsMap[a.product_id] = a; });

    const favCountMap: Record<string, number> = {};
    (favorites || []).forEach((f: any) => {
      favCountMap[f.product_id] = (favCountMap[f.product_id] || 0) + 1;
    });

    const orderCountMap: Record<string, number> = {};
    (orderItems || []).forEach((oi: any) => {
      orderCountMap[oi.product_id] = (orderCountMap[oi.product_id] || 0) + oi.quantity;
    });

    const performanceData: ProductPerformance[] = productsData.map((p: any) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      stock_quantity: p.stock_quantity,
      view_count: analyticsMap[p.id]?.view_count || 0,
      cart_add_count: analyticsMap[p.id]?.cart_add_count || 0,
      favorite_count: favCountMap[p.id] || 0,
      order_count: orderCountMap[p.id] || 0,
    }));

    setProducts(performanceData);
    setLoading(false);
  };

  const topViewed = [...products].sort((a, b) => b.view_count - a.view_count).slice(0, 5);
  const topSold = [...products].sort((a, b) => b.order_count - a.order_count).slice(0, 5);
  const topFavorited = [...products].sort((a, b) => b.favorite_count - a.favorite_count).slice(0, 5);

  if (loading) return <div className="text-center py-8 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <TrendingUp className="h-6 w-6" /> Ürün Performans Raporu
      </h2>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" /> En Çok Görüntülenen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topViewed.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm truncate flex-1">
                  <Badge variant="outline" className="mr-2">{i + 1}</Badge>
                  {p.title}
                </span>
                <span className="text-sm font-bold text-muted-foreground ml-2">{p.view_count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> En Çok Satılan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSold.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm truncate flex-1">
                  <Badge variant="outline" className="mr-2">{i + 1}</Badge>
                  {p.title}
                </span>
                <span className="text-sm font-bold text-muted-foreground ml-2">{p.order_count} adet</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4" /> En Çok Favorilenen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topFavorited.map((p, i) => (
              <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="text-sm truncate flex-1">
                  <Badge variant="outline" className="mr-2">{i + 1}</Badge>
                  {p.title}
                </span>
                <span className="text-sm font-bold text-muted-foreground ml-2">{p.favorite_count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Full table */}
      <Card>
        <CardHeader>
          <CardTitle>Tüm Ürünler - Performans Detayı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ürün</TableHead>
                  <TableHead className="text-right">Fiyat</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Görüntülenme</TableHead>
                  <TableHead className="text-right">Sepete Ekleme</TableHead>
                  <TableHead className="text-right">Favori</TableHead>
                  <TableHead className="text-right">Satış Adedi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products
                  .sort((a, b) => b.order_count - a.order_count)
                  .map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                    <TableCell className="text-right">₺{Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {p.stock_quantity !== null ? p.stock_quantity : "—"}
                    </TableCell>
                    <TableCell className="text-right">{p.view_count}</TableCell>
                    <TableCell className="text-right">{p.cart_add_count}</TableCell>
                    <TableCell className="text-right">{p.favorite_count}</TableCell>
                    <TableCell className="text-right font-bold">{p.order_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
