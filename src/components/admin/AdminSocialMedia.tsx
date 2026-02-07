import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, GripVertical, Upload, X } from "lucide-react";

interface SocialMediaItem {
  id: string;
  name: string;
  url: string;
  icon: string | null;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export const AdminSocialMedia = () => {
  const [items, setItems] = useState<SocialMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialMediaItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    icon: "",
    logo_url: "",
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
      const { data, error } = await (supabase as any)
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sadece JPG, PNG, WebP ve SVG dosyaları yüklenebilir",
      });
      return;
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Dosya boyutu 2MB'dan küçük olmalıdır",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("social-logos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("social-logos")
        .getPublicUrl(fileName);

      setFormData({ ...formData, logo_url: urlData.publicUrl });
      toast({
        title: "Başarılı",
        description: "Logo yüklendi",
      });
    } catch (error: any) {
      logger.error("Logo yüklenemedi", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Logo yüklenemedi: " + error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.url) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "İsim ve URL zorunludur",
      });
      return;
    }

    try {
      if (editingItem) {
        // Update
        const { error } = await supabase
          .from("social_media_items" as any)
          .update({
            name: formData.name,
            url: formData.url,
            icon: formData.icon || null,
            logo_url: formData.logo_url || null,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({
          title: "Başarılı",
          description: "Sosyal medya hesabı güncellendi",
        });
      } else {
        // Create
        const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order)) : 0;
        const { error } = await supabase
          .from("social_media_items" as any)
          .insert({
            name: formData.name,
            url: formData.url,
            icon: formData.icon || null,
            logo_url: formData.logo_url || null,
            sort_order: maxOrder + 1,
          });

        if (error) throw error;
        toast({
          title: "Başarılı",
          description: "Sosyal medya hesabı eklendi",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadItems();
    } catch (error: any) {
      logger.error("Sosyal medya kaydedilemedi", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("social_media_items" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({
        title: "Başarılı",
        description: "Sosyal medya hesabı silindi",
      });
      loadItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message,
      });
    }
  };

  const toggleActive = async (item: SocialMediaItem) => {
    try {
      const { error } = await supabase
        .from("social_media_items" as any)
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) throw error;
      loadItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message,
      });
    }
  };

  const openEditDialog = (item: SocialMediaItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      url: item.url,
      icon: item.icon || "",
      logo_url: item.logo_url || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", url: "", icon: "", logo_url: "" });
    setEditingItem(null);
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Sosyal Medya Hesapları</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Hesabı Düzenle" : "Yeni Hesap Ekle"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Platform Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Instagram, YouTube, LinkedIn"
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
                <Label>İkon Adı (Lucide)</Label>
                <Input
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Örn: Instagram, Youtube, Linkedin"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  lucide.dev'den ikon adı (isteğe bağlı)
                </p>
              </div>
              <div>
                <Label>Özel Logo</Label>
                <div className="flex gap-2 items-center">
                  {formData.logo_url ? (
                    <div className="relative">
                      <img
                        src={formData.logo_url}
                        alt="Logo"
                        className="w-12 h-12 object-contain rounded border"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => setFormData({ ...formData, logo_url: "" })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Label className="flex items-center gap-2 cursor-pointer border rounded px-4 py-2 hover:bg-muted">
                      <Upload className="h-4 w-4" />
                      <span>{uploading ? "Yükleniyor..." : "Logo Yükle"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                      />
                    </Label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Özel logo yüklerseniz ikon yerine kullanılır
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button onClick={handleSubmit}>
                  {editingItem ? "Güncelle" : "Ekle"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Henüz sosyal medya hesabı eklenmemiş
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    {item.logo_url ? (
                      <img
                        src={item.logo_url}
                        alt={item.name}
                        className="w-8 h-8 object-contain rounded"
                      />
                    ) : item.icon ? (
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs">
                        {item.icon.slice(0, 2)}
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm truncate max-w-[200px] block"
                    >
                      {item.url}
                    </a>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => toggleActive(item)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Silmek istediğinizden emin misiniz?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bu işlem geri alınamaz.
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
