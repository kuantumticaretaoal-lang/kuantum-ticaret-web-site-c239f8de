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

function random6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { step, email, code } = await req.json().catch(() => ({}));
    if (!step || !email) return json({ ok: false, error: "Missing params" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Find user by email
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (!profile) return json({ ok: false, error: "User not found" });

    if (step === "check") {
      // Check if 2FA is enabled for this user
      const { data: settings } = await admin
        .from("two_factor_settings")
        .select("is_enabled")
        .eq("user_id", profile.id)
        .maybeSingle();

      return json({ ok: true, twoFactorEnabled: settings?.is_enabled === true });
    }

    if (step === "send") {
      const plain = random6();
      const codeHash = await sha256(plain);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Clean old codes
      await admin
        .from("login_verification_codes")
        .delete()
        .eq("user_id", profile.id)
        .is("used_at", null);

      // Insert new code
      await admin.from("login_verification_codes").insert({
        user_id: profile.id,
        email: email.toLowerCase(),
        code_hash: codeHash,
        expires_at: expiresAt,
      });

      // Send email via Resend
      const resendKey = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
      let emailSent = false;

      if (resendKey) {
        try {
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Kuantum Ticaret <onboarding@resend.dev>",
              to: [email.toLowerCase()],
              subject: "Giriş Doğrulama Kodu",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
                  <h2 style="color:#111;">Giriş Doğrulama Kodu</h2>
                  <p>Hesabınıza giriş yapmak için aşağıdaki kodu kullanın:</p>
                  <div style="padding:16px;background:#f3f4f6;border-radius:8px;text-align:center;margin:20px 0;">
                    <span style="font-size:32px;letter-spacing:8px;font-weight:700;color:#111;">${plain}</span>
                  </div>
                  <p style="color:#6b7280;font-size:14px;">Bu kod 10 dakika içinde geçersiz olacaktır.</p>
                  <p style="color:#6b7280;font-size:14px;">Bu isteği siz yapmadıysanız bu e-postayı görmezden gelin.</p>
                </div>
              `,
            }),
          });
          emailSent = resp.ok;
          if (!resp.ok) console.error("Resend error:", await resp.text());
        } catch (e) {
          console.error("Email send failed:", e);
        }
      }

      if (!emailSent) {
        // Fallback: return code directly (dev mode)
        return json({ ok: true, fallback_code: plain });
      }

      return json({ ok: true });
    }

    if (step === "verify") {
      if (!code) return json({ ok: false, error: "Code required" }, 400);

      const codeHash = await sha256(String(code).replace(/\D/g, ""));

      const { data: latest } = await admin
        .from("login_verification_codes")
        .select("id, code_hash, expires_at, used_at")
        .eq("user_id", profile.id)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) return json({ ok: false, error: "No code found" });
      if (latest.used_at) return json({ ok: false, error: "Code already used" });
      if (new Date(latest.expires_at).getTime() < Date.now()) return json({ ok: false, error: "Code expired" });
      if (latest.code_hash !== codeHash) return json({ ok: false, error: "Wrong code" });

      // Mark as used
      await admin
        .from("login_verification_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", latest.id);

      return json({ ok: true, verified: true });
    }

    return json({ ok: false, error: "Unknown step" }, 400);
  } catch (e) {
    console.error("send-login-code error:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
