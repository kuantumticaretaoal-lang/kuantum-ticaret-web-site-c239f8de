import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { FileText, Plus, Trash2, Eye, EyeOff, Edit } from "lucide-react";

export const AdminBlog = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editPost, setEditPost] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", slug: "", content: "", excerpt: "", cover_image_url: "",
    meta_title: "", meta_description: "", tags: "", is_published: false,
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await (supabase as any).from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts(data || []);
    setLoading(false);
  };

  const generateSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9ğüşıöç]/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const openNew = () => {
    setEditPost(null);
    setForm({ title: "", slug: "", content: "", excerpt: "", cover_image_url: "", meta_title: "", meta_description: "", tags: "", is_published: false });
    setEditOpen(true);
  };

  const openEdit = (post: any) => {
    setEditPost(post);
    setForm({
      title: post.title, slug: post.slug, content: post.content || "", excerpt: post.excerpt || "",
      cover_image_url: post.cover_image_url || "", meta_title: post.meta_title || "",
      meta_description: post.meta_description || "", tags: (post.tags || []).join(", "), is_published: post.is_published,
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!form.title || !form.slug) { toast({ variant: "destructive", title: "Hata", description: "Başlık ve slug gerekli" }); return; }
    const payload = {
      ...form, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      published_at: form.is_published ? new Date().toISOString() : null,
    };

    if (editPost) {
      const { error } = await (supabase as any).from("blog_posts").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editPost.id);
      if (error) { toast({ variant: "destructive", title: "Hata" }); return; }
      await logAdminActivity("blog_update", `Blog yazısı güncellendi: ${form.title}`, "blog_posts", editPost.id);
    } else {
      const { error } = await (supabase as any).from("blog_posts").insert(payload);
      if (error) { toast({ variant: "destructive", title: "Hata", description: error.message }); return; }
      await logAdminActivity("blog_create", `Blog yazısı oluşturuldu: ${form.title}`, "blog_posts");
    }
    toast({ title: "Başarılı" });
    setEditOpen(false);
    load();
  };

  const remove = async (id: string, title: string) => {
    await (supabase as any).from("blog_posts").delete().eq("id", id);
    await logAdminActivity("blog_delete", `Blog yazısı silindi: ${title}`, "blog_posts", id);
    toast({ title: "Silindi" });
    load();
  };

  const togglePublish = async (id: string, current: boolean) => {
    await (supabase as any).from("blog_posts").update({ is_published: !current, published_at: !current ? new Date().toISOString() : null }).eq("id", id);
    load();
  };

  if (loading) return <p className="text-center py-8">Yükleniyor...</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Blog Yazıları ({posts.length})</CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Yeni Yazı</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başlık</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map(post => (
              <TableRow key={post.id}>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{post.slug}</TableCell>
                <TableCell>
                  <Badge variant={post.is_published ? "default" : "secondary"}>
                    {post.is_published ? "Yayında" : "Taslak"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{new Date(post.created_at).toLocaleDateString("tr-TR")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(post)}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => togglePublish(post.id, post.is_published)}>
                      {post.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(post.id, post.title)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editPost ? "Blog Yazısını Düzenle" : "Yeni Blog Yazısı"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Başlık</Label><Input value={form.title} onChange={e => { setForm({...form, title: e.target.value, slug: editPost ? form.slug : generateSlug(e.target.value) }); }} /></div>
              <div><Label>Slug (URL)</Label><Input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} /></div>
              <div><Label>Özet</Label><Input value={form.excerpt} onChange={e => setForm({...form, excerpt: e.target.value})} /></div>
              <div><Label>İçerik</Label><Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="min-h-[200px]" /></div>
              <div><Label>Kapak Görseli URL</Label><Input value={form.cover_image_url} onChange={e => setForm({...form, cover_image_url: e.target.value})} /></div>
              <div><Label>SEO Başlık</Label><Input value={form.meta_title} onChange={e => setForm({...form, meta_title: e.target.value})} placeholder="Max 60 karakter" /></div>
              <div><Label>SEO Açıklama</Label><Input value={form.meta_description} onChange={e => setForm({...form, meta_description: e.target.value})} placeholder="Max 160 karakter" /></div>
              <div><Label>Etiketler (virgülle ayırın)</Label><Input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_published} onCheckedChange={v => setForm({...form, is_published: v})} />
                <Label>Yayınla</Label>
              </div>
              <Button onClick={save} className="w-full">Kaydet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
