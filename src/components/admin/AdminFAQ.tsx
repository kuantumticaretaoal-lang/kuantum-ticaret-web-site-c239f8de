import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, HelpCircle } from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
}

export const AdminFAQ = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FAQ | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", sort_order: 0, is_active: true });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("faq_items").select("*").order("sort_order");
    setItems(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ question: "", answer: "", sort_order: 0, is_active: true });
  };

  const startEdit = (item: FAQ) => {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, sort_order: item.sort_order, is_active: item.is_active });
  };

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast({ variant: "destructive", description: "Soru ve cevap boş olamaz" });
      return;
    }
    const payload = { ...form, question: form.question.trim(), answer: form.answer.trim() };
    const { error } = editing
      ? await (supabase as any).from("faq_items").update(payload).eq("id", editing.id)
      : await (supabase as any).from("faq_items").insert(payload);
    if (error) {
      toast({ variant: "destructive", title: "Hata", description: error.message });
      return;
    }
    toast({ title: editing ? "Güncellendi" : "Eklendi" });
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    await (supabase as any).from("faq_items").delete().eq("id", id);
    toast({ title: "Silindi" });
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {editing ? "Soruyu Düzenle" : "Yeni Soru Ekle"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Soru</Label>
            <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Örn: Siparişim ne kadar sürede gelir?" />
          </div>
          <div>
            <Label>Cevap</Label>
            <Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={5} placeholder="Cevabınızı yazın..." />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Sıralama</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <span className="text-sm">Aktif</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={save}><Plus className="h-4 w-4 mr-1" />{editing ? "Güncelle" : "Ekle"}</Button>
            {editing && <Button variant="outline" onClick={resetForm}>İptal</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mevcut Sorular ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>Yükleniyor...</p> : items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Henüz soru eklenmedi.</p>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="border rounded-lg p-4 flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{it.question}</p>
                      {!it.is_active && <span className="text-xs bg-muted px-2 py-0.5 rounded">Pasif</span>}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{it.answer}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sıra: {it.sort_order}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => startEdit(it)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => remove(it.id)} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
