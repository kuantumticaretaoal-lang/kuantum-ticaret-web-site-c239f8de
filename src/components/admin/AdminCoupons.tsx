import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Tag, Percent, Banknote } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "0",
    max_uses: "",
    expires_at: "",
    is_active: true,
  });

  useEffect(() => {
    loadCoupons();

    const channel = supabase
      .channel("coupons-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "coupons" }, () => {
        loadCoupons();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCoupons = async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kuponlar yüklenemedi",
      });
    } else {
      setCoupons(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      min_order_amount: "0",
      max_uses: "",
      expires_at: "",
      is_active: true,
    });
    setEditingCoupon(null);
  };

  const handleSubmit = async () => {
    if (!formData.code.trim() || !formData.discount_value) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kupon kodu ve indirim değeri zorunludur",
      });
      return;
    }

    const couponData = {
      code: formData.code.toUpperCase().trim(),
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      min_order_amount: parseFloat(formData.min_order_amount) || 0,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      expires_at: formData.expires_at || null,
      is_active: formData.is_active,
    };

    if (editingCoupon) {
      const { error } = await supabase
        .from("coupons")
        .update(couponData)
        .eq("id", editingCoupon.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Kupon güncellenemedi",
        });
      } else {
        toast({
          title: "Başarılı",
          description: "Kupon güncellendi",
        });
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("coupons").insert(couponData);

      if (error) {
        if (error.code === "23505") {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Bu kupon kodu zaten mevcut",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Kupon oluşturulamadı",
          });
        }
      } else {
        toast({
          title: "Başarılı",
          description: "Kupon oluşturuldu",
        });
        setDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_order_amount: coupon.min_order_amount.toString(),
      max_uses: coupon.max_uses?.toString() || "",
      expires_at: coupon.expires_at ? coupon.expires_at.split("T")[0] : "",
      is_active: coupon.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kupon silinemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Kupon silindi",
      });
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from("coupons")
      .update({ is_active: !coupon.is_active })
      .eq("id", coupon.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kupon durumu güncellenemedi",
      });
    }
  };

  const activeCoupons = coupons.filter((c) => c.is_active);
  const totalUsage = coupons.reduce((sum, c) => sum + c.current_uses, 0);

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{coupons.length}</p>
                <p className="text-sm text-muted-foreground">Toplam Kupon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{activeCoupons.length}</p>
                <p className="text-sm text-muted-foreground">Aktif Kupon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalUsage}</p>
                <p className="text-sm text-muted-foreground">Toplam Kullanım</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kupon Ekle */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCoupon ? "Kuponu Düzenle" : "Yeni Kupon Oluştur"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Kupon Kodu *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="INDIRIM20"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label>İndirim Türü</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v) => setFormData({ ...formData, discount_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Yüzde (%)</SelectItem>
                    <SelectItem value="fixed">Sabit Tutar (₺)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  İndirim Değeri *{" "}
                  {formData.discount_type === "percentage" ? "(%)" : "(₺)"}
                </Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === "percentage" ? "20" : "50"}
                  min="0"
                  max={formData.discount_type === "percentage" ? "100" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Sipariş Tutarı (₺)</Label>
                <Input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Maksimum Kullanım (boş = sınırsız)</Label>
                <Input
                  type="number"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                  placeholder="Sınırsız"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Son Kullanma Tarihi (boş = süresiz)</Label>
                <Input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Aktif</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingCoupon ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kupon Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Kuponlar</CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz kupon oluşturulmamış</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>İndirim</TableHead>
                    <TableHead>Min. Tutar</TableHead>
                    <TableHead>Kullanım</TableHead>
                    <TableHead>Son Tarih</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                      <TableCell>
                        {coupon.discount_type === "percentage"
                          ? `%${coupon.discount_value}`
                          : `₺${coupon.discount_value}`}
                      </TableCell>
                      <TableCell>₺{coupon.min_order_amount}</TableCell>
                      <TableCell>
                        {coupon.current_uses}
                        {coupon.max_uses && ` / ${coupon.max_uses}`}
                      </TableCell>
                      <TableCell>
                        {coupon.expires_at
                          ? new Date(coupon.expires_at).toLocaleDateString("tr-TR")
                          : "Süresiz"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={coupon.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleActive(coupon)}
                        >
                          {coupon.is_active ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(coupon)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
