import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";

interface Product {
  id: string;
  title: string;
  price: number;
  discounted_price?: number;
  image_url?: string;
  purchase_count?: number;
}

interface AlsoBoughtProductsProps {
  productId: string;
}

export const AlsoBoughtProducts = ({ productId }: AlsoBoughtProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    loadProducts();
  }, [productId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Birlikte satın alınan ürünleri getir
      const { data: pairs } = await supabase
        .from('product_purchase_pairs')
        .select('paired_product_id, purchase_count')
        .eq('product_id', productId)
        .order('purchase_count', { ascending: false })
        .limit(6);

      if (pairs && pairs.length > 0) {
        const productIds = pairs.map(p => p.paired_product_id).filter(Boolean) as string[];
        
        const { data: productsData } = await supabase
          .from('products')
          .select(`
            id,
            title,
            price,
            discounted_price,
            product_images (image_url)
          `)
          .in('id', productIds);

        if (productsData) {
          const productsWithImages = productsData.map(product => ({
            id: product.id,
            title: product.title,
            price: parseFloat(String(product.price)),
            discounted_price: product.discounted_price ? parseFloat(String(product.discounted_price)) : undefined,
            image_url: (product as any).product_images?.[0]?.image_url,
            purchase_count: pairs.find(p => p.paired_product_id === product.id)?.purchase_count || 0
          }));
          
          // Sort by purchase count
          productsWithImages.sort((a, b) => (b.purchase_count || 0) - (a.purchase_count || 0));
          setProducts(productsWithImages);
        }
      }
    } catch (error) {
      console.error('Error loading also bought products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mt-8">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Bu Ürünü Alanlar Bunları da Aldı
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Bu Ürünü Alanlar Bunları da Aldı
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
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
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
                      ₺{product.discounted_price.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      ₺{product.price.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-primary">
                    ₺{product.price.toFixed(2)}
                  </span>
                )}
              </div>
              {product.purchase_count && product.purchase_count > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {product.purchase_count} kişi birlikte aldı
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
