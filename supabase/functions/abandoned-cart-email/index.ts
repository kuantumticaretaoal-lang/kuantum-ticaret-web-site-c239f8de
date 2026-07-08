import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AbandonedCartRequest {
  userId?: string;
  checkAll?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // AUTH: internal callers must present the service role key; admin JWTs also accepted.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let authorized = bearer === supabaseServiceKey;
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, checkAll }: AbandonedCartRequest = await req.json();

    // Terk edilmiş sepetleri kontrol et (24 saat önce güncellenen ve hala aktif olan)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("cart")
      .select(`
        user_id,
        products (
          title,
          price,
          discounted_price,
          product_images (image_url)
        )
      `)
      .lt("updated_at", twentyFourHoursAgo)
      .not("user_id", "is", null);

    if (userId && !checkAll) {
      query = query.eq("user_id", userId);
    }

    const { data: cartItems, error: cartError } = await query;

    if (cartError) {
      console.error("Error fetching cart items:", cartError);
      throw cartError;
    }

    if (!cartItems || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No abandoned carts found" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Kullanıcılara göre sepetleri grupla
    const userCarts: Record<string, any[]> = {};
    for (const item of cartItems) {
      if (item.user_id) {
        if (!userCarts[item.user_id]) {
          userCarts[item.user_id] = [];
        }
        userCarts[item.user_id].push(item);
      }
    }

    const emailsSent: string[] = [];
    const errors: string[] = [];

    for (const [uid, items] of Object.entries(userCarts)) {
      // Daha önce hatırlatma gönderilip gönderilmediğini kontrol et
      const { data: existingReminder } = await supabase
        .from("abandoned_cart_reminders")
        .select("id")
        .eq("user_id", uid)
        .eq("email_sent", true)
        .gte("sent_at", twentyFourHoursAgo)
        .maybeSingle();

      if (existingReminder) {
        continue; // Son 24 saatte zaten e-posta gönderilmiş
      }

      // Kullanıcı bilgilerini al
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("id", uid)
        .single();

      if (!profile?.email) {
        continue;
      }

      // Ürün listesini oluştur
      const productList = items.map((item: any) => {
        const product = item.products;
        const price = product.discounted_price || product.price;
        return `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              ${product.title}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
              ₺${parseFloat(price).toFixed(2)}
            </td>
          </tr>
        `;
      }).join("");

      // E-posta gönder
      try {
        await resend.emails.send({
          from: "Kuantum Mağaza <onboarding@resend.dev>",
          to: [profile.email],
          subject: "Sepetinizde ürünler bekliyor! 🛒",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #fff; padding: 30px; border: 1px solid #eee; }
                .products { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Merhaba ${profile.first_name || ""}! 👋</h1>
                  <p>Sepetinizde sizi bekleyen ürünler var!</p>
                </div>
                <div class="content">
                  <p>Sepetinize eklediğiniz ürünleri unutmadınız değil mi?</p>
                  
                  <table class="products">
                    <thead>
                      <tr>
                        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #667eea;">Ürün</th>
                        <th style="text-align: right; padding: 10px; border-bottom: 2px solid #667eea;">Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${productList}
                    </tbody>
                  </table>
                  
                  <p style="text-align: center;">
                    <a href="${supabaseUrl.replace('.supabase.co', '')}/cart" class="cta-button">
                      Sepetime Git →
                    </a>
                  </p>
                  
                  <p style="color: #888; font-size: 14px;">
                    Bu ürünler stoklarla sınırlıdır. Kaçırmadan siparişinizi tamamlayın!
                  </p>
                </div>
                <div class="footer">
                  <p>Bu e-postayı almak istemiyorsanız, hesap ayarlarınızdan bildirim tercihlerinizi güncelleyebilirsiniz.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        // Hatırlatma kaydı oluştur
        await supabase.from("abandoned_cart_reminders").insert({
          user_id: uid,
          cart_snapshot: items,
          email_sent: true,
          sent_at: new Date().toISOString(),
        });

        emailsSent.push(profile.email);
      } catch (emailError: any) {
        console.error(`Error sending email to ${profile.email}:`, emailError);
        errors.push(profile.email);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        emails: emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in abandoned-cart-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
