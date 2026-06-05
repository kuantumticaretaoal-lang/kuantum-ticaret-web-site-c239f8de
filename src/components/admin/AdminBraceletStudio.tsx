import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Send, Sparkles, Loader2, ShieldAlert, Plus, Minus } from "lucide-react";
import BraceletSimulator3D from "@/components/BraceletSimulator3D";
import type { SelectedOrnament } from "@/components/OrnamentPicker";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "Veritabanı RLS politikalarımda gözden kaçan riskler neler olabilir?",
  "Edge function'larım için CORS ve auth en iyi uygulamaları nedir?",
  "Sepet terk oranını düşürmek için 5 somut iyileştirme öner.",
  "OWASP Top 10'a göre sitemde kontrol edilmesi gereken noktalar?",
  "Core Web Vitals iyileştirmesi için öncelikli adımları listele.",
  "Premium üyelik dönüşümünü artırmak için 7 büyüme taktiği öner.",
];

export const AdminBraceletStudio = () => {
  // 3D studio state
  const [name, setName] = useState("AYŞE");
  const [charms, setCharms] = useState<SelectedOrnament[]>([
    { id: "c1", name: "Kalp", extra_price: 0, quantity: 1 },
    { id: "c2", name: "Yıldız", extra_price: 0, quantity: 1 },
  ]);
  const [cordColor, setCordColor] = useState("#7a4a25");

  const addCharm = () => {
    const labels = ["Ay", "Güneş", "Çiçek", "Anahtar", "Kuş", "Sonsuzluk", "Şimşek"];
    const label = labels[Math.floor(Math.random() * labels.length)];
    setCharms((c) => [...c, { id: crypto.randomUUID(), name: label, extra_price: 0, quantity: 1 }]);
  };
  const updateCharm = (i: number, q: number) =>
    setCharms((c) => c.map((x, idx) => (idx === i ? { ...x, quantity: Math.max(0, q) } : x)).filter((x) => x.quantity > 0));

  // AI advisor state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/security-advisor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (resp.status === 429) {
        toast({ title: "Limit aşıldı", description: "Lütfen biraz bekleyin.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "Kredi bitti", description: "AI çalışma alanına kredi ekleyin.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("AI yanıt vermedi");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistantText += c;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast({ title: "Hata", description: e.message || "Bilinmeyen hata", variant: "destructive" });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* 3D Studio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            3D Bileklik Stüdyosu
            <Badge variant="secondary">Yeni</Badge>
          </CardTitle>
          <CardDescription>
            Müşteri görselleştirmesini birebir simüle edin. Bu önizleme ürün sayfasında da canlı çalışıyor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">İsim</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={12} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Aksesuarlar</label>
              <Button size="sm" variant="outline" onClick={addCharm}>
                <Plus className="h-4 w-4 mr-1" /> Aksesuar Ekle
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {charms.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 border rounded-full pl-3 pr-1 py-1 bg-muted/40">
                  <span className="text-sm">{c.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCharm(i, c.quantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-xs w-4 text-center">{c.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateCharm(i, c.quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <BraceletSimulator3D
            customName={name}
            ornaments={charms}
            cordColor={cordColor}
            onCordColorChange={setCordColor}
            exportFileName={`yonetici-bileklik-${name.toLowerCase()}`}
            height={380}
            title="Yönetici Önizlemesi"
          />
        </CardContent>
      </Card>

      {/* AI Security Advisor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            AI Güvenlik & Geliştirme Danışmanı
            <Badge variant="secondary">AI</Badge>
          </CardTitle>
          <CardDescription>
            Site güvenliği, RLS, performans, SEO ve büyüme için uzman tavsiyeleri al.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p) => (
              <Button key={p} size="sm" variant="outline" onClick={() => send(p)} disabled={loading} className="text-xs">
                {p.length > 50 ? p.slice(0, 47) + "..." : p}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[380px] rounded-lg border p-3 bg-muted/20">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-12">
                <Shield className="h-10 w-10 mb-2 opacity-50" />
                <p>Hızlı bir soru seç veya kendi sorunu yaz.</p>
                <p className="text-xs mt-1">Akış halinde gerçek zamanlı cevap alırsın.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"
                    }`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Düşünüyor...
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Güvenlik, performans veya büyüme sorunu yaz..."
              className="min-h-[60px]"
              disabled={loading}
            />
            <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBraceletStudio;
