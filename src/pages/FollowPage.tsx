import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Instagram, Youtube, Linkedin, MapPin, Phone } from "lucide-react";

interface SocialMediaItem {
  id: string;
  name: string;
  url: string;
  icon: string | null;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
}

const iconMap: Record<string, any> = {
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  whatsapp: Phone,
  google_business: MapPin,
  google: MapPin,
  phone: Phone,
};

const FollowPage = () => {
  const [socialItems, setSocialItems] = useState<SocialMediaItem[]>([]);
  const [legacySocial, setLegacySocial] = useState<any>(null);
  const [aboutUs, setAboutUs] = useState("");

  useEffect(() => {
    loadSocialItems();
    loadLegacySocial();
    loadAboutUs();

    const itemsChannel = supabase
      .channel("social-items-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_media_items" }, () => {
        loadSocialItems();
      })
      .subscribe();

    const legacyChannel = supabase
      .channel("social-media-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_media" }, () => {
        loadLegacySocial();
      })
      .subscribe();

    const aboutChannel = supabase
      .channel("about-us-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "about_us" }, () => {
        loadAboutUs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(legacyChannel);
      supabase.removeChannel(aboutChannel);
    };
  }, []);

  const loadSocialItems = async () => {
    const { data } = await supabase
      .from("social_media_items")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data) setSocialItems(data);
  };

  const loadLegacySocial = async () => {
    const { data } = await (supabase as any)
      .from("social_media")
      .select("*")
      .maybeSingle();
    
    if (data) setLegacySocial(data);
  };

  const loadAboutUs = async () => {
    const { data } = await supabase
      .from("about_us")
      .select("content")
      .maybeSingle();
    
    if (data) setAboutUs(data.content || "");
  };

  // Combine new items with legacy fallback
  const getLegacyLinks = () => {
    if (!legacySocial) return [];
    
    return [
      { name: "Instagram", icon: "instagram", url: legacySocial.instagram },
      { name: "YouTube", icon: "youtube", url: legacySocial.youtube },
      { name: "LinkedIn", icon: "linkedin", url: legacySocial.linkedin },
      { name: "WhatsApp", icon: "whatsapp", url: legacySocial.whatsapp },
      { name: "Google Business", icon: "google_business", url: legacySocial.google_business },
    ].filter(link => link.url);
  };

  const displayItems = socialItems.length > 0 ? socialItems : getLegacyLinks().map((l, i) => ({
    id: `legacy-${i}`,
    name: l.name,
    url: l.url,
    icon: l.icon,
    logo_url: null,
    is_active: true,
    sort_order: i,
  }));

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return null;
    const key = iconName.toLowerCase().replace(/\s+/g, "_");
    return iconMap[key] || null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">Bizi Takip Edin!</h1>
        
        {displayItems.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Sosyal medya hesaplarımız yakında eklenecek.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {displayItems.map((item) => {
              const IconComp = getIconComponent(item.icon);
              
              return (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
                      {item.logo_url ? (
                        <img
                          src={item.logo_url}
                          alt={item.name}
                          className="w-16 h-16 object-contain"
                        />
                      ) : IconComp ? (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <IconComp className="h-8 w-8 text-white" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <span className="text-white font-bold text-xl">
                            {item.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                    </CardContent>
                  </Card>
                </a>
              );
            })}
          </div>
        )}

        {aboutUs && (
          <div className="max-w-4xl mx-auto mt-16">
            <Card>
              <CardHeader>
                <h2 className="text-3xl font-bold text-center">Hakkımızda</h2>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {aboutUs}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FollowPage;
