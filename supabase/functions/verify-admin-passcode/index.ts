// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { code } = await req.json().catch(() => ({}));
    if (!code) {
      return new Response(JSON.stringify({ error: "code_required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const expected = Deno.env.get("ADMIN_SECOND_PASSWORD");
    if (!expected) {
      return new Response(JSON.stringify({ error: "not_configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (code === expected) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "unexpected_error", details: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
