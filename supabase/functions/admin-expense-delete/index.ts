import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const step = body?.step;
    const expenseId = String(body?.expenseId ?? "").trim();
    const code = String(body?.code ?? "");

    if (!step || !expenseId) {
      return json({ ok: false, error: "Missing step or expenseId" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = (Deno.env.get("RESEND_API_KEY") ?? "").trim();

    const authHeader = req.headers.get("Authorization") ?? "";
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
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

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: expense, error: expErr } = await admin
      .from("expenses")
      .select("id, order_id, description, amount, type, created_at")
      .eq("id", expenseId)
      .maybeSingle();

    if (expErr || !expense) {
      console.error("Expense not found", expErr);
      return json({ ok: false, error: "Expense not found" });
    }

    const { data: siteSettings, error: settingsErr } = await admin
      .from("site_settings")
      .select("email")
      .maybeSingle();

    if (settingsErr) {
      console.error("Failed to read site settings", settingsErr);
    }

    const adminEmail = siteSettings?.email || userData.user.email || null;

    if (step === "request") {
      const plain = random6DigitCode();
      const codeHash = await sha256Hex(plain);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await admin
        .from("admin_action_verifications")
        .delete()
        .eq("action_type", "delete_expense")
        .eq("target_id", expenseId)
        .is("used_at", null);

      const { error: insErr } = await admin.from("admin_action_verifications").insert({
        action_type: "delete_expense",
        target_id: expenseId,
        email: adminEmail || "admin@local",
        code_hash: codeHash,
        expires_at: expiresAt,
      });

      if (insErr) {
        console.error("Insert verification failed", insErr);
        return json({ ok: false, error: "Failed to create verification" });
      }

      let emailSent = false;

      if (resendApiKey && adminEmail) {
        try {
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Kuantum Ticaret <onboarding@resend.dev>",
              to: [adminEmail],
              subject: "Gelir-Gider Silme Doğrulama Kodu",
              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
                  <h2>Gelir-Gider Silme Doğrulaması</h2>
                  <p>Aşağıdaki finans hareketini silmek için doğrulama kodu:</p>
                  <div style="padding: 12px; background: #f3f4f6; border-radius: 8px; display: inline-block;">
                    <span style="font-size: 24px; letter-spacing: 6px; font-weight: 700;">${plain}</span>
                  </div>
                  <p style="margin-top: 16px;"><strong>Açıklama:</strong> ${expense.description}</p>
                  <p><strong>Tutar:</strong> ${Number(expense.amount).toFixed(2)} TL</p>
                  <p><strong>Tür:</strong> ${expense.type === "income" ? "Gelir" : "Gider"}</p>
                  <p><strong>Kaynak:</strong> ${expense.order_id ? "Sipariş bağlantılı kayıt" : "Manuel kayıt"}</p>
                  <p style="margin-top: 16px; color: #6b7280;">Kod 10 dakika içinde geçersiz olur.</p>
                </div>
              `,
            }),
          });

          if (emailResponse.ok) {
            emailSent = true;
          } else {
            console.error(`Resend API error (${emailResponse.status}):`, await emailResponse.text());
          }
        } catch (emailErr) {
          console.error("Email sending failed:", emailErr);
        }
      }

      if (!emailSent) {
        return json({ ok: true, fallback_code: plain, message: "E-posta gönderilemedi. Kod ekranda gösterildi." });
      }

      return json({ ok: true });
    }

    if (step === "confirm") {
      const normalized = code.replace(/\D/g, "");
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
        console.error("Verification load failed", verErr);
        return json({ ok: false, error: "Verification load failed" });
      }

      if (!latest) return json({ ok: false, error: "No verification request found" });
      if (latest.used_at) return json({ ok: false, error: "Code already used" });
      if (new Date(latest.expires_at).getTime() < Date.now()) return json({ ok: false, error: "Code expired" });
      if (latest.code_hash !== codeHash) return json({ ok: false, error: "Wrong code" });

      const { error: usedErr } = await admin
        .from("admin_action_verifications")
        .update({ used_at: new Date().toISOString() })
        .eq("id", latest.id);

      if (usedErr) {
        console.error("Failed to mark used", usedErr);
        return json({ ok: false, error: "Failed to mark code as used" });
      }

      const { error: delErr } = await admin.from("expenses").delete().eq("id", expenseId);
      if (delErr) {
        console.error("Delete expense failed", delErr);
        return json({ ok: false, error: "Delete failed" });
      }

      const { error: logErr } = await admin.from("admin_activity_logs").insert({
        admin_id: userData.user.id,
        action_type: "expense_deleted",
        action_description: `Finans kaydı silindi: ${expense.description}`,
        target_table: "expenses",
        target_id: expenseId,
        metadata: {
          amount: expense.amount,
          type: expense.type,
          order_id: expense.order_id,
          created_at: expense.created_at,
        },
      });

      if (logErr) {
        console.error("Admin log insert failed", logErr);
      }

      return json({ ok: true });
    }

    return json({ ok: false, error: "Unknown step" });
  } catch (e) {
    console.error("admin-expense-delete error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
});
