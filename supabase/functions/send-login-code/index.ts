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

function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeBackupCode(code: unknown) {
  return String(code ?? "").trim().toUpperCase();
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeRedirectUrl(rawUrl: unknown, req: Request) {
  const requestOrigin = req.headers.get("origin") ?? "https://kuantum-ticaret-web-site.lovable.app";
  const fallback = new URL("/account", requestOrigin).toString();

  if (!rawUrl) return fallback;

  try {
    const url = new URL(String(rawUrl));
    const allowedHosts = [
      new URL(requestOrigin).host,
      "kuantum-ticaret-web-site.lovable.app",
      "id-preview--67f2667a-2bfc-4afb-b383-88792d91ca22.lovable.app",
      "67f2667a-2bfc-4afb-b383-88792d91ca22.lovableproject.com",
    ];

    if (allowedHosts.includes(url.host)) {
      return url.toString();
    }
  } catch {
  }

  return fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { step, email, password, code, redirectTo } = await req.json().catch(() => ({}));
    const normalizedEmail = normalizeEmail(email);

    if (!step || !normalizedEmail) {
      return json({ ok: false, error: "Missing params" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = (Deno.env.get("RESEND_API_KEY") ?? "").trim();

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (step === "check") {
      if (!profile) {
        return json({ ok: true, twoFactorEnabled: false });
      }

      const { data: settings } = await admin
        .from("two_factor_settings")
        .select("is_enabled")
        .eq("user_id", profile.id)
        .maybeSingle();

      return json({ ok: true, twoFactorEnabled: settings?.is_enabled === true });
    }

    if (!profile) {
      return json({ ok: false, error: "Geçersiz bilgiler" });
    }

    async function issueLoginCode() {
      const plain = random6();
      const codeHash = await sha256(plain);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await admin
        .from("login_verification_codes")
        .delete()
        .eq("user_id", profile.id)
        .is("used_at", null);

      const { error: insertError } = await admin.from("login_verification_codes").insert({
        user_id: profile.id,
        email: normalizedEmail,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

      if (insertError) {
        console.error("Failed to create login code", insertError);
        throw new Error("Kod oluşturulamadı");
      }

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
              to: [normalizedEmail],
              subject: "Giriş Doğrulama Kodu",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
                  <h2 style="color:#111;">Giriş Doğrulama Kodu</h2>
                  <p>Hesabınıza giriş yapmak için aşağıdaki 6 haneli kodu kullanın:</p>
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
        } catch (error) {
          console.error("Email send failed:", error);
        }
      }

      return {
        ok: true,
        twoFactorRequired: true,
        ...(emailSent ? {} : { fallback_code: plain }),
      };
    }

    if (step === "prepare") {
      const plainPassword = String(password ?? "");
      if (!plainPassword) {
        return json({ ok: false, error: "Şifre gerekli" }, 400);
      }

      const { data: settings } = await admin
        .from("two_factor_settings")
        .select("is_enabled")
        .eq("user_id", profile.id)
        .maybeSingle();

      const twoFactorEnabled = settings?.is_enabled === true;

      const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: plainPassword,
      });

      if (signInError || !signInData.user) {
        return json({ ok: false, error: "E-posta veya şifre hatalı" });
      }

      if (!twoFactorEnabled) {
        return json({ ok: true, twoFactorRequired: false });
      }

      return json(await issueLoginCode());
    }

    if (step === "send") {
      const { data: settings } = await admin
        .from("two_factor_settings")
        .select("is_enabled")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (settings?.is_enabled !== true) {
        return json({ ok: false, error: "2FA aktif değil" });
      }

      return json(await issueLoginCode());
    }

    if (step === "verify") {
      const normalizedCode = String(code ?? "").replace(/\D/g, "");
      if (normalizedCode.length !== 6) {
        return json({ ok: false, error: "Kod gerekli" }, 400);
      }

      const codeHash = await sha256(normalizedCode);

      const { data: latest } = await admin
        .from("login_verification_codes")
        .select("id, code_hash, expires_at, used_at")
        .eq("user_id", profile.id)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) return json({ ok: false, error: "Kod bulunamadı" });
      if (latest.used_at) return json({ ok: false, error: "Kod zaten kullanılmış" });
      if (new Date(latest.expires_at).getTime() < Date.now()) return json({ ok: false, error: "Kodun süresi dolmuş" });
      if (latest.code_hash !== codeHash) return json({ ok: false, error: "Kod hatalı" });

      const { error: updateError } = await admin
        .from("login_verification_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", latest.id);

      if (updateError) {
        console.error("Failed to consume login code", updateError);
        return json({ ok: false, error: "Kod kullanılamadı" });
      }

      return json({ ok: true, verified: true });
    }

    if (step === "backup_recovery") {
      const normalizedCode = normalizeBackupCode(code);
      if (!normalizedCode) {
        return json({ ok: false, error: "Yedek kod gerekli" }, 400);
      }

      const codeHash = await sha256(normalizedCode);

      const { data: matchingCode } = await admin
        .from("backup_codes")
        .select("id")
        .eq("user_id", profile.id)
        .eq("code", codeHash)
        .eq("used", false)
        .maybeSingle();

      if (!matchingCode) {
        return json({ ok: false, error: "Yedek kod geçersiz veya kullanılmış" });
      }

      const { error: consumeError } = await admin
        .from("backup_codes")
        .update({ used: true, used_at: new Date().toISOString() })
        .eq("id", matchingCode.id);

      if (consumeError) {
        console.error("Failed to consume backup code", consumeError);
        return json({ ok: false, error: "Yedek kod kullanılamadı" });
      }

      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
          redirectTo: safeRedirectUrl(redirectTo, req),
        },
      });

      const recoveryLink = linkData?.properties?.action_link;

      if (linkError || !recoveryLink) {
        console.error("Failed to generate recovery link", linkError);
        return json({ ok: false, error: "Şifre sıfırlama bağlantısı oluşturulamadı" });
      }

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
              to: [normalizedEmail],
              subject: "Şifre Sıfırlama Bağlantısı",
              html: `
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
                  <h2 style="color:#111;">Şifre Sıfırlama</h2>
                  <p>Yedek kod doğrulaması başarılı oldu. Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanın:</p>
                  <p style="margin:24px 0;">
                    <a href="${recoveryLink}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#111;color:#fff;text-decoration:none;font-weight:700;">Şifremi Sıfırla</a>
                  </p>
                  <p style="color:#6b7280;font-size:14px;">Bu bağlantı tek kullanımlıktır. Eğer bu işlemi siz yapmadıysanız hesabınızı kontrol edin.</p>
                </div>
              `,
            }),
          });

          emailSent = resp.ok;
          if (!resp.ok) console.error("Resend recovery error:", await resp.text());
        } catch (error) {
          console.error("Recovery email send failed:", error);
        }
      }

      if (!emailSent) {
        return json({ ok: true, reset_link: recoveryLink, fallback_used: true });
      }

      return json({ ok: true, email_sent: true });
    }

    return json({ ok: false, error: "Unknown step" }, 400);
  } catch (e) {
    console.error("send-login-code error:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
