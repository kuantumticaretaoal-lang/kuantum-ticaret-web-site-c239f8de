import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Sparkles } from "lucide-react";

export interface Ornament {
  id: string;
  name: string;
  image_url: string | null;
  extra_price: number;
  max_per_product: number;
}

export interface SelectedOrnament {
  id: string;
  name: string;
  extra_price: number;
  quantity: number;
}

interface Props {
  productId: string;
  value: SelectedOrnament[];
  onChange: (next: SelectedOrnament[]) => void;
}

export const OrnamentPicker = ({ productId, value, onChange }: Props) => {
  const [ornaments, setOrnaments] = useState<Ornament[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("product_ornaments")
        .select("id, name, image_url, extra_price, max_per_product")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setOrnaments(data || []);
    })();
  }, [productId]);

  if (ornaments.length === 0) return null;

  const getQty = (id: string) => value.find((s) => s.id === id)?.quantity || 0;

  const update = (orn: Ornament, delta: number) => {
    const current = getQty(orn.id);
    const next = Math.max(0, Math.min(orn.max_per_product || 10, current + delta));
    const others = value.filter((s) => s.id !== orn.id);
    if (next === 0) {
      onChange(others);
    } else {
      onChange([...others, { id: orn.id, name: orn.name, extra_price: Number(orn.extra_price), quantity: next }]);
    }
  };

  const totalExtra = value.reduce((s, o) => s + o.extra_price * o.quantity, 0);

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4 text-primary" />
        Süs / Charm Ekle (Opsiyonel)
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ornaments.map((orn) => {
          const qty = getQty(orn.id);
          return (
            <div key={orn.id} className="border rounded-md p-2 bg-background flex flex-col items-center text-center gap-1">
              {orn.image_url ? (
                <img src={orn.image_url} alt={orn.name} className="w-16 h-16 object-cover rounded" loading="lazy" />
              ) : (
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="text-xs font-medium line-clamp-1">{orn.name}</div>
              <div className="text-xs text-primary font-semibold">+₺{Number(orn.extra_price).toFixed(2)}</div>
              <div className="flex items-center gap-1 mt-1">
                <Button type="button" size="icon" variant="outline" className="h-6 w-6" onClick={() => update(orn, -1)} disabled={qty === 0}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                <Button type="button" size="icon" variant="outline" className="h-6 w-6" onClick={() => update(orn, +1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {totalExtra > 0 && (
        <div className="text-sm text-right font-semibold text-primary">
          Süs Ek Ücreti: +₺{totalExtra.toFixed(2)}
        </div>
      )}
    </div>
  );
};
