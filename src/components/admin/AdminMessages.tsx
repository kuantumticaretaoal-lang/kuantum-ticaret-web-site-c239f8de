import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const AdminMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [reply, setReply] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel("admin-messages-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, () => {
        loadMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMessages = async () => {
    const { data, error } = await (supabase as any)
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } else {
      setMessages(data || []);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen yanıt yazın",
      });
      return;
    }

    // Send notification to user if they have user_id
    if (selectedMessage.user_id) {
      const { error: notifError } = await (supabase as any)
        .from("notifications")
        .insert({
          user_id: selectedMessage.user_id,
          message: `İletişim mesajınıza yanıt: ${reply}`,
        });

      if (notifError) {
        console.error("Error sending notification:", notifError);
      }
    }

    toast({
      title: "Başarılı",
      description: "Yanıt kullanıcıya bildirim olarak gönderildi",
    });
    
    setSelectedMessage(null);
    setReply("");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>İletişim Mesajları ({messages.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz mesaj yok</p>
          ) : (
            messages.map((message) => (
              <Card key={message.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{message.name}</p>
                      <p className="text-sm text-muted-foreground">{message.email}</p>
                      {message.phone && (
                        <p className="text-sm text-muted-foreground">{message.phone}</p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(message.created_at).toLocaleDateString("tr-TR")}{" "}
                      {new Date(message.created_at).toLocaleTimeString("tr-TR")}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Mesaj:</p>
                    <p>{message.message}</p>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedMessage(message);
                      setReply("");
                    }}
                  >
                    Yanıtla
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mesajı Yanıtla</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Gönderen:</p>
                <p className="font-medium">{selectedMessage.name} ({selectedMessage.email})</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Mesaj:</p>
                <p className="font-medium">{selectedMessage.message}</p>
              </div>
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Yanıtınızı yazın"
                rows={4}
              />
              <Button onClick={sendReply} className="w-full">
                Bildirim Olarak Gönder
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};