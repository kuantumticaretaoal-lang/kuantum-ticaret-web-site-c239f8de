import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, Copy } from "lucide-react";

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
  is_dismissible: boolean;
  scroll_speed: number;
}

// Hazır arka plan şablonları
const backgroundTemplates = [
  { name: "Kırmızı Gradient", value: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" },
  { name: "Mavi Gradient", value: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" },
  { name: "Yeşil Gradient", value: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" },
  { name: "Mor Gradient", value: "linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)" },
  { name: "Turuncu Gradient", value: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)" },
  { name: "Altın Gradient", value: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)" },
  { name: "Siyah Premium", value: "linear-gradient(135deg, #1f2937 0%, #111827 100%)" },
  { name: "Neon Pembe", value: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" },
  { name: "Gökyüzü Mavisi", value: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" },
  { name: "Yılbaşı", value: "linear-gradient(135deg, #dc2626 0%, #16a34a 50%, #dc2626 100%)" },
  { name: "Gün Batımı", value: "linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)" },
  { name: "Okyanus", value: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)" },
];

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
  is_dismissible: true,
  scroll_speed: 15,
};

export const AdminCampaignBanners = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState<Omit<Banner, 'id'>>(defaultBanner);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

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

  const handleTemplateSelect = (value: string) => {
    setSelectedTemplate(value);
    const template = backgroundTemplates.find(t => t.value === value);
    if (template) {
      setFormData({ ...formData, background_color: value, background_image_url: null });
      setImageFile(null);
    }
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
    setSelectedTemplate("");
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
      is_dismissible: banner.is_dismissible ?? true,
      scroll_speed: banner.scroll_speed || 15,
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (banner: Banner) => {
    setEditingBanner(null);
    setFormData({
      ...banner,
      title: `${banner.title} (Kopya)`,
      is_active: false,
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

  const getBackgroundPreview = (banner: Banner) => {
    if (banner.background_image_url) {
      return { backgroundImage: `url(${banner.background_image_url})`, backgroundSize: 'cover' };
    }
    if (banner.background_color.includes('gradient')) {
      return { background: banner.background_color };
    }
    return { backgroundColor: banner.background_color };
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
            setSelectedTemplate("");
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

            {/* Önizleme */}
            <div 
              className="w-full py-3 px-4 rounded-lg mb-4"
              style={{
                ...(formData.background_color.includes('gradient') 
                  ? { background: formData.background_color }
                  : { backgroundColor: formData.background_color }),
                color: formData.text_color,
              }}
            >
              <div className="text-center">
                <span className="font-bold">{formData.title || "Banner Önizleme"}</span>
                {formData.description && (
                  <span className="ml-2 text-sm opacity-90">{formData.description}</span>
                )}
              </div>
            </div>

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

                  <div>
                    <Label>Kayma Hızı (saniye - düşük = daha hızlı)</Label>
                    <Input
                      type="number"
                      min="5"
                      max="60"
                      value={formData.scroll_speed}
                      onChange={(e) => setFormData({ ...formData, scroll_speed: parseInt(e.target.value) || 15 })}
                      placeholder="15"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Varsayılan: 15 saniye. 5-60 arası bir değer girin.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Görünüm Ayarları */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Görünüm</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {/* Hazır Şablonlar */}
                  <div>
                    <Label>Hazır Arka Plan Şablonu</Label>
                    <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Şablon seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {backgroundTemplates.map((template) => (
                          <SelectItem key={template.value} value={template.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-6 h-6 rounded"
                                style={{ background: template.value }}
                              />
                              {template.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Özel Arka Plan Rengi</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.background_color.startsWith('#') ? formData.background_color : '#dc2626'}
                          onChange={(e) => {
                            setFormData({ ...formData, background_color: e.target.value });
                            setSelectedTemplate("");
                          }}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={formData.background_color}
                          onChange={(e) => {
                            setFormData({ ...formData, background_color: e.target.value });
                            setSelectedTemplate("");
                          }}
                          placeholder="#dc2626 veya gradient"
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
                    <Label>Arka Plan Resmi (Opsiyonel)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setImageFile(e.target.files?.[0] || null);
                        setSelectedTemplate("");
                      }}
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

              {/* Kapanabilirlik ve Geri Sayım */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Davranış Ayarları</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_dismissible}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_dismissible: checked })}
                    />
                    <Label>Kullanıcı kapatabilir</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Kapatılamaz banner'lar sürekli görünür ve X butonu göstermez
                  </p>

                  {formData.is_dismissible && (
                    <div>
                      <Label>Kapatıldıktan sonra kaç gün gizlensin? (0 = Kalıcı gizle)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.hide_days_after_close}
                        onChange={(e) => setFormData({ ...formData, hide_days_after_close: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  )}

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
      <div className="grid gap-4">
        {banners.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Henüz banner eklenmemiş
            </CardContent>
          </Card>
        ) : (
          banners.map((banner) => (
            <Card key={banner.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Önizleme */}
                  <div 
                    className="w-32 h-12 rounded flex items-center justify-center text-xs font-medium shrink-0"
                    style={{
                      ...getBackgroundPreview(banner),
                      color: banner.text_color,
                    }}
                  >
                    {banner.title.slice(0, 15)}...
                  </div>

                  {/* Bilgiler */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{banner.title}</span>
                      <Badge variant={banner.is_active ? "default" : "secondary"}>
                        {banner.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                      {!banner.is_dismissible && (
                        <Badge variant="outline">Kapatılamaz</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                      <span>Öncelik: {banner.priority}</span>
                      {banner.show_countdown && banner.countdown_end && (
                        <span>Bitiş: {new Date(banner.countdown_end).toLocaleString('tr-TR')}</span>
                      )}
                    </div>
                  </div>

                  {/* İşlemler */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(banner.id, banner.is_active)}
                      title={banner.is_active ? "Pasifleştir" : "Aktifleştir"}
                    >
                      <Eye className={`h-4 w-4 ${banner.is_active ? "" : "opacity-50"}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicate(banner)}
                      title="Kopyala"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(banner)}
                      title="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(banner.id)}
                      className="text-destructive hover:text-destructive"
                      title="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
