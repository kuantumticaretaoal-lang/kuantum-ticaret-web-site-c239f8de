import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkMainAdmin();
    loadUsers();

    const channel = supabase
      .channel("users-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    } else {
      setUsers(data || []);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kullanıcılar</CardTitle>
      </CardHeader>
      <CardContent>
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
                  <TableCell>{isMainAdmin ? (user.phone || "-") : "Bu bilgileri görme yetkiniz yok!"}</TableCell>
                  <TableCell>{isMainAdmin ? (user.province || "-") : "Bu bilgileri görme yetkiniz yok!"}</TableCell>
                  <TableCell>{isMainAdmin ? (user.district || "-") : "Bu bilgileri görme yetkiniz yok!"}</TableCell>
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
