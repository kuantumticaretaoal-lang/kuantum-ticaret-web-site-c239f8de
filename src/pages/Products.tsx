import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<string>("newest");
  const navigate = useNavigate();

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

  const sortedProducts = [...products].sort((a, b) => {
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
          <div className="max-w-xs mb-8">
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
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                {product.product_images?.[0] && (
                  <div className="w-full h-48 overflow-hidden">
                    <img
                      src={product.product_images[0].image_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                  <div className="text-2xl font-bold text-primary">
                    ₺{parseFloat(product.price).toFixed(2)}
                  </div>
                </CardHeader>
                <CardContent>
                  {product.description && (
                    <p className="text-muted-foreground line-clamp-2">{product.description}</p>
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
