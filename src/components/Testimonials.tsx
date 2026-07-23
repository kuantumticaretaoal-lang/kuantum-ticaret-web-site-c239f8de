import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const TESTIMONIALS = [
  {
    name: "Elif Y.",
    city: "İstanbul",
    rating: 5,
    text: "Bilekliğim tam istediğim gibi geldi, kalite beklentimin çok üstünde. Kargo da hızlıydı, teşekkürler!",
  },
  {
    name: "Mert K.",
    city: "Ankara",
    rating: 5,
    text: "Kişiye özel isim işlemesi harika olmuş. Hediye ettim, çok beğenildi. Kesinlikle tekrar sipariş vereceğim.",
  },
  {
    name: "Ayşe D.",
    city: "İzmir",
    rating: 5,
    text: "Müşteri desteği çok ilgili, sipariş takibi sorunsuz. Ürün fotoğraflardakiyle bire bir aynı.",
  },
  {
    name: "Burak T.",
    city: "Bursa",
    rating: 5,
    text: "3D önizleme sayesinde nasıl geleceğini görebildim, çok pratik. Ürün gerçekten şık.",
  },
];

const Testimonials = () => {
  return (
    <section className="py-16 bg-muted/30" aria-labelledby="testimonials-heading">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold mb-3">
            Müşterilerimiz Ne Diyor?
          </h2>
          <p className="text-muted-foreground">
            Binlerce mutlu müşterimizin deneyimlerinden bir kesit.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {TESTIMONIALS.map((t, i) => (
            <Card key={i} className="relative hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-3">
                <Quote className="h-6 w-6 text-primary/40" aria-hidden />
                <div className="flex gap-0.5" aria-label={`${t.rating} yıldız`}>
                  {Array.from({ length: t.rating }).map((_, k) => (
                    <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">"{t.text}"</p>
                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.city}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
