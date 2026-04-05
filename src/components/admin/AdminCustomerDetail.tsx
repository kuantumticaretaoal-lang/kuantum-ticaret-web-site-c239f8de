import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Package, Heart, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const AdminCustomerDetail = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userFavorites, setUserFavorites] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const { data } = await (supabase as any).from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
    setUsers(data || []);
  };

  const viewUser = async (user: any) => {
    setSelectedUser(user);
    const [ordersRes, favsRes] = await Promise.all([
      (supabase as any).from("orders").select("*, order_items(*, products(title))").eq("user_id", user.id).order("created_at", { ascending: false }),
      (supabase as any).from("favorites").select("*, products(title, price)").eq("user_id", user.id),
    ]);
    setUserOrders(ordersRes.data || []);
    setUserFavorites(favsRes.data || []);
    setOpen(true);
  };

  const totalSpending = userOrders
    .filter(o => o.status === "delivered")
    .reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Müşteri Detayları</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Konum</TableHead>
              <TableHead>İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.first_name} {u.last_name}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell className="text-sm">{u.phone}</TableCell>
                <TableCell className="text-sm">{u.district}/{u.province}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => viewUser(u)}>Detay</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{selectedUser?.first_name} {selectedUser?.last_name} - Müşteri Detayı</DialogTitle></DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card><CardContent className="pt-4 text-center">
                    <DollarSign className="h-6 w-6 mx-auto mb-1 text-green-500" />
                    <p className="text-xl font-bold">₺{totalSpending.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground">Toplam Harcama</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-4 text-center">
                    <Package className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                    <p className="text-xl font-bold">{userOrders.length}</p>
                    <p className="text-xs text-muted-foreground">Sipariş</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-4 text-center">
                    <Heart className="h-6 w-6 mx-auto mb-1 text-red-500" />
                    <p className="text-xl font-bold">{userFavorites.length}</p>
                    <p className="text-xs text-muted-foreground">Favori</p>
                  </CardContent></Card>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Siparişler</h4>
                  {userOrders.length === 0 ? <p className="text-sm text-muted-foreground">Sipariş yok</p> : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {userOrders.map(o => (
                        <div key={o.id} className="p-2 border rounded text-sm flex justify-between">
                          <div>
                            <span className="font-mono">{o.order_code}</span>
                            <span className="text-muted-foreground ml-2">{new Date(o.created_at).toLocaleDateString("tr-TR")}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{o.status}</Badge>
                            <span className="font-bold">₺{parseFloat(o.total_amount).toLocaleString("tr-TR")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Favoriler</h4>
                  {userFavorites.length === 0 ? <p className="text-sm text-muted-foreground">Favori yok</p> : (
                    <div className="flex flex-wrap gap-2">
                      {userFavorites.map(f => (
                        <Badge key={f.id} variant="secondary">{f.products?.title}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
