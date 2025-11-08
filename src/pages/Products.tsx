import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { addToCart } from "@/lib/cart";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [filterPromotion, setFilterPromotion] = useState<string>("all");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const getPromoVariant = (badge: string): any => {
    const b = (badge || "").toLowerCase();
    if (b.includes("hızlı teslimat")) return "success";
    if (b.includes("sınırlı stok")) return "warning";
    if (b.includes("en geç yarın kargoda")) return "violet";
    if (b.includes("indirim")) return "destructive";
    return "secondary";
  };

  useEffect(() => {
    loadProducts();

    const channel = supabase
      .channel("products-page-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProducts = async () => {
    try {
      const { data } = await (supabase as any)
        .from("products")
        .select(`
          *,
          product_images (
            id,
            image_url
          ),
          product_reviews (
            rating
          )
        `)
        .order("created_at", { ascending: false });
      if (data) setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleAddToCart = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await addToCart(productId, 1);
    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sepete eklenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Ürün sepete eklendi",
      });
    }
  };

  const query = new URLSearchParams(location.search).get("query")?.toLowerCase() || "";
  const filtered = products.filter((p) => {
    const title = (p.title || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();
    const matchesQuery = !query || title.includes(query) || desc.includes(query);
    
    if (filterPromotion === "all") return matchesQuery;
    return matchesQuery && p.promotion_badges?.includes(filterPromotion);
  });

  const sortedProducts = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-desc":
        return parseFloat(b.price) - parseFloat(a.price);
      case "name-asc":
        return a.title.localeCompare(b.title, 'tr');
      case "name-desc":
        return b.title.localeCompare(a.title, 'tr');
      case "rating":
        const avgA = a.product_reviews?.length > 0 
          ? a.product_reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / a.product_reviews.length 
          : 0;
        const avgB = b.product_reviews?.length > 0 
          ? b.product_reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / b.product_reviews.length 
          : 0;
        return avgB - avgA;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">Ürünlerimiz</h1>
        
        {products.length > 0 && (
          <div className="flex gap-4 mb-8">
            <div className="max-w-xs">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">En Yeni</SelectItem>
                  <SelectItem value="price-asc">Fiyat (Artan)</SelectItem>
                  <SelectItem value="price-desc">Fiyat (Azalan)</SelectItem>
                  <SelectItem value="name-asc">A'dan Z'ye</SelectItem>
                  <SelectItem value="name-desc">Z'den A'ya</SelectItem>
                  <SelectItem value="rating">En Çok Değerlendirilen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="max-w-xs">
              <Select value={filterPromotion} onValueChange={setFilterPromotion}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Ürünler</SelectItem>
                  <SelectItem value="En Geç Yarın Kargoda">En Geç Yarın Kargoda</SelectItem>
                  <SelectItem value="Hızlı Teslimat">Hızlı Teslimat</SelectItem>
                  <SelectItem value="Sınırlı Stok">Sınırlı Stok</SelectItem>
                  <SelectItem value="İndirim">İndirim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Ürünler Yakında</CardTitle>
              <CardDescription>
                Ürünlerimiz çok yakında burada olacak. Bizi takip etmeye devam edin!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Kaliteli ve özenle seçilmiş ürünlerimizi sizler için hazırlıyoruz.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProducts.map((product) => (
              <Card
                key={product.id}
                className="hover:shadow-lg transition-shadow cursor-pointer relative"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                {product.product_images?.[0] && (
                  <div className="w-full h-48 overflow-hidden relative">
                    <img
                      src={product.product_images[0].image_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                      onClick={(e) => handleAddToCart(product.id, e)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                    {product.promotion_badges && product.promotion_badges.length > 0 && (
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.promotion_badges.map((badge: string, idx: number) => (
                          <Badge key={idx} variant={getPromoVariant(badge)} className="text-xs">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary">
                      ₺{parseFloat(product.price).toFixed(2)}
                    </div>
                    {product.stock_status !== 'in_stock' && (
                      <Badge variant={product.stock_status === 'out_of_stock' ? 'destructive' : 'secondary'}>
                        {product.stock_status === 'limited_stock' ? 'Sınırlı' : 'Tükendi'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {product.description && (
                    <p className="text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                  {product.product_reviews?.length > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      ⭐ {(product.product_reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / product.product_reviews.length).toFixed(1)} ({product.product_reviews.length} değerlendirme)
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Products;