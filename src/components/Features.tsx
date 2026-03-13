import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, Shield, Headphones } from "lucide-react";
import { motion } from "framer-motion";

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

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: "easeOut" as const },
  }),
};

const Features = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.h2 
          className="text-4xl md:text-5xl font-bold text-center text-foreground mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          Neden Kuantum Ticaret?
        </motion.h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
              >
                <Card 
                  className="border-2 hover:border-primary/30 hover:shadow-xl transition-all duration-300 text-center h-full"
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
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
