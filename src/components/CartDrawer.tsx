import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShoppingBag, Trash2, Plus, Minus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { getCartItems, updateCartQuantity, removeFromCart, getSessionId } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";

const FREE_SHIPPING_THRESHOLD = 500;

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CartDrawer = ({ open, onOpenChange }: CartDrawerProps) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getCartItems();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    load();
    const ch = supabase
      .channel("cart-drawer-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "cart" }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        const sid = getSessionId();
        const n: any = payload.new; const o: any = payload.old;
        if ((user && (n?.user_id === user.id || o?.user_id === user.id)) ||
            (!user && (n?.session_id === sid || o?.session_id === sid))) load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open]);

  const subtotal = items.reduce((s, it) => {
    const price = Number(it.products?.discounted_price ?? it.products?.price ?? 0);
    return s + price * (it.quantity || 0);
  }, 0);

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Sepetim
            <span className="text-sm font-normal text-muted-foreground ml-auto">
              {items.length} ürün
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* Free shipping progress */}
        {items.length > 0 && (
          <div className="px-5 py-3 bg-muted/40 border-b">
            {remaining > 0 ? (
              <p className="text-xs mb-2">
                <span className="font-semibold text-primary">{remaining.toFixed(2)} ₺</span> daha ekleyin,
                <span className="font-semibold"> ücretsiz kargo</span> kazanın 🚚
              </p>
            ) : (
              <p className="text-xs mb-2 text-success font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Tebrikler! Ücretsiz kargo kazandınız.
              </p>
            )}
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-10">Yükleniyor...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                <ShoppingBag className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">Sepetiniz boş</p>
              <p className="text-sm text-muted-foreground mb-4">Hemen ürünleri keşfedin</p>
              <Button asChild onClick={() => onOpenChange(false)}>
                <Link to="/products">Ürünlere Göz At</Link>
              </Button>
            </div>
          ) : (
            items.map((it) => {
              const img = it.products?.product_images?.[0]?.image_url || "/placeholder.svg";
              const price = Number(it.products?.discounted_price ?? it.products?.price ?? 0);
              return (
                <div key={it.id} className="flex gap-3 p-2 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                  <img src={img} alt={it.products?.title} className="w-16 h-16 object-cover rounded-md bg-muted" loading="lazy" />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/products/${it.product_id}`}
                      onClick={() => onOpenChange(false)}
                      className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors"
                    >
                      {it.products?.title}
                    </Link>
                    {it.custom_name && (
                      <div className="text-xs text-muted-foreground truncate">İsim: {it.custom_name}</div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border rounded-md">
                        <button
                          className="p-1 hover:bg-muted disabled:opacity-50"
                          disabled={it.quantity <= 1}
                          onClick={() => updateCartQuantity(it.id, it.quantity - 1)}
                          aria-label="Azalt"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-sm font-medium">{it.quantity}</span>
                        <button
                          className="p-1 hover:bg-muted"
                          onClick={() => updateCartQuantity(it.id, it.quantity + 1)}
                          aria-label="Arttır"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-sm font-semibold">{(price * it.quantity).toFixed(2)} ₺</div>
                    </div>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-destructive p-1 self-start"
                    onClick={() => removeFromCart(it.id)}
                    aria-label="Kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t px-5 py-4 space-y-3 bg-background">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ara Toplam</span>
              <span className="font-semibold">{subtotal.toFixed(2)} ₺</span>
            </div>
            <Button asChild className="w-full" size="lg" onClick={() => onOpenChange(false)}>
              <Link to="/cart">Sepete Git ve Öde</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
