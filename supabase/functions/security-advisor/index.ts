import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function logAdvisorRun(entry: Record<string, unknown>) {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    await admin.from("security_advisor_logs").insert(entry);
  } catch (e) {
    console.error("log insert failed", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  let userId: string | null = null;
  let userEmail: string | null = null;
  let lastPrompt = "";
  let messageCount = 0;

  try {
    const { messages, context } = await req.json();
    messageCount = Array.isArray(messages) ? messages.length : 0;
    const lastUser = Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m?.role === "user")
      : null;
    lastPrompt = String(lastUser?.content || "").slice(0, 4000);

    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    if (token) {
      try {
        const supa = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data } = await supa.auth.getUser();
        userId = data.user?.id ?? null;
        userEmail = data.user?.email ?? null;
      } catch (_) { /* ignore */ }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = context
      ? `${SYSTEM_PROMPT}\n\nProje bağlamı:\n${String(context).slice(0, 4000)}`
      : SYSTEM_PROMPT;

    const model = "google/gemini-2.5-flash";
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages: [{ role: "system", content: sys }, ...(messages || [])], stream: true }),
    });

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null;
    const ua = req.headers.get("user-agent") || null;

    if (response.status === 429 || response.status === 402 || !response.ok) {
      const code = response.status === 429 ? "RATE_LIMIT" : response.status === 402 ? "NO_CREDIT" : "GATEWAY_ERROR";
      const msg = response.status === 429 ? "Çok fazla istek. Lütfen biraz bekleyin." :
                  response.status === 402 ? "AI kredisi tükendi. Çalışma alanına kredi ekleyin." :
                  "AI gateway hatası";
      await logAdvisorRun({
        user_id: userId, user_email: userEmail, prompt: lastPrompt, response: null,
        model, status_code: response.status, error_code: code,
        latency_ms: Date.now() - startedAt, message_count: messageCount,
        ip_address: ip, user_agent: ua,
      });
      return new Response(JSON.stringify({ error: msg }), {
        status: response.status === 429 || response.status === 402 ? response.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee stream: pass through to client AND capture full text for log
    const [forClient, forLog] = response.body!.tee();
    (async () => {
      try {
        const reader = forLog.getReader();
        const decoder = new TextDecoder();
        let buffer = ""; let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).replace(/\r$/, "");
            buffer = buffer.slice(nl + 1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;
            try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) full += c; } catch {}
          }
        }
        await logAdvisorRun({
          user_id: userId, user_email: userEmail, prompt: lastPrompt,
          response: full.slice(0, 20000), model, status_code: 200, error_code: null,
          latency_ms: Date.now() - startedAt, message_count: messageCount,
          ip_address: ip, user_agent: ua,
        });
      } catch (e) { console.error("stream log err", e); }
    })();

    return new Response(forClient, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
    await logAdvisorRun({
      user_id: userId, user_email: userEmail, prompt: lastPrompt, response: null,
      model: "google/gemini-2.5-flash", status_code: 500, error_code: "EXCEPTION",
      latency_ms: Date.now() - startedAt, message_count: messageCount,
    });
    console.error("security-advisor error", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
