import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import garajLogo from "@/assets/garaj-logo.png";

const Sponsors = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center text-foreground mb-12">
          Sponsorlarımız
        </h2>
        
        <div className="max-w-md mx-auto">
          <Card className="border-2 hover:border-primary/30 transition-all hover:shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <img 
                  src={garajLogo} 
                  alt="Garaj Alp Oğuz" 
                  className="h-32 w-32 mx-auto object-contain bg-yellow-400 rounded-lg p-4"
                />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Garaj Alp Oğuz Girişimcilik ve Ön Kuluçka Merkezi
              </h3>
              <Button 
                variant="outline" 
                className="gap-2"
                asChild
              >
                <a 
                  href="https://www.garajalpoguz.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Website'yi Ziyaret Et
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Sponsors;
