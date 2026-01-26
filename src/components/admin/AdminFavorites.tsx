import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Heart, User, Package } from "lucide-react";

interface FavoriteWithDetails {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  user?: { first_name: string; last_name: string; email: string };
  product?: { title: string; price: number; discounted_price: number | null };
}

export const AdminFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalFavorites: 0, uniqueUsers: 0, uniqueProducts: 0 });

  useEffect(() => {
    loadFavorites();

    const channel = supabase
      .channel("admin-favorites")
      .on("postgres_changes", { event: "*", schema: "public", table: "favorites" }, () => loadFavorites())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFavorites = async () => {
    try {
      // Fetch favorites first
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select("*")
        .order("created_at", { ascending: false });

      if (favError) {
        console.error("Favorites error:", favError);
        setLoading(false);
        return;
      }

      if (!favData || favData.length === 0) {
        setFavorites([]);
        setStats({ totalFavorites: 0, uniqueUsers: 0, uniqueProducts: 0 });
        setLoading(false);
        return;
      }

      // Get unique IDs
      const productIds = [...new Set(favData.map(f => f.product_id))];
      const userIds = [...new Set(favData.map(f => f.user_id))];

      // Fetch products separately
      const { data: products } = await (supabase as any)
        .from("products")
        .select("id, title, price, discounted_price")
        .in("id", productIds);

      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", userIds);

      // Map data
      const formatted = favData.map((f: any) => ({
        id: f.id,
        user_id: f.user_id,
        product_id: f.product_id,
        created_at: f.created_at,
        user: profiles?.find(p => p.id === f.user_id),
        product: products?.find((p: any) => p.id === f.product_id),
      }));

      setFavorites(formatted);
      setStats({
        totalFavorites: favData.length,
        uniqueUsers: userIds.length,
        uniqueProducts: productIds.length,
      });
    } catch (err) {
      console.error("Error loading favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("tr-TR");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">Yükleniyor...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Favoriler Takibi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalFavorites}</div>
              <p className="text-sm text-muted-foreground">Toplam Favori</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold flex items-center gap-2">
                <User className="h-5 w-5" />
                {stats.uniqueUsers}
              </div>
              <p className="text-sm text-muted-foreground">Farklı Kullanıcı</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-5 w-5" />
                {stats.uniqueProducts}
              </div>
              <p className="text-sm text-muted-foreground">Farklı Ürün</p>
            </CardContent>
          </Card>
        </div>

        {favorites.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Henüz favori eklenmemiş
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Eklenme Tarihi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {favorites.map((fav) => (
                  <TableRow key={fav.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {fav.user?.first_name} {fav.user?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{fav.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{fav.product?.title || "Silinmiş Ürün"}</span>
                    </TableCell>
                    <TableCell>
                      {fav.product ? (
                        <div>
                          {fav.product.discounted_price ? (
                            <>
                              <span className="text-green-600 font-medium">
                                {fav.product.discounted_price.toFixed(2)} ₺
                              </span>
                              <span className="text-xs text-muted-foreground line-through ml-2">
                                {fav.product.price.toFixed(2)} ₺
                              </span>
                            </>
                          ) : (
                            <span>{fav.product.price.toFixed(2)} ₺</span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatDate(fav.created_at)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
