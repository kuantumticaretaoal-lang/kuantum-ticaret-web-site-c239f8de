import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function random6DigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendEmail({
  apiKey,
  to,
  subject,
  html,
}: {
  apiKey: string;
  to: string;
  subject: string;
  html: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Kuantum Ticaret <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { step, expenseId, code } = await req.json();
    if (!step || !expenseId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing step or expenseId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleOk } = await authed.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    if (!roleOk) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Protect: only manual expenses (order_id must be null)
    const { data: expense, error: expErr } = await admin
      .from("expenses")
      .select("id, order_id, description, amount, type")
      .eq("id", expenseId)
      .maybeSingle();

    if (expErr || !expense) {
      return new Response(JSON.stringify({ ok: false, error: "Expense not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (expense.order_id) {
      return new Response(JSON.stringify({ ok: false, error: "Order-linked transactions cannot be deleted" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load admin email address from settings
    const { data: siteSettings } = await admin.from("site_settings").select("email").maybeSingle();
    const adminEmail = siteSettings?.email;
    if (!adminEmail) {
      return new Response(JSON.stringify({ ok: false, error: "Admin email not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (step === "request") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        return new Response(JSON.stringify({ ok: false, error: "Email service not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const plain = random6DigitCode();
      const codeHash = await sha256Hex(plain);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insErr } = await admin.from("admin_action_verifications").insert({
        action_type: "delete_expense",
        target_id: expenseId,
        email: adminEmail,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

      if (insErr) {
        console.error("insert verification failed", insErr);
        return new Response(JSON.stringify({ ok: false, error: "Failed to create verification" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const subject = "İşlem Silme Doğrulama Kodu";
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
          <h2>İşlem Silme Doğrulaması</h2>
          <p>Aşağıdaki işlemi silmek için doğrulama kodu:</p>
          <div style="padding: 12px; background: #f3f4f6; border-radius: 8px; display: inline-block;">
            <span style="font-size: 24px; letter-spacing: 6px; font-weight: 700;">${plain}</span>
          </div>
          <p style="margin-top: 16px;"><strong>İşlem:</strong> ${expense.description}</p>
          <p><strong>Tutar:</strong> ${Number(expense.amount).toFixed(2)} TL</p>
          <p style="margin-top: 16px; color: #6b7280;">Kod 10 dakika içinde geçersiz olur.</p>
        </div>
      `;

      await sendEmail({ apiKey: resendApiKey, to: adminEmail, subject, html });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (step === "confirm") {
      const normalized = String(code || "").replace(/\D/g, "");
      if (normalized.length !== 6) {
        return new Response(JSON.stringify({ ok: false, error: "Invalid code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const codeHash = await sha256Hex(normalized);

      const { data: latest } = await admin
        .from("admin_action_verifications")
        .select("id, code_hash, expires_at, used_at")
        .eq("action_type", "delete_expense")
        .eq("target_id", expenseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) {
        return new Response(JSON.stringify({ ok: false, error: "No verification request found" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (latest.used_at) {
        return new Response(JSON.stringify({ ok: false, error: "Code already used" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(latest.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ ok: false, error: "Code expired" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (latest.code_hash !== codeHash) {
        return new Response(JSON.stringify({ ok: false, error: "Wrong code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark used, then delete
      await admin.from("admin_action_verifications").update({ used_at: new Date().toISOString() }).eq("id", latest.id);
      const { error: delErr } = await admin.from("expenses").delete().eq("id", expenseId);

      if (delErr) {
        console.error("delete expense failed", delErr);
        return new Response(JSON.stringify({ ok: false, error: "Delete failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: "Unknown step" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-expense-delete error", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
