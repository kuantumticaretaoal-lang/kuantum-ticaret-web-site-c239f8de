import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  description: string | null;
  background_image_url: string | null;
  background_color: string;
  text_color: string;
  countdown_end: string | null;
  is_active: boolean;
  show_countdown: boolean;
  scrolling_text: string | null;
  show_on_all_pages: boolean;
  show_on_homepage: boolean;
  show_on_products: boolean;
  target_all_users: boolean;
  target_new_users: boolean;
  target_premium_users: boolean;
  target_cart_users: boolean;
  hide_days_after_close: number;
  priority: number;
}

const defaultBanner: Omit<Banner, 'id'> = {
  title: '',
  description: null,
  background_image_url: null,
  background_color: '#dc2626',
  text_color: '#ffffff',
  countdown_end: null,
  is_active: true,
  show_countdown: true,
  scrolling_text: null,
  show_on_all_pages: true,
  show_on_homepage: false,
  show_on_products: false,
  target_all_users: true,
  target_new_users: false,
  target_premium_users: false,
  target_cart_users: false,
  hide_days_after_close: 1,
  priority: 0,
};

export const AdminCampaignBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState<Omit<Banner, 'id'>>(defaultBanner);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const loadBanners = async () => {
    const { data, error } = await supabase
      .from('campaign_banners')
      .select('*')
      .order('priority', { ascending: false });

    if (error) {
      toast.error('Banner\'lar yüklenirken hata oluştu');
      return;
    }

    setBanners(data || []);
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleImageUpload = async (): Promise<string | null> => {
    if (!imageFile) return formData.background_image_url;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `banner_${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      toast.error('Resim yüklenirken hata oluştu');
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Başlık zorunludur');
      return;
    }

    const imageUrl = await handleImageUpload();
    const dataToSave = { ...formData, background_image_url: imageUrl };

    if (editingBanner) {
      const { error } = await supabase
        .from('campaign_banners')
        .update(dataToSave)
        .eq('id', editingBanner.id);

      if (error) {
        toast.error('Banner güncellenirken hata oluştu');
        return;
      }

      toast.success('Banner güncellendi');
    } else {
      const { error } = await supabase
        .from('campaign_banners')
        .insert([dataToSave]);

      if (error) {
        toast.error('Banner eklenirken hata oluştu');
        return;
      }

      toast.success('Banner eklendi');
    }

    setIsDialogOpen(false);
    setEditingBanner(null);
    setFormData(defaultBanner);
    setImageFile(null);
    loadBanners();
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description,
      background_image_url: banner.background_image_url,
      background_color: banner.background_color,
      text_color: banner.text_color,
      countdown_end: banner.countdown_end,
      is_active: banner.is_active,
      show_countdown: banner.show_countdown,
      scrolling_text: banner.scrolling_text,
      show_on_all_pages: banner.show_on_all_pages,
      show_on_homepage: banner.show_on_homepage,
      show_on_products: banner.show_on_products,
      target_all_users: banner.target_all_users,
      target_new_users: banner.target_new_users,
      target_premium_users: banner.target_premium_users,
      target_cart_users: banner.target_cart_users,
      hide_days_after_close: banner.hide_days_after_close,
      priority: banner.priority,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu banner\'ı silmek istediğinize emin misiniz?')) return;

    const { error } = await supabase
      .from('campaign_banners')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Banner silinirken hata oluştu');
      return;
    }

    toast.success('Banner silindi');
    loadBanners();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('campaign_banners')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast.error('Durum değiştirilirken hata oluştu');
      return;
    }

    loadBanners();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Kampanya Banner'ları</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingBanner(null);
            setFormData(defaultBanner);
            setImageFile(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? 'Banner Düzenle' : 'Yeni Banner Ekle'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              {/* Temel Bilgiler */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Temel Bilgiler</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Başlık *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Yılbaşı İndirimi!"
                      />
                    </div>
                    <div>
                      <Label>Öncelik (Yüksek = Önce gösterilir)</Label>
                      <Input
                        type="number"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Açıklama</Label>
                    <Input
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Tüm ürünlerde %50'ye varan indirimler!"
                    />
                  </div>

                  <div>
                    <Label>Kayan Yazı (Boş bırakılırsa başlık gösterilir)</Label>
                    <Input
                      value={formData.scrolling_text || ''}
                      onChange={(e) => setFormData({ ...formData, scrolling_text: e.target.value })}
                      placeholder="🎄 Yılbaşı indirimleri başladı! 🎁 Kaçırmayın! 🎄"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Görünüm Ayarları */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Görünüm</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Arka Plan Rengi</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.background_color}
                          onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={formData.background_color}
                          onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Yazı Rengi</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.text_color}
                          onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={formData.text_color}
                          onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Arka Plan Resmi</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                    {formData.background_image_url && (
                      <img 
                        src={formData.background_image_url} 
                        alt="Banner" 
                        className="mt-2 h-20 object-cover rounded"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Geri Sayım */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Geri Sayım</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.show_countdown}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_countdown: checked })}
                    />
                    <Label>Geri sayım göster</Label>
                  </div>

                  {formData.show_countdown && (
                    <div>
                      <Label>Bitiş Tarihi ve Saati</Label>
                      <Input
                        type="datetime-local"
                        value={formData.countdown_end?.slice(0, 16) || ''}
                        onChange={(e) => setFormData({ ...formData, countdown_end: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sayfa Hedefleme */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hangi Sayfalarda Görünsün?</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.show_on_all_pages}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        show_on_all_pages: checked,
                        show_on_homepage: false,
                        show_on_products: false
                      })}
                    />
                    <Label>Tüm site</Label>
                  </div>

                  {!formData.show_on_all_pages && (
                    <>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.show_on_homepage}
                          onCheckedChange={(checked) => setFormData({ ...formData, show_on_homepage: checked })}
                        />
                        <Label>Sadece ana sayfa</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.show_on_products}
                          onCheckedChange={(checked) => setFormData({ ...formData, show_on_products: checked })}
                        />
                        <Label>Sadece kategori / ürün sayfaları</Label>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Kullanıcı Segmenti */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Kullanıcı Segmenti</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.target_all_users}
                      onCheckedChange={(checked) => setFormData({ 
                        ...formData, 
                        target_all_users: checked,
                        target_new_users: false,
                        target_premium_users: false,
                        target_cart_users: false
                      })}
                    />
                    <Label>Tüm kullanıcılar</Label>
                  </div>

                  {!formData.target_all_users && (
                    <>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.target_new_users}
                          onCheckedChange={(checked) => setFormData({ ...formData, target_new_users: checked })}
                        />
                        <Label>Yeni kullanıcı (son 7 gün)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.target_premium_users}
                          onCheckedChange={(checked) => setFormData({ ...formData, target_premium_users: checked })}
                        />
                        <Label>Premium üyeler</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.target_cart_users}
                          onCheckedChange={(checked) => setFormData({ ...formData, target_cart_users: checked })}
                        />
                        <Label>Sepeti dolu olanlar</Label>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Kapatma Davranışı */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Kapatma Davranışı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label>Kapatıldıktan sonra kaç gün gizlensin? (0 = Kalıcı gizle)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.hide_days_after_close}
                      onChange={(e) => setFormData({ ...formData, hide_days_after_close: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Aktiflik */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Aktif</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleSave}>
                {editingBanner ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Banner Listesi */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Önizleme</TableHead>
            <TableHead>Başlık</TableHead>
            <TableHead>Hedefleme</TableHead>
            <TableHead>Bitiş</TableHead>
            <TableHead>Öncelik</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {banners.map((banner) => (
            <TableRow key={banner.id}>
              <TableCell>
                <div 
                  className="w-32 h-8 rounded flex items-center justify-center text-xs px-2 overflow-hidden"
                  style={{ 
                    backgroundColor: banner.background_color, 
                    color: banner.text_color,
                    backgroundImage: banner.background_image_url ? `url(${banner.background_image_url})` : undefined,
                    backgroundSize: 'cover'
                  }}
                >
                  {banner.title}
                </div>
              </TableCell>
              <TableCell className="font-medium">{banner.title}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {banner.show_on_all_pages ? 'Tüm site' : 
                  [
                    banner.show_on_homepage && 'Ana sayfa',
                    banner.show_on_products && 'Ürünler'
                  ].filter(Boolean).join(', ') || 'Belirtilmemiş'}
              </TableCell>
              <TableCell>
                {banner.countdown_end 
                  ? new Date(banner.countdown_end).toLocaleDateString('tr-TR')
                  : '-'
                }
              </TableCell>
              <TableCell>{banner.priority}</TableCell>
              <TableCell>
                <Switch
                  checked={banner.is_active}
                  onCheckedChange={() => toggleActive(banner.id, banner.is_active)}
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(banner.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {banners.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Henüz banner eklenmemiş
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
