import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { logger } from "@/lib/logger";

const TAB_PERMISSION_OPTIONS = [
  { key: "orders", label: "Siparişler" },
  { key: "order-stats", label: "Sipariş İstatistikleri" },
  { key: "users", label: "Kullanıcılar" },
  { key: "user-stats", label: "Kullanıcı İstatistikleri" },
  { key: "products", label: "Ürünler" },
  { key: "categories", label: "Kategoriler" },
  { key: "questions", label: "Sorular" },
  { key: "contact", label: "İletişim" },
  { key: "social", label: "Sosyal Medya" },
  { key: "sponsors", label: "Sponsorlar" },
  { key: "analytics", label: "Ziyaretçiler" },
  { key: "finances", label: "Gelir-Gider" },
  { key: "messages", label: "Mesajlar" },
  { key: "notifications", label: "Bildirimler" },
  { key: "coupons", label: "Kuponlar" },
  { key: "about", label: "Hakkımızda" },
  { key: "banners", label: "Kampanya Bannerları" },
  { key: "premium", label: "Premium" },
  { key: "policies", label: "Politikalar" },
  { key: "languages", label: "Diller" },
  { key: "translations", label: "Çeviriler" },
  { key: "urgency", label: "Aciliyet Ayarları" },
  { key: "shipping", label: "Kargo Ayarları" },
  { key: "shipping-companies", label: "Kargo Şirketleri" },
  { key: "product-translations", label: "Ürün Çevirileri" },
  { key: "live-support", label: "Canlı Destek" },
  { key: "admin-favorites", label: "Favoriler" },
  { key: "admin-cart", label: "Sepet Takibi" },
] as const;

interface ManagerPermissions {
  tabs: Record<string, boolean>;
  usersSensitiveData: boolean;
}

