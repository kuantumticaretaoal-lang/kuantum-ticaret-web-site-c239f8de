
# Kapsamlı Site İyileştirme Planı

Amaç: Tüm cihazlarda sorunsuz görünüm, ekrana sığmayan öğelerin düzeltilmesi, gerçek verilere bağlı istatistikler ve göze çarpan görsel/UX iyileştirmeleri.

## 1. Acil Düzeltmeler (Responsive & Konumlandırma)

### Çerez Bannerı (CookieConsent)
- Mobilde tam ekran yerine alt kısımda kompakt, kaydırılabilir kart olarak yeniden tasarla
- Maksimum yükseklik `max-h-[80vh]` + iç scroll, buton grubunu sticky footer yap
- Küçük ekranlarda (< 400px) tek kolon layout, ikonları küçült
- Safe-area padding (iOS notch) ekle

### AI Chatbot (LiveSupportWidget)
- Mobil bottom nav ile çakışmayı önle: `bottom-20 md:bottom-6` konumlandırma
- Açık durumdayken pencere boyutu `w-[calc(100vw-2rem)] max-w-sm` + `max-h-[70vh]`
- Z-index hiyerarşisini düzelt (banner > widget > nav)

### Exit Intent Popup
- Mobilde tetiklenmesin (scroll-up trigger'a çevir), padding küçült

## 2. Gerçek Veri Entegrasyonu

### HeroStats Düzeltmesi
- Şu an `Math.max(count, 50)` gibi minimum floor değerleri var — bunları kaldır, gerçek sayıları göster
- `delivered` sipariş sayısı: doğrudan `orders` tablosundan
- Müşteri sayısı: en az 1 delivered siparişi olan unique `user_id` sayısı (sadece kayıtlı değil, gerçekten alışveriş yapmış)
- Ortalama puan: `product_reviews.rating` ortalaması (gerçek yıldız), yoksa alanı gizle
- Kargo süresi: `shipping_settings`'ten ortalama teslim süresi
- Loading skeleton ekle, boş veri durumunda ilgili stat'ı gizle

## 3. Görünür UX/UI İyileştirmeleri

Aşağıdaki değişiklikler kullanıcı ve admin tarafından ilk bakışta fark edilecek şekilde tasarlanır:

### 3.1 Hero Bölümü Yenileme
- Sağdaki büyük statik logo kartını kaldır → yerine dönen/parlayan ürün karuseli (öne çıkan 3-4 ürün)
- Arka plana animasyonlu gradient blob efekti
- Başlık font-weight ve boyut hiyerarşisi güçlendir

### 3.2 Ürün Kartları
- Hover efektlerini güçlendir: subtle lift + shadow-glow
- "Yeni", "Çok Satan", "Stokta Az" rozetleri (halihazırda urgency var, görsel olarak iyileştir)
- Favori kalp animasyonu (pulse + fill transition)
- Mobilde 2 kolon grid, tap feedback

### 3.3 Navbar
- Scroll'da glassmorphism efekti (backdrop-blur intensifikasyon)
- Aktif route için altı çizili gösterge animasyonu
- Sepet ikonu üzerinde ürün eklendiğinde bounce animasyonu

### 3.4 Mobil Bottom Nav
- Aktif tab için renkli pill background + haptic-feedback benzeri scale animation
- Bildirim/sepet badge'leri daha görünür

### 3.5 Loading States
- Tüm sayfalarda skeleton loader'ları standartlaştır
- Route geçişlerinde ince top progress bar (nprogress benzeri)

### 3.6 Ürün Detay Sayfası
- Sticky "Sepete Ekle" barı (mobilde ekranın altında sabit)
- Görsel galeri: zoom + swipe iyileştirme
- "Bu üründen kaç kişi bakıyor" real-time gösterge (mevcut urgency'yi öne çıkar)

### 3.7 Sepet & Checkout
- Adım göstergesi (Sepet → Adres → Ödeme) progress bar
- Boş sepet için illustrated empty state
- Kupon input inline feedback (yeşil check / kırmızı X)

### 3.8 Footer
- Sosyal medya ikonlarına hover animasyonları
- Newsletter kayıt form'unu görsel olarak öne çıkar

### 3.9 Renk & Tipografi Rafinasyonu
- Semantic token'lar korunur; `--shadow-elegant` ve `--gradient-primary` daha aktif kullanılır
- H1/H2 için display font ağırlığı artırılır

## 4. Erişilebilirlik & Performans
- Tüm interaktif öğelere `focus-visible` ring
- `prefers-reduced-motion` respect edilir (animasyonlar devre dışı)
- Görsel `loading="lazy"` + `decoding="async"` denetimi
- Hero image preload zaten mevcut, koru

## Teknik Detaylar

### Değişecek Dosyalar
- `src/components/CookieConsent.tsx` — mobil layout yeniden
- `src/components/LiveSupportWidget.tsx` — konum ve boyut
- `src/components/ExitIntentPopup.tsx` — mobil davranış
- `src/components/HeroStats.tsx` — gerçek query'ler, floor kaldırma
- `src/components/HeroSection.tsx` — sağ karusel
- `src/components/Navbar.tsx` — scroll glassmorphism
- `src/components/MobileBottomNav.tsx` — aktif indicator
- `src/components/ProductCardImage.tsx` — hover efekt
- `src/components/Footer.tsx` — sosyal + newsletter
- `src/pages/ProductDetail.tsx` — sticky CTA
- `src/pages/CartPage.tsx` — step indicator
- `src/index.css` — yeni animation keyframe'leri (blob, shimmer, pulse)

### Yeni Dosyalar
- `src/components/HeroProductCarousel.tsx` — öne çıkan ürün karuseli
- `src/components/RouteProgressBar.tsx` — üst progress
- `src/components/CheckoutSteps.tsx` — sepet adım göstergesi

### Migration Yok
- Sadece frontend değişiklikleri; DB şeması değişmez
- HeroStats için mevcut RLS izinleriyle count query'leri yeterli

## Uygulama Sırası
1. Acil responsive düzeltmeler (cookie + chatbot + popup)
2. HeroStats gerçek veri entegrasyonu
3. Hero karusel + navbar glassmorphism
4. Ürün kartı, mobil nav, footer animasyonları
5. Sticky CTA + checkout steps
6. Loading states + progress bar
