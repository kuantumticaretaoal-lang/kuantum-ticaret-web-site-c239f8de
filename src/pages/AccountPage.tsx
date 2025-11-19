import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatLocationData } from "@/lib/formatters";
import { createBackupCode, getActiveBackupCode } from "@/lib/backup-codes";
import { Copy, RefreshCw } from "lucide-react";

const AccountPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [backupCode, setBackupCode] = useState<string | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setEmail(session.user.email || "");

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Profil yüklenemedi",
      });
    } else if (data) {
      const formatted = formatLocationData(data);
      setProfile(formatted);
    }

    // Load backup code
    const code = await getActiveBackupCode(session.user.id);
    if (!code) {
      // Generate first code if doesn't exist
      const { code: newCode } = await createBackupCode(session.user.id);
      setBackupCode(newCode);
    } else {
      setBackupCode(code);
    }

    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const formatted = formatLocationData(profile);

    const { error } = await supabase
      .from("profiles")
      .update(formatted)
      .eq("id", session.user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Profil güncellenemedi",
      });
    } else {
      setProfile(formatted);
      toast({
        title: "Başarılı",
        description: "Profiliniz güncellendi",
      });
    }
  };

  const handleRegenerateCode = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setRegeneratingCode(true);
    const { code, error } = await createBackupCode(session.user.id);
    setRegeneratingCode(false);

    if (error || !code) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kod oluşturulamadı",
      });
    } else {
      setBackupCode(code);
      toast({
        title: "Başarılı",
        description: "Yeni yedek kod oluşturuldu",
      });
    }
  };

  const copyToClipboard = () => {
    if (backupCode) {
      navigator.clipboard.writeText(backupCode);
      toast({
        title: "Kopyalandı",
        description: "Yedek kod panoya kopyalandı",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p>Yükleniyor...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Hesap Ayarları</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={email} disabled />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ad</Label>
                  <Input
                    value={profile?.first_name || ""}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Soyad</Label>
                  <Input
                    value={profile?.last_name || ""}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Telefon</Label>
                <Input
                  value={profile?.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>İl</Label>
                  <Input
                    value={profile?.province || ""}
                    onChange={(e) => setProfile({ ...profile, province: e.target.value })}
                  />
                </div>
                <div>
                  <Label>İlçe</Label>
                  <Input
                    value={profile?.district || ""}
                    onChange={(e) => setProfile({ ...profile, district: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Adres</Label>
                <Input
                  value={profile?.address || ""}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full">
                Güncelle
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t">
              <h3 className="text-lg font-semibold mb-2">Hesap Kurtarma Kodu</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Bu kodu güvenli bir yerde saklayın. Şifrenizi unutursanız bu kod ile hesabınıza giriş yapabilirsiniz.
              </p>
              <div className="flex gap-2 items-center">
                <Input
                  value={backupCode || "Yükleniyor..."}
                  disabled
                  className="font-mono text-lg"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={copyToClipboard}
                  disabled={!backupCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={handleRegenerateCode}
                  disabled={regeneratingCode || !backupCode}
                >
                  <RefreshCw className={`h-4 w-4 ${regeneratingCode ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <p className="text-xs text-destructive mt-2">
                ⚠️ Eski kod kullanıldıktan sonra otomatik olarak yeni kod oluşturulur
              </p>
            </div>

            <div className="mt-8 pt-8 border-t">
              <h3 className="text-lg font-semibold mb-4">Şifre Değiştir</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newPassword = formData.get("newPassword") as string;
                const confirmPassword = formData.get("confirmPassword") as string;

                if (!newPassword || newPassword.length < 6) {
                  toast({
                    variant: "destructive",
                    title: "Hata",
                    description: "Şifre en az 6 karakter olmalıdır",
                  });
                  return;
                }

                if (newPassword !== confirmPassword) {
                  toast({
                    variant: "destructive",
                    title: "Hata",
                    description: "Şifreler eşleşmiyor",
                  });
                  return;
                }

                const { error } = await supabase.auth.updateUser({
                  password: newPassword
                });

                if (error) {
                  toast({
                    variant: "destructive",
                    title: "Hata",
                    description: "Şifre değiştirilemedi",
                  });
                } else {
                  toast({
                    title: "Başarılı",
                    description: "Şifreniz değiştirildi",
                  });
                  (e.target as HTMLFormElement).reset();
                }
              }} className="space-y-4">
                <div>
                  <Label>Yeni Şifre</Label>
                  <Input
                    type="password"
                    name="newPassword"
                    placeholder="En az 6 karakter"
                    required
                  />
                </div>
                <div>
                  <Label>Yeni Şifre (Tekrar)</Label>
                  <Input
                    type="password"
                    name="confirmPassword"
                    placeholder="Şifreyi tekrar girin"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Şifreyi Değiştir
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default AccountPage;
