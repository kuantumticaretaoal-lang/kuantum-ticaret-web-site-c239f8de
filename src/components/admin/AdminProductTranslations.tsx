import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Languages, Sparkles, Loader2, CheckCircle } from "lucide-react";

const AdminProductTranslations = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [translations, setTranslations] = useState<any[]>([]);
  const [translating, setTranslating] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (selectedProduct) loadTranslations(selectedProduct); }, [selectedProduct]);

  const loadData = async () => {
    const [{ data: prods }, { data: langs }] = await Promise.all([
      (supabase as any).from("products").select("id, title").order("title"),
      (supabase as any).from("supported_languages").select("*").eq("is_active", true).eq("is_default", false).order("sort_order"),
    ]);
    setProducts(prods || []);
    setLanguages(langs || []);
  };

  const loadTranslations = async (productId: string) => {
    const { data } = await (supabase as any)
      .from("product_translations").select("*").eq("product_id", productId);
    setTranslations(data || []);
  };

  const translateProduct = async (productId: string) => {
    if (!languages.length) { toast({ variant: "destructive", title: "Hata", description: "Aktif dil bulunamadı" }); return; }
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-translate-product", {
        body: { productId, targetLanguages: languages.map(l => ({ code: l.code, name: l.name })) },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Çeviri başarısız");
      const successCount = data.results?.filter((r: any) => r.ok).length || 0;
      toast({ title: "Çeviri tamamlandı", description: `${successCount}/${languages.length} dil çevrildi` });
      if (selectedProduct === productId) loadTranslations(productId);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Hata", description: e.message });
    } finally { setTranslating(false); }
  };

  const translateAllProducts = async () => {
    if (!languages.length || !products.length) return;
    setTranslatingAll(true);
    let done = 0;
    for (const p of products) {
      try {
        await supabase.functions.invoke("auto-translate-product", {
          body: { productId: p.id, targetLanguages: languages.map(l => ({ code: l.code, name: l.name })) },
        });
        done++;
      } catch { /* skip */ }
    }
    toast({ title: "Toplu çeviri tamamlandı", description: `${done}/${products.length} ürün çevrildi` });
    if (selectedProduct) loadTranslations(selectedProduct);
    setTranslatingAll(false);
  };

  const hasTranslation = (langCode: string) => translations.some(t => t.language_code === langCode);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Otomatik Ürün Çevirisi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={translateAllProducts} disabled={translatingAll || !products.length} className="gap-2">
              {translatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
              {translatingAll ? "Çevriliyor..." : "Tüm Ürünleri Çevir"}
            </Button>
            <span className="text-sm text-muted-foreground">{products.length} ürün × {languages.length} dil</span>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger><SelectValue placeholder="Ürün seçin..." /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => selectedProduct && translateProduct(selectedProduct)} disabled={!selectedProduct || translating} size="sm" className="gap-1">
              {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Çevir
            </Button>
          </div>

          {selectedProduct && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Çeviri Durumu:</p>
              <div className="flex flex-wrap gap-2">
                {languages.map(lang => (
                  <Badge key={lang.code} variant={hasTranslation(lang.code) ? "default" : "secondary"} className="gap-1">
                    {hasTranslation(lang.code) && <CheckCircle className="h-3 w-3" />}
                    {lang.native_name}
                  </Badge>
                ))}
              </div>
              {translations.length > 0 && (
                <div className="mt-4 space-y-3">
                  {translations.map(t => (
                    <div key={t.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{t.language_code}</Badge>
                        <span className="font-medium text-sm">{t.title}</span>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { AdminProductTranslations };
export default AdminProductTranslations;
