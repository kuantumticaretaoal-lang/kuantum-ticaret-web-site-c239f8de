import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");


const buildInvoiceHTML = (order: any, profile: any): string => {
  const items = order.order_items || [];
  const itemRows = items.map((item: any, i: number) => `
    <tr>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #ddd;padding:8px">${esc(item.products?.title || item.custom_name || '-')}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${esc(item.selected_size || '-')}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${Number(item.quantity) || 0}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right">₺${(Number(item.price)||0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right">₺${((Number(item.price)||0) * (Number(item.quantity)||0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const subtotal = Number(order.subtotal_amount) || items.reduce((s: number, it: any) => s + (Number(it.price)||0) * (Number(it.quantity)||0), 0);
  const discount = Number(order.discount_amount) || 0;
  const shipping = Number(order.shipping_fee) || 0;
  const total = Number(order.total_amount) || (subtotal - discount + shipping);
  const customerName = esc(profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || '-' : '-');
  const customerEmail = esc(profile?.email || '-');
  const customerPhone = esc(profile?.phone || '-');
  const customerAddress = esc(profile ? `${profile.address ?? ''}, ${profile.district ?? ''}, ${profile.province ?? ''}` : '-');
  const invoiceDate = esc(new Date(order.created_at).toLocaleDateString('tr-TR'));
  const orderCode = esc(order.order_code || '-');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fatura ${orderCode}</title></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:800px;margin:0 auto;padding:40px">
  ${order.returned_at ? `<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin-bottom:24px;color:#991b1b"><div style="font-weight:bold">⚠ İADE EDİLEN SİPARİŞ</div><div style="font-size:13px">Bu sipariş ${esc(new Date(order.returned_at).toLocaleString('tr-TR'))} tarihinde başarıyla iade edilmiştir.</div></div>` : ''}
  <div style="display:flex;justify-content:space-between;border-bottom:3px solid #1e40af;padding-bottom:20px;margin-bottom:30px">
    <div><h2 style="color:#1e40af;margin:0">KUANTUM TİCARET</h2><div style="font-size:12px;color:#666">E-Ticaret Hizmetleri</div></div>
    <div style="text-align:right"><h2 style="color:#1e40af;margin:0">FATURA</h2><div style="font-size:13px"><strong>No:</strong> ${orderCode}</div><div style="font-size:13px"><strong>Tarih:</strong> ${invoiceDate}</div></div>
  </div>
  <div style="margin-bottom:20px">
    <strong>Müşteri:</strong> ${customerName}<br/>
    <strong>E-posta:</strong> ${customerEmail}<br/>
    <strong>Telefon:</strong> ${customerPhone}<br/>
    <strong>Adres:</strong> ${customerAddress}
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <thead><tr style="background:#1e40af;color:white">
      <th style="padding:8px">#</th><th style="padding:8px;text-align:left">Ürün</th><th>Beden</th><th>Adet</th><th>Birim</th><th>Toplam</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div style="margin-left:auto;width:300px">
    <div style="display:flex;justify-content:space-between;padding:4px 0">Ara Toplam:<span>₺${subtotal.toLocaleString('tr-TR',{minimumFractionDigits:2})}</span></div>
    ${discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#dc2626">İndirim:<span>-₺${discount.toLocaleString('tr-TR',{minimumFractionDigits:2})}</span></div>` : ''}
    ${shipping > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0">Kargo:<span>₺${shipping.toLocaleString('tr-TR',{minimumFractionDigits:2})}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;border-top:2px solid #1e40af;padding-top:10px;font-weight:bold;font-size:16px;color:#1e40af">Genel Toplam:<span>₺${total.toLocaleString('tr-TR',{minimumFractionDigits:2})}</span></div>
  </div>
  <div style="margin-top:40px;text-align:center;font-size:12px;color:#999;border-top:1px solid #e5e7eb;padding-top:16px">Teşekkür ederiz! • Kuantum Ticaret</div>
</body></html>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // AUTH: accept either (a) the service role key (internal callers / DB triggers)
    // or (b) an admin user's JWT. Regular users cannot trigger invoice emails.
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    let authorized = false;
    if (bearer && bearer === serviceKey) {
      authorized = true;
    } else if (bearer) {
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

    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .select("*, order_items(*, products(title))")
      .eq("id", orderId)
      .maybeSingle();

    if (oErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Skip cancelled/rejected/trashed/pending
    if (order.status === "pending" || order.status === "rejected" || order.trashed) {
      return new Response(JSON.stringify({ skipped: true, reason: "Order not eligible" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, phone, address, district, province")
      .eq("id", order.user_id)
      .maybeSingle();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "Customer email not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const html = buildInvoiceHTML(order, profile);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (RESEND_API_KEY) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Kuantum Ticaret <onboarding@resend.dev>",
          to: [profile.email],
          subject: `Faturanız - Sipariş ${order.order_code}`,
          html: `<p>Merhaba ${esc(profile.first_name ?? '')},</p><p>Siparişiniz onaylandı. Faturanız aşağıdadır:</p>${html}`,
        }),
      });
      const emailJson = await emailRes.json();
      if (!emailRes.ok) {
        console.error("Resend error:", emailJson);
      }
    }

    await supabase.from("orders").update({ invoice_sent_at: new Date().toISOString() }).eq("id", orderId);
    await supabase.from("notifications").insert({
      user_id: order.user_id,
      message: `🧾 Faturanız hazır — Sipariş #${order.order_code}. Geçmiş siparişlerinizden indirebilirsiniz.`,
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-order-invoice error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
