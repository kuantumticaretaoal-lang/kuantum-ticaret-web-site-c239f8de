import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCartItems, updateCartQuantity, removeFromCart, getSessionId } from "@/lib/cart";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, Trash2 } from "lucide-react";

const CartPage = () => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadCart();

    const channel = supabase
      .channel("cart-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cart" }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        const sessionId = getSessionId();
        
        // Only update if change is for current user/session
        if (
          (user && (payload.new as any)?.user_id === user.id) ||
          (!user && (payload.new as any)?.session_id === sessionId) ||
          (payload.old as any)?.user_id === user?.id ||
          (payload.old as any)?.session_id === sessionId
        ) {
          loadCart();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCart = async () => {
    setLoading(true);
    const items = await getCartItems();
    setCartItems(items);
    setLoading(false);
  };

  const handleUpdateQuantity = async (cartId: string, newQuantity: number) => {
    const { error } = await updateCartQuantity(cartId, newQuantity);
    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Miktar güncellenemedi",
      });
    }
  };

  const handleRemove = async (cartId: string) => {
    const { error } = await removeFromCart(cartId);
    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Ürün silinemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Ürün sepetten çıkarıldı",
      });
    }
  };

  const total = cartItems.reduce(
    (sum, item) => sum + parseFloat(item.products.price) * item.quantity,
    0
  );

  const handleCheckout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Giriş Gerekli",
        description: "Sipariş vermek için giriş yapmalısınız",
      });
      navigate("/login");
      return;
    }

    // Get user profile to check if address is filled
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("address, district, province")
      .eq("id", user.id)
      .single();

    if (!profile?.address || !profile?.district || !profile?.province) {
      toast({
        variant: "destructive",
        title: "Adres Bilgisi Eksik",
        description: "Sipariş vermek için hesabınızdan adres bilgilerinizi tamamlayın",
      });
      navigate("/account");
      return;
    }

    try {
      // Create order
      const { data: order, error: orderError } = await (supabase as any)
        .from("orders")
        .insert({
          user_id: user.id,
          delivery_type: "address",
          delivery_address: `${profile.address}, ${profile.district}, ${profile.province}`,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.products.price,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      const { error: clearError } = await (supabase as any)
        .from("cart")
        .delete()
        .eq("user_id", user.id);

      if (clearError) throw clearError;

      toast({
        title: "Sipariş Oluşturuldu",
        description: "Siparişiniz başarıyla oluşturuldu. Hesabım sayfasından takip edebilirsiniz.",
      });
      
      navigate("/account");
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sipariş oluşturulurken bir hata oluştu",
      });
    }
  };

  if (loading) {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Sepetim</h1>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Sepetiniz boş</p>
              <Button onClick={() => navigate("/products")}>
                Ürünlere Göz At
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {item.products.product_images?.[0] && (
                        <img
                          src={item.products.product_images[0].image_url}
                          alt={item.products.title}
                          className="w-24 h-24 object-cover rounded cursor-pointer"
                          onClick={() => navigate(`/products/${item.products.id}`)}
                        />
                      )}
                      <div className="flex-1">
                        <h3 
                          className="font-semibold mb-2 cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/products/${item.products.id}`)}
                        >
                          {item.products.title}
                        </h3>
                        <p className="text-lg font-bold text-primary mb-4">
                          ₺{parseFloat(item.products.price).toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val > 0) handleUpdateQuantity(item.id, val);
                            }}
                            className="w-20 text-center"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="ml-auto"
                            onClick={() => handleRemove(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Sipariş Özeti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-lg">
                    <span>Toplam:</span>
                    <span className="font-bold text-primary">
                      ₺{total.toFixed(2)}
                    </span>
                  </div>
                  <Button className="w-full" size="lg" onClick={handleCheckout}>
                    Sipariş Ver
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/products")}
                  >
                    Alışverişe Devam Et
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CartPage;
