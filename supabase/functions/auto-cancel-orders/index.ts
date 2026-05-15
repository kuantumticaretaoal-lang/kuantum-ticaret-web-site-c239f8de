import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Cancel pending orders older than 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: stale, error } = await supabase
    .from("orders")
    .select("id, user_id, order_code")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let cancelled = 0;
  for (const o of stale ?? []) {
    const { error: upErr } = await supabase
      .from("orders")
      .update({ status: "rejected", rejection_reason: "Otomatik iptal: 48 saat içinde onaylanmadı" })
      .eq("id", o.id);
    if (!upErr) {
      cancelled++;
      await supabase.from("notifications").insert({
        user_id: o.user_id,
        message: `Siparişiniz (${o.order_code}) 48 saat içinde işlenmediği için otomatik iptal edildi.`,
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, cancelled }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
