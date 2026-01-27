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

    // Get previous messages for context (last 6 messages)
    let contextMessages: { role: string; content: string }[] = [];
    if (threadId) {
      const { data: prevMessages } = await supabase
        .from("live_support_messages")
        .select("role, content")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(6);

      if (prevMessages) {
        contextMessages = prevMessages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
      }
    }

    // Get some product info for context
    const { data: products } = await supabase
      .from("products")
      .select("title, price, discounted_price, stock_status, description")
      .limit(15);

    const productContext = products
      ? products
          .map((p) => `- ${p.title}: ${p.discounted_price || p.price} TL (${p.stock_status === "in_stock" ? "Stokta" : "Stok dışı"})${p.description ? " - " + p.description.substring(0, 50) : ""}`)
          .join("\n")
      : "";

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

    const systemPrompt = `Sen Kuantum Ticaret'in yapay zeka destekli müşteri hizmetleri asistanısın. Türkçe konuşuyorsun ve müşterilere yardımcı olmak için varsın.

Site Bilgileri:
- E-posta: ${siteSettings?.email || "info@kuantumticaret.com"}
- Telefon: ${siteSettings?.phone || "+90 555 123 45 67"}
- Adres: ${siteSettings?.address || "Türkiye"}

Hakkımızda:
${aboutUs?.content ? aboutUs.content.substring(0, 300) : "Kuantum Ticaret, kaliteli ürünler sunan güvenilir bir e-ticaret platformudur."}

Mevcut Ürünlerimiz:
${productContext || "Çeşitli ürünler mevcut."}

ÖNEMLİ KURALLAR:
1. Her zaman nazik, yardımsever ve profesyonel ol
2. Ürünler, siparişler, teslimat ve iade konularında yardımcı ol
3. Fiyat ve stok bilgisi ver
4. Sipariş takibi için /account sayfasını öner
5. Teknik sorunlar için iletişim sayfasını öner
6. Kısa, net ve anlaşılır yanıtlar ver (maksimum 2-3 cümle)
7. Emoji kullanarak samimi bir ton oluştur 🛍️
8. Bilmediğin konularda dürüst ol ve iletişim bilgilerini paylaş

YAPAMAZSIN:
- Sipariş oluşturma veya iptal etme
- Ödeme alma veya iade işlemi yapma
- Şifre sıfırlama
- Kişisel veri paylaşma`;

    // Use Lovable AI API
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not found");
      return new Response(
        JSON.stringify({ 
          response: `Merhaba! 🛍️ Size yardımcı olmak için buradayım. Ürünlerimiz hakkında bilgi almak, sipariş durumunuzu sorgulamak veya herhangi bir konuda destek almak isterseniz lütfen sorunuzu yazın. İletişim: ${siteSettings?.email || "info@kuantumticaret.com"} | ${siteSettings?.phone || "+90 555 123 45 67"}` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build messages array for Lovable AI
    const messages = [
      { role: "system", content: systemPrompt },
      ...contextMessages,
      { role: "user", content: message },
    ];

    console.log("Calling Lovable AI with", messages.length, "messages");

    try {
      const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: messages,
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("Lovable AI error:", errorText);
        
        // Try with a different model
        const fallbackResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-5-nano",
            messages: messages,
            max_tokens: 512,
            temperature: 0.7,
          }),
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const assistantResponse = fallbackData.choices?.[0]?.message?.content;
          
          if (assistantResponse) {
            console.log("Fallback model success:", assistantResponse.substring(0, 100));
            return new Response(
              JSON.stringify({ response: assistantResponse }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        throw new Error("All models failed");
      }

      const aiData = await aiResponse.json();
      const assistantResponse = aiData.choices?.[0]?.message?.content;

      if (!assistantResponse) {
        throw new Error("No response from AI");
      }

      console.log("AI Response success:", assistantResponse.substring(0, 100));

      return new Response(
        JSON.stringify({ response: assistantResponse }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiError) {
      console.error("AI Error:", aiError);
      
      // Smart fallback responses based on user message
      const lowerMessage = message.toLowerCase();
      let fallbackResponse = "";
      
      if (lowerMessage.includes("merhaba") || lowerMessage.includes("selam") || lowerMessage.includes("hi")) {
        fallbackResponse = `Merhaba! 👋 Kuantum Ticaret'e hoş geldiniz! Size nasıl yardımcı olabilirim? Ürünlerimiz, siparişleriniz veya herhangi bir konuda sorularınızı yanıtlamaktan mutluluk duyarım. 🛍️`;
      } else if (lowerMessage.includes("ürün") || lowerMessage.includes("fiyat")) {
        fallbackResponse = `Ürünlerimizi /products sayfasından inceleyebilirsiniz. 🛍️ Tüm ürünlerimiz kalite garantili ve hızlı kargo ile gönderilmektedir. Belirli bir ürün hakkında bilgi isterseniz lütfen ürün adını yazın!`;
      } else if (lowerMessage.includes("sipariş") || lowerMessage.includes("kargo")) {
        fallbackResponse = `Siparişlerinizi takip etmek için /account sayfasından giriş yapabilirsiniz. 📦 Kargo takip numaranız e-posta ile gönderilmektedir. Sorularınız için ${siteSettings?.phone || "telefon numaramızdan"} bize ulaşabilirsiniz.`;
      } else if (lowerMessage.includes("iade") || lowerMessage.includes("değişim")) {
        fallbackResponse = `İade ve değişim işlemleri için 14 gün içinde bizimle iletişime geçebilirsiniz. 📧 ${siteSettings?.email || "E-posta"} adresimize ürün fotoğrafları ile birlikte başvurunuzu iletebilirsiniz.`;
      } else if (lowerMessage.includes("iletişim") || lowerMessage.includes("telefon") || lowerMessage.includes("mail")) {
        fallbackResponse = `İletişim bilgilerimiz: 📧 ${siteSettings?.email || "info@kuantumticaret.com"} | 📞 ${siteSettings?.phone || "+90 555 123 45 67"} | 📍 ${siteSettings?.address || "Türkiye"}. Size yardımcı olmaktan mutluluk duyarız!`;
      } else {
        fallbackResponse = `Merhaba! 🛍️ Sorunuzu aldım. Size en iyi şekilde yardımcı olmak istiyorum. Ürünler, siparişler veya diğer konularda sorularınızı yanıtlayabilirim. Daha fazla bilgi için: ${siteSettings?.email || "info@kuantumticaret.com"} | ${siteSettings?.phone || "+90 555 123 45 67"}`;
      }
      
      return new Response(
        JSON.stringify({ response: fallbackResponse }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in ai-support-chat:", error);
    return new Response(
      JSON.stringify({ response: "Bir hata oluştu. Lütfen tekrar deneyin veya iletişim sayfamızdan bize ulaşın. 📧" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
