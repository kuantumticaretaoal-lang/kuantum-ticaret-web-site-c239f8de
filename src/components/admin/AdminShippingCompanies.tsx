import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Truck, Plus, Trash2, Edit, Save, X, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ShippingCompany {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  tracking_url: string | null;
  is_active: boolean;
  sort_order: number;
}

const AdminShippingCompanies = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingCompany | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    description: "",
    tracking_url: "",
    is_active: true,
    sort_order: 0,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    loadCompanies();
    
    const channel = supabase
      .channel("shipping-companies-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "shipping_companies" }, () => loadCompanies())
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCompanies = async () => {
    const { data, error } = await (supabase as any)
      .from("shipping_companies")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error loading companies:", error);
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `shipping-logos/${fileName}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Logo yüklenemedi",
      });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kargo şirketi adı gerekli",
      });
      return;
    }

    let logoUrl = formData.logo_url;
    if (logoFile) {
      const uploaded = await uploadLogo(logoFile);
      if (uploaded) {
        logoUrl = uploaded;
      }
    }

    const payload = {
      name: formData.name,
      logo_url: logoUrl || null,
      description: formData.description || null,
      tracking_url: formData.tracking_url || null,
      is_active: formData.is_active,
      sort_order: formData.sort_order,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await (supabase as any)
        .from("shipping_companies")
        .update(payload)
        .eq("id", editing.id);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: "Güncellenemedi" });
        return;
      }
      toast({ title: "Başarılı", description: "Kargo şirketi güncellendi" });
    } else {
      const { error } = await (supabase as any)
        .from("shipping_companies")
        .insert(payload);

      if (error) {
        toast({ variant: "destructive", title: "Hata", description: "Eklenemedi" });
        return;
      }
      toast({ title: "Başarılı", description: "Kargo şirketi eklendi" });
    }

    resetForm();
    setDialogOpen(false);
    loadCompanies();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kargo şirketini silmek istediğinize emin misiniz?")) return;

    const { error } = await (supabase as any)
      .from("shipping_companies")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Silinemedi" });
      return;
    }

    toast({ title: "Başarılı", description: "Kargo şirketi silindi" });
    loadCompanies();
  };

  const handleEdit = (company: ShippingCompany) => {
    setEditing(company);
    setFormData({
      name: company.name,
      logo_url: company.logo_url || "",
      description: company.description || "",
      tracking_url: company.tracking_url || "",
      is_active: company.is_active,
      sort_order: company.sort_order,
    });
    setLogoFile(null);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      name: "",
      logo_url: "",
      description: "",
      tracking_url: "",
      is_active: true,
      sort_order: 0,
    });
    setLogoFile(null);
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6" />
          Kargo Şirketleri
        </h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kargo Şirketi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Kargo Şirketi Düzenle" : "Yeni Kargo Şirketi"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Şirket Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: Yurtiçi Kargo"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                </div>
                {(formData.logo_url || logoFile) && (
                  <div className="mt-2">
                    <img
                      src={logoFile ? URL.createObjectURL(logoFile) : formData.logo_url}
                      alt="Logo önizleme"
                      className="h-16 object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kargo şirketi hakkında bilgi..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Takip URL</Label>
                <Input
                  value={formData.tracking_url}
                  onChange={(e) => setFormData({ ...formData, tracking_url: e.target.value })}
                  placeholder="https://takip.kargosirketi.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Sıralama</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Aktif</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  <X className="h-4 w-4 mr-2" />
                  İptal
                </Button>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Henüz kargo şirketi eklenmemiş
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {company.logo_url && (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="h-12 w-20 object-contain"
                      />
                    )}
                    <div>
                      <h3 className="font-semibold">{company.name}</h3>
                      {company.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {company.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${company.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {company.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => handleEdit(company)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(company.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminShippingCompanies;
