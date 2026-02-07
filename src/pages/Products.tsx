import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { addToCart } from "@/lib/cart";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CampaignBanner } from "@/components/CampaignBanner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search, X, Filter, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { ProductSkeleton } from "@/components/ProductSkeleton";
import { useFavorites } from "@/hooks/use-favorites";
import FavoriteButton from "@/components/FavoriteButton";
import { useTranslations } from "@/hooks/use-translations";
import * as LucideIcons from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productTranslations, setProductTranslations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [filterPromotion, setFilterPromotion] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showOnlyInStock, setShowOnlyInStock] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { t, formatPrice, currentLanguage } = useTranslations();

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
    loadCategories();
    loadProductTranslations();

    const channel = supabase
      .channel("products-page-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadProducts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => {
        loadCategories();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "product_translations" }, () => {
        loadProductTranslations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // URL'den arama sorgusunu al
  useEffect(() => {
    const urlQuery = new URLSearchParams(location.search).get("query") || "";
    setSearchQuery(urlQuery);
  }, [location.search]);

  const loadProducts = async () => {
    try {
      setLoading(true);
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
          ),
          product_categories (
            category_id,
            categories (
              id,
              name,
              icon
            )
          )
        `)
        .order("created_at", { ascending: false });
      if (data) setProducts(data);
    } catch (error) {
      logger.error("Ürünler yüklenemedi", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setCategories(data);
  };

  const loadProductTranslations = async () => {
    if (currentLanguage === "tr") return;
    
    const { data } = await (supabase as any)
      .from("product_translations")
      .select("product_id, title, description")
      .eq("language_code", currentLanguage);
    
    if (data) {
      const transMap: Record<string, any> = {};
      data.forEach((t: any) => {
        transMap[t.product_id] = { title: t.title, description: t.description };
      });
      setProductTranslations(transMap);
    }
  };

  // Reload translations when language changes
  useEffect(() => {
    loadProductTranslations();
  }, [currentLanguage]);

  const getProductTitle = (product: any) => {
    if (currentLanguage !== "tr" && productTranslations[product.id]?.title) {
      return productTranslations[product.id].title;
    }
    return product.title;
  };

  const handleAddToCart = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock_status === "out_of_stock") {
      toast({
        variant: "destructive",
        title: "Stokta Yok",
        description: "Bu ürün şu anda stokta bulunmamaktadır",
      });
      return;
    }
    
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

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const clearFilters = () => {
    setFilterPromotion("all");
    setFilterCategory("all");
    setShowOnlyInStock(false);
    setPriceRange({ min: "", max: "" });
    setSearchQuery("");
  };

  const hasActiveFilters = filterPromotion !== "all" || filterCategory !== "all" || showOnlyInStock || priceRange.min || priceRange.max || searchQuery;

  const filtered = products.filter((p) => {
    const title = (p.title || "").toLowerCase();
    const desc = (p.description || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesQuery = !query || title.includes(query) || desc.includes(query);
    
    const matchesStock = !showOnlyInStock || (p.stock_status === "in_stock" || p.stock_status === "limited_stock");
    
    const productCategoryIds = p.product_categories?.map((pc: any) => pc.category_id) || [];
    const matchesCategory = filterCategory === "all" || productCategoryIds.includes(filterCategory);
    
    const price = parseFloat(p.price);
    const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
    const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity;
    const matchesPrice = price >= minPrice && price <= maxPrice;
    
    if (filterPromotion === "all") return matchesQuery && matchesStock && matchesCategory && matchesPrice;
    return matchesQuery && matchesStock && matchesCategory && matchesPrice && p.promotion_badges?.includes(filterPromotion);
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
      <CampaignBanner currentPage="products" />
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">Ürünlerimiz</h1>
        
        {/* Kategoriler */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <Button
              variant={filterCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory("all")}
            >
              Tümü
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={filterCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory(cat.id)}
                className="flex items-center gap-1"
              >
                {getIconComponent(cat.icon)}
                {cat.name}
              </Button>
            ))}
          </div>
        )}

        {/* Arama ve Filtreler */}
        <div className="space-y-4 mb-8">
          {/* Arama ve Sıralama */}
          <div className="flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search_products", "Ürün ara...")}
                className="pl-10"
              />
            </div>
            
            {/* Sıralama - Filtrelerin dışında */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("sort", "Sırala")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("newest", "En Yeni")}</SelectItem>
                <SelectItem value="price-asc">{t("price_asc", "Fiyat (Artan)")}</SelectItem>
                <SelectItem value="price-desc">{t("price_desc", "Fiyat (Azalan)")}</SelectItem>
                <SelectItem value="name-asc">{t("name_asc", "A'dan Z'ye")}</SelectItem>
                <SelectItem value="name-desc">{t("name_desc", "Z'den A'ya")}</SelectItem>
                <SelectItem value="rating">{t("most_rated", "En Çok Değerlendirilen")}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {t("filters", "Filtreler")}
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">!</Badge>
              )}
            </Button>
          </div>

          {/* Gelişmiş Filtreler */}
          {showFilters && (
            <Card className="max-w-4xl mx-auto">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Promosyon Filtresi */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Promosyon</label>
                    <Select value={filterPromotion} onValueChange={setFilterPromotion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filtrele" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Promosyonlar</SelectItem>
                        <SelectItem value="En Geç Yarın Kargoda">En Geç Yarın Kargoda</SelectItem>
                        <SelectItem value="Hızlı Teslimat">Hızlı Teslimat</SelectItem>
                        <SelectItem value="Sınırlı Stok">Sınırlı Stok</SelectItem>
                        <SelectItem value="İndirim">İndirim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fiyat Aralığı */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fiyat Aralığı</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min ₺"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                        className="w-full"
                      />
                      <Input
                        type="number"
                        placeholder="Max ₺"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Stok Filtresi */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stok Durumu</label>
                    <div className="flex items-center h-10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showOnlyInStock}
                          onChange={(e) => setShowOnlyInStock(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm">Sadece Stokta</span>
                      </label>
                    </div>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {sortedProducts.length} ürün bulundu
                    </p>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Filtreleri Temizle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
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
        ) : sortedProducts.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Arama kriterlerinize uygun ürün bulunamadı</p>
              <Button variant="outline" onClick={clearFilters}>
                Filtreleri Temizle
              </Button>
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
                    <div className="absolute top-2 right-2 flex gap-1">
                      <FavoriteButton
                        isFavorite={isFavorite(product.id)}
                        onClick={() => toggleFavorite(product.id)}
                        className="bg-background/80 backdrop-blur-sm rounded-full w-10 h-10"
                      />
                      <Button
                        size="default"
                        className="group overflow-hidden rounded-full shadow-lg transition-all duration-300 hover:w-auto hover:px-4 w-10 h-10 p-0"
                        onClick={(e) => handleAddToCart(product.id, e)}
                      >
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <ShoppingCart className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
                          <span className="max-w-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:opacity-100">
                            Sepete Ekle
                          </span>
                        </div>
                      </Button>
                    </div>
                    {product.promotion_badges && product.promotion_badges.length > 0 && (
                      <div className="absolute top-2 left-2 flex flex-col gap-1">
                        {product.promotion_badges.map((badge: string, idx: number) => (
                          <Badge key={idx} variant={getPromoVariant(badge)} className="text-xs">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {product.product_categories && product.product_categories.length > 0 && (
                      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                        {product.product_categories.slice(0, 2).map((pc: any, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1">
                            {getIconComponent(pc.categories?.icon)}
                            {pc.categories?.name}
                          </Badge>
                        ))}
                        {product.product_categories.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{product.product_categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{product.title}</CardTitle>
                  <div className="flex items-center justify-between">
                    <div>
                      {product.discounted_price ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg line-through text-muted-foreground">₺{parseFloat(product.price).toFixed(2)}</span>
                          <span className="text-2xl font-bold text-green-600">₺{parseFloat(product.discounted_price).toFixed(2)}</span>
                          <Badge variant="destructive" className="text-xs">
                            %{Math.round(((parseFloat(product.price) - parseFloat(product.discounted_price)) / parseFloat(product.price)) * 100)}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold text-primary">₺{parseFloat(product.price).toFixed(2)}</span>
                      )}
                    </div>
                    {product.stock_status !== 'in_stock' && (
                      <Badge variant={product.stock_status === 'out_of_stock' ? 'destructive' : 'secondary'}>
                        {product.stock_status === 'limited_stock' ? 'Sınırlı' : 'Tükendi'}
                      </Badge>
                    )}
                  </div>
                  {product.stock_quantity !== null && product.stock_quantity <= 5 && product.stock_status !== 'out_of_stock' && (
                    <div className="mt-2">
                      <Badge variant="warning" className="text-xs">
                        ⚠️ Son {product.stock_quantity} Adet
                      </Badge>
                    </div>
                  )}
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