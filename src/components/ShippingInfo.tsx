import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/hooks/use-translations";

interface ShippingCompany {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  tracking_url: string | null;
}

const ShippingInfo = () => {
  const { t } = useTranslations();
  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    const { data } = await (supabase as any)
      .from("shipping_companies")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    setCompanies(data || []);
    setLoading(false);
  };

  if (loading) {
    return null;
  }

  if (companies.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 flex items-center justify-center gap-3">
          <Truck className="h-8 w-8 text-primary" />
          {t("shipping_title", "Kargo & Gönderim")}
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {companies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-all">
              <CardContent className="pt-6 text-center">
                {company.logo_url && (
                  <div className="mb-4 h-20 flex items-center justify-center">
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{company.name}</h3>
                {company.description && (
                  <p className="text-muted-foreground text-sm mb-4">
                    {company.description}
                  </p>
                )}
                {company.tracking_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={company.tracking_url} target="_blank" rel="noopener noreferrer">
                      {t("track_shipment", "Kargo Takip")}
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShippingInfo;
