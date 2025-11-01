import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, Shield, Headphones } from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Kaliteli Ürünler",
    description: "Özenle seçilmiş, kaliteli ürünlerle size hizmet veriyoruz."
  },
  {
    icon: Truck,
    title: "Hızlı Teslimat",
    description: "Siparişleriniz en kısa sürede adresinize teslim ediliyor."
  },
  {
    icon: Shield,
    title: "Güvenli Alışveriş",
    description: "Bilgileriniz güvende, güvenli alışveriş deneyimi sunuyoruz."
  },
  {
    icon: Headphones,
    title: "Müşteri Desteği",
    description: "Her zaman yanınızdayız, sorularınız için bize ulaşın."
  }
];

const Features = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-foreground mb-16">
          Neden Kuantum Ticaret?
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="border-2 hover:border-primary/30 hover:shadow-xl transition-all duration-300 text-center"
              >
                <CardHeader>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
