import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatPhoneNumber, formatProvince, formatDistrict } from "@/lib/formatters";
import { logger } from "@/lib/logger";
import { exportToExcel, formatDateForExport } from "@/lib/excel-export";
import { Download } from "lucide-react";

export const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [lastRegistration, setLastRegistration] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkMainAdmin();
    loadUsers();

    const profilesChannel = supabase
      .channel("users-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadUsers();
      })
      .subscribe();

    const rolesChannel = supabase
      .channel("user-roles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => {
        loadUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, []);

  const checkMainAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from("user_roles")
      .select("is_main_admin")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsMainAdmin(data?.is_main_admin === true);
  };

  const loadUsers = async () => {
    try {
      // Tüm profilleri çek - EN YENİ KAYITLAR EN ÜSTTE
      const { data: allProfiles, error: profileError } = await (supabase as any)
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }); // EN YENİ KAYITLAR EN ÜSTTE
      
      if (profileError) {
        logger.error("Kullanıcılar yüklenemedi", profileError);
        setUsers([]);
        setTotalUsers(0);
        setLastRegistration(null);
        return;
      }
      
      console.log("📊 Toplam profil sayısı:", allProfiles?.length || 0);
      
      // Admin ve yöneticileri filtrele
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      if (rolesError) {
        logger.error("Admin rolleri yüklenemedi", rolesError);
      }
      
      console.log("👑 Admin sayısı:", adminRoles?.length || 0);
      console.log("👑 Admin ID'leri:", adminRoles?.map(r => r.user_id));
      
      const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);
      const allUsers = allProfiles || [];
      const regularUsers = allUsers.filter(u => !adminIds.has(u.id));
      
      console.log("👥 Normal kullanıcı sayısı:", regularUsers.length);
      console.log("👥 Normal kullanıcılar:", regularUsers.map(u => ({ email: u.email, id: u.id })));
      
      setUsers(allUsers);
      setTotalUsers(regularUsers.length);
      
      // En son kayıt olan normal kullanıcı
      if (regularUsers.length > 0) {
        const sortedRegularUsers = [...regularUsers].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLastRegistration(sortedRegularUsers[0].created_at);
      } else {
        setLastRegistration(null);
      }
    } catch (error) {
      logger.error("Kullanıcı yükleme hatası", error);
      setUsers([]);
      setTotalUsers(0);
      setLastRegistration(null);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Başarılı",
        description: "Kullanıcı silindi",
      });
      loadUsers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kullanıcı silinemedi",
      });
    }
  };

  const exportUsers = () => {
    const exportData = users.map(user => ({
      "Ad": user.first_name,
      "Soyad": user.last_name,
      "E-posta": user.email,
      "Telefon": user.phone,
      "İl": user.province,
      "İlçe": user.district,
      "Adres": user.address,
      "Kayıt Tarihi": formatDateForExport(user.created_at),
    }));
    exportToExcel(exportData, 'kullanici-listesi', 'Kullanıcılar');
    toast({
      title: "Başarılı",
      description: "Kullanıcı listesi Excel olarak indirildi",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Kullanıcılar</span>
          <Button onClick={exportUsers} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel İndir
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-sm text-muted-foreground">Toplam Kullanıcı Sayısı</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-lg font-semibold">
                {lastRegistration 
                  ? new Date(lastRegistration).toLocaleString("tr-TR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Henüz kayıt yok"}
              </div>
              <p className="text-sm text-muted-foreground">Son Kayıt Tarihi</p>
            </CardContent>
          </Card>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Ad</TableHead>
              <TableHead>Soyad</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>İl</TableHead>
              <TableHead>İlçe</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Henüz kayıtlı kullanıcı yok
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{isMainAdmin ? (user.first_name || "-") : "Bu bilgileri görme yetkiniz yok!"}</TableCell>
                  <TableCell>{isMainAdmin ? (user.last_name || "-") : "Bu bilgileri görme yetkiniz yok!"}</TableCell>
                  <TableCell>{isMainAdmin ? (user.email || "-") : "Bu bilgileri görme yetkiniz yok!"}</TableCell>
                  <TableCell>{isMainAdmin ? (user.phone ? formatPhoneNumber(user.phone) : "-") : "Bu bilgileri görme yetkiniz yok!"}</TableCell>
                  <TableCell>{isMainAdmin ? (user.province ? formatProvince(user.province) : "-") : "Bu bilgileri görme yetkiniz yok!"}</TableCell>
                  <TableCell>{isMainAdmin ? (user.district ? formatDistrict(user.district) : "-") : "Bu bilgileri görme yetkiniz yok!"}</TableCell>
                  <TableCell>
                    {isMainAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">Sil</Button>
                        </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bu işlem geri alınamaz. Kullanıcı kalıcı olarak silinecektir.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteUser(user.id)}>
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
