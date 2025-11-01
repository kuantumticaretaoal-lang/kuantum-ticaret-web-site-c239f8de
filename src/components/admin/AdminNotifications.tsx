import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export const AdminNotifications = () => {
  const [message, setMessage] = useState("");
  const [targetUser, setTargetUser] = useState("all");
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await (supabase as any).from("profiles").select("id, first_name, last_name");
    if (data) setUsers(data);
  };

  const sendNotification = async () => {
    if (!message) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Mesaj boş olamaz",
      });
      return;
    }

    if (targetUser === "all") {
      const notifications = users.map((user) => ({
        user_id: user.id,
        message,
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
        message,
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
            />
          </div>

          <Button onClick={sendNotification} className="w-full">
            Gönder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
