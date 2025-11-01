import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Upload, X } from "lucide-react";

export const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({ title: "", description: "", price: "" });
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editImages, setEditImages] = useState<any[]>([]);
  const [uploadingImages, setUploadingImages] = useState<File[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();

    const channel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProducts = async () => {
    const { data } = await (supabase as any)
      .from("products")
      .select(`
        *,
        product_images (
          id,
          image_url
        )
      `)
      .order("created_at", { ascending: false });
    if (data) setProducts(data);
  };

  const uploadImages = async (productId: string, files: File[]) => {
    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${productId}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: `Resim yüklenemedi: ${file.name}`,
        });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      await (supabase as any).from("product_images").insert({
        product_id: productId,
        image_url: publicUrl,
      });
    }
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    const path = imageUrl.split("/product-images/")[1];
    if (path) {
      await supabase.storage.from("product-images").remove([path]);
    }
    await (supabase as any).from("product_images").delete().eq("id", imageId);
    setEditImages(editImages.filter((img) => img.id !== imageId));
  };

  const addProduct = async () => {
    if (!newProduct.title || !newProduct.price) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Başlık ve fiyat zorunludur",
      });
      return;
    }

    const { data, error } = await (supabase as any)
      .from("products")
      .insert({
        title: newProduct.title,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün eklenemedi",
      });
    } else {
      if (uploadingImages.length > 0) {
        await uploadImages(data.id, uploadingImages);
      }
      toast({
        title: "Başarılı",
        description: "Ürün eklendi",
      });
      setNewProduct({ title: "", description: "", price: "" });
      setUploadingImages([]);
      loadProducts();
    }
  };

  const updateProduct = async () => {
    if (!editProduct.title || !editProduct.price) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Başlık ve fiyat zorunludur",
      });
      return;
    }

    const { error } = await (supabase as any)
      .from("products")
      .update({
        title: editProduct.title,
        description: editProduct.description,
        price: parseFloat(editProduct.price),
      })
      .eq("id", editProduct.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün güncellenemedi",
      });
    } else {
      if (uploadingImages.length > 0) {
        await uploadImages(editProduct.id, uploadingImages);
      }
      toast({
        title: "Başarılı",
        description: "Ürün güncellendi",
      });
      setEditProduct(null);
      setUploadingImages([]);
      loadProducts();
    }
  };

  const deleteProduct = async (id: string) => {
    const { error } = await (supabase as any).from("products").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün silinemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Ürün silindi",
      });
      loadProducts();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Ürünler</span>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Yeni Ürün Ekle</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Ürün</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Başlık *</Label>
                  <Input
                    value={newProduct.title}
                    onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
                    placeholder="Ürün başlığı"
                  />
                </div>
                <div>
                  <Label>Açıklama</Label>
                  <Textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Ürün açıklaması"
                  />
                </div>
                <div>
                  <Label>Fiyat (TL) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Resimler</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setUploadingImages(Array.from(e.target.files || []))}
                  />
                </div>
                <Button onClick={addProduct} className="w-full">
                  Ekle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başlık</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Resimler</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.title}</TableCell>
                <TableCell>{product.description || "-"}</TableCell>
                <TableCell>{product.price} TL</TableCell>
                <TableCell>{product.product_images?.length || 0} resim</TableCell>
                <TableCell className="space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditProduct(product);
                      setEditImages(product.product_images || []);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteProduct(product.id)}>
                    Sil
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!editProduct} onOpenChange={(open) => !open && setEditProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ürün Düzenle</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="space-y-4">
              <div>
                <Label>Başlık *</Label>
                <Input
                  value={editProduct.title}
                  onChange={(e) => setEditProduct({ ...editProduct, title: e.target.value })}
                  placeholder="Ürün başlığı"
                />
              </div>
              <div>
                <Label>Açıklama</Label>
                <Textarea
                  value={editProduct.description || ""}
                  onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                  placeholder="Ürün açıklaması"
                />
              </div>
              <div>
                <Label>Fiyat (TL) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editProduct.price}
                  onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Mevcut Resimler</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {editImages.map((image) => (
                    <div key={image.id} className="relative">
                      <img
                        src={image.image_url}
                        alt="Product"
                        className="w-full h-24 object-cover rounded"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => deleteImage(image.id, image.image_url)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Yeni Resimler Ekle</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setUploadingImages(Array.from(e.target.files || []))}
                />
              </div>
              <Button onClick={updateProduct} className="w-full">
                Güncelle
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
