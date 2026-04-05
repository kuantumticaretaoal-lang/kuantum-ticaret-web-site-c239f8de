import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const AdminScheduledDiscounts = () => {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", category_id: "", discount_percent: "", starts_at: "", ends_at: "" });

  useEffect(() => { load(); loadProducts(); loadCategories(); }, []);

  const load = async () => {
    const { data } = await (supabase as any).from("scheduled_discounts")
      .select("*, products(title), categories(name)")
      .order("starts_at", { ascending: false });
    setDiscounts(data || []);
  };

  const loadProducts = async () => {
    const { data } = await (supabase as any).from("products").select("id, title").order("title");
    setProducts(data || []);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    setCategories(data || []);
  };

  const save = async () => {
    if (!form.discount_percent || !form.starts_at || !form.ends_at) {
      toast({ variant: "destructive", title: "Hata", description: "Tüm alanları doldurun" }); return;
    }
    const payload: any = {
      discount_percent: parseFloat(form.discount_percent),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
    };
    if (form.product_id) payload.product_id = form.product_id;
    if (form.category_id) payload.category_id = form.category_id;

    const { error } = await (supabase as any).from("scheduled_discounts").insert(payload);
    if (error) { toast({ variant: "destructive", title: "Hata" }); return; }
    await logAdminActivity("scheduled_discount_create", `Zamanlı indirim oluşturuldu: %${form.discount_percent}`, "scheduled_discounts");
    toast({ title: "Başarılı" });
    setOpen(false);
    setForm({ product_id: "", category_id: "", discount_percent: "", starts_at: "", ends_at: "" });
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("scheduled_discounts").delete().eq("id", id);
    toast({ title: "Silindi" });
    load();
  };

  const isActive = (d: any) => {
    const now = new Date();
    return d.is_active && new Date(d.starts_at) <= now && new Date(d.ends_at) >= now;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Zamanlı İndirimler</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Yeni</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Zamanlı İndirim Ekle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Ürün (opsiyonel)</Label>
                <Select value={form.product_id} onValueChange={v => setForm({...form, product_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Ürün seçin" /></SelectTrigger>
                  <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kategori (opsiyonel)</Label>
                <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>İndirim Yüzdesi (%)</Label><Input type="number" value={form.discount_percent} onChange={e => setForm({...form, discount_percent: e.target.value})} /></div>
              <div><Label>Başlangıç</Label><Input type="datetime-local" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})} /></div>
              <div><Label>Bitiş</Label><Input type="datetime-local" value={form.ends_at} onChange={e => setForm({...form, ends_at: e.target.value})} /></div>
              <Button onClick={save} className="w-full">Kaydet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hedef</TableHead>
              <TableHead>İndirim</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.map(d => (
              <TableRow key={d.id}>
                <TableCell>{d.products?.title || d.categories?.name || "Tümü"}</TableCell>
                <TableCell className="font-bold">%{d.discount_percent}</TableCell>
                <TableCell className="text-sm">{new Date(d.starts_at).toLocaleString("tr-TR")}</TableCell>
                <TableCell className="text-sm">{new Date(d.ends_at).toLocaleString("tr-TR")}</TableCell>
                <TableCell><Badge variant={isActive(d) ? "default" : "secondary"}>{isActive(d) ? "Aktif" : "Pasif"}</Badge></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
