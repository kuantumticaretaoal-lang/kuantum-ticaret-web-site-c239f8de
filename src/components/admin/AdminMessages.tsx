import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit, Download } from "lucide-react";
import { logger } from "@/lib/logger";
import { exportToExcel, formatDateForExport } from "@/lib/excel-export";

export const AdminMessages = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [isEditing, setIsEditing] = useState(false);
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
      logger.error("Mesajlar yüklenemedi", error);
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

    // Update message as replied
    const { error: updateError } = await supabase
      .from("contact_messages")
      .update({
        replied: true,
        reply_message: reply,
        replied_at: new Date().toISOString(),
      })
      .eq("id", selectedMessage.id);

    if (updateError) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Mesaj güncellenemedi",
      });
      return;
    }

    // Send notification to user if they have user_id
    if (selectedMessage.user_id) {
      await supabase
        .from("notifications")
        .insert({
          user_id: selectedMessage.user_id,
          message: `İletişim mesajınıza yanıt: ${reply}`,
        });
    }

    toast({
      title: "Başarılı",
      description: isEditing ? "Yanıt güncellendi" : "Yanıt kullanıcıya gönderildi",
    });
    
    setSelectedMessage(null);
    setReply("");
    setIsEditing(false);
    loadMessages();
  };

  const exportMessages = (type: 'unanswered' | 'answered' = 'unanswered') => {
    const messagesToExport = type === 'unanswered' ? unansweredMessages : answeredMessages;
    const exportData = messagesToExport.map(message => ({
      "Ad": message.name,
      "E-posta": message.email,
      "Telefon": message.phone || '-',
      "Mesaj": message.message,
      "Gönderilme Tarihi": formatDateForExport(message.created_at),
      "Cevaplanma Tarihi": message.replied_at ? formatDateForExport(message.replied_at) : '-',
      "Cevap": message.reply_message || '-',
    }));
    const fileName = type === 'unanswered' ? 'cevaplanmamis-mesajlar' : 'cevaplanan-mesajlar';
    exportToExcel(exportData, fileName, 'Mesajlar');
    toast({
      title: "Başarılı",
      description: "Mesajlar Excel olarak indirildi",
    });
  };

  const unansweredMessages = messages.filter(m => !m.replied);
  const answeredMessages = messages.filter(m => m.replied);

  const MessageCard = ({ message }: { message: any }) => (
    <Card key={message.id}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{message.name}</p>
            <p className="text-sm text-muted-foreground">{message.email}</p>
            {message.phone && (
              <p className="text-sm text-muted-foreground">{message.phone}</p>
            )}
            {message.replied && (
              <p className="text-xs text-green-600 mt-1">✓ Bu Soru Daha Önceden Cevaplandı</p>
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
        {message.reply_message && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Verilen Yanıt:</p>
            <p>{message.reply_message}</p>
            {message.replied_at && (
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(message.replied_at).toLocaleDateString("tr-TR")}{" "}
                {new Date(message.replied_at).toLocaleTimeString("tr-TR")}
              </p>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant={message.replied ? "outline" : "default"}
            onClick={() => {
              setSelectedMessage(message);
              setReply(message.reply_message || "");
              setIsEditing(!!message.replied);
            }}
          >
            {message.replied ? (
              <>
                <Edit className="h-4 w-4 mr-2" />
                Yanıtı Düzenle
              </>
            ) : (
              "Yanıtla"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>İletişim Mesajları</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="unanswered">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="unanswered">
                Cevaplanmayan ({unansweredMessages.length})
              </TabsTrigger>
              <TabsTrigger value="answered">
                Cevaplanan ({answeredMessages.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="unanswered" className="space-y-4 mt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-muted-foreground">
                  Bu sekmedeki toplam mesaj sayısı: {unansweredMessages.length}
                </div>
                <Button onClick={() => exportMessages('unanswered')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Excel İndir
                </Button>
              </div>
              {unansweredMessages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Cevaplanmayan mesaj yok</p>
              ) : (
                unansweredMessages.map((message) => <MessageCard key={message.id} message={message} />)
              )}
            </TabsContent>

            <TabsContent value="answered" className="space-y-4 mt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm text-muted-foreground">
                  Bu sekmedeki toplam mesaj sayısı: {answeredMessages.length}
                </div>
                <Button onClick={() => exportMessages('answered')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Excel İndir
                </Button>
              </div>
              {answeredMessages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Cevaplanan mesaj yok</p>
              ) : (
                answeredMessages.map((message) => <MessageCard key={message.id} message={message} />)
              )}
            </TabsContent>
          </Tabs>
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