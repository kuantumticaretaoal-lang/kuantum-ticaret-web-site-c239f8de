import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { event_type, payload } = await req.json();
    if (!event_type) {
      return new Response(JSON.stringify({ error: "event_type zorunlu" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: hooks } = await supabase
      .from("webhooks")
      .select("*")
      .eq("is_active", true)
      .contains("event_types", [event_type]);

    let dispatched = 0;
    for (const hook of hooks ?? []) {
      try {
        const r = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(hook.secret ? { "X-Webhook-Secret": hook.secret } : {}),
          },
          body: JSON.stringify({ event: event_type, data: payload, timestamp: Date.now() }),
        });
        await supabase.from("webhook_logs").insert({
          webhook_id: hook.id,
          event_type,
          payload,
          response_status: r.status,
          response_body: (await r.text()).slice(0, 500),
        });
        dispatched++;
      } catch (e) {
        await supabase.from("webhook_logs").insert({
          webhook_id: hook.id,
          event_type,
          payload,
          response_status: 0,
          response_body: String(e).slice(0, 500),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, dispatched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
