import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { GitCompare, X, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "@/hooks/use-translations";

export const ProductComparison = () => {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const navigate = useNavigate();
  const { formatPrice } = useTranslations();

  useEffect(() => {
    loadAllProducts();
  }, []);

  useEffect(() => {
    if (selectedIds.length > 0) loadSelectedProducts();
  }, [selectedIds]);

  const loadAllProducts = async () => {
    const { data } = await (supabase as any)
      .from("products")
      .select("id, title, price, discounted_price, stock_status, stock_quantity, product_images(image_url)")
      .order("title");
    setAllProducts(data || []);
  };

  const loadSelectedProducts = async () => {
    const { data } = await (supabase as any)
      .from("products")
      .select(`*, product_images(image_url), product_reviews(rating), product_categories(categories(name))`)
      .in("id", selectedIds);
    setProducts(data || []);
  };

  const addProduct = (id: string) => {
    if (selectedIds.length >= 4 || selectedIds.includes(id)) return;
    setSelectedIds([...selectedIds, id]);
  };

  const removeProduct = (id: string) => {
    setSelectedIds(selectedIds.filter(i => i !== id));
    setProducts(products.filter(p => p.id !== id));
  };

  const getAvgRating = (reviews: any[]) => {
    if (!reviews?.length) return 0;
    return (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1);
  };

  const stockText = (p: any) => {
    if (p.stock_status === "out_of_stock") return "Stokta Yok";
    if (p.stock_status === "made_to_order") return "Siparişe Özel";
    return `${p.stock_quantity ?? 0} adet`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitCompare className="h-4 w-4" /> Karşılaştır
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ürün Karşılaştırma (Max 4)</DialogTitle>
        </DialogHeader>

        {selectedIds.length < 4 && (
          <Select onValueChange={addProduct}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Ürün ekle..." />
            </SelectTrigger>
            <SelectContent>
              {allProducts.filter(p => !selectedIds.includes(p.id)).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {products.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b w-32">Özellik</th>
                  {products.map(p => (
                    <th key={p.id} className="p-2 border-b text-center min-w-[180px]">
                      <div className="relative">
                        <Button size="icon" variant="ghost" className="absolute -top-1 -right-1 h-6 w-6" onClick={() => removeProduct(p.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                        {p.product_images?.[0] && (
                          <img src={p.product_images[0].image_url} className="w-20 h-20 object-cover rounded mx-auto mb-2 cursor-pointer" onClick={() => { setOpen(false); navigate(`/products/${p.id}`); }} />
                        )}
                        <p className="font-medium text-xs truncate">{p.title}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td className="p-2 border-b font-medium">Fiyat</td>
                  {products.map(p => (
                    <td key={p.id} className="p-2 border-b text-center">
                      {p.discounted_price ? (
                        <div><span className="font-bold text-primary">{formatPrice(p.discounted_price)}</span><br/><span className="text-xs line-through text-muted-foreground">{formatPrice(p.price)}</span></div>
                      ) : <span className="font-bold">{formatPrice(p.price)}</span>}
                    </td>
                  ))}
                </tr>
                <tr><td className="p-2 border-b font-medium">Stok</td>
                  {products.map(p => <td key={p.id} className="p-2 border-b text-center">{stockText(p)}</td>)}
                </tr>
                <tr><td className="p-2 border-b font-medium">Puan</td>
                  {products.map(p => <td key={p.id} className="p-2 border-b text-center">⭐ {getAvgRating(p.product_reviews)}</td>)}
                </tr>
                <tr><td className="p-2 border-b font-medium">Kategori</td>
                  {products.map(p => (
                    <td key={p.id} className="p-2 border-b text-center">
                      {p.product_categories?.map((pc: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs mr-1">{pc.categories?.name}</Badge>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr><td className="p-2 border-b font-medium">Bedenler</td>
                  {products.map(p => <td key={p.id} className="p-2 border-b text-center text-xs">{p.available_sizes?.join(", ") || "—"}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {products.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Karşılaştırmak için ürün ekleyin</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
