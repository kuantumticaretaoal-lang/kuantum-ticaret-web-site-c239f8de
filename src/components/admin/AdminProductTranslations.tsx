import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Languages, Save, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Product {
  id: string;
  title: string;
  description: string | null;
}

interface Translation {
  id?: string;
  product_id: string;
  language_code: string;
  title: string;
  description: string | null;
}

interface Language {
  code: string;
  name: string;
  native_name: string;
}

const AdminProductTranslations = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [openProducts, setOpenProducts] = useState<Record<string, boolean>>({});
  const [localTranslations, setLocalTranslations] = useState<Record<string, Record<string, { title: string; description: string }>>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [productsRes, languagesRes, translationsRes] = await Promise.all([
      supabase.from("products").select("id, title, description").order("title"),
      supabase.from("supported_languages").select("code, name, native_name").eq("is_active", true).order("sort_order"),
      (supabase as any).from("product_translations").select("*"),
    ]);

    setProducts(productsRes.data || []);
    setLanguages((languagesRes.data || []).filter((l: Language) => l.code !== "tr"));
    setTranslations(translationsRes.data || []);

    // Initialize local translations
    const localTrans: Record<string, Record<string, { title: string; description: string }>> = {};
    (productsRes.data || []).forEach((product: Product) => {
      localTrans[product.id] = {};
      (languagesRes.data || []).filter((l: Language) => l.code !== "tr").forEach((lang: Language) => {
        const existing = (translationsRes.data || []).find(
          (t: Translation) => t.product_id === product.id && t.language_code === lang.code
        );
        localTrans[product.id][lang.code] = {
          title: existing?.title || "",
          description: existing?.description || "",
        };
      });
    });
    setLocalTranslations(localTrans);
    setLoading(false);
  };

  const handleSave = async (productId: string, langCode: string) => {
    const trans = localTranslations[productId]?.[langCode];
    if (!trans?.title.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Başlık gerekli" });
      return;
    }

    setSaving(`${productId}-${langCode}`);

    const existing = translations.find(
      (t) => t.product_id === productId && t.language_code === langCode
    );

    const payload = {
      product_id: productId,
      language_code: langCode,
      title: trans.title,
      description: trans.description || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (existing?.id) {
      const res = await (supabase as any)
        .from("product_translations")
        .update(payload)
        .eq("id", existing.id);
      error = res.error;
    } else {
      const res = await (supabase as any)
        .from("product_translations")
        .insert(payload);
      error = res.error;
    }

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Kaydedilemedi" });
    } else {
      toast({ title: "Başarılı", description: "Çeviri kaydedildi" });
      loadData();
    }

    setSaving(null);
  };

  const updateLocal = (productId: string, langCode: string, field: "title" | "description", value: string) => {
    setLocalTranslations((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [langCode]: {
          ...prev[productId]?.[langCode],
          [field]: value,
        },
      },
    }));
  };

  const toggleProduct = (productId: string) => {
    setOpenProducts((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  if (loading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  if (languages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Türkçe dışında aktif dil bulunmuyor. Önce Dil Ayarları'ndan yeni dil ekleyin.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Languages className="h-6 w-6" />
          Ürün Çevirileri
        </h2>
      </div>

      <p className="text-muted-foreground">
        Her ürün için farklı dillerde başlık ve açıklama ekleyebilirsiniz. Türkçe varsayılan dildir.
      </p>

      <div className="space-y-4">
        {products.map((product) => (
          <Collapsible
            key={product.id}
            open={openProducts[product.id]}
            onOpenChange={() => toggleProduct(product.id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">{product.title}</CardTitle>
                    {openProducts[product.id] ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-0">
                  {/* Original Turkish */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2 text-sm">🇹🇷 Türkçe (Orijinal)</h4>
                    <p className="text-sm"><strong>Başlık:</strong> {product.title}</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Açıklama:</strong> {product.description || "—"}
                    </p>
                  </div>

                  {/* Other languages */}
                  {languages.map((lang) => {
                    const trans = localTranslations[product.id]?.[lang.code] || { title: "", description: "" };
                    const isSaving = saving === `${product.id}-${lang.code}`;
                    const hasTranslation = translations.some(
                      (t) => t.product_id === product.id && t.language_code === lang.code
                    );

                    return (
                      <div key={lang.code} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-sm">
                            {lang.code === "en" ? "🇬🇧" : lang.code === "de" ? "🇩🇪" : "🌐"} {lang.native_name}
                          </h4>
                          {hasTranslation && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              Çeviri var
                            </span>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Başlık</Label>
                            <Input
                              value={trans.title}
                              onChange={(e) => updateLocal(product.id, lang.code, "title", e.target.value)}
                              placeholder={`${lang.name} başlık...`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Açıklama</Label>
                            <Textarea
                              value={trans.description}
                              onChange={(e) => updateLocal(product.id, lang.code, "description", e.target.value)}
                              placeholder={`${lang.name} açıklama...`}
                              rows={3}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleSave(product.id, lang.code)}
                            disabled={isSaving}
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? "Kaydediliyor..." : "Kaydet"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default AdminProductTranslations;
