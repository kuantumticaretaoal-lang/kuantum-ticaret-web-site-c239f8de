import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { logger } from "@/lib/logger";

export const AdminManagers = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    // Get all admin roles first with custom_role
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("id, user_id, role, is_main_admin, created_at, custom_role")
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    if (rolesError) {
      logger.error("Admin rolleri yüklenemedi", rolesError);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Yönetici rolleri yüklenemedi: " + rolesError.message,
      });
      return;
    }

    if (!adminRoles || adminRoles.length === 0) {
      setAdmins([]);
      return;
    }

    // Get profile data for each admin
    const userIds = adminRoles.map(role => role.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);

    if (profilesError) {
      logger.error("Profiller yüklenemedi", profilesError);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Profiller yüklenemedi: " + profilesError.message,
      });
      return;
    }

    // Combine the data
    const adminsWithProfiles = adminRoles.map(role => ({
      ...role,
      profiles: profiles?.find(p => p.id === role.user_id) || null
    }));

    setAdmins(adminsWithProfiles);
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

  const updateRole = async (userId: string) => {
    if (!newRole.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen rol bilgisi girin",
      });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .update({ custom_role: newRole.trim() })
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Rol güncellenemedi: " + error.message,
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Rol güncellendi",
      });
      setEditingRole(null);
      setNewRole("");
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
              <TableHead>Rol</TableHead>
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
                  {editingRole === admin.user_id ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        placeholder="Rol"
                        className="w-32"
                      />
                      <Button size="sm" onClick={() => updateRole(admin.user_id)}>
                        Kaydet
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingRole(null);
                        setNewRole("");
                      }}>
                        İptal
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm">{admin.custom_role || "-"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {!admin.is_main_admin && editingRole !== admin.user_id && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingRole(admin.user_id);
                          setNewRole(admin.custom_role || "");
                        }}
                      >
                        Rolü Düzenle
                      </Button>
                    )}
                    {!admin.is_main_admin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Yetkiyi Kaldır
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Yönetici yetkisini kaldırmak istediğinizden emin misiniz?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bu işlem geri alınamaz.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hayır</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeAdmin(admin.user_id)}>
                              Evet
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
