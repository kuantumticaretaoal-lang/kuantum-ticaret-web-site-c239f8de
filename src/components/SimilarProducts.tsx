import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";

interface SimilarProductsProps {
  currentProductId: string;
  categoryIds: string[];
}

export const SimilarProducts = ({ currentProductId, categoryIds }: SimilarProductsProps) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    const loadSimilarProducts = async () => {
      if (categoryIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get products in the same categories
      const { data: productCategories } = await (supabase as any)
        .from("product_categories")
        .select("product_id")
        .in("category_id", categoryIds)
        .neq("product_id", currentProductId);

      if (!productCategories || productCategories.length === 0) {
        setLoading(false);
        return;
      }

      const productIds = [...new Set(productCategories.map((pc: any) => pc.product_id))];

      const { data } = await (supabase as any)
        .from("products")
        .select(`
          *,
          product_images (image_url)
        `)
        .in("id", productIds)
        .neq("stock_status", "out_of_stock")
        .limit(6);

      setProducts(data || []);
      setLoading(false);
    };

    loadSimilarProducts();
  }, [currentProductId, categoryIds]);

  if (loading || products.length === 0) return null;

  return (
    <Card className="mt-8">
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Benzer Ürünler
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {products.map((product) => (
            <div 
              key={product.id}
              className="cursor-pointer group relative"
            >
              <div 
                className="aspect-square rounded-lg overflow-hidden bg-muted mb-2 relative"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                {product.product_images?.[0] ? (
                  <img 
                    src={product.product_images[0].image_url} 
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    Resim Yok
                  </div>
                )}
                {product.discounted_price && product.discounted_price < product.price && (
                  <Badge className="absolute top-1 left-1 bg-red-500 text-white text-xs">
                    %{Math.round(((product.price - product.discounted_price) / product.price) * 100)}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-7 w-7 bg-background/80 hover:bg-background"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(product.id);
                  }}
                >
                  <Heart 
                    className={`h-4 w-4 ${
                      isFavorite(product.id) 
                        ? 'fill-red-500 text-red-500' 
                        : 'text-muted-foreground'
                    }`} 
                  />
                </Button>
              </div>
              <h4 
                className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                {product.title}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                {product.discounted_price && product.discounted_price < product.price ? (
                  <>
                    <span className="text-sm font-bold text-primary">
                      ₺{parseFloat(product.discounted_price).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      ₺{parseFloat(product.price).toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-primary">
                    ₺{parseFloat(product.price).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
