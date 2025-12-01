import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Download } from "lucide-react";
import { exportToExcel, formatDateForExport } from "@/lib/excel-export";

export const AdminSentNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("sent-notifications-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch profiles separately for each notification
      const notificationsWithProfiles = await Promise.all(
        data.map(async (notif) => {
          if (!notif.user_id) return { ...notif, profiles: { first_name: "Tüm", last_name: "Kullanıcılar" } };
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", notif.user_id)
            .maybeSingle();
          
          return { ...notif, profiles: profile || { first_name: "Bilinmeyen", last_name: "Kullanıcı" } };
        })
      );
      
      setNotifications(notificationsWithProfiles);
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Bildirim silinemedi",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Bildirim silindi",
      });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const exportNotifications = () => {
    const exportData = notifications.map(notif => ({
      "Alıcı": notif.profiles ? `${notif.profiles.first_name} ${notif.profiles.last_name}` : "Kullanıcı",
      "Mesaj": notif.message,
      "Gönderilme Tarihi": formatDateForExport(notif.created_at),
      "Okundu mu?": notif.read ? "Evet" : "Hayır",
    }));
    exportToExcel(exportData, 'gonderilmis-bildirimler', 'Bildirimler');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Gönderilmiş Bildirimler</span>
          <Button onClick={exportNotifications} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel İndir
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Henüz bildirim gönderilmedi</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alıcı</TableHead>
                <TableHead>Mesaj</TableHead>
                <TableHead>Tarih & Saat</TableHead>
                <TableHead>İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((notif) => (
                <TableRow key={notif.id}>
                  <TableCell>
                    {notif.profiles
                      ? `${notif.profiles.first_name} ${notif.profiles.last_name}`
                      : "Kullanıcı"}
                  </TableCell>
                  <TableCell className="max-w-md truncate">{notif.message}</TableCell>
                  <TableCell>{formatDate(notif.created_at)}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Bildirimi sil</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bu bildirimi silmek istediğinizden emin misiniz?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteNotification(notif.id)}>
                            Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
