import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { logger } from "@/lib/logger";

const ContactPage = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const contactSchema = z.object({
    name: z.string()
      .trim()
      .min(2, 'Ad en az 2 karakter olmalıdır')
      .max(100, 'Ad en fazla 100 karakter olmalıdır'),
    email: z.string()
      .trim()
      .email('Geçerli bir e-posta adresi girin')
      .max(255, 'E-posta en fazla 255 karakter olmalıdır')
      .toLowerCase(),
    phone: z.string()
      .trim()
      .optional(),
    message: z.string()
      .trim()
      .min(10, 'Mesaj en az 10 karakter olmalıdır')
      .max(2000, 'Mesaj en fazla 2000 karakter olmalıdır')
  });

  const loadSettings = async () => {
    try {
      const { data } = await (supabase as any).from("site_settings").select("*").single();
      if (data) setSettings(data);
    } catch (error) {
      logger.error("Error loading settings", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with zod schema
    const validation = contactSchema.safeParse(formData);
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: validation.error.errors[0].message,
      });
      return;
    }

    const validData = validation.data;
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase as any)
        .from("contact_messages")
        .insert({
          name: validData.name,
          email: validData.email,
          phone: validData.phone || null,
          message: validData.message,
          user_id: user?.id || null,
        });

      if (error) throw error;

      toast({
        title: "Başarılı",
        description: "Mesajınız gönderildi",
      });
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      logger.error("Failed to submit contact form", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Mesaj gönderilemedi",
      });
    } finally {
      setIsSubmitting(false);
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
              <CardTitle className="text-2xl">
                Mesaj Gönder{" "}
                <span className="text-sm font-normal text-muted-foreground block mt-1">
                  (İstek, Öneri, Şikayet ve Mesajınızı Buradan Yazabilirsiniz...)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Adınız</label>
                  <Input 
                    placeholder="Adınızı girin"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">E-posta</label>
                  <Input 
                    type="email" 
                    placeholder="E-posta adresiniz"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Telefon (İsteğe bağlı)</label>
                  <Input 
                    type="tel" 
                    placeholder="Telefon numaranız"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Mesajınız</label>
                  <Textarea 
                    placeholder="Mesajınızı buraya yazın..." 
                    className="min-h-[150px] resize-none"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Gönderiliyor..." : "Gönder"}
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
