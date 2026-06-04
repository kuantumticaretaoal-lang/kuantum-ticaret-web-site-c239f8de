import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import SEO from "@/components/SEO";

const FAQPage = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("faq_items").select("*").eq("is_active", true).order("sort_order");
      setItems(data || []);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sıkça Sorulan Sorular (SSS)"
        description="Kuantum Ticaret hakkında en çok sorulan sorular: kargo, iade, ödeme, özelleştirme ve daha fazlası."
        path="/faq"
        jsonLd={items.length > 0 ? {
          "@type": "FAQPage",
          mainEntity: items.map((it: any) => ({
            "@type": "Question",
            name: it.question,
            acceptedAnswer: { "@type": "Answer", text: it.answer },
          })),
        } : undefined}
      />
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <HelpCircle className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Sıkça Sorulan Sorular</h1>
        </div>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Henüz soru eklenmedi.</p>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {items.map((it) => (
              <AccordionItem key={it.id} value={it.id} className="border border-border rounded-lg px-4">
                <AccordionTrigger className="text-left font-semibold">{it.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground whitespace-pre-wrap">{it.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
