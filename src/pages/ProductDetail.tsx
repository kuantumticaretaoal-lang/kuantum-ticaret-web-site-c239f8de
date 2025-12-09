import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/cart";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Star, ShoppingCart, Package, AlertCircle, Upload, User, Heart } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ProductDetailSkeleton } from "@/components/ProductSkeleton";
import { useFavorites } from "@/hooks/use-favorites";
import { useRateLimit } from "@/hooks/use-rate-limit";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { sanitizeInput } from "@/lib/security";
import { RecentlyViewedProducts } from "@/components/RecentlyViewedProducts";
import { SimilarProducts } from "@/components/SimilarProducts";
import { ShareButtons } from "@/components/ShareButtons";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { checkDailyLimit, DAILY_LIMIT } = useRateLimit();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [question, setQuestion] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customName, setCustomName] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [customPhotoFile, setCustomPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    loadProduct();
    loadReviews();
    loadQuestions();
    checkUser();

    const reviewsChannel = supabase
      .channel("product-reviews-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_reviews", filter: `product_id=eq.${id}` }, () => {
        loadReviews();
      })
      .subscribe();

    const questionsChannel = supabase
      .channel("product-questions-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_questions", filter: `product_id=eq.${id}` }, () => {
        loadQuestions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(reviewsChannel);
      supabase.removeChannel(questionsChannel);
    };
  }, [id]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadProduct = async () => {
    const { data } = await (supabase as any)
      .from("products")
      .select(`
        *,
        product_images (
          id,
          image_url
        )
      `)
      .eq("id", id)
      .single();
    
    if (data) {
      setProduct(data);
      // Track recently viewed
      addToRecentlyViewed({
        id: data.id,
        title: data.title,
        price: parseFloat(data.price),
        discounted_price: data.discounted_price ? parseFloat(data.discounted_price) : undefined,
        image_url: data.product_images?.[0]?.image_url,
      });
    } else {
      navigate("/products");
    }
  };

  const loadReviews = async () => {
    const { data: reviewsData, error } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false });
    
    if (error) {
      setReviews([]);
      return;
    }

    const reviewsWithProfiles = await Promise.all(
      (reviewsData || []).map(async (review) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", review.user_id)
          .single();
        
        return {
          ...review,
          profiles: profile
        };
      })
    );

    setReviews(reviewsWithProfiles);
  };

  const loadQuestions = async () => {
    const { data: questionsData, error } = await supabase
      .from("product_questions")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false });
    
    if (error) {
      setQuestions([]);
      return;
    }

    const questionsWithProfiles = await Promise.all(
      (questionsData || []).map(async (question) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", question.user_id)
          .single();
        
        return {
          ...question,
          profiles: profile
        };
      })
    );

    setQuestions(questionsWithProfiles);
  };

  const submitReview = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yorum yapmak için giriş yapmalısınız",
      });
      return;
    }

    if (rating === 0) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen yıldız verin",
      });
      return;
    }

    // Rate limit kontrolü
    const { allowed, remaining } = await checkDailyLimit("product_reviews");
    if (!allowed) {
      toast({
        variant: "destructive",
        title: "Günlük Limit Aşıldı",
        description: `Günde en fazla ${DAILY_LIMIT} yorum yapabilirsiniz. Yarın tekrar deneyin.`,
      });
      return;
    }

    const sanitizedComment = sanitizeInput(comment);

    const { error } = await (supabase as any).from("product_reviews").insert({
      product_id: id,
      user_id: user.id,
      rating,
      comment: sanitizedComment || null,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yorum eklenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: `Yorumunuz eklendi. Bugün ${remaining - 1} yorum hakkınız kaldı.`,
      });
      setRating(0);
      setComment("");
    }
  };

  const submitQuestion = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Soru sormak için giriş yapmalısınız",
      });
      return;
    }

    if (!question.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen bir soru yazın",
      });
      return;
    }

    // Rate limit kontrolü
    const { allowed, remaining } = await checkDailyLimit("product_questions");
    if (!allowed) {
      toast({
        variant: "destructive",
        title: "Günlük Limit Aşıldı",
        description: `Günde en fazla ${DAILY_LIMIT} soru sorabilirsiniz. Yarın tekrar deneyin.`,
      });
      return;
    }

    const sanitizedQuestion = sanitizeInput(question);

    const { error } = await (supabase as any).from("product_questions").insert({
      product_id: id,
      user_id: user.id,
      question: sanitizedQuestion,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Soru eklenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: `Sorunuz eklendi. Bugün ${remaining - 1} soru hakkınız kaldı.`,
      });
      setQuestion("");
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (product.stock_status === 'out_of_stock') {
      toast({
        variant: "destructive",
        title: "Stokta Yok",
        description: "Bu ürün şu anda stokta bulunmamaktadır",
      });
      return;
    }

    if (product.available_sizes && product.available_sizes.length > 0 && !selectedSize) {
      toast({
        variant: "destructive",
        title: "Beden Seçimi Gerekli",
        description: "Lütfen bir beden seçiniz",
      });
      return;
    }

    if (product.is_name_customizable && !customName.trim()) {
      toast({
        variant: "destructive",
        title: "İsim Gerekli",
        description: "Lütfen isim giriniz",
      });
      return;
    }

    if (product.allows_custom_photo && !customPhotoFile) {
      toast({
        variant: "destructive",
        title: "Fotoğraf Gerekli",
        description: "Lütfen bir fotoğraf yükleyiniz (jpg, jpeg, png veya webp formatında)",
      });
      return;
    }

    let customPhotoUrl = null;

    if (customPhotoFile && user) {
      const fileExt = customPhotoFile.name.split(".").pop();
      const fileName = `${user.id}/${id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("custom-photos")
        .upload(fileName, customPhotoFile);

      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Fotoğraf yüklenemedi",
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("custom-photos")
        .getPublicUrl(fileName);

      customPhotoUrl = publicUrl;
    }

    const { error } = await addToCart(id!, quantity, customName || undefined, selectedSize || undefined, customPhotoUrl || undefined);
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
      setCustomName("");
      setSelectedSize("");
      setCustomPhotoFile(null);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <ProductDetailSkeleton />
        <Footer />
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const getStockBadge = () => {
    if (product.stock_status === 'out_of_stock') {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Stokta Yok</Badge>;
    }
    if (product.stock_quantity <= 5 && product.stock_quantity > 0) {
      return <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"><AlertCircle className="h-3 w-3" />Son {product.stock_quantity} Adet</Badge>;
    }
    return <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Package className="h-3 w-3" />Stokta Var</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 lg:py-12">
        <Button variant="ghost" onClick={() => navigate("/products")} className="mb-6">
          ← Ürünlere Dön
        </Button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Resim Galerisi */}
          <div className="space-y-4">
            {product.product_images && product.product_images.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {product.product_images.map((image: any) => (
                    <CarouselItem key={image.id}>
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                        <img
                          src={image.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {product.product_images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </>
                )}
              </Carousel>
            ) : (
              <div className="w-full aspect-square bg-muted rounded-xl flex items-center justify-center">
                <p className="text-muted-foreground">Resim yok</p>
              </div>
            )}
            
            {/* Promosyon Rozetleri */}
            {product.promotion_badges && product.promotion_badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.promotion_badges.map((badge: string, idx: number) => (
                  <Badge key={idx} variant="outline">{badge}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Ürün Bilgileri */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-3xl lg:text-4xl font-bold">{product.title}</h1>
                {getStockBadge()}
              </div>
              
              {averageRating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= averageRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {averageRating.toFixed(1)} ({reviews.length} değerlendirme)
                  </span>
                </div>
              )}

              <div className="text-4xl font-bold text-primary mb-4">
                ₺{parseFloat(product.price).toFixed(2)}
              </div>

              {product.description && (
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              )}
            </div>

            <Separator />

            {/* Özelleştirme Seçenekleri */}
            {product.stock_status !== 'out_of_stock' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ürün Seçenekleri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.is_name_customizable && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        İsim Özelleştirme <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="İsim giriniz"
                      />
                    </div>
                  )}

                  {product.available_sizes && product.available_sizes.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Beden Seçimi <span className="text-destructive">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {product.available_sizes.map((size: string) => (
                          <Button
                            key={size}
                            variant={selectedSize === size ? "default" : "outline"}
                            onClick={() => setSelectedSize(size)}
                            size="sm"
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.allows_custom_photo && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Fotoğraf Yükle <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length === 1) {
                            setCustomPhotoFile(files[0]);
                          } else if (files && files.length > 1) {
                            toast({
                              variant: "destructive",
                              title: "Hata",
                              description: "Sadece 1 adet fotoğraf yükleyebilirsiniz",
                            });
                            e.target.value = "";
                          }
                        }}
                      />
                      {customPhotoFile && (
                        <p className="text-xs text-muted-foreground">
                          Seçilen: {customPhotoFile.name}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Adet</label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sepete Ekle Butonu */}
            {product.stock_status === 'out_of_stock' ? (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="pt-6">
                  <p className="text-center text-destructive font-medium">
                    Bu ürün şu anda stokta bulunmamaktadır
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex gap-3">
                <Button onClick={handleAddToCart} size="lg" className="flex-1 text-lg h-14">
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Sepete Ekle
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 p-0"
                  onClick={() => id && toggleFavorite(id)}
                >
                  <Heart
                    className={`h-6 w-6 ${
                      id && isFavorite(id)
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Yorumlar ve Sorular */}
        <Tabs defaultValue="reviews" className="mt-12">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reviews">Değerlendirmeler ({reviews.length})</TabsTrigger>
            <TabsTrigger value="questions">Sorular ({questions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="mt-6 space-y-6">
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle>Değerlendirme Yap</CardTitle>
                  <CardDescription>Ürün hakkındaki düşüncelerinizi paylaşın</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Puan <span className="text-destructive">*</span></p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Yorum</p>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Ürün hakkındaki görüşlerinizi yazın... (isteğe bağlı)"
                      rows={4}
                    />
                  </div>
                  <Button onClick={submitReview} className="w-full">
                    Değerlendirmeyi Gönder
                  </Button>
                </CardContent>
              </Card>
            )}

            {reviews.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Henüz değerlendirme yok. İlk değerlendirmeyi siz yapın!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">
                            {review.profiles?.first_name} {review.profiles?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && <p className="text-muted-foreground">{review.comment}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="questions" className="mt-6 space-y-6">
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle>Soru Sor</CardTitle>
                  <CardDescription>Ürün hakkında merak ettiklerinizi sorun</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Sorunuzu buraya yazın..."
                    rows={3}
                  />
                  <Button onClick={submitQuestion} className="w-full">
                    Soruyu Gönder
                  </Button>
                </CardContent>
              </Card>
            )}

            {questions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Henüz soru yok. İlk soruyu siz sorun!
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <Card key={q.id}>
                    <CardContent className="pt-6 space-y-4">
                      <div>
                        <div className="flex items-start gap-3 mb-2">
                          <Badge variant="secondary">S</Badge>
                          <div className="flex-1">
                            <p className="font-medium mb-1">
                              {q.profiles?.first_name} {q.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              {new Date(q.created_at).toLocaleDateString('tr-TR')}
                            </p>
                            <p>{q.question}</p>
                          </div>
                        </div>
                      </div>
                      {q.answer && (
                        <div className="pl-10 border-l-2 border-primary/20">
                          <div className="flex items-start gap-3">
                            <Badge variant="default">C</Badge>
                            <div className="flex-1">
                              <p className="font-medium text-primary mb-1">Satıcı Yanıtı</p>
                              <p className="text-sm text-muted-foreground mb-2">
                                {new Date(q.answered_at).toLocaleDateString('tr-TR')}
                              </p>
                              <p>{q.answer}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Similar Products */}
        <SimilarProducts 
          currentProductId={id || ''} 
          categoryIds={product?.product_categories?.map((pc: any) => pc.category_id) || []}
        />

        {/* Recently Viewed Products */}
        <RecentlyViewedProducts currentProductId={id} />
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;
