import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ---------- Sanitization helpers (prevent stored XSS in invoice output) ----------
const escapeHtml = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
};

const safeNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (v: unknown): string =>
  safeNumber(v).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const safeDate = (v: unknown): string => {
  try {
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
};

const safeDateTime = (v: unknown): string => {
  try {
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("tr-TR");
  } catch {
    return "-";
  }
};

export const buildInvoiceHTML = (order: any, profile: any): string => {
  const items = Array.isArray(order?.order_items) ? order.order_items : [];
  const itemRows = items
    .map((item: any, i: number) => {
      const orns = Array.isArray(item?.selected_ornaments) ? item.selected_ornaments : [];
      const ornText =
        orns.length > 0
          ? `<div style="font-size:11px;color:#6b7280;margin-top:4px">Süsler: ${orns
              .map(
                (o: any) =>
                  `${escapeHtml(o?.name)} x${safeNumber(o?.quantity)} (+₺${fmtMoney(o?.extra_price)})`
              )
              .join(", ")}</div>`
          : "";
      const productTitle = escapeHtml(item?.products?.title || item?.custom_name || "-");
      const size = escapeHtml(item?.selected_size || "-");
      const qty = safeNumber(item?.quantity);
      const unit = safeNumber(item?.price);
      return `
    <tr>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #ddd;padding:8px">${productTitle}${ornText}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${size}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${qty}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right">₺${fmtMoney(unit)}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right">₺${fmtMoney(unit * qty)}</td>
    </tr>
  `;
    })
    .join("");

  const subtotal =
    safeNumber(order?.subtotal_amount) ||
    items.reduce((s: number, it: any) => s + safeNumber(it?.price) * safeNumber(it?.quantity), 0);
  const discount = safeNumber(order?.discount_amount);
  const shipping = safeNumber(order?.shipping_fee);
  const total = safeNumber(order?.total_amount) || subtotal - discount + shipping;

  const customerName = escapeHtml(
    profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "-" : "-"
  );
  const customerAddress = escapeHtml(
    profile ? `${profile.address ?? ""}, ${profile.district ?? ""}, ${profile.province ?? ""}` : "-"
  );
  const customerPhone = escapeHtml(profile?.phone || "-");
  const customerEmail = escapeHtml(profile?.email || "-");
  const invoiceDate = escapeHtml(safeDate(order?.created_at));
  const orderCode = escapeHtml(order?.order_code || "-");
  const deliveryLabel = order?.delivery_type === "home_delivery" ? "Adrese Teslim" : "Yerinden Teslim";
  const couponCode = order?.applied_coupon_code ? escapeHtml(order.applied_coupon_code) : "";
  const returnedBanner = order?.returned_at
    ? `<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin-bottom:24px;color:#991b1b"><div style="font-weight:bold;font-size:16px;margin-bottom:4px">⚠ İADE EDİLEN SİPARİŞ</div><div style="font-size:13px">Bu sipariş ${escapeHtml(safeDateTime(order.returned_at))} tarihinde başarıyla iade edilmiştir.</div></div>`
    : "";

  return `
    <!DOCTYPE html>
    <html lang="tr"><head><meta charset="UTF-8"><title>Fatura - ${orderCode}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Segoe UI',Tahoma,sans-serif; color:#333; padding:40px; max-width:800px; margin:0 auto; background:#fff; }
      .header { display:flex; justify-content:space-between; border-bottom:3px solid #1e40af; padding-bottom:20px; margin-bottom:30px; }
      .company-name { font-size:24px; font-weight:bold; color:#1e40af; }
      .invoice-title { font-size:28px; font-weight:bold; color:#1e40af; text-align:right; }
      .invoice-meta { text-align:right; margin-top:8px; font-size:14px; color:#666; }
      .section-title { font-size:14px; font-weight:bold; color:#1e40af; margin-bottom:8px; text-transform:uppercase; letter-spacing:1px; }
      .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:30px; }
      .info-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; }
      .info-label { font-size:12px; color:#666; margin-bottom:2px; }
      .info-value { font-size:14px; font-weight:500; }
      table { width:100%; border-collapse:collapse; margin-bottom:24px; }
      th { background:#1e40af; color:white; padding:10px 8px; text-align:left; font-size:13px; }
      td { font-size:13px; }
      .totals { margin-left:auto; width:300px; }
      .total-row { display:flex; justify-content:space-between; padding:6px 0; font-size:14px; }
      .total-row.final { border-top:2px solid #1e40af; margin-top:8px; padding-top:12px; font-size:18px; font-weight:bold; color:#1e40af; }
      .footer { margin-top:60px; text-align:center; font-size:12px; color:#999; border-top:1px solid #e2e8f0; padding-top:20px; }
      @media print { body { padding:20px; } .no-print { display:none; } }
    </style></head><body>
      ${returnedBanner}
      <div class="header">
        <div><div class="company-name">KUANTUM TİCARET</div><div style="font-size:12px;color:#666;margin-top:4px">E-Ticaret Hizmetleri</div></div>
        <div><div class="invoice-title">FATURA</div><div class="invoice-meta"><div><strong>Fatura No:</strong> ${orderCode}</div><div><strong>Tarih:</strong> ${invoiceDate}</div></div></div>
      </div>
      <div class="info-grid">
        <div class="info-box"><div class="section-title">Müşteri Bilgileri</div>
          <div class="info-label">Ad Soyad</div><div class="info-value">${customerName}</div>
          <div class="info-label" style="margin-top:8px">Telefon</div><div class="info-value">${customerPhone}</div>
          <div class="info-label" style="margin-top:8px">E-posta</div><div class="info-value">${customerEmail}</div>
        </div>
        <div class="info-box"><div class="section-title">Teslimat Bilgileri</div>
          <div class="info-label">Teslimat Tipi</div><div class="info-value">${deliveryLabel}</div>
          <div class="info-label" style="margin-top:8px">Adres</div><div class="info-value">${customerAddress}</div>
        </div>
      </div>
      <div><div class="section-title" style="margin-bottom:12px">Sipariş Detayları</div>
        <table><thead><tr><th style="width:40px;text-align:center">#</th><th>Ürün</th><th style="width:80px;text-align:center">Beden</th><th style="width:60px;text-align:center">Adet</th><th style="width:100px;text-align:right">Birim Fiyat</th><th style="width:100px;text-align:right">Toplam</th></tr></thead>
        <tbody>${itemRows}</tbody></table>
      </div>
      <div class="totals">
        <div class="total-row"><span>Ara Toplam:</span><span>₺${fmtMoney(subtotal)}</span></div>
        ${discount > 0 ? `<div class="total-row" style="color:#dc2626"><span>İndirim:</span><span>-₺${fmtMoney(discount)}</span></div>` : ""}
        ${shipping > 0 ? `<div class="total-row"><span>Kargo:</span><span>₺${fmtMoney(shipping)}</span></div>` : ""}
        ${couponCode ? `<div class="total-row" style="color:#16a34a"><span>Kupon:</span><span>${couponCode}</span></div>` : ""}
        <div class="total-row final"><span>Genel Toplam:</span><span>₺${fmtMoney(total)}</span></div>
      </div>
      <div class="footer"><p>Bu fatura ${invoiceDate} tarihinde Kuantum Ticaret tarafından düzenlenmiştir.</p><p style="margin-top:4px">Teşekkür ederiz!</p></div>
    </body></html>`;
};

// Open invoice in a new isolated window. We inject the sanitized HTML via
// srcdoc + sandbox to strictly prevent any residual script execution.
export const viewInvoice = (order: any, profile: any): void => {
  const html = buildInvoiceHTML(order, profile);
  const wrapper = `${html}<div style="text-align:center;margin-top:20px" class="no-print"><button onclick="window.print()" style="background:#1e40af;color:#fff;border:0;padding:10px 24px;border-radius:6px;cursor:pointer;margin-right:8px">Yazdır</button></div>`;
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  // Build a shell page whose only body is a sandboxed iframe rendering the invoice.
  // The iframe has NO allow-scripts token, so any injected <script> is inert.
  const shell = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Fatura</title>
<style>html,body{margin:0;padding:0;height:100%;background:#f3f4f6}iframe{border:0;width:100%;height:100vh;background:#fff}</style>
</head><body><iframe sandbox="allow-same-origin allow-modals allow-popups" srcdoc="${wrapper
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")}"></iframe></body></html>`;
  w.document.open();
  w.document.write(shell);
  w.document.close();
};

// Download invoice as a real PDF file (rendered off-screen; content is sanitized above)
export const downloadInvoicePDF = async (order: any, profile: any): Promise<void> => {
  const html = buildInvoiceHTML(order, profile);
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "800px";
  container.style.background = "#fff";
  container.innerHTML = html;
  // Defense-in-depth: strip any <script> nodes that could have slipped through
  container.querySelectorAll("script").forEach((n) => n.remove());
  document.body.appendChild(container);

  try {
    const body = (container.querySelector("body") as HTMLElement) || container;
    const canvas = await html2canvas(body, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(`Fatura-${(order?.order_code || order?.id || "kayit").toString().replace(/[^\w-]/g, "_")}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};

// Backward compat
export const generateInvoicePDF = viewInvoice;
