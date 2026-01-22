import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, User, Package, TrendingUp } from "lucide-react";

interface CartWithDetails {
  id: string;
  user_id: string | null;
  session_id: string | null;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  custom_name: string | null;
  selected_size: string | null;
  user?: { first_name: string; last_name: string; email: string } | null;
  product?: { title: string; price: number; discounted_price: number | null };
}

export const AdminCart = () => {
  const [carts, setCarts] = useState<CartWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    uniqueUsers: 0,
    guestCarts: 0,
  });

  useEffect(() => {
    loadCarts();

    const channel = supabase
      .channel("admin-carts")
      .on("postgres_changes", { event: "*", schema: "public", table: "cart" }, () => loadCarts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCarts = async () => {
    const { data } = await supabase
      .from("cart")
      .select(`
        *,
        products:product_id (title, price, discounted_price)
      `)
      .order("updated_at", { ascending: false });

    if (data) {
      // Load user profiles separately for user_id items
      const userIds = [...new Set(data.filter((c) => c.user_id).map((c) => c.user_id))];
      
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", userIds);
        
        if (profiles) {
          profiles.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const formatted: CartWithDetails[] = data.map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        session_id: c.session_id,
        product_id: c.product_id,
        quantity: c.quantity,
        created_at: c.created_at,
        updated_at: c.updated_at,
        custom_name: c.custom_name,
        selected_size: c.selected_size,
        user: c.user_id ? profilesMap[c.user_id] : null,
        product: c.products,
      }));

      setCarts(formatted);

      // Calculate stats
      const totalItems = data.reduce((sum, c) => sum + c.quantity, 0);
      const totalValue = data.reduce((sum, c) => {
        const price = c.products?.discounted_price || c.products?.price || 0;
        return sum + price * c.quantity;
      }, 0);
      const uniqueUsers = new Set(data.filter((c) => c.user_id).map((c) => c.user_id)).size;
      const guestCarts = data.filter((c) => !c.user_id && c.session_id).length;

      setStats({ totalItems, totalValue, uniqueUsers, guestCarts });
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("tr-TR");
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Şimdi";
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
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
          <ShoppingCart className="h-5 w-5" />
          Sepet Takibi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-5 w-5" />
                {stats.totalItems}
              </div>
              <p className="text-sm text-muted-foreground">Toplam Ürün</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {stats.totalValue.toFixed(2)} ₺
              </div>
              <p className="text-sm text-muted-foreground">Potansiyel Gelir</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold flex items-center gap-2">
                <User className="h-5 w-5" />
                {stats.uniqueUsers}
              </div>
              <p className="text-sm text-muted-foreground">Üye Sepeti</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.guestCarts}</div>
              <p className="text-sm text-muted-foreground">Misafir Sepeti</p>
            </CardContent>
          </Card>
        </div>

        {carts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Şu an sepette ürün yok
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Adet</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Toplam</TableHead>
                  <TableHead>Güncelleme</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carts.map((cart) => {
                  const price = cart.product?.discounted_price || cart.product?.price || 0;
                  const total = price * cart.quantity;
                  
                  return (
                    <TableRow key={cart.id}>
                      <TableCell>
                        {cart.user ? (
                          <div>
                            <p className="font-medium">
                              {cart.user.first_name} {cart.user.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{cart.user.email}</p>
                          </div>
                        ) : (
                          <Badge variant="secondary">
                            Misafir ({cart.session_id?.substring(0, 8)}...)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cart.product?.title || "Silinmiş Ürün"}</p>
                          {cart.selected_size && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Beden: {cart.selected_size}
                            </Badge>
                          )}
                          {cart.custom_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Özel: {cart.custom_name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge>{cart.quantity}</Badge>
                      </TableCell>
                      <TableCell>
                        {cart.product?.discounted_price ? (
                          <div>
                            <span className="text-green-600">{cart.product.discounted_price.toFixed(2)} ₺</span>
                            <span className="text-xs text-muted-foreground line-through ml-1">
                              {cart.product.price.toFixed(2)} ₺
                            </span>
                          </div>
                        ) : (
                          <span>{price.toFixed(2)} ₺</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {total.toFixed(2)} ₺
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTimeAgo(cart.updated_at)}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
