import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatPhoneNumber, formatProvince, formatDistrict } from "@/lib/formatters";
import { logger } from "@/lib/logger";
import { exportToExcel, formatDateForExport } from "@/lib/excel-export";
import { Download, Crown, Bell, Sparkles } from "lucide-react";
import { UserFilters } from "./users/UserFilters";
import { useUserFilters } from "./users/useUserFilters";

export const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [premiumUsers, setPremiumUsers] = useState<Set<string>>(new Set());
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [canViewSensitiveData, setCanViewSensitiveData] = useState(false);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const {
    filters,
    sortBy,
    sortOrder,
    filteredUsers,
    handleFilterChange,
    handleSortChange,
    resetFilters,
  } = useUserFilters(users);

  // Get admin IDs for filtering stats
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());

  const regularUsersCount = useMemo(() => {
    return filteredUsers.filter(u => !adminIds.has(u.id)).length;
  }, [filteredUsers, adminIds]);

  const lastRegistration = useMemo(() => {
    const regularUsers = filteredUsers.filter(u => !adminIds.has(u.id));
    if (regularUsers.length === 0) return null;
    const sorted = [...regularUsers].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0]?.created_at;
  }, [filteredUsers, adminIds]);

  useEffect(() => {
    checkMainAdmin();
    loadUsers();
    loadPremiumUsers();

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

    const premiumChannel = supabase
      .channel("premium-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "premium_memberships" }, () => {
        loadPremiumUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
      supabase.removeChannel(premiumChannel);
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

    const mainAdmin = data?.is_main_admin === true;
    setIsMainAdmin(mainAdmin);

    if (mainAdmin) {
      setCanViewSensitiveData(true);
      return;
    }

    const { data: visibilitySetting } = await (supabase as any)
      .from("admin_visibility_settings")
      .select("visible")
      .eq("setting_key", `manager:${user.id}:users_sensitive_data`)
      .maybeSingle();

    setCanViewSensitiveData(visibilitySetting?.visible === true);
  };

  const loadPremiumUsers = async () => {
    const { data } = await (supabase as any)
      .from("premium_memberships")
      .select("user_id")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());

    if (data) {
      setPremiumUsers(new Set(data.map((m: any) => m.user_id)));
    }
  };

  const loadUsers = async () => {
    try {
      const { data: allProfiles, error: profileError } = await (supabase as any)
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (profileError) {
        logger.error("Kullanıcılar yüklenemedi", profileError);
        setUsers([]);
        return;
      }
      
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      if (rolesError) {
        logger.error("Admin rolleri yüklenemedi", rolesError);
      }
      
      setAdminIds(new Set(adminRoles?.map(r => r.user_id) || []));
      setUsers(allProfiles || []);
    } catch (error) {
      logger.error("Kullanıcı yükleme hatası", error);
      setUsers([]);
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

  const grantPremiumTrial = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId));
    
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await (supabase as any)
        .from("premium_memberships")
        .insert({
          user_id: userId,
          status: "active",
          is_trial: true,
          trial_days: 7,
          starts_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      await (supabase as any)
        .from("notifications")
        .insert({
          user_id: userId,
          message: "🎉 Tebrikler! 7 günlük ücretsiz Premium deneme süreniz başladı. Premium avantajlarının keyfini çıkarın!",
        });

      toast({
        title: "Başarılı",
        description: "7 günlük Premium deneme süresi verildi",
      });
      
      loadPremiumUsers();
    } catch (error) {
      logger.error("Premium deneme hatası", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Premium deneme verilemedi",
      });
    } finally {
      setProcessingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const sendPremiumReminder = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId));
    
    try {
      await (supabase as any)
        .from("notifications")
        .insert({
          user_id: userId,
          message: "👑 Premium'a geçin! Özel indirimler, ücretsiz kargo ve daha fazlası sizi bekliyor. Hemen Premium üye olun!",
        });

      toast({
        title: "Başarılı",
        description: "Premium hatırlatma bildirimi gönderildi",
      });
    } catch (error) {
      logger.error("Bildirim gönderme hatası", error);
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bildirim gönderilemedi",
      });
    } finally {
      setProcessingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const exportUsers = () => {
    const exportData = filteredUsers.map(user => ({
      "Ad": user.first_name,
      "Soyad": user.last_name,
      "E-posta": user.email,
      "Telefon": user.phone,
      "İl": user.province,
      "İlçe": user.district,
      "Adres": user.address,
      "Kayıt Tarihi": formatDateForExport(user.created_at),
      "Premium": premiumUsers.has(user.id) ? "Evet" : "Hayır",
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
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{regularUsersCount}</div>
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

        {/* Filters */}
        <UserFilters
          filters={filters}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          onReset={resetFilters}
        />

        {/* Results count */}
        <div className="text-sm text-muted-foreground mb-4">
          {filteredUsers.length} kullanıcı bulundu
          {filteredUsers.length !== users.length && ` (toplam ${users.length})`}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Soyad</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>İl/İlçe</TableHead>
                <TableHead>Kayıt</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Kullanıcı bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => {
                  const isPremium = premiumUsers.has(user.id);
                  const isProcessing = processingUsers.has(user.id);
                  const shouldMaskSensitive = !isMainAdmin && !canViewSensitiveData;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{shouldMaskSensitive ? "***" : (user.first_name || "-")}</TableCell>
                      <TableCell>{shouldMaskSensitive ? "***" : (user.last_name || "-")}</TableCell>
                      <TableCell>{shouldMaskSensitive ? "***" : (user.email || "-")}</TableCell>
                      <TableCell>{shouldMaskSensitive ? "***" : (user.phone ? formatPhoneNumber(user.phone) : "-")}</TableCell>
                      <TableCell>
                        {shouldMaskSensitive ? "***" : (
                          <span className="text-xs">
                            {formatProvince(user.province) || "-"}
                            {user.district && ` / ${formatDistrict(user.district)}`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(user.created_at).toLocaleDateString("tr-TR")}
                      </TableCell>
                      <TableCell>
                        {isPremium ? (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
                            <Crown className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Standart</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {!isPremium && isMainAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => grantPremiumTrial(user.id)}
                                disabled={isProcessing}
                                className="text-xs"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                {isProcessing ? "..." : "Denet"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendPremiumReminder(user.id)}
                                disabled={isProcessing}
                                className="text-xs"
                              >
                                <Bell className="h-3 w-3 mr-1" />
                                {isProcessing ? "..." : "Hatırlat"}
                              </Button>
                            </>
                          )}
                          {isMainAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="text-xs">Sil</Button>
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
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
