import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { subject, body_html } = await req.json();
    if (!subject || !body_html) {
      return new Response(JSON.stringify({ error: "subject ve body_html zorunlu" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkisiz" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // verify caller is admin
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Yetkisiz" }), { status: 401, headers: corsHeaders });

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Yalnızca admin" }), { status: 403, headers: corsHeaders });

    // Get active subscribers
    const { data: subs } = await supabase
      .from("newsletters")
      .select("email")
      .eq("is_active", true);

    const emails = (subs ?? []).map((s: any) => s.email);
    if (!emails.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
    let sent = 0;
    if (RESEND_KEY) {
      // Resend supports up to 50 recipients per call via BCC
      for (let i = 0; i < emails.length; i += 50) {
        const chunk = emails.slice(i, i + 50);
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: "Kuantum Ticaret <onboarding@resend.dev>",
            to: ["onboarding@resend.dev"],
            bcc: chunk,
            subject,
            html: body_html,
          }),
        });
        if (r.ok) sent += chunk.length;
      }
    }

    await supabase.from("newsletter_campaigns").insert({
      subject,
      body_html,
      sent_at: new Date().toISOString(),
      recipient_count: sent,
      created_by: user.id,
    });

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
