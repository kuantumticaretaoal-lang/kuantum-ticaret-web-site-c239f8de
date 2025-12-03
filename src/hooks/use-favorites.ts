import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadFavorites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", session.user.id);

    if (!error && data) {
      setFavorites(data.map(f => f.product_id));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFavorites();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadFavorites();
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleFavorite = async (productId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        variant: "destructive",
        title: "Giriş Yapın",
        description: "Favorilere eklemek için giriş yapmalısınız.",
      });
      return;
    }

    const isFavorite = favorites.includes(productId);

    if (isFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", session.user.id)
        .eq("product_id", productId);

      if (!error) {
        setFavorites(prev => prev.filter(id => id !== productId));
        toast({
          title: "Favorilerden Çıkarıldı",
          description: "Ürün favorilerinizden çıkarıldı.",
        });
      }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: session.user.id, product_id: productId });

      if (!error) {
        setFavorites(prev => [...prev, productId]);
        toast({
          title: "Favorilere Eklendi",
          description: "Ürün favorilerinize eklendi.",
        });
      }
    }
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  return { favorites, loading, toggleFavorite, isFavorite, refetch: loadFavorites };
};
