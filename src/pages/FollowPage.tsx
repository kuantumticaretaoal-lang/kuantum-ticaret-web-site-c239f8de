import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Instagram, Youtube, Linkedin, MapPin, Phone } from "lucide-react";

const FollowPage = () => {
  const [socialMedia, setSocialMedia] = useState<any>(null);
  const [aboutUs, setAboutUs] = useState("");

  useEffect(() => {
    loadSocialMedia();
    loadAboutUs();

    const socialChannel = supabase
      .channel("social-media-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_media" }, () => {
        loadSocialMedia();
      })
      .subscribe();

    const aboutChannel = supabase
      .channel("about-us-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "about_us" }, () => {
        loadAboutUs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(socialChannel);
      supabase.removeChannel(aboutChannel);
    };
  }, []);

  const loadSocialMedia = async () => {
    const { data } = await (supabase as any)
      .from("social_media")
      .select("*")
      .maybeSingle();
    
    if (data) setSocialMedia(data);
  };

  const loadAboutUs = async () => {
    const { data } = await supabase
      .from("about_us")
      .select("content")
      .maybeSingle();
    
    if (data) setAboutUs(data.content || "");
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
