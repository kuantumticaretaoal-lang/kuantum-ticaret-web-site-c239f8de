import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FavoriteButton from "@/components/FavoriteButton";
import { ShareButtons } from "@/components/ShareButtons";
import { ShoppingCart, ExternalLink, Star, Package, AlertTriangle } from "lucide-react";
import { addToCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { useFavorites } from "@/hooks/use-favorites";

interface QuickViewModalProps {
  product: any;
  open: boolean;
  onClose: () => void;
}

export const QuickViewModal = ({ product, open, onClose }: QuickViewModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [addingToCart, setAddingToCart] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!product) return null;

  const images = product.product_images || [];
  const hasCustomization = product.is_name_customizable || product.allows_custom_photo || (product.available_sizes && product.available_sizes.length > 0);
  const isOutOfStock = product.stock_status === 'out_of_stock';
  const isLowStock = product.stock_quantity !== null && product.stock_quantity <= 5 && product.stock_quantity > 0;

  const handleQuickAddToCart = async () => {
    if (hasCustomization) {
      navigate(`/products/${product.id}`);
      onClose();
      return;
    }

    if (isOutOfStock) {
      toast({
        variant: "destructive",
        title: "Stok Tükendi",
        description: "Bu ürün şu anda stokta yok",
      });
      return;
    }

    setAddingToCart(true);
    const { error } = await addToCart(product.id, 1);
    setAddingToCart(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Ürün sepete eklenemedi",
      });
    } else {
      toast({
        title: "Sepete Eklendi",
        description: `${product.title} sepete eklendi`,
      });
    }
  };

  const handleViewDetails = () => {
    navigate(`/products/${product.id}`);
    onClose();
  };

  const averageRating = product.product_reviews?.length 
    ? product.product_reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / product.product_reviews.length 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square rounded-lg overflow-hidden bg-muted relative">
              {images.length > 0 ? (
                <img 
                  src={images[currentImageIndex]?.image_url} 
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Resim Yok
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.discounted_price && product.discounted_price < product.price && (
                  <Badge className="bg-red-500 text-white">
                    %{Math.round(((product.price - product.discounted_price) / product.price) * 100)} İndirim
                  </Badge>
                )}
                {isLowStock && (
                  <Badge variant="outline" className="bg-background">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Son {product.stock_quantity} Adet
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img: any, idx: number) => (
                  <button
                    key={idx}
                    className={`w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border-2 ${
                      currentImageIndex === idx ? 'border-primary' : 'border-transparent'
                    }`}
                    onClick={() => setCurrentImageIndex(idx)}
                  >
                    <img 
                      src={img.image_url} 
                      alt={`${product.title} - ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xl font-bold">{product.title}</h2>
              <div className="flex gap-2 flex-shrink-0">
                <FavoriteButton 
                  isFavorite={isFavorite(product.id)} 
                  onClick={() => toggleFavorite(product.id)} 
                />
                <ShareButtons title={product.title} />
              </div>
            </div>

            {/* Rating */}
            {product.product_reviews?.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star}
                      className={`h-4 w-4 ${
                        star <= averageRating 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.product_reviews.length} değerlendirme)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3">
              {product.discounted_price && product.discounted_price < product.price ? (
                <>
                  <span className="text-3xl font-bold text-primary">
                    ₺{parseFloat(product.discounted_price).toFixed(2)}
                  </span>
                  <span className="text-xl text-muted-foreground line-through">
                    ₺{parseFloat(product.price).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold text-primary">
                  ₺{parseFloat(product.price).toFixed(2)}
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className={`text-sm ${isOutOfStock ? 'text-destructive' : 'text-green-600'}`}>
                {isOutOfStock ? 'Stokta Yok' : 'Stokta Var'}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-4">
                {product.description}
              </p>
            )}

            {/* Customization Note */}
            {hasCustomization && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Bu ürün özelleştirme içeriyor:</p>
                <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                  {product.is_name_customizable && <li>İsme Özel Yazdırma</li>}
                  {product.available_sizes?.length > 0 && <li>Beden Seçimi</li>}
                  {product.allows_custom_photo && <li>Özel Fotoğraf Yükleme</li>}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleQuickAddToCart}
                disabled={isOutOfStock || addingToCart}
                className="flex-1"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {hasCustomization ? 'Özelleştir' : (addingToCart ? 'Ekleniyor...' : 'Sepete Ekle')}
              </Button>
              <Button variant="outline" onClick={handleViewDetails}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Detaylar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
