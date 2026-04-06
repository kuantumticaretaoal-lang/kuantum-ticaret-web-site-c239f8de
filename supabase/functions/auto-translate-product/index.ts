import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { productId, targetLanguages } = await req.json();
    if (!productId || !targetLanguages?.length) {
      return new Response(JSON.stringify({ error: "productId and targetLanguages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get product
    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("title, description")
      .eq("id", productId)
      .single();
    if (pErr || !product) throw new Error("Product not found");

    const results: any[] = [];

    for (const lang of targetLanguages) {
      const prompt = `Translate this product information to ${lang.name} (${lang.code}). Return ONLY a JSON object with "title" and "description" keys. Do not include any other text.

Product Title: ${product.title}
Product Description: ${product.description || ""}`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a professional translator. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          results.push({ lang: lang.code, error: "Rate limited" });
          continue;
        }
        results.push({ lang: lang.code, error: "AI error" });
        continue;
      }

      const aiData = await aiResp.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      
      // Extract JSON from response
      let translated: { title: string; description: string };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        translated = JSON.parse(jsonMatch?.[0] || content);
      } catch {
        results.push({ lang: lang.code, error: "Parse error" });
        continue;
      }

      // Upsert translation
      const { error: upsertErr } = await supabase
        .from("product_translations")
        .upsert({
          product_id: productId,
          language_code: lang.code,
          title: translated.title,
          description: translated.description || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "product_id,language_code" });

      if (upsertErr) {
        // Try insert if upsert fails (no unique constraint)
        const { data: existing } = await supabase
          .from("product_translations")
          .select("id")
          .eq("product_id", productId)
          .eq("language_code", lang.code)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("product_translations")
            .update({ title: translated.title, description: translated.description, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
        } else {
          await supabase
            .from("product_translations")
            .insert({ product_id: productId, language_code: lang.code, title: translated.title, description: translated.description });
        }
      }

      results.push({ lang: lang.code, title: translated.title, ok: true });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
