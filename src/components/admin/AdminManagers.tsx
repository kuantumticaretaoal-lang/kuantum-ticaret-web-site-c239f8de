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
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("*, profiles(first_name, last_name, email)")
      .eq("role", "admin");

    if (data) setAdmins(data);
  };

  const addAdmin = async () => {
    if (!newAdminEmail) return;

    // Find user by email in profiles table
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("email", newAdminEmail)
      .maybeSingle();

    if (!profile) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kullanıcı bulunamadı",
      });
      return;
    }

    const { error } = await (supabase as any)
      .from("user_roles")
      .insert({ user_id: profile.id, role: "admin" });

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Admin eklenemedi",
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
    const { error } = await (supabase as any)
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yönetici kaldırılamadı",
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
