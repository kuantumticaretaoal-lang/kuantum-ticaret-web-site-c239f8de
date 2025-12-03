import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { addToCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";

const FavoritesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { favorites, toggleFavorite, loading: favLoading } = useFavorites();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const loadFavoriteProducts = async () => {
      if (favorites.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("products")
        .select(`
          *,
          product_images (id, image_url)
        `)
        .in("id", favorites);

      if (data) setProducts(data);
      setLoading(false);
    };

    if (!favLoading) {
      loadFavoriteProducts();
    }
  }, [favorites, favLoading]);

  const handleAddToCart = async (productId: string) => {
    const { error } = await addToCart(productId, 1);
    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Sepete eklenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Ürün sepete eklendi",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-8 w-8 text-red-500 fill-red-500" />
          <h1 className="text-4xl font-bold">Favorilerim</h1>
        </div>

        {loading || favLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        ) : products.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Henüz Favoriniz Yok</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Beğendiğiniz ürünleri favorilere ekleyerek daha sonra kolayca bulabilirsiniz.
              </p>
              <Button onClick={() => navigate("/products")}>
                Ürünleri Keşfet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
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
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary">
                      ₺{parseFloat(product.price).toFixed(2)}
                    </div>
                    {product.stock_status === "out_of_stock" && (
                      <Badge variant="destructive">Tükendi</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product.id);
                    }}
                    disabled={product.stock_status === "out_of_stock"}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Sepete Ekle
                  </Button>
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

export default FavoritesPage;
