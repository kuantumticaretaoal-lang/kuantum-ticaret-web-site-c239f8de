import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const AdminManagers = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*, profiles!user_roles_user_id_fkey(first_name, last_name, email)")
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading admins:", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yöneticiler yüklenemedi: " + error.message,
      });
      return;
    }

    console.log("Loaded admins:", data);
    if (data) setAdmins(data);
  };

  const addAdmin = async () => {
    if (!newAdminEmail) return;

    // Find user by email in profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", newAdminEmail.toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kullanıcı bulunamadı: " + (profileError?.message || "Email eşleşmedi"),
      });
      return;
    }

    // Check if already admin
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", profile.id)
      .eq("role", "admin")
      .maybeSingle();

    if (existingRole) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bu kullanıcı zaten yönetici",
      });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.id, role: "admin" });

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Admin eklenemedi: " + error.message,
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Yönetici eklendi",
      });
      setNewAdminEmail("");
      loadAdmins();
    }
  };

  const removeAdmin = async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yönetici kaldırılamadı: " + error.message,
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Yönetici yetkisi kaldırıldı",
      });
      loadAdmins();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yöneticiler</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6">
          <div>
            <Label>Yeni Yönetici Ekle</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="Email adresi"
              />
              <Button onClick={addAdmin}>Ekle</Button>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  {admin.profiles?.first_name} {admin.profiles?.last_name}
                </TableCell>
                <TableCell>{admin.profiles?.email}</TableCell>
                <TableCell>
                  {!admin.is_main_admin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeAdmin(admin.user_id)}
                    >
                      Yetkiyi Kaldır
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
