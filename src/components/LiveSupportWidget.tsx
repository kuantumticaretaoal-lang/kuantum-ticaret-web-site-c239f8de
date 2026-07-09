import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User, AlertTriangle, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

const getDeviceId = (): string => {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
};

export const LiveSupportWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(
    typeof window !== "undefined" && localStorage.getItem("live_support_disclaimer_v1") === "1"
  );
  const [contactInfo, setContactInfo] = useState<{ email?: string; phone?: string }>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      (async () => {
        const { data } = await supabase.from("site_settings").select("email, phone").maybeSingle();
        if (data) setContactInfo({ email: (data as any).email, phone: (data as any).phone });
      })();
      if (disclaimerAccepted) loadOrCreateThread();
    }
  }, [isOpen, disclaimerAccepted]);

  const acceptDisclaimer = () => {
    localStorage.setItem("live_support_disclaimer_v1", "1");
    setDisclaimerAccepted(true);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadOrCreateThread = async () => {
    const deviceId = getDeviceId();
    const { data: { user } } = await supabase.auth.getUser();

    // Check for existing thread
    const { data: existingThread } = await supabase
      .from("live_support_threads")
      .select("id")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingThread) {
      setThreadId(existingThread.id);
      loadMessages(existingThread.id);
    } else {
      // Create new thread
      const { data: newThread } = await supabase
        .from("live_support_threads")
        .insert({
          device_id: deviceId,
          user_id: user?.id || null,
        })
        .select()
        .single();

      if (newThread) {
        setThreadId(newThread.id);
        // Add welcome message
        const welcomeMsg: Message = {
          id: "welcome",
          role: "assistant",
          content: "Merhaba! Size nasıl yardımcı olabilirim? 🛍️",
          created_at: new Date().toISOString(),
        };
        setMessages([welcomeMsg]);
      }
    }
  };

  const loadMessages = async (tid: string) => {
    const { data } = await supabase
      .from("live_support_messages")
      .select("*")
      .eq("thread_id", tid)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      setMessages(data.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        created_at: m.created_at,
      })));
    } else {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Merhaba! Size nasıl yardımcı olabilirim? 🛍️",
        created_at: new Date().toISOString(),
      }]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !threadId) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Add user message to UI immediately
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Save user message to DB
    await supabase.from("live_support_messages").insert({
      thread_id: threadId,
      role: "user",
      content: userMessage,
    });

    // Update thread last message time
    await supabase
      .from("live_support_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", threadId);

    try {
      // Call AI for response
      const response = await supabase.functions.invoke("ai-support-chat", {
        body: {
          message: userMessage,
          threadId: threadId,
        },
      });

      const aiResponse = response.data?.response || "Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.";

      // Save assistant message to DB
      const { data: savedMsg } = await supabase
        .from("live_support_messages")
        .insert({
          thread_id: threadId,
          role: "assistant",
          content: aiResponse,
        })
        .select()
        .single();

      // Add to UI
      const assistantMsg: Message = {
        id: savedMsg?.id || `assistant-${Date.now()}`,
        role: "assistant",
        content: aiResponse,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("AI error:", error);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Bir hata oluştu. Lütfen tekrar deneyin.",
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setLoading(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        aria-label="Canlı destek"
        className="fixed right-4 bottom-20 md:right-6 md:bottom-6 h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg z-40"
        size="icon"
      >
        <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed right-2 left-2 bottom-20 md:left-auto md:right-6 md:bottom-6 md:w-96 max-h-[calc(100vh-6rem)] md:h-[500px] z-40 shadow-2xl flex flex-col">

      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span>Canlı Destek</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-3 overflow-hidden">
        {!disclaimerAccepted ? (
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3 text-sm space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                Bilgilendirme
              </div>
              <p className="text-amber-900/90 dark:text-amber-100/90 leading-relaxed">
                Canlı destek <strong>yapay zeka</strong> tarafından sağlanmaktadır.
                Her konuda yardımcı olamayabilir ve bazen <strong>hatalı veya
                eksik bilgi</strong> verebilir. Önemli bilgileri lütfen bizimle
                doğrulayın.
              </p>
              <p className="text-amber-900/90 dark:text-amber-100/90">
                Daha fazla yardım için bizimle doğrudan iletişime geçebilirsiniz:
              </p>
              <div className="space-y-1 text-amber-900 dark:text-amber-100">
                {contactInfo.email && (
                  <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-2 hover:underline">
                    <Mail className="h-4 w-4" /> {contactInfo.email}
                  </a>
                )}
                {contactInfo.phone && (
                  <a href={`tel:${contactInfo.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:underline">
                    <Phone className="h-4 w-4" /> {contactInfo.phone}
                  </a>
                )}
                <Link to="/contact" className="flex items-center gap-2 hover:underline" onClick={() => setIsOpen(false)}>
                  <MessageCircle className="h-4 w-4" /> İletişim Sayfası
                </Link>
              </div>
            </div>
            <Button onClick={acceptDisclaimer} className="w-full mt-auto">
              Anladım, sohbete başla
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      <span className="animate-pulse">Yazıyor...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex gap-2 mt-3 flex-shrink-0">
              <Input
                placeholder="Mesajınızı yazın..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Yapay zeka destekli — bilgiler hatalı olabilir.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
