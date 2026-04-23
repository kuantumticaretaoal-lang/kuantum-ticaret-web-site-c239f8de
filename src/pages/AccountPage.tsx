import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { formatLocationData } from "@/lib/formatters";
import { createBackupCode } from "@/lib/backup-codes";
import { Copy, RefreshCw, Moon, Sun, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderTracking from "@/components/OrderTracking";
import { useTheme } from "next-themes";
import { AvatarUpload } from "@/components/AvatarUpload";
import { LoyaltyCard } from "@/components/LoyaltyCard";

const AccountPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [backupCode, setBackupCode] = useState<string | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    setEmail(session.user.email || "");
    setUserId(session.user.id);

    const [{ data: profileData, error: profileError }, { data: codeData }, { data: twoFAData }] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle(),
      supabase
        .from("backup_codes")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("used", false)
        .maybeSingle(),
      (supabase as any)
        .from("two_factor_settings")
        .select("is_enabled")
        .eq("user_id", session.user.id)
        .maybeSingle(),
    ]);

    if (profileError) {
      toast({ variant: "destructive", title: "Hata", description: "Profil yüklenemedi" });
    } else if (profileData) {
      setProfile(formatLocationData(profileData));
    }

    if (!codeData) {
      const { code: newCode, error } = await createBackupCode(session.user.id);
      if (!error && newCode) {
        setBackupCode(newCode);
        toast({
          title: "Yedek kod oluşturuldu",
          description: "Lütfen bu kodu güvenli bir yerde saklayın; yalnızca şimdi görüntülenebilir.",
          duration: 10000,
        });
      } else {
        setBackupCode(null);
      }
    } else {
      setBackupCode("********-***-***");
    }

    setTwoFAEnabled(twoFAData?.is_enabled === true);
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const formatted = formatLocationData(profile);
    const { error } = await supabase.from("profiles").update(formatted).eq("id", session.user.id);

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Profil güncellenemedi" });
      return;
    }

    setProfile(formatted);
    toast({ title: "Başarılı", description: "Profiliniz güncellendi" });
  };

  const handleRegenerateCode = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setRegeneratingCode(true);
    const { code, error } = await createBackupCode(session.user.id);
    setRegeneratingCode(false);

    if (error || !code) {
      toast({ variant: "destructive", title: "Hata", description: "Kod oluşturulamadı" });
      return;
    }

    setBackupCode(code);
    toast({
      title: "Yeni yedek kod oluşturuldu",
      description: "UYARI: Bu kod sadece şimdi görüntülenebilir!",
      duration: 10000,
    });
  };

  const toggle2FA = async (enabled: boolean) => {
    if (!userId) return;

    setTwoFALoading(true);
    try {
      const { error } = await (supabase as any)
        .from("two_factor_settings")
        .upsert({ user_id: userId, is_enabled: enabled }, { onConflict: "user_id" });

      if (error) {
        throw error;
      }

      setTwoFAEnabled(enabled);
      toast({
        title: enabled ? "2 adımlı doğrulama aktif" : "2 adımlı doğrulama kapatıldı",
        description: enabled
          ? "Giriş yaparken e-posta ile kod doğrulaması istenecektir."
          : "Artık doğrudan giriş yapabilirsiniz.",
      });
    } catch {
      toast({ variant: "destructive", title: "Hata", description: "Ayar güncellenemedi" });
    } finally {
      setTwoFALoading(false);
    }
  };

  const copyToClipboard = () => {
    if (backupCode && !backupCode.includes("*")) {
      navigator.clipboard.writeText(backupCode);
      toast({ title: "Kopyalandı", description: "Yedek kod panoya kopyalandı" });
      return;
    }

    toast({
      variant: "destructive",
      title: "Kopyalanamıyor",
      description: "Yeni kod oluşturmak için yenile butonuna tıklayın.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center"><p>Yükleniyor...</p></div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <Tabs defaultValue="settings" className="max-w-2xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Hesap Ayarları</TabsTrigger>
            <TabsTrigger value="tracking">Sipariş Takibi</TabsTrigger>
            <TabsTrigger value="loyalty">Puanlar & Davet</TabsTrigger>
          </TabsList>

          <TabsContent value="tracking">
            <OrderTracking />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Hesap Ayarları</CardTitle>
              </CardHeader>
              <CardContent>
                {userId && (
                  <div className="mb-6 flex justify-center">
                    <AvatarUpload
                      userId={userId}
                      currentUrl={profile?.avatar_url}
                      firstName={profile?.first_name}
                      onUploaded={(url) => setProfile({ ...profile, avatar_url: url })}
                    />
                  </div>
                )}

                <div className="mb-6 flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    <div>
                      <p className="text-sm font-medium">Koyu Mod</p>
                      <p className="text-xs text-muted-foreground">Arayüzü koyu tema ile kullanın</p>
                    </div>
                  </div>
                  <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
                </div>

                <div className="mb-6 flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">2 Adımlı Doğrulama</p>
                      <p className="text-xs text-muted-foreground">Giriş yaparken e-posta ile kod doğrulaması</p>
                    </div>
                  </div>
                  <Switch checked={twoFAEnabled} onCheckedChange={toggle2FA} disabled={twoFALoading} />
                </div>

                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input value={email} disabled />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ad</Label>
                      <Input value={profile?.first_name || ""} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Soyad</Label>
                      <Input value={profile?.last_name || ""} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <Label>Telefon</Label>
                    <Input value={profile?.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>İl</Label>
                      <Input value={profile?.province || ""} onChange={(e) => setProfile({ ...profile, province: e.target.value })} />
                    </div>
                    <div>
                      <Label>İlçe</Label>
                      <Input value={profile?.district || ""} onChange={(e) => setProfile({ ...profile, district: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <Label>Adres</Label>
                    <Input value={profile?.address || ""} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
                  </div>

                  <Button type="submit" className="w-full">Güncelle</Button>
                </form>

                <div className="mt-8 border-t pt-8">
                  <h3 className="mb-2 text-lg font-semibold">Hesap Kurtarma Kodu</h3>
                  <p className="mb-4 text-sm text-muted-foreground">Bu kodu güvenli bir yerde saklayın.</p>
                  <div className="flex items-center gap-2">
                    <Input value={regeneratingCode ? "Oluşturuluyor..." : (backupCode || "Yükleniyor...")} disabled className="font-mono text-lg tracking-wider" />
                    <Button type="button" size="icon" variant="outline" onClick={copyToClipboard} disabled={!backupCode || backupCode.includes("*") || regeneratingCode} title="Kodu Kopyala">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={handleRegenerateCode} disabled={regeneratingCode} title="Yeni Kod Oluştur">
                      <RefreshCw className={`h-4 w-4 ${regeneratingCode ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  {backupCode && !backupCode.includes("*") && (
                    <p className="mt-2 text-xs font-medium text-primary">✓ Bu kod sadece şimdi görüntülenebilir!</p>
                  )}
                  {backupCode && backupCode.includes("*") && (
                    <p className="mt-2 text-xs text-muted-foreground">Mevcut kodunuz güvenli biçimde saklanıyor. Yeni kod için yenile butonunu kullanın.</p>
                  )}
                  <p className="mt-2 text-xs text-destructive">⚠️ Yedek kod kullanıldıktan sonra hesabınıza giriş yaptıktan sonra yeni bir kod üretin.</p>
                </div>

                <div className="mt-8 border-t pt-8">
                  <h3 className="mb-4 text-lg font-semibold">Şifre Değiştir</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newPassword = formData.get("newPassword") as string;
                    const confirmPassword = formData.get("confirmPassword") as string;

                    if (!newPassword || newPassword.length < 6) {
                      toast({ variant: "destructive", title: "Hata", description: "Şifre en az 6 karakter olmalıdır" });
                      return;
                    }

                    if (newPassword !== confirmPassword) {
                      toast({ variant: "destructive", title: "Hata", description: "Şifreler eşleşmiyor" });
                      return;
                    }

                    const { error } = await supabase.auth.updateUser({ password: newPassword });

                    if (error) {
                      toast({ variant: "destructive", title: "Hata", description: "Şifre değiştirilemedi" });
                    } else {
                      toast({ title: "Başarılı", description: "Şifreniz değiştirildi" });
                      (e.target as HTMLFormElement).reset();
                    }
                  }} className="space-y-4">
                    <div>
                      <Label>Yeni Şifre</Label>
                      <Input type="password" name="newPassword" placeholder="En az 6 karakter" required />
                    </div>
                    <div>
                      <Label>Yeni Şifre (Tekrar)</Label>
                      <Input type="password" name="confirmPassword" placeholder="Şifreyi tekrar girin" required />
                    </div>
                    <Button type="submit" className="w-full">Şifreyi Değiştir</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="loyalty">
            {userId && <LoyaltyCard userId={userId} />}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AccountPage;
