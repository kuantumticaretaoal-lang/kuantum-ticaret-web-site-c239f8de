import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AdminSentNotifications } from "./AdminSentNotifications";
import { z } from "zod";

const notificationSchema = z.object({
  message: z.string()
    .trim()
    .min(1, "Mesaj boş olamaz")
    .max(500, "Mesaj en fazla 500 karakter olabilir"),
  targetUser: z.string().min(1, "Kullanıcı seçmelisiniz")
});

export const AdminNotifications = () => {
  const [message, setMessage] = useState("");
  const [targetUser, setTargetUser] = useState("all");
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"send" | "sent">("send");
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await (supabase as any).from("profiles").select("id, first_name, last_name");
    if (data) setUsers(data);
  };

  const sendNotification = async () => {
    const validation = notificationSchema.safeParse({ message, targetUser });
    
    if (!validation.success) {
      toast({
        variant: "destructive",
        description: validation.error.errors[0].message,
      });
      return;
    }

    if (targetUser === "all") {
      const notifications = users.map((user) => ({
        user_id: user.id,
        message: message.trim(),
      }));

      const { error } = await (supabase as any).from("notifications").insert(notifications);

      if (error) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Bildirim gönderilemedi",
        });
      } else {
        toast({
          title: "Başarılı",
          description: "Tüm kullanıcılara bildirim gönderildi",
        });
        setMessage("");
      }
    } else {
      const { error } = await (supabase as any).from("notifications").insert({
        user_id: targetUser,
        message: message.trim(),
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Bildirim gönderilemedi",
        });
      } else {
        toast({
          title: "Başarılı",
          description: "Bildirim gönderildi",
        });
        setMessage("");
      }
    }
  };

  return (
    <Tabs defaultValue="send" value={activeTab} onValueChange={(v) => setActiveTab(v as "send" | "sent")}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="send">Bildirim Gönder</TabsTrigger>
        <TabsTrigger value="sent">Gönderilmiş Bildirimler</TabsTrigger>
      </TabsList>
      
      <TabsContent value="send">
        <Card>
          <CardHeader>
            <CardTitle>Bildirim Gönder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Alıcı</Label>
                <Select value={targetUser} onValueChange={setTargetUser}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kullanıcılar</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Mesaj</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Bildirim mesajınızı yazın..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {message.length}/500 karakter
                </p>
              </div>

              <Button onClick={sendNotification} className="w-full">
                Gönder
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sent">
        <AdminSentNotifications />
      </TabsContent>
    </Tabs>
  );
};
