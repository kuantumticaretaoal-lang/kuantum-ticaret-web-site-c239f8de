import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

const FAQS = [
  {
    q: "Siparişim ne kadar sürede kargoya verilir?",
    a: "Hazır ürünler 1-2 iş günü içinde, kişiye özel ürünler ise 3-5 iş günü içinde kargoya verilir. Kargolama sonrası ortalama teslim süresi 1-3 iş günüdür.",
  },
  {
    q: "Kişiselleştirilmiş ürünlerde iade yapabilir miyim?",
    a: "Kişiye özel üretilen ürünlerde üretim hatası dışında iade kabul edilmemektedir. Standart ürünlerde 14 gün içinde koşulsuz iade hakkınız bulunur.",
  },
  {
    q: "Kargo ücretini kim öder?",
    a: "Belirli tutarın üzerindeki siparişlerde kargo tamamen ücretsizdir. Detaylar için sepet sayfasındaki ilerleme çubuğunu kontrol edebilirsiniz.",
  },
  {
    q: "Ödeme yöntemleri neler?",
    a: "Kredi/banka kartı, kapıda ödeme ve IBAN ile havale/EFT seçeneklerini destekliyoruz. Tüm ödemeler SSL sertifikası ile korunur.",
  },
  {
    q: "Ürün nasıl üretileceğini önceden görebilir miyim?",
    a: "Evet! Ürün detay sayfasında 3D önizleme ile bilekliğinizi ismini, süslerini ve ip rengini değiştirerek gerçek zamanlı görüntüleyebilirsiniz.",
  },
  {
    q: "Sorun yaşarsam nasıl iletişime geçebilirim?",
    a: "7/24 canlı destek widget'ımızı sağ alt köşeden kullanabilir, iletişim sayfası üzerinden mesaj bırakabilir veya doğrudan e-posta gönderebilirsiniz.",
  },
];

const HomeFAQ = () => {
  return (
    <section className="py-16" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <HelpCircle className="h-3.5 w-3.5" />
            Sıkça Sorulan Sorular
          </div>
          <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold mb-3">
            Aklınıza takılanlar
          </h2>
          <p className="text-muted-foreground">
            En sık sorulan sorulara hızlı yanıtlar.
          </p>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-sm md:text-base">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="text-center mt-8">
          <Link to="/faq" className="text-sm text-primary hover:underline font-medium">
            Tüm soruları görüntüle →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeFAQ;
