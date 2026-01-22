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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get previous messages for context
    let contextMessages: { role: string; content: string }[] = [];
    if (threadId) {
      const { data: prevMessages } = await supabase
        .from("live_support_messages")
        .select("role, content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(10);

      if (prevMessages) {
        contextMessages = prevMessages.map((m) => ({
          role: m.role,
          content: m.content,
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
      .single();

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

    // Use Lovable AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not found");
      return new Response(
        JSON.stringify({ response: "Şu anda destek hizmeti kullanılamıyor. Lütfen daha sonra tekrar deneyin." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...contextMessages,
      { role: "user", content: message },
    ];

    console.log("Calling AI with messages:", aiMessages.length);

    const aiResponse = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ response: "Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const assistantResponse = aiData.choices?.[0]?.message?.content || "Yanıt alınamadı.";

    console.log("AI response received:", assistantResponse.substring(0, 100));

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
