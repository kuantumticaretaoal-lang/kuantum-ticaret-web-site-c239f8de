import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Upload, X, Download } from "lucide-react";
import { exportToExcel, formatDateForExport, formatCurrencyForExport } from "@/lib/excel-export";

interface Category {
  id: string;
  name: string;
}

export const AdminProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newProduct, setNewProduct] = useState({ 
    title: "", 
    description: "", 
    price: "", 
    stock_status: "in_stock", 
    stock_quantity: 0, 
    promotion_badges: [] as string[],
    is_name_customizable: false,
    available_sizes: [] as string[],
    allows_custom_photo: false,
    category_id: ""
  });
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editImages, setEditImages] = useState<any[]>([]);
  const [uploadingImages, setUploadingImages] = useState<File[]>([]);
  const { toast } = useToast();
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState(0);
  
  const availablePromotions = [
    "En Geç Yarın Kargoda",
    "Hızlı Teslimat",
    "Sınırlı Stok",
    "İndirim"
  ];

  const availableSizeOptions = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", "6XL"];

  useEffect(() => {
    loadProducts();
    loadCategories();

    const channel = supabase
      .channel("products-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadProducts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        loadCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("sort_order", { ascending: true });
    if (data) setCategories(data);
  };

  const loadProducts = async () => {
    const { data } = await (supabase as any)
      .from("products")
      .select(`
        *,
        product_images (
          id,
          image_url
        ),
        categories (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false });
    if (data) {
      setProducts(data);
      const total = data.reduce((sum: number, p: any) => sum + Number(p.price), 0);
      const lowStock = data.filter((p: any) => (p.stock_quantity || 0) <= 5).length;
      setTotalProducts(data.length);
      setTotalValue(total);
      setLowStockProducts(lowStock);
    }
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
        stock_status: newProduct.stock_status,
        stock_quantity: newProduct.stock_quantity || 0,
        promotion_badges: newProduct.promotion_badges,
        is_name_customizable: newProduct.is_name_customizable,
        available_sizes: newProduct.available_sizes,
        allows_custom_photo: newProduct.allows_custom_photo,
        category_id: newProduct.category_id || null,
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
      setNewProduct({ 
        title: "", 
        description: "", 
        price: "", 
        stock_status: "in_stock", 
        stock_quantity: 0, 
        promotion_badges: [],
        is_name_customizable: false,
        available_sizes: [],
        allows_custom_photo: false,
        category_id: ""
      });
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
        stock_status: editProduct.stock_status,
        stock_quantity: editProduct.stock_quantity || 0,
        promotion_badges: editProduct.promotion_badges || [],
        is_name_customizable: editProduct.is_name_customizable || false,
        available_sizes: editProduct.available_sizes || [],
        allows_custom_photo: editProduct.allows_custom_photo || false,
        category_id: editProduct.category_id || null,
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

  const exportProducts = () => {
    const exportData = products.map(product => ({
      "Başlık": product.title,
      "Kategori": product.categories?.name || '-',
      "Açıklama": product.description || '-',
      "Fiyat": formatCurrencyForExport(product.price),
      "Stok Durumu": product.stock_status === 'in_stock' ? 'Stokta' : 
                     product.stock_status === 'limited_stock' ? 'Sınırlı' : 'Tükendi',
      "Stok Miktarı": product.stock_quantity || 0,
      "Fırsatlar": product.promotion_badges?.length > 0 ? product.promotion_badges.join(", ") : "-",
      "İsme Özel": product.is_name_customizable ? "Evet" : "Hayır",
      "Bedenler": product.available_sizes?.length > 0 ? product.available_sizes.join(", ") : "-",
      "Özel Fotoğraf": product.allows_custom_photo ? "Evet" : "Hayır",
      "Resim Sayısı": product.product_images?.length || 0,
      "Eklenme Tarihi": formatDateForExport(product.created_at),
    }));
    exportToExcel(exportData, 'urun-listesi', 'Ürünler');
    toast({
      title: "Başarılı",
      description: "Ürün listesi Excel olarak indirildi",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Ürünler</span>
          <Button onClick={exportProducts} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel İndir
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-sm text-muted-foreground">Toplam Ürün Sayısı</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalValue.toFixed(2)} ₺</div>
              <p className="text-sm text-muted-foreground">Toplam Fiyat</p>
            </CardContent>
          </Card>
          <Card className={lowStockProducts > 0 ? "border-destructive" : ""}>
            <CardContent className="pt-6">
              <div className={`text-2xl font-bold ${lowStockProducts > 0 ? "text-destructive" : ""}`}>
                {lowStockProducts}
              </div>
              <p className="text-sm text-muted-foreground">Düşük Stoklu Ürün</p>
            </CardContent>
          </Card>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="mb-4">Yeni Ürün Ekle</Button>
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
                  <Label>Kategori</Label>
                  <Select value={newProduct.category_id} onValueChange={(v) => setNewProduct({ ...newProduct, category_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Kategorisiz</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stok Miktarı</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                  />
                  {newProduct.stock_quantity <= 5 && (
                    <p className="text-xs text-destructive mt-1">⚠️ Düşük stok uyarısı</p>
                  )}
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
                  <Label>Stok Durumu</Label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={newProduct.stock_status}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_status: e.target.value })}
                  >
                    <option value="in_stock">Stokta</option>
                    <option value="limited_stock">Sınırlı Stok</option>
                    <option value="out_of_stock">Tükendi</option>
                  </select>
                </div>
                <div>
                  <Label>Fırsatlar</Label>
                  <div className="space-y-2">
                    {availablePromotions.map((promo) => (
                      <label key={promo} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newProduct.promotion_badges.includes(promo)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewProduct({ ...newProduct, promotion_badges: [...newProduct.promotion_badges, promo] });
                            } else {
                              setNewProduct({ ...newProduct, promotion_badges: newProduct.promotion_badges.filter(p => p !== promo) });
                            }
                          }}
                        />
                        <span className="text-sm">{promo}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newProduct.is_name_customizable}
                      onChange={(e) => setNewProduct({ ...newProduct, is_name_customizable: e.target.checked })}
                    />
                    <span className="text-sm font-medium">İsme Özel</span>
                  </label>
                </div>
                <div>
                  <Label>Beden Seçenekleri</Label>
                  <div className="space-y-2">
                    {availableSizeOptions.map((size) => (
                      <label key={size} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newProduct.available_sizes.includes(size)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewProduct({ ...newProduct, available_sizes: [...newProduct.available_sizes, size] });
                            } else {
                              setNewProduct({ ...newProduct, available_sizes: newProduct.available_sizes.filter(s => s !== size) });
                            }
                          }}
                        />
                        <span className="text-sm">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newProduct.allows_custom_photo}
                      onChange={(e) => setNewProduct({ ...newProduct, allows_custom_photo: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Özel Fotoğraf Yükleme</span>
                  </label>
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
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Başlık</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Stok Durumu</TableHead>
              <TableHead>Stok Miktarı</TableHead>
              <TableHead>Fırsatlar</TableHead>
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
                <TableCell>
                  {product.stock_status === 'in_stock' ? 'Stokta' : 
                   product.stock_status === 'limited_stock' ? 'Sınırlı' : 'Tükendi'}
                </TableCell>
                <TableCell>
                  <span className={(product.stock_quantity || 0) <= 5 ? "text-destructive font-semibold" : ""}>
                    {product.stock_quantity || 0}
                    {(product.stock_quantity || 0) <= 5 && " ⚠️"}
                  </span>
                </TableCell>
                <TableCell>
                  {product.promotion_badges?.length > 0 ? product.promotion_badges.join(", ") : "-"}
                </TableCell>
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        Sil
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Ürünü silmek istediğinizden emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hayır</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteProduct(product.id)}>
                          Evet
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                <Label>Stok Durumu</Label>
                <select 
                  className="w-full p-2 border rounded"
                  value={editProduct.stock_status || 'in_stock'}
                  onChange={(e) => setEditProduct({ ...editProduct, stock_status: e.target.value })}
                >
                  <option value="in_stock">Stokta</option>
                  <option value="limited_stock">Sınırlı Stok</option>
                  <option value="out_of_stock">Tükendi</option>
                </select>
              </div>
              <div>
                <Label>Stok Miktarı</Label>
                <Input
                  type="number"
                  min="0"
                  value={editProduct.stock_quantity || 0}
                  onChange={(e) => setEditProduct({ ...editProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                />
                {(editProduct.stock_quantity || 0) < 10 && (
                  <p className="text-xs text-destructive mt-1">⚠️ Düşük stok uyarısı</p>
                )}
              </div>
                <div>
                  <Label>Fırsatlar</Label>
                  <div className="space-y-2">
                    {availablePromotions.map((promo) => (
                      <label key={promo} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editProduct.promotion_badges?.includes(promo) || false}
                          onChange={(e) => {
                            const badges = editProduct.promotion_badges || [];
                            if (e.target.checked) {
                              setEditProduct({ ...editProduct, promotion_badges: [...badges, promo] });
                            } else {
                              setEditProduct({ ...editProduct, promotion_badges: badges.filter((p: string) => p !== promo) });
                            }
                          }}
                        />
                        <span className="text-sm">{promo}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editProduct.is_name_customizable || false}
                      onChange={(e) => setEditProduct({ ...editProduct, is_name_customizable: e.target.checked })}
                    />
                    <span className="text-sm font-medium">İsme Özel</span>
                  </label>
                </div>
                <div>
                  <Label>Beden Seçenekleri</Label>
                  <div className="space-y-2">
                    {availableSizeOptions.map((size) => (
                      <label key={size} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editProduct.available_sizes?.includes(size) || false}
                          onChange={(e) => {
                            const sizes = editProduct.available_sizes || [];
                            if (e.target.checked) {
                              setEditProduct({ ...editProduct, available_sizes: [...sizes, size] });
                            } else {
                              setEditProduct({ ...editProduct, available_sizes: sizes.filter((s: string) => s !== size) });
                            }
                          }}
                        />
                        <span className="text-sm">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editProduct.allows_custom_photo || false}
                      onChange={(e) => setEditProduct({ ...editProduct, allows_custom_photo: e.target.checked })}
                    />
                    <span className="text-sm font-medium">Özel Fotoğraf Yükleme</span>
                  </label>
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
