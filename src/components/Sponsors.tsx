import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslations } from "@/hooks/use-translations";

interface SponsorsProps {
  showTitle?: boolean;
}

const Sponsors = ({ showTitle = false }: SponsorsProps) => {
  const { t } = useTranslations();
  const [sponsors, setSponsors] = useState<any[]>([]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("public-sponsors-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sponsors" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("sponsors")
      .select("*")
      .order("created_at", { ascending: false });
    setSponsors(data || []);
  };

  if (sponsors.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        {showTitle && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 flex items-center justify-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            {t("sponsors_title", "Sponsorlarımız")}
          </h2>
        )}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sponsors.map((s) => (
            <Card key={s.id} className="border-2 hover:border-primary/30 transition-all hover:shadow-xl">
              <CardContent className="p-8 text-center">
                {s.logo_url && (
                  <div className="mb-6">
                    <img
                      src={s.logo_url}
                      alt={`${s.name} logosu`}
                      className="h-32 w-full mx-auto object-contain"
                    />
                  </div>
                )}
                <h3 className="text-xl font-semibold text-foreground mb-2">{s.name}</h3>
                {s.description && <p className="text-sm text-muted-foreground mb-4">{s.description}</p>}
                {s.link && (
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={s.link} target="_blank" rel="noopener noreferrer">
                      {t("visit_website", "Website'yi Ziyaret Et")}
                      <ExternalLink className="h-4 w-4" />
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

export default Sponsors;
