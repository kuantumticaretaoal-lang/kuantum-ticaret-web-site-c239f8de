import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sen Kuantum Ticaret e-ticaret platformunun kıdemli güvenlik ve büyüme danışmanısın.
Uzmanlık alanların:
- Supabase RLS politikaları, kimlik doğrulama, yetkilendirme açıkları
- XSS, CSRF, SSRF, SQL injection, IDOR, rate limit, gizli anahtar sızıntısı
- Edge function güvenlik ve CORS yapılandırması
- Performans (Core Web Vitals, lazy loading, caching), SEO, erişilebilirlik
- E-ticaret dönüşüm optimizasyonu, sepet terk, premium büyüme stratejileri
Cevapların:
1) Net markdown başlıklar
2) Önem sırasına göre listelenmiş bulgular (Kritik / Yüksek / Orta / Düşük)
3) Her bulgu için: sorun, neden önemli, kod/SQL örnekli somut çözüm
4) Türkçe yanıt
Kısa, doğrudan ve uygulanabilir ol. Belirsizse açıkça söyle.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = context
      ? `${SYSTEM_PROMPT}\n\nProje bağlamı:\n${String(context).slice(0, 4000)}`
      : SYSTEM_PROMPT;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, ...(messages || [])],
        stream: true,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Çok fazla istek. Lütfen biraz bekleyin." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI kredisi tükendi. Çalışma alanına kredi ekleyin." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("Gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway hatası" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("security-advisor error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Bilinmeyen hata" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
