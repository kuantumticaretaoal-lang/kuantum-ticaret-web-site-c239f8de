import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram, Youtube, Linkedin, MapPin, Phone } from "lucide-react";

const FollowPage = () => {
  const [socialMedia, setSocialMedia] = useState<any>(null);

  useEffect(() => {
    loadSocialMedia();

    const channel = supabase
      .channel("social-media-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_media" }, () => {
        loadSocialMedia();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSocialMedia = async () => {
    const { data } = await (supabase as any)
      .from("social_media")
      .select("*")
      .maybeSingle();
    
    if (data) setSocialMedia(data);
  };

  const socialLinks = [
    {
      name: "Instagram",
      icon: Instagram,
      url: socialMedia?.instagram,
    },
    {
      name: "YouTube",
      icon: Youtube,
      url: socialMedia?.youtube,
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      url: socialMedia?.linkedin,
    },
    {
      name: "WhatsApp",
      icon: Phone,
      url: socialMedia?.whatsapp,
    },
    {
      name: "Google Business",
      icon: MapPin,
      url: socialMedia?.google_business,
    },
  ].filter(link => link.url);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">Bizi Takip Edin!</h1>
        
        {socialLinks.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Sosyal medya hesaplarımız yakında eklenecek.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <link.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg">{link.name}</h3>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FollowPage;
