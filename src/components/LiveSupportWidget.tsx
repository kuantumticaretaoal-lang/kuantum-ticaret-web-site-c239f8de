import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadOrCreateThread();
    }
  }, [isOpen]);

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
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-80 sm:w-96 h-[500px] z-50 shadow-2xl flex flex-col">
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
      </CardContent>
    </Card>
  );
};
