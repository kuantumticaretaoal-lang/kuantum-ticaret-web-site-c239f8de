import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/cart";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Star, ShoppingCart } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [question, setQuestion] = useState("");
  const [quantity, setQuantity] = useState(1);

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
    } else {
      navigate("/products");
    }
  };

  const loadReviews = async () => {
    const { data } = await (supabase as any)
      .from("product_reviews")
      .select(`
        *,
        profiles (
          first_name,
          last_name
        )
      `)
      .eq("product_id", id)
      .order("created_at", { ascending: false });
    
    if (data) setReviews(data);
  };

  const loadQuestions = async () => {
    const { data } = await (supabase as any)
      .from("product_questions")
      .select(`
        *,
        profiles!product_questions_user_id_fkey (
          first_name,
          last_name
        )
      `)
      .eq("product_id", id)
      .order("created_at", { ascending: false });
    
    if (data) setQuestions(data);
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

    const { error } = await (supabase as any).from("product_reviews").insert({
      product_id: id,
      user_id: user.id,
      rating,
      comment: comment || null,
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
        description: "Yorumunuz eklendi",
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

    const { error } = await (supabase as any).from("product_questions").insert({
      product_id: id,
      user_id: user.id,
      question,
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
        description: "Sorunuz eklendi",
      });
      setQuestion("");
    }
  };

  const handleAddToCart = async () => {
    const { error } = await addToCart(id!, quantity);
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

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Yükleniyor...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <Button variant="outline" onClick={() => navigate("/products")} className="mb-6">
          ← Geri
        </Button>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div>
            {product.product_images && product.product_images.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {product.product_images.map((image: any) => (
                    <CarouselItem key={image.id}>
                      <img
                        src={image.image_url}
                        alt={product.title}
                        className="w-full h-96 object-cover rounded-lg"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            ) : (
              <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Resim yok</p>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-4xl font-bold mb-4">{product.title}</h1>
            <div className="text-3xl font-bold text-primary mb-4">
              ₺{parseFloat(product.price).toFixed(2)}
            </div>
            {averageRating > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${
                        star <= averageRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({reviews.length} yorum)
                </span>
              </div>
            )}
            {product.description && (
              <p className="text-muted-foreground mb-6">{product.description}</p>
            )}
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-medium">Adet:</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24"
                />
              </div>
              <Button onClick={handleAddToCart} size="lg" className="w-full">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Sepete Ekle
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="reviews" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reviews">Yorumlar</TabsTrigger>
            <TabsTrigger value="questions">Soru & Cevap</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="space-y-6">
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle>Yorum Yap</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 text-sm font-medium">Puan Verin *</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-8 w-8 cursor-pointer ${
                            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                          onClick={() => setRating(star)}
                        />
                      ))}
                    </div>
                  </div>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Yorumunuzu yazın (isteğe bağlı)"
                    rows={4}
                  />
                  <Button onClick={submitReview} className="w-full">
                    Gönder
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          {review.profiles?.first_name} {review.profiles?.last_name}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </CardHeader>
                  {review.comment && (
                    <CardContent>
                      <p>{review.comment}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle>Soru Sor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Sorunuzu yazın"
                    rows={4}
                  />
                  <Button onClick={submitQuestion} className="w-full">
                    Gönder
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {questions.map((q) => (
                <Card key={q.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">
                        {q.profiles?.first_name} {q.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Soru:</p>
                      <p>{q.question}</p>
                    </div>
                    {q.answer && (
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Cevap:</p>
                        <p>{q.answer}</p>
                        {q.answered_at && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(q.answered_at).toLocaleDateString("tr-TR")}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;
