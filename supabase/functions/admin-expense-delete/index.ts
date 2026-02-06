import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200, // IMPORTANT: avoid non-2xx so frontend gets a readable { ok:false, error }
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
      // NOTE: If you later verify your own domain in Resend, change this to that domain.
      from: "Kuantum Ticaret <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const step = body?.step;
    const expenseId = body?.expenseId;
    const code = body?.code;

    console.log("admin-expense-delete", { step, expenseId: String(expenseId || "").slice(0, 8) });

    if (!step || !expenseId) {
      return json({ ok: false, error: "Missing step or expenseId" });
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
      console.warn("Unauthorized", userErr);
      return json({ ok: false, error: "Unauthorized" });
    }

    const { data: roleOk, error: roleErr } = await authed.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    if (roleErr) {
      console.error("Role check failed", roleErr);
      return json({ ok: false, error: "Role check failed" });
    }

    if (!roleOk) {
      return json({ ok: false, error: "Forbidden" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Protect: only manual expenses (order_id must be null)
    const { data: expense, error: expErr } = await admin
      .from("expenses")
      .select("id, order_id, description, amount, type")
      .eq("id", expenseId)
      .maybeSingle();

    if (expErr || !expense) {
      console.error("Expense not found", expErr);
      return json({ ok: false, error: "Expense not found" });
    }

    if (expense.order_id) {
      return json({ ok: false, error: "Order-linked transactions cannot be deleted" });
    }

    // Load admin email address from settings
    const { data: siteSettings, error: settingsErr } = await admin
      .from("site_settings")
      .select("email")
      .maybeSingle();

    if (settingsErr) {
      console.error("Failed to read site settings", settingsErr);
      return json({ ok: false, error: "Failed to read admin email" });
    }

    const adminEmail = siteSettings?.email;
    if (!adminEmail) {
      return json({ ok: false, error: "Admin email not configured" });
    }

    if (step === "request") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        return json({ ok: false, error: "Email service not configured" });
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
        return json({ ok: false, error: "Failed to create verification" });
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

      try {
        await sendEmail({ apiKey: resendApiKey, to: adminEmail, subject, html });
      } catch (e) {
        console.error("sendEmail failed", e);
        return json({ ok: false, error: e instanceof Error ? e.message : "Email send failed" });
      }

      return json({ ok: true });
    }

    if (step === "confirm") {
      const normalized = String(code || "").replace(/\D/g, "");
      if (normalized.length !== 6) {
        return json({ ok: false, error: "Invalid code" });
      }

      const codeHash = await sha256Hex(normalized);

      const { data: latest, error: verErr } = await admin
        .from("admin_action_verifications")
        .select("id, code_hash, expires_at, used_at")
        .eq("action_type", "delete_expense")
        .eq("target_id", expenseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verErr) {
        console.error("verification load failed", verErr);
        return json({ ok: false, error: "Verification load failed" });
      }

      if (!latest) {
        return json({ ok: false, error: "No verification request found" });
      }

      if (latest.used_at) {
        return json({ ok: false, error: "Code already used" });
      }

      if (new Date(latest.expires_at).getTime() < Date.now()) {
        return json({ ok: false, error: "Code expired" });
      }

      if (latest.code_hash !== codeHash) {
        return json({ ok: false, error: "Wrong code" });
      }

      const { error: usedErr } = await admin
        .from("admin_action_verifications")
        .update({ used_at: new Date().toISOString() })
        .eq("id", latest.id);

      if (usedErr) {
        console.error("failed to mark used", usedErr);
        return json({ ok: false, error: "Failed to mark code as used" });
      }

      const { error: delErr } = await admin.from("expenses").delete().eq("id", expenseId);
      if (delErr) {
        console.error("delete expense failed", delErr);
        return json({ ok: false, error: "Delete failed" });
      }

      return json({ ok: true });
    }

    return json({ ok: false, error: "Unknown step" });
  } catch (e) {
    console.error("admin-expense-delete error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
});
