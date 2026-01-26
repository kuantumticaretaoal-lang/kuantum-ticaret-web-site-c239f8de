import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback models to try
const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-pro",
];

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

    // Try each model until one works
    let assistantResponse = null;
    let lastError = null;

    for (const model of GEMINI_MODELS) {
      try {
        console.log(`Trying model: ${model}`);
        
        const aiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: contents,
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
                topP: 0.8,
                topK: 40,
              },
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          assistantResponse = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (assistantResponse) {
            console.log(`Success with model ${model}:`, assistantResponse.substring(0, 100));
            break;
          }
        } else {
          const errorText = await aiResponse.text();
          console.log(`Model ${model} failed:`, errorText.substring(0, 200));
          lastError = errorText;
          
          // If it's a rate limit error, try the next model
          if (aiResponse.status === 429) {
            continue;
          }
          // If it's a 404, the model doesn't exist, try the next one
          if (aiResponse.status === 404) {
            continue;
          }
        }
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError);
        lastError = modelError;
      }
    }

    if (!assistantResponse) {
      console.error("All models failed. Last error:", lastError);
      
      // Return a helpful fallback response
      const fallbackResponses = [
        `Merhaba! 🛍️ Şu anda yoğunluk nedeniyle yanıt vermekte gecikmeler yaşanıyor. Lütfen birkaç dakika sonra tekrar deneyin veya bize ${siteSettings?.email || "e-posta"} üzerinden ulaşabilirsiniz.`,
        `Selamlar! ⏳ Sistemimiz şu anda çok yoğun. Lütfen birazdan tekrar deneyin. Acil sorularınız için ${siteSettings?.phone || "telefon"} numaramızdan bize ulaşabilirsiniz.`,
      ];
      
      return new Response(
        JSON.stringify({ response: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
