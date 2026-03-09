export const generateInvoicePDF = (order: any, profile: any): void => {
  // Build invoice content as HTML string, then use browser print
  const items = order.order_items || [];
  const itemRows = items.map((item: any, i: number) => `
    <tr>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${i + 1}</td>
      <td style="border:1px solid #ddd;padding:8px">${item.products?.title || item.custom_name || '-'}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${item.selected_size || '-'}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:center">${item.quantity}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right">₺${Number(item.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
      <td style="border:1px solid #ddd;padding:8px;text-align:right">₺${(Number(item.price) * item.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  const subtotal = Number(order.subtotal_amount) || items.reduce((s: number, it: any) => s + Number(it.price) * it.quantity, 0);
  const discount = Number(order.discount_amount) || 0;
  const shipping = Number(order.shipping_fee) || 0;
  const total = Number(order.total_amount) || (subtotal - discount + shipping);

  const customerName = profile ? `${profile.first_name} ${profile.last_name}` : '-';
  const customerAddress = profile ? `${profile.address}, ${profile.district}, ${profile.province}` : '-';
  const customerPhone = profile?.phone || '-';
  const customerEmail = profile?.email || '-';

  const invoiceDate = new Date(order.created_at).toLocaleDateString('tr-TR');

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>Fatura - ${order.order_code}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 40px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #1e40af; }
        .invoice-title { font-size: 28px; font-weight: bold; color: #1e40af; text-align: right; }
        .invoice-meta { text-align: right; margin-top: 8px; font-size: 14px; color: #666; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
        .info-label { font-size: 12px; color: #666; margin-bottom: 2px; }
        .info-value { font-size: 14px; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #1e40af; color: white; padding: 10px 8px; text-align: left; font-size: 13px; }
        td { font-size: 13px; }
        .totals { margin-left: auto; width: 300px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .total-row.final { border-top: 2px solid #1e40af; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: bold; color: #1e40af; }
        .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        @media print { body { padding: 20px; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">KUANTUM TİCARET</div>
          <div style="font-size:12px;color:#666;margin-top:4px">E-Ticaret Hizmetleri</div>
        </div>
        <div>
          <div class="invoice-title">FATURA</div>
          <div class="invoice-meta">
            <div><strong>Fatura No:</strong> ${order.order_code}</div>
            <div><strong>Tarih:</strong> ${invoiceDate}</div>
          </div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <div class="section-title">Müşteri Bilgileri</div>
          <div class="info-label">Ad Soyad</div>
          <div class="info-value">${customerName}</div>
          <div class="info-label" style="margin-top:8px">Telefon</div>
          <div class="info-value">${customerPhone}</div>
          <div class="info-label" style="margin-top:8px">E-posta</div>
          <div class="info-value">${customerEmail}</div>
        </div>
        <div class="info-box">
          <div class="section-title">Teslimat Bilgileri</div>
          <div class="info-label">Teslimat Tipi</div>
          <div class="info-value">${order.delivery_type === 'home_delivery' ? 'Adrese Teslim' : 'Yerinden Teslim'}</div>
          <div class="info-label" style="margin-top:8px">Adres</div>
          <div class="info-value">${customerAddress}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title" style="margin-bottom:12px">Sipariş Detayları</div>
        <table>
          <thead>
            <tr>
              <th style="width:40px;text-align:center">#</th>
              <th>Ürün</th>
              <th style="width:80px;text-align:center">Beden</th>
              <th style="width:60px;text-align:center">Adet</th>
              <th style="width:100px;text-align:right">Birim Fiyat</th>
              <th style="width:100px;text-align:right">Toplam</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div class="total-row"><span>Ara Toplam:</span><span>₺${subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span></div>
        ${discount > 0 ? `<div class="total-row" style="color:#dc2626"><span>İndirim:</span><span>-₺${discount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span></div>` : ''}
        ${shipping > 0 ? `<div class="total-row"><span>Kargo:</span><span>₺${shipping.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span></div>` : ''}
        ${order.applied_coupon_code ? `<div class="total-row" style="color:#16a34a"><span>Kupon:</span><span>${order.applied_coupon_code}</span></div>` : ''}
        <div class="total-row final"><span>Genel Toplam:</span><span>₺${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span></div>
      </div>

      <div class="footer">
        <p>Bu fatura ${invoiceDate} tarihinde Kuantum Ticaret tarafından düzenlenmiştir.</p>
        <p style="margin-top:4px">Teşekkür ederiz!</p>
      </div>

      <div class="no-print" style="text-align:center;margin-top:30px">
        <button onclick="window.print()" style="background:#1e40af;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:16px;cursor:pointer">
          Yazdır / PDF Olarak Kaydet
        </button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};
