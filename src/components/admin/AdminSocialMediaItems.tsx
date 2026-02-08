import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { logger } from "@/lib/logger";
import { Plus, Pencil, Trash2, Upload, GripVertical } from "lucide-react";

interface SocialMediaItem {
  id: string;
  name: string;
  url: string;
  icon: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export const AdminSocialMediaItems = () => {
  const [items, setItems] = useState<SocialMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialMediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    url: "",
    icon: "",
    is_active: true,
  });

  useEffect(() => {
    loadItems();

    const channel = supabase
      .channel("social-media-items-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_media_items" }, () => {
        loadItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from("social_media_items")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      logger.error("Sosyal medya öğeleri yüklenemedi", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: SocialMediaItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        url: item.url,
        icon: item.icon || "",
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        url: "",
        icon: "",
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("social-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("social-logos")
        .getPublicUrl(fileName);

      if (itemId) {
        // Update existing item
        const { error: updateError } = await supabase
          .from("social_media_items")
          .update({ logo_url: urlData.publicUrl })
          .eq("id", itemId);

        if (updateError) throw updateError;
        toast({ title: "Başarılı", description: "Logo güncellendi" });
        loadItems();
      } else if (editingItem) {
        // Update editing item logo
        const { error: updateError } = await supabase
          .from("social_media_items")
          .update({ logo_url: urlData.publicUrl })
          .eq("id", editingItem.id);

        if (updateError) throw updateError;
        setEditingItem({ ...editingItem, logo_url: urlData.publicUrl });
        toast({ title: "Başarılı", description: "Logo yüklendi" });
        loadItems();
      }
    } catch (error) {
      logger.error("Logo yüklenemedi", error);
      toast({ variant: "destructive", title: "Hata", description: "Logo yüklenemedi" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.url) {
      toast({ variant: "destructive", title: "Hata", description: "Ad ve URL zorunludur" });
      return;
    }

    try {
      if (editingItem) {
        const { error } = await supabase
          .from("social_media_items")
          .update({
            name: formData.name,
            url: formData.url,
            icon: formData.icon || null,
            is_active: formData.is_active,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({ title: "Başarılı", description: "Sosyal medya hesabı güncellendi" });
      } else {
        const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) : 0;
        const { error } = await supabase
          .from("social_media_items")
          .insert({
            name: formData.name,
            url: formData.url,
            icon: formData.icon || null,
            is_active: formData.is_active,
            sort_order: maxOrder + 1,
          });

        if (error) throw error;
        toast({ title: "Başarılı", description: "Sosyal medya hesabı eklendi" });
      }

      setDialogOpen(false);
      loadItems();
    } catch (error) {
      logger.error("Kaydetme hatası", error);
      toast({ variant: "destructive", title: "Hata", description: "İşlem başarısız" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("social_media_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Başarılı", description: "Sosyal medya hesabı silindi" });
      loadItems();
    } catch (error) {
      logger.error("Silme hatası", error);
      toast({ variant: "destructive", title: "Hata", description: "Silinemedi" });
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("social_media_items")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;
      loadItems();
    } catch (error) {
      logger.error("Durum güncellenemedi", error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sosyal Medya Hesapları</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Yükleniyor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Sosyal Medya Hesapları</span>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Yeni Ekle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? "Hesabı Düzenle" : "Yeni Hesap Ekle"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Platform Adı *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Instagram, YouTube, vb."
                  />
                </div>
                <div>
                  <Label>URL *</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>İkon Adı (opsiyonel)</Label>
                  <Input
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="instagram, youtube, linkedin, vb."
                  />
                </div>
                {editingItem && (
                  <div>
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4 mt-2">
                      {editingItem.logo_url && (
                        <img
                          src={editingItem.logo_url}
                          alt={editingItem.name}
                          className="w-12 h-12 object-contain rounded"
                        />
                      )}
                      <Label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
                          <Upload className="h-4 w-4" />
                          {uploading ? "Yükleniyor..." : "Logo Yükle"}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLogoUpload(e)}
                          disabled={uploading}
                        />
                      </Label>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Aktif</Label>
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editingItem ? "Güncelle" : "Ekle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Henüz sosyal medya hesabı eklenmemiş.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.logo_url ? (
                        <img
                          src={item.logo_url}
                          alt={item.name}
                          className="w-8 h-8 object-contain rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                          ?
                        </div>
                      )}
                      <Label className="cursor-pointer">
                        <Upload className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLogoUpload(e, item.id)}
                          disabled={uploading}
                        />
                      </Label>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate max-w-[200px] block"
                    >
                      {item.url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => toggleActive(item.id, item.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Silmek istediğinize emin misiniz?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{item.name}" hesabı kalıcı olarak silinecek.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>
                              Sil
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
