import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";

const ContactPage = () => {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadSettings();

    const channel = supabase
      .channel("contact-settings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => {
        loadSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await (supabase as any).from("site_settings").select("*").single();
      if (data) setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12">İletişim</h1>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="space-y-6">
            <Card>
              <CardContent className="flex items-start gap-4 p-6">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <Phone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Telefon</h3>
                  <p className="text-muted-foreground">{settings?.phone || "+90 (XXX) XXX XX XX"}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-start gap-4 p-6">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">E-posta</h3>
                  <p className="text-muted-foreground">{settings?.email || "info@kuantumticaret.com"}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-start gap-4 p-6">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Adres</h3>
                  <p className="text-muted-foreground">{settings?.address || "İstanbul, Türkiye"}</p>
                  {settings?.location_url && (
                    <a
                      href={settings.location_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline mt-2 inline-block"
                    >
                      Konumu Aç
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Mesaj Gönder</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Adınız</label>
                  <Input placeholder="Adınızı girin" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">E-posta</label>
                  <Input type="email" placeholder="E-posta adresiniz" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Mesajınız</label>
                  <Textarea 
                    placeholder="Mesajınızı buraya yazın..." 
                    className="min-h-[150px] resize-none"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                >
                  Gönder
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactPage;
