import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, User, Bot, Clock, Download } from "lucide-react";
import { exportToExcel, formatDateForExport } from "@/lib/excel-export";
import { useToast } from "@/hooks/use-toast";

interface Thread {
  id: string;
  device_id: string;
  user_id: string | null;
  created_at: string;
  last_message_at: string;
  messages?: Message[];
  profile?: { first_name: string; last_name: string; email: string } | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export const AdminLiveSupport = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const exportConversations = () => {
    const exportData = threads.flatMap(thread => {
      const userName = thread.profile 
        ? `${thread.profile.first_name} ${thread.profile.last_name}`
        : "Misafir";
      
      if (!thread.messages || thread.messages.length === 0) {
        return [{
          "Kullanıcı": userName,
          "E-posta": thread.profile?.email || "-",
          "Rol": "-",
          "Mesaj": "(Mesaj yok)",
          "Tarih": formatDateForExport(thread.created_at),
        }];
      }
      
      return thread.messages.map(msg => ({
        "Kullanıcı": userName,
        "E-posta": thread.profile?.email || "-",
        "Rol": msg.role === "user" ? "Kullanıcı" : "Asistan",
        "Mesaj": msg.content,
        "Tarih": formatDateForExport(msg.created_at),
      }));
    });
    
    exportToExcel(exportData, 'canli-destek-gorusmeleri', 'Görüşmeler');
    toast({
      title: "Başarılı",
      description: "Görüşmeler Excel olarak indirildi",
    });
  };

  useEffect(() => {
    loadThreads();

    const channel = supabase
      .channel("admin-live-support")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_support_threads" }, () => loadThreads())
      .on("postgres_changes", { event: "*", schema: "public", table: "live_support_messages" }, () => {
        loadThreads();
        if (selectedThread) {
          loadMessages(selectedThread.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedThread]);

  const loadThreads = async () => {
    const { data } = await supabase
      .from("live_support_threads")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (data) {
      // Load user profiles for threads with user_id
      const threadsWithProfiles = await Promise.all(
        data.map(async (thread) => {
          let profile = null;
          if (thread.user_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("first_name, last_name, email")
              .eq("id", thread.user_id)
              .maybeSingle();
            profile = profileData;
          }
          return { ...thread, profile };
        })
      );
      setThreads(threadsWithProfiles);
    }
    setLoading(false);
  };

  const loadMessages = async (threadId: string) => {
    const { data } = await supabase
      .from("live_support_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (data && selectedThread) {
      setSelectedThread({ ...selectedThread, messages: data });
    }
  };

  const selectThread = async (thread: Thread) => {
    setSelectedThread(thread);
    const { data } = await supabase
      .from("live_support_messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });

    setSelectedThread({ ...thread, messages: data || [] });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("tr-TR");
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Şimdi";
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">Yükleniyor...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Canlı Destek Görüşmeleri
          </div>
          <Button onClick={exportConversations} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Excel İndir
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Thread list */}
          <div className="lg:col-span-1 border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-medium">Görüşmeler ({threads.length})</h3>
            </div>
            <ScrollArea className="h-[400px]">
              {threads.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Henüz görüşme yok
                </div>
              ) : (
                <div className="divide-y">
                  {threads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => selectThread(thread)}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedThread?.id === thread.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {thread.profile
                              ? `${thread.profile.first_name} ${thread.profile.last_name}`
                              : "Misafir"}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {getTimeAgo(thread.last_message_at)}
                        </Badge>
                      </div>
                      {thread.profile?.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {thread.profile.email}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Cihaz: {thread.device_id.substring(0, 8)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Messages view */}
          <div className="lg:col-span-2 border rounded-lg">
            {selectedThread ? (
              <>
                <div className="p-3 border-b bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        {selectedThread.profile
                          ? `${selectedThread.profile.first_name} ${selectedThread.profile.last_name}`
                          : "Misafir Kullanıcı"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Başlangıç: {formatDate(selectedThread.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <ScrollArea className="h-[350px] p-4">
                  <div className="space-y-3">
                    {selectedThread.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatDate(msg.created_at)}
                          </p>
                        </div>
                        {msg.role === "user" && (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {(!selectedThread.messages || selectedThread.messages.length === 0) && (
                      <p className="text-center text-muted-foreground">
                        Bu görüşmede henüz mesaj yok
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Görüntülemek için bir görüşme seçin
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
