import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // AUTH: service role OR admin JWT only (destructive state-changing job)
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
        _user_id: userData.user.id, _role: "admin",
      });
      if (roleOk) authorized = true;
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

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
