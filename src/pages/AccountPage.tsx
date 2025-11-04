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

const AccountPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");

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
      setProfile(data);
    }

    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await (supabase as any)
      .from("profiles")
      .update(profile)
      .eq("id", session.user.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Profil güncellenemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Profiliniz güncellendi",
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