export const AdminManagers = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<any>(null);
  const [permissions, setPermissions] = useState<ManagerPermissions>({ tabs: {}, usersSensitiveData: false });
  const [savingPermissions, setSavingPermissions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkMainAdmin();
    loadAdmins();
  }, []);

  const checkMainAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("is_main_admin")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsMainAdmin(data?.is_main_admin === true);
  };

  const loadAdmins = async () => {
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("id, user_id, role, is_main_admin, created_at, custom_role")
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    if (rolesError) {
      logger.error("Admin rolleri yüklenemedi", rolesError);
      toast({ variant: "destructive", title: "Hata", description: "Yönetici rolleri yüklenemedi" });
      return;
    }

    if (!adminRoles || adminRoles.length === 0) {
      setAdmins([]);
      return;
    }

    const userIds = adminRoles.map((role) => role.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", userIds);

    if (profilesError) {
      logger.error("Profiller yüklenemedi", profilesError);
      toast({ variant: "destructive", title: "Hata", description: "Profiller yüklenemedi" });
      return;
    }

    const adminsWithProfiles = adminRoles.map((role) => ({
      ...role,
      profiles: profiles?.find((p) => p.id === role.user_id) || null,
    }));

    setAdmins(adminsWithProfiles);
  };

  const addAdmin = async () => {
    if (!newAdminEmail || !isMainAdmin) return;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", newAdminEmail.toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      toast({ variant: "destructive", title: "Hata", description: "Kullanıcı bulunamadı" });
      return;
    }

    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", profile.id)
      .eq("role", "admin")
      .maybeSingle();

    if (existingRole) {
      toast({ variant: "destructive", title: "Hata", description: "Bu kullanıcı zaten yönetici" });
      return;
    }

    const { error } = await supabase.from("user_roles").insert({ user_id: profile.id, role: "admin" });

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Yönetici eklenemedi" });
      return;
    }

    toast({ title: "Başarılı", description: "Yönetici eklendi" });
    setNewAdminEmail("");
    loadAdmins();
  };

  const removeAdmin = async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Yönetici kaldırılamadı" });
      return;
    }

    toast({ title: "Başarılı", description: "Yönetici yetkisi kaldırıldı" });
    loadAdmins();
  };

  const updateRole = async (userId: string) => {
    if (!newRole.trim()) {
      toast({ variant: "destructive", title: "Hata", description: "Lütfen rol bilgisi girin" });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .update({ custom_role: newRole.trim() })
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) {
      toast({ variant: "destructive", title: "Hata", description: "Rol güncellenemedi" });
      return;
    }

    toast({ title: "Başarılı", description: "Rol güncellendi" });
    setEditingRole(null);
    setNewRole("");
    loadAdmins();
  };

  const buildDefaultPermissions = (): ManagerPermissions => ({
    tabs: Object.fromEntries(TAB_PERMISSION_OPTIONS.map((tab) => [tab.key, true])),
    usersSensitiveData: false,
  });

  const openPermissionsDialog = async (manager: any) => {
    const defaults = buildDefaultPermissions();
    setSelectedManager(manager);
    setPermissions(defaults);
    setPermissionDialogOpen(true);

    const { data: rows, error } = await (supabase as any)
      .from("admin_visibility_settings")
      .select("setting_key, visible")
      .like("setting_key", `manager:${manager.user_id}:%`);

    if (error) {
      logger.error("Manager yetkileri yüklenemedi", error);
      return;
    }

    const nextPermissions = { ...defaults, tabs: { ...defaults.tabs } };

    (rows || []).forEach((row: any) => {
      const settingKey = String(row.setting_key);
      const visible = row.visible !== false;

      if (settingKey.includes(":tab:")) {
        const tabKey = settingKey.split(":tab:")[1];
        if (tabKey) nextPermissions.tabs[tabKey] = visible;
      } else if (settingKey.endsWith(":users_sensitive_data")) {
        nextPermissions.usersSensitiveData = visible;
      }
    });

    setPermissions(nextPermissions);
  };

  const upsertVisibilitySetting = async (settingKey: string, visible: boolean) => {
    const { data: existing } = await (supabase as any)
      .from("admin_visibility_settings")
      .select("id")
      .eq("setting_key", settingKey)
      .maybeSingle();

    if (existing?.id) {
      return (supabase as any)
        .from("admin_visibility_settings")
        .update({ visible, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }

    return (supabase as any).from("admin_visibility_settings").insert({
      setting_key: settingKey,
      visible,
      updated_at: new Date().toISOString(),
    });
  };

  const savePermissions = async () => {
    if (!selectedManager) return;

    setSavingPermissions(true);

    try {
      await Promise.all([
        ...TAB_PERMISSION_OPTIONS.map((tab) =>
          upsertVisibilitySetting(
            `manager:${selectedManager.user_id}:tab:${tab.key}`,
            permissions.tabs[tab.key] !== false
          )
        ),
        upsertVisibilitySetting(
          `manager:${selectedManager.user_id}:users_sensitive_data`,
          permissions.usersSensitiveData
        ),
      ]);

      toast({ title: "Başarılı", description: "Yönetici yetkileri güncellendi" });
      setPermissionDialogOpen(false);
    } catch (error) {
      logger.error("Yönetici yetkileri kaydedilemedi", error);
      toast({ variant: "destructive", title: "Hata", description: "Yetkiler kaydedilemedi" });
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yöneticiler</CardTitle>
      </CardHeader>
      <CardContent>
        {isMainAdmin && (
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
        )}

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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRole(null);
                          setNewRole("");
                        }}
                      >
                        İptal
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm">{admin.custom_role || "-"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    {isMainAdmin && !admin.is_main_admin && editingRole !== admin.user_id && (
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

                    {isMainAdmin && !admin.is_main_admin && (
                      <Button size="sm" variant="outline" onClick={() => openPermissionsDialog(admin)}>
                        Yetkileri Yönet
                      </Button>
                    )}

                    {isMainAdmin && !admin.is_main_admin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            Yetkiyi Kaldır
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Yönetici yetkisini kaldırmak istediğinizden emin misiniz?</AlertDialogTitle>
                            <AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hayır</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeAdmin(admin.user_id)}>Evet</AlertDialogAction>
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

        <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yönetici Yetkileri</DialogTitle>
              <DialogDescription>
                {selectedManager?.profiles?.email} için sekme ve veri görünürlüğünü ayarlayın.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="users-sensitive-data">Kullanıcı hassas verilerini görsün</Label>
                  <Switch
                    id="users-sensitive-data"
                    checked={permissions.usersSensitiveData}
                    onCheckedChange={(checked) =>
                      setPermissions((prev) => ({ ...prev, usersSensitiveData: checked }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Sekme Yetkileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TAB_PERMISSION_OPTIONS.map((tab) => (
                    <div key={tab.key} className="rounded-lg border border-border p-3 flex items-center justify-between">
                      <Label htmlFor={`perm-${tab.key}`}>{tab.label}</Label>
                      <Switch
                        id={`perm-${tab.key}`}
                        checked={permissions.tabs[tab.key] !== false}
                        onCheckedChange={(checked) =>
                          setPermissions((prev) => ({
                            ...prev,
                            tabs: {
                              ...prev.tabs,
                              [tab.key]: checked,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={savePermissions} className="w-full" disabled={savingPermissions}>
                {savingPermissions ? "Kaydediliyor..." : "Yetkileri Kaydet"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
