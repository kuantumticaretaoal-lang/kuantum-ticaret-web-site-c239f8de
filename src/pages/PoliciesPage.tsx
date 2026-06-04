import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

const PoliciesPage = () => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("site_policies")
        .select("id, title, policy_type, content, updated_at")
        .eq("is_active", true)
        .order("title");
      setPolicies(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Politikalar ve Sözleşmeler"
        description="Kuantum Ticaret gizlilik politikası, KVKK aydınlatma metni, çerez politikası ve satış sözleşmeleri."
        path="/politikalar"
      />
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-7 w-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Politikalar ve Sözleşmeler</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Hizmetlerimizi kullanırken geçerli olan tüm politikalar ve sözleşmeler aşağıda yer almaktadır. Kabul etmiş ya da reddetmiş olsanız fark etmeksizin her zaman buradan ulaşabilirsiniz.
        </p>

        {loading ? (
          <p className="text-muted-foreground">Yükleniyor…</p>
        ) : policies.length === 0 ? (
          <Card><CardContent className="p-6 text-muted-foreground">Henüz yayımlanmış politika yok.</CardContent></Card>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {policies.map((p) => (
              <AccordionItem key={p.id} value={p.id} className="border rounded-lg px-4 bg-card">
                <AccordionTrigger className="text-left font-semibold">{p.title}</AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/90">
                    {p.content}
                  </div>
                  {p.updated_at && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Son güncelleme: {new Date(p.updated_at).toLocaleDateString("tr-TR")}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PoliciesPage;
