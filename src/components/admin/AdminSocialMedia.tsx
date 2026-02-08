import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSocialMediaItems } from "./AdminSocialMediaItems";

export const AdminSocialMedia = () => {
  const [social, setSocial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSocial();

    const channel = supabase
      .channel("social-media-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "social_media" }, () => {
        loadSocial();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSocial = async () => {
    try {
      const { data } = await (supabase as any).from("social_media").select("*").single();
      if (data) setSocial(data);
    } catch (error) {
      logger.error("Sosyal medya yüklenemedi", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSocial = async () => {
    if (!social?.id) return;
    
    const { error } = await (supabase as any)
      .from("social_media")
      .update(social)
      .eq("id", social.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sosyal medya hesapları güncellenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Sosyal medya hesapları güncellendi",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sosyal Medya Yönetimi</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Yükleniyor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dynamic" className="w-full">
        <TabsList>
          <TabsTrigger value="dynamic">Sosyal Medya Hesapları</TabsTrigger>
          <TabsTrigger value="legacy">Eski Ayarlar</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dynamic">
          <AdminSocialMediaItems />
        </TabsContent>
        
        <TabsContent value="legacy">
          <Card>
            <CardHeader>
              <CardTitle>Eski Sosyal Medya Ayarları</CardTitle>
            </CardHeader>
            <CardContent>
              {!social ? (
                <p>Ayarlar bulunamadı.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>WhatsApp Kanalı</Label>
                    <Input
                      value={social.whatsapp || ""}
                      onChange={(e) => setSocial({ ...social, whatsapp: e.target.value })}
                      placeholder="WhatsApp link"
                    />
                  </div>
                  <div>
                    <Label>LinkedIn</Label>
                    <Input
                      value={social.linkedin || ""}
                      onChange={(e) => setSocial({ ...social, linkedin: e.target.value })}
                      placeholder="LinkedIn profil linki"
                    />
                  </div>
                  <div>
                    <Label>Google İşletme Hesabı</Label>
                    <Input
                      value={social.google_business || ""}
                      onChange={(e) => setSocial({ ...social, google_business: e.target.value })}
                      placeholder="Google Business link"
                    />
                  </div>
                  <div>
                    <Label>Instagram</Label>
                    <Input
                      value={social.instagram || ""}
                      onChange={(e) => setSocial({ ...social, instagram: e.target.value })}
                      placeholder="Instagram profil linki"
                    />
                  </div>
                  <div>
                    <Label>YouTube</Label>
                    <Input
                      value={social.youtube || ""}
                      onChange={(e) => setSocial({ ...social, youtube: e.target.value })}
                      placeholder="YouTube kanal linki"
                    />
                  </div>
                  <Button onClick={updateSocial} className="w-full">
                    Güncelle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
