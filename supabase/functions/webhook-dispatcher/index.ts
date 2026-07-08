import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // AUTH: accept service role key OR authenticated admin user
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let authorized = bearer === serviceKey;
    if (!authorized && bearer) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: roleOk } = await userClient.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        if (roleOk) authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event_type, payload } = await req.json();
    if (!event_type || typeof event_type !== "string" || event_type.length > 100) {
      return new Response(JSON.stringify({ error: "event_type zorunlu" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

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
