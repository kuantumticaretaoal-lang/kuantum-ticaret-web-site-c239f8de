# Site Geliştirme Planı

Mevcut kod tabanı analiz edildi. Aşağıdaki iyileştirmeler tek komutla uygulanmaya hazır. Her madde bağımsız olarak uygulanabilir; onay verdiğinde hepsi sırayla yapılacak.

## 1. Performans & Core Web Vitals
- **Hero LCP**: `index.html` içine hero görseli için `<link rel="preload" as="image" fetchpriority="high">` ekle.
- **Route prefetch**: Navbar linklerine hover'da `import()` prefetch (Products, Cart, ProductDetail).
- **Image lazy + AVIF/WebP**: `vite-imagetools` ile ürün kart görsellerini otomatik dönüştür; `<img loading="lazy" decoding="async">` standardı.
- **Font display swap**: Google Fonts linkine `&display=swap` ve `preconnect`.
- **Bundle küçültme**: `framer-motion` gibi ağır kütüphaneleri sadece animasyon gerektiren bileşenlerde dinamik import.

## 2. SEO
- **Route başına meta**: FAQPage, PoliciesPage, ContactPage, SponsorsPage, FollowPage, PremiumPage, LoginPage, RegisterPage için eksik `<SEO>` bileşeni ekle.
- **JSON-LD**: Organization, WebSite (SearchAction), BreadcrumbList, Product, FAQPage şemaları.
- **Sitemap dinamik**: `scripts/generate-sitemap.ts` — ürün ve blog satırlarını Supabase'den çekip her build'de yaz.
- **robots.txt** Sitemap satırı ekle.
- **hreflang**: Aktif diller için `<link rel="alternate" hreflang>`.

## 3. Erişilebilirlik (a11y)
- Icon-only butonlara `aria-label` (Navbar, CartDrawer, FavoriteButton, ShareButtons).
- Tek `<main>` sarmalayıcı her route için.
- Kontrast: `text-muted-foreground/50` gibi düşük kontrastları token'a çevir.
- Focus-visible ring standartlaştır.
- Skip-to-content linki.

## 4. Dönüşüm & UX
- **Sepet kurtarma micro-CTA**: Ürün detayda "3 kişi bu ürünü sepete ekledi" (mevcut urgency verisi).
- **Wishlist → Sepete taşı** tek tıkla toplu.
- **Ödeme sonrası cross-sell**: Sipariş onayında "sıkça birlikte alınanlar".
- **Boş durumlar**: FavoritesPage, CartPage, SearchResults için illustrated empty states.
- **Loading skeleton'ları**: Products grid, ProductDetail için tam iskelet.
- **Toast → Sonner standardı** (çift toast sistemi var, tekilleştir).

## 5. Mobil
- Bottom nav'da aktif rota göstergesi (haptic hover).
- Sepet drawer'da swipe-to-close.
- Ürün galerisinde pinch-zoom (mevcut ImageZoom mobil optimize).
- Tap hedefleri min 44×44.

## 6. Güvenlik & Backend
- Rate-limit login endpoint'i (mevcut localStorage'ı server-side'a taşı — edge function).
- Newsletter double opt-in (Resend doğrulama e-postası).
- CSP header'ları `index.html`'e meta tag olarak.
- RLS denetimi: `visitor_analytics`, `filter_events`, `cart` tablolarında anon insert politikaları gözden geçir.

## 7. Admin Paneli
- **Dashboard KPI kartları**: bugün siparişler, ciro, dönüşüm oranı, terk sepet.
- **Grafikler**: Son 30 gün ciro/sipariş trend (recharts).
- **Hızlı aksiyonlar**: yeni ürün, kupon, banner.
- **Toplu işlem**: sipariş durumu bulk update, ürün stok bulk edit.
- **Excel export** tüm listelere.

## 8. Bileklik Simülatörü
- İpli/deri seçenekleri için farklı materyal preset'i.
- Ekran görüntüsü çözünürlük seçimi (1x/2x/3x).
- URL paylaşımı (query string ile konfig).
- Kayıtlı taslaklar (kullanıcı hesabına).

## 9. Analitik
- **Funnel raporu**: ziyaret → ürün detay → sepet → checkout → satın alma.
- **Isı haritası**: en çok tıklanan bölümler (basit event tracker).
- **Ürün performansı**: mevcut sekmeyi görsel grafiklerle zenginleştir.

## 10. İçerik & Pazarlama
- Blog yorumları.
- SSS içi arama.
- E-posta şablonlarını Resend/React Email ile modernize.
- WhatsApp destek butonu (mevcut sosyal medya verisinden).

## Teknik Notlar
- Tüm değişiklikler mevcut design token'ları (`index.css`) korur, hardcoded renk yok.
- Migration'lar `GRANT` blokları ile birlikte.
- TypeScript strict uyumlu, tsgo temiz.
- Sonrasında SEO scan otomatik tetiklenir.

## Uygulama Sırası
1. Perf + SEO meta (kritik, hemen ölçülebilir)
2. a11y düzeltmeleri
3. Admin dashboard & analitik
4. Bileklik & UX polisajları
5. Backend/güvenlik sertleştirme

Onayla, hepsini sırayla uygulayayım.