import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Trash2, Star } from "lucide-react";

export const AddressBook = () => {
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", first_name: "", last_name: "", phone: "", province: "", district: "", address: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase as any).from("address_book").select("*").eq("user_id", user.id).order("is_default", { ascending: false });
    setAddresses(data || []);
  };

  const save = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!form.title || !form.address || !form.province || !form.district) {
      toast({ variant: "destructive", title: "Hata", description: "Gerekli alanları doldurun" });
      return;
    }
    const { error } = await (supabase as any).from("address_book").insert({
      ...form, user_id: user.id, is_default: addresses.length === 0,
    });
    if (error) { toast({ variant: "destructive", title: "Hata", description: "Adres eklenemedi" }); return; }
    toast({ title: "Başarılı", description: "Adres eklendi" });
    setForm({ title: "", first_name: "", last_name: "", phone: "", province: "", district: "", address: "" });
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from("address_book").delete().eq("id", id);
    toast({ title: "Silindi" });
    load();
  };

  const setDefault = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase as any).from("address_book").update({ is_default: false }).eq("user_id", user.id);
    await (supabase as any).from("address_book").update({ is_default: true }).eq("id", id);
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg"><MapPin className="h-5 w-5" /> Adres Defteri</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Yeni Adres</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yeni Adres Ekle</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Başlık (Ev, İş...)</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Ad</Label><Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} /></div>
                <div><Label>Soyad</Label><Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
              </div>
              <div><Label>Telefon</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>İl</Label><Input value={form.province} onChange={e => setForm({...form, province: e.target.value})} /></div>
                <div><Label>İlçe</Label><Input value={form.district} onChange={e => setForm({...form, district: e.target.value})} /></div>
              </div>
              <div><Label>Adres</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <Button onClick={save} className="w-full">Kaydet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {addresses.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Kayıtlı adresiniz yok</p>
        ) : (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className="p-3 border rounded-lg flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{addr.title}</span>
                    {addr.is_default && <Badge variant="secondary" className="text-xs">Varsayılan</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{addr.first_name} {addr.last_name}</p>
                  <p className="text-xs text-muted-foreground">{addr.address}, {addr.district}/{addr.province}</p>
                </div>
                <div className="flex gap-1">
                  {!addr.is_default && (
                    <Button size="icon" variant="ghost" onClick={() => setDefault(addr.id)} title="Varsayılan yap">
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(addr.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
