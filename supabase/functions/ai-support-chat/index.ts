import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, threadId } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get previous messages for context
    let contextMessages: { role: string; parts: { text: string }[] }[] = [];
    if (threadId) {
      const { data: prevMessages } = await supabase
        .from("live_support_messages")
        .select("role, content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(10);

      if (prevMessages) {
        contextMessages = prevMessages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      }
    }

    // Get some product info for context
    const { data: products } = await supabase
      .from("products")
      .select("title, price, discounted_price, stock_status")
      .limit(10);

    const productContext = products
      ? products
          .map((p) => `- ${p.title}: ${p.discounted_price || p.price} TL (${p.stock_status === "in_stock" ? "Stokta" : "Stok dışı"})`)
          .join("\n")
      : "";

    // Get site info
    const { data: siteSettings } = await supabase
      .from("site_settings")
      .select("*")
      .maybeSingle();

    const systemPrompt = `Sen Kuantum Ticaret'in yapay zeka destekli müşteri hizmetleri asistanısın. Türkçe konuşuyorsun.

Site Bilgileri:
- E-posta: ${siteSettings?.email || "Belirtilmemiş"}
- Telefon: ${siteSettings?.phone || "Belirtilmemiş"}
- Adres: ${siteSettings?.address || "Belirtilmemiş"}

Mevcut Ürünler:
${productContext}

Görevin:
1. Müşteri sorularını nazikçe yanıtla
2. Ürün bilgisi, sipariş takibi, iade/değişim konularında yardımcı ol
3. Teknik sorunlarda /contact sayfasına yönlendir
4. Kısa, net ve yardımsever yanıtlar ver
5. Emoji kullanarak samimi bir ton oluştur

Yapamayacakların:
- Sipariş oluşturma veya iptal etme
- Ödeme alma
- Sistem değişikliği yapma`;

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY not found");
      return new Response(
        JSON.stringify({ response: "Şu anda destek hizmeti kullanılamıyor. Lütfen daha sonra tekrar deneyin." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build conversation history for Gemini
    const contents = [
      {
        role: "user",
        parts: [{ text: systemPrompt }],
      },
      {
        role: "model",
        parts: [{ text: "Anladım! Kuantum Ticaret'in müşteri hizmetleri asistanı olarak size yardımcı olmaya hazırım. 🛍️" }],
      },
      ...contextMessages,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    console.log("Calling Gemini API with", contents.length, "messages");

    const aiResponse = await fetch(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
             maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ response: "Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const assistantResponse = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";

    console.log("Gemini response received:", assistantResponse.substring(0, 100));

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ai-support-chat:", error);
    return new Response(
      JSON.stringify({ response: "Bir hata oluştu. Lütfen tekrar deneyin." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
