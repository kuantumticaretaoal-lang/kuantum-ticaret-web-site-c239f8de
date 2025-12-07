import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, FolderTree, GripVertical } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

const iconOptions = [
  "Smartphone", "Shirt", "Home", "Sparkles", "Dumbbell", "Book", "Package",
  "Camera", "Headphones", "Watch", "Gift", "Heart", "Star", "ShoppingBag",
  "Car", "Plane", "Utensils", "Coffee", "Music", "Gamepad2", "Baby", "Dog"
];

export const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "Package",
    sort_order: "0",
  });

  useEffect(() => {
    loadCategories();

    const channel = supabase
      .channel("categories-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        loadCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kategoriler yüklenemedi",
      });
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      icon: "Package",
      sort_order: "0",
    });
    setEditingCategory(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kategori adı zorunludur",
      });
      return;
    }

    const categoryData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      icon: formData.icon,
      sort_order: parseInt(formData.sort_order) || 0,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingCategory.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Kategori güncellenemedi",
        });
      } else {
        toast({
          title: "Başarılı",
          description: "Kategori güncellendi",
        });
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("categories").insert(categoryData);

      if (error) {
        if (error.code === "23505") {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Bu kategori adı zaten mevcut",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Hata",
            description: "Kategori oluşturulamadı",
          });
        }
      } else {
        toast({
          title: "Başarılı",
          description: "Kategori oluşturuldu",
        });
        setDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "Package",
      sort_order: category.sort_order.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kategori silinemedi. Bu kategoride ürün olabilir.",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Kategori silindi",
      });
    }
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return <LucideIcons.Package className="h-5 w-5" />;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <LucideIcons.Package className="h-5 w-5" />;
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">Toplam Kategori</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kategori Ekle */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Kategoriyi Düzenle" : "Yeni Kategori Oluştur"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Kategori Adı *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Elektronik"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Kategori açıklaması"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label>İkon</Label>
                <div className="grid grid-cols-6 gap-2">
                  {iconOptions.map((icon) => {
                    const IconComponent = (LucideIcons as any)[icon];
                    return (
                      <Button
                        key={icon}
                        type="button"
                        variant={formData.icon === icon ? "default" : "outline"}
                        size="sm"
                        className="p-2"
                        onClick={() => setFormData({ ...formData, icon })}
                      >
                        {IconComponent && <IconComponent className="h-4 w-4" />}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sıralama</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingCategory ? "Güncelle" : "Oluştur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kategori Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Kategoriler</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz kategori oluşturulmamış</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sıra</TableHead>
                    <TableHead className="w-12">İkon</TableHead>
                    <TableHead>Kategori Adı</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          {category.sort_order}
                        </div>
                      </TableCell>
                      <TableCell>{getIconComponent(category.icon)}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
