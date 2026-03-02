import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const MAX_MESSAGE_LENGTH = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getCorsHeaders(_: Request) {
  return corsHeaders;
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientKey);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientKey, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Restricted topics the AI cannot discuss
const RESTRICTED_TOPICS = [
  "kod", "source", "kaynak", "api", "endpoint", "database", "veritabanı",
  "güvenlik açığı", "exploit", "hack", "injection", "xss", "csrf",
  "password", "şifre", "token", "secret", "key", "admin", "yönetici",
  "supabase", "edge function", "sql", "rls", "policy"
];

function containsRestrictedTopic(message: string): boolean {
  const normalized = message.normalize("NFKD").toLowerCase();
  return RESTRICTED_TOPICS.some(topic => normalized.includes(topic));
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Çok fazla istek gönderdiniz. Lütfen bekleyin." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, threadId } = await req.json();

    // Input validation
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize and limit input
    const sanitizedMessage = message
      .replace(/[<>]/g, "")
      .trim()
      .substring(0, MAX_MESSAGE_LENGTH);

    if (sanitizedMessage.length === 0) {
      return new Response(
        JSON.stringify({ error: "Message is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for restricted topics
    if (containsRestrictedTopic(sanitizedMessage)) {
      return new Response(
        JSON.stringify({ 
          response: "Üzgünüm, bu konuda size yardımcı olamıyorum. 🔒 Güvenlik ve teknik altyapı hakkında bilgi paylaşamam. Ürünlerimiz, siparişleriniz veya diğer konularda size yardımcı olmaktan mutluluk duyarım!" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get previous messages for context (last 8 messages)
    let contextMessages: { role: string; content: string }[] = [];
    if (threadId && typeof threadId === "string") {
      const { data: prevMessages } = await supabase
        .from("live_support_messages")
        .select("role, content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(8);

      if (prevMessages) {
        contextMessages = prevMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
      }
    }

    // Get product info for context
    const { data: products } = await supabase
      .from("products")
      .select("title, price, discounted_price, stock_status, description, stock_quantity")
      .limit(20);

    const productContext = products
      ? products
          .map((p) => {
            const price = p.discounted_price || p.price;
            const originalPrice = p.discounted_price ? ` (Eski: ${p.price} TL)` : "";
            const stock = p.stock_status === "in_stock" ? `Stokta (${p.stock_quantity || "var"})` : "Stok dışı";
            return `• ${p.title}: ${price} TL${originalPrice} - ${stock}`;
          })
          .join("\n")
      : "Çeşitli ürünler mevcut.";

    // Get site info
    const { data: siteSettings } = await supabase
      .from("site_settings")
      .select("*")
      .maybeSingle();

    // Get about us info
    const { data: aboutUs } = await supabase
      .from("about_us")
      .select("content")
      .maybeSingle();

    // Get policies
    const { data: policies } = await supabase
      .from("site_policies")
      .select("policy_type, title")
      .eq("is_active", true);

    const policyList = policies?.map(p => `• ${p.title}`).join("\n") || "";

    // Get shipping settings
    const { data: shippingSettings } = await supabase
      .from("shipping_settings")
      .select("*")
      .eq("is_active", true);

    const shippingInfo = shippingSettings?.map(s => 
      `• ${s.delivery_type === 'home_delivery' ? 'Eve Teslimat' : 'Mağazadan Teslim'}: ${s.base_fee} TL`
    ).join("\n") || "";

    const systemPrompt = `Sen Kuantum Ticaret'in yapay zeka destekli müşteri hizmetleri asistanısın. Profesyonel, samimi ve yardımsever bir Türkçe konuşuyorsun.

## SİTE BİLGİLERİ
- Şirket: Kuantum Ticaret
- E-posta: ${siteSettings?.email || "info@kuantumticaret.com"}
- Telefon: ${siteSettings?.phone || "Belirtilmemiş"}
- Adres: ${siteSettings?.address || "Türkiye"}

## HAKKIMIZDA
${aboutUs?.content ? aboutUs.content.substring(0, 500) : "Kuantum Ticaret, kaliteli ürünler sunan güvenilir bir e-ticaret platformudur."}

## MEVCUT ÜRÜNLER
${productContext}

## KARGO BİLGİLERİ
${shippingInfo || "Kargo bilgileri için site üzerinden bilgi alabilirsiniz."}

## POLİTİKALAR
${policyList || "İade, gizlilik ve diğer politikalarımız sitede mevcuttur."}

## DAVRANIŞLARIN
1. Her zaman nazik, profesyonel ve samimi ol
2. Kısa ve net yanıtlar ver (maksimum 3-4 cümle)
3. Emoji kullanarak samimi bir ton oluştur 🛍️
4. Ürünler, fiyatlar, stok durumu hakkında doğru bilgi ver
5. Sipariş takibi için /account sayfasını yönlendir
6. İletişim için /contact sayfasını öner
7. Premium üyelik avantajlarından bahset
8. Her mesaja özel ve farklı yanıtlar ver, tekrar etme

## YASAKLAR (KESİNLİKLE YAPMA)
- Teknik/yazılım bilgisi paylaşma
- Güvenlik açıkları hakkında konuşma
- Kaynak kodu, API, veritabanı hakkında bilgi verme
- Admin paneli veya yönetici işlevleri hakkında konuşma
- Şifre, token veya gizli bilgi paylaşma
- Aynı kalıp cevapları tekrar etme

## YAPABİLECEKLERİN
- Ürün önerisi yapma
- Fiyat ve stok bilgisi verme
- Kargo ve teslimat bilgisi verme
- İade politikası hakkında bilgi verme
- Sipariş durumu sorgulama yönlendirmesi
- Genel sorulara yardımcı olma`;

    // Use Lovable AI API
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          response: `Merhaba! 🛍️ Size yardımcı olmak için buradayım. Ürünlerimiz, siparişleriniz veya herhangi bir konuda sorularınızı yanıtlayabilirim. İletişim: ${siteSettings?.email || "info@kuantumticaret.com"} | ${siteSettings?.phone || ""}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...contextMessages,
      { role: "user", content: sanitizedMessage },
    ];

    // Try multiple models in order of preference
    const models = [
      "google/gemini-2.5-flash",
      "openai/gpt-5-nano",
      "google/gemini-2.5-flash-lite"
    ];

    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 600,
            temperature: 0.8,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          lastError = new Error(errorText);
          continue;
        }

        const aiData = await aiResponse.json();
        const assistantResponse = aiData.choices?.[0]?.message?.content;

        if (!assistantResponse) {
          continue;
        }

        return new Response(
          JSON.stringify({ response: assistantResponse }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        lastError = err as Error;
        continue;
      }
    }

    // All models failed, use smart fallback
    const lowerMessage = sanitizedMessage.toLowerCase();
    let fallbackResponse = "";
    
    if (lowerMessage.includes("merhaba") || lowerMessage.includes("selam") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
      fallbackResponse = `Merhaba! 👋 Kuantum Ticaret'e hoş geldiniz! Size nasıl yardımcı olabilirim? Ürünlerimiz, kargo, iade veya başka konularda sorularınızı yanıtlayabilirim. 🛒`;
    } else if (lowerMessage.includes("ürün") || lowerMessage.includes("fiyat") || lowerMessage.includes("ne kadar")) {
      const randomProduct = products?.[Math.floor(Math.random() * (products?.length || 1))];
      fallbackResponse = randomProduct 
        ? `Ürünlerimizi /products sayfasından inceleyebilirsiniz! 🛍️ Örneğin "${randomProduct.title}" şu an ${randomProduct.discounted_price || randomProduct.price} TL.`
        : `Ürünlerimizi /products sayfasından inceleyebilirsiniz. 🛍️ Tüm ürünlerimiz kalite garantili!`;
    } else if (lowerMessage.includes("sipariş") || lowerMessage.includes("takip")) {
      fallbackResponse = `Siparişlerinizi takip etmek için hesabınıza giriş yapıp /account sayfasını ziyaret edebilirsiniz. 📦`;
    } else if (lowerMessage.includes("kargo") || lowerMessage.includes("teslimat") || lowerMessage.includes("gönderim")) {
      fallbackResponse = shippingInfo 
        ? `Kargo seçeneklerimiz:\n${shippingInfo}\n📦 Premium üyelerimize ücretsiz kargo avantajı sunuyoruz!`
        : `Kargo bilgileri için sipariş esnasında güncel fiyatları görebilirsiniz. 📦`;
    } else if (lowerMessage.includes("iade") || lowerMessage.includes("değişim") || lowerMessage.includes("iptal")) {
      fallbackResponse = `İade ve değişim işlemleri için 14 gün içinde ${siteSettings?.email || "iletişim sayfamızdan"} bize ulaşabilirsiniz. 📧`;
    } else if (lowerMessage.includes("iletişim") || lowerMessage.includes("telefon") || lowerMessage.includes("mail") || lowerMessage.includes("adres")) {
      fallbackResponse = `📧 ${siteSettings?.email || "E-posta ile ulaşın"}\n📞 ${siteSettings?.phone || ""}\n📍 ${siteSettings?.address || "Türkiye"}`;
    } else if (lowerMessage.includes("premium") || lowerMessage.includes("üyelik") || lowerMessage.includes("vip")) {
      fallbackResponse = `Premium üyelik avantajları: 👑\n• Özel indirimler\n• Ücretsiz kargo\n• Erken erişim\n\nDetaylar için /premium sayfasını ziyaret edin!`;
    } else if (lowerMessage.includes("teşekkür") || lowerMessage.includes("sağol") || lowerMessage.includes("eyv")) {
      fallbackResponse = `Rica ederim! 😊 Başka bir konuda yardımcı olabilir miyim?`;
    } else {
      fallbackResponse = `Sorunuzu aldım! 💬 Ürünler, siparişler, kargo veya diğer konularda sorularınızı yanıtlayabilirim.\n\n📧 ${siteSettings?.email || ""}\n📞 ${siteSettings?.phone || ""}`;
    }
    
    return new Response(
      JSON.stringify({ response: fallbackResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ response: "Bir hata oluştu. Lütfen tekrar deneyin veya /contact sayfasından bize ulaşın. 📧" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
