import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const AdminProductOrnaments = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [ornaments, setOrnaments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", image_url: "", extra_price: "0", max_per_product: "10", sort_order: "0" });

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("products").select("id, title, allows_ornaments").order("title");
      setProducts(data || []);
    })();
  }, []);

  useEffect(() => { if (selectedProduct) load(); }, [selectedProduct]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("product_ornaments")
      .select("*")
      .eq("product_id", selectedProduct)
      .order("sort_order");
    setOrnaments(data || []);
  };

  const toggleAllows = async (productId: string, value: boolean) => {
    await (supabase as any).from("products").update({ allows_ornaments: value }).eq("id", productId);
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, allows_ornaments: value } : p)));
    toast({ title: value ? "Süs eklemeye açıldı" : "Süs eklemeye kapatıldı" });
  };

  const save = async () => {
    if (!selectedProduct || !form.name.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Ürün ve isim zorunlu" });
      return;
    }
    const { error } = await (supabase as any).from("product_ornaments").insert({
      product_id: selectedProduct,
      name: form.name.trim(),
      image_url: form.image_url || null,
      extra_price: parseFloat(form.extra_price) || 0,
      max_per_product: parseInt(form.max_per_product) || 10,
      sort_order: parseInt(form.sort_order) || 0,
    });
    if (error) { toast({ variant: "destructive", title: "Hata", description: error.message }); return; }
    toast({ title: "Süs eklendi" });
    setOpen(false);
    setForm({ name: "", image_url: "", extra_price: "0", max_per_product: "10", sort_order: "0" });
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("product_ornaments").delete().eq("id", id);
    toast({ title: "Silindi" });
    load();
  };

  const toggleActive = async (id: string, value: boolean) => {
    await (supabase as any).from("product_ornaments").update({ is_active: value }).eq("id", id);
    load();
  };

  const selectedProductObj = products.find((p) => p.id === selectedProduct);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Ürün Süsleri (Charm)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Ürün Seçin</Label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger><SelectValue placeholder="Bir ürün seçin" /></SelectTrigger>
            <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {selectedProductObj && (
          <div className="flex items-center justify-between border p-3 rounded-md">
            <div>
              <div className="font-semibold">Süs Eklemeye İzin Ver</div>
              <div className="text-xs text-muted-foreground">Müşteriler bu ürüne süs ekleyebilsin mi?</div>
            </div>
            <Switch checked={!!selectedProductObj.allows_ornaments} onCheckedChange={(v) => toggleAllows(selectedProduct, v)} />
          </div>
        )}

        {selectedProduct && (
          <>
            <div className="flex justify-end">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Yeni Süs</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Yeni Süs Ekle</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>İsim</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div><Label>Görsel URL (opsiyonel)</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
                    <div><Label>Ek Ücret (₺)</Label><Input type="number" step="0.01" value={form.extra_price} onChange={(e) => setForm({ ...form, extra_price: e.target.value })} /></div>
                    <div><Label>Maks. Adet</Label><Input type="number" value={form.max_per_product} onChange={(e) => setForm({ ...form, max_per_product: e.target.value })} /></div>
                    <div><Label>Sıralama</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
                    <Button onClick={save} className="w-full">Kaydet</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Görsel</TableHead>
                  <TableHead>İsim</TableHead>
                  <TableHead>Ek Ücret</TableHead>
                  <TableHead>Maks</TableHead>
                  <TableHead>Aktif</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ornaments.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.image_url ? <img src={o.image_url} alt={o.name} className="w-10 h-10 object-cover rounded" /> : "-"}</TableCell>
                    <TableCell>{o.name}</TableCell>
                    <TableCell>₺{Number(o.extra_price).toFixed(2)}</TableCell>
                    <TableCell>{o.max_per_product}</TableCell>
                    <TableCell><Switch checked={o.is_active} onCheckedChange={(v) => toggleActive(o.id, v)} /></TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(o.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {ornaments.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Henüz süs eklenmemiş</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
};
