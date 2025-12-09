import { useNavigate } from "react-router-dom";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface RecentlyViewedProductsProps {
  currentProductId?: string;
  showClearButton?: boolean;
  maxDisplay?: number;
}

export const RecentlyViewedProducts = ({ 
  currentProductId, 
  showClearButton = true,
  maxDisplay = 5
}: RecentlyViewedProductsProps) => {
  const navigate = useNavigate();
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const [startIndex, setStartIndex] = useState(0);

  // Filter out current product if on product detail page
  const filteredProducts = recentlyViewed.filter(p => p.id !== currentProductId);

  if (filteredProducts.length === 0) return null;

  const displayedProducts = filteredProducts.slice(startIndex, startIndex + maxDisplay);
  const canGoBack = startIndex > 0;
  const canGoForward = startIndex + maxDisplay < filteredProducts.length;

  const handleNext = () => {
    if (canGoForward) {
      setStartIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (canGoBack) {
      setStartIndex(prev => prev - 1);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Son Görüntülenen Ürünler
        </CardTitle>
        <div className="flex items-center gap-2">
          {filteredProducts.length > maxDisplay && (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                disabled={!canGoBack}
                onClick={handlePrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                disabled={!canGoForward}
                onClick={handleNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {showClearButton && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearRecentlyViewed}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" />
              Temizle
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayedProducts.map((product) => (
            <div 
              key={product.id}
              className="cursor-pointer group"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2 relative">
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
                  <Badge className="absolute top-1 right-1 bg-red-500 text-white text-xs">
                    %{Math.round(((product.price - product.discounted_price) / product.price) * 100)}
                  </Badge>
                )}
              </div>
              <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
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
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
