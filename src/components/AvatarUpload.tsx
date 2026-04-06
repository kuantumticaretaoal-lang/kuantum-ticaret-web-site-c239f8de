import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  userId: string;
  currentUrl?: string | null;
  firstName?: string;
  onUploaded: (url: string) => void;
}

export const AvatarUpload = ({ userId, currentUrl, firstName, onUploaded }: AvatarUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Hata", description: "Sadece resim dosyaları yüklenebilir" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Hata", description: "Dosya 2MB'dan küçük olmalı" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      await (supabase as any).from("profiles").update({ avatar_url: urlWithCacheBust }).eq("id", userId);

      onUploaded(urlWithCacheBust);
      toast({ title: "Başarılı", description: "Profil fotoğrafı güncellendi" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Hata", description: err.message || "Yükleme başarısız" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
        <Avatar className="h-24 w-24 border-2 border-primary/20">
          <AvatarImage src={currentUrl || undefined} />
          <AvatarFallback className="text-2xl bg-primary/10">{firstName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? "Yükleniyor..." : "Fotoğraf Değiştir"}
      </Button>
    </div>
  );
};
