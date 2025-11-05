import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export const AdminAbout = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAbout();

    const channel = supabase
      .channel("about-us-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "about_us" }, () => {
        loadAbout();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAbout = async () => {
    const { data } = await supabase
      .from("about_us")
      .select("*")
      .maybeSingle();

    if (data) {
      setContent(data.content || "");
    }
    setLoading(false);
  };

  const saveAbout = async () => {
    const { data: existing } = await supabase
      .from("about_us")
      .select("id")
      .maybeSingle();

    let error;
    if (existing) {
      const result = await supabase
        .from("about_us")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("about_us")
        .insert({ content });
      error = result.error;
    }

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Hakkımızda bilgisi güncellenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Hakkımızda bilgisi güncellendi",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">Yükleniyor...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hakkımızda</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hakkımızda bilgisini buraya yazın..."
            rows={10}
          />
          <Button onClick={saveAbout} className="w-full">
            Güncelle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
