# Görünür UI/UX Yenileme + Bileklik Önizlemesi Yeniden Yapımı

## 1. Bileklik Önizlemesi — Tamamen Yeniden İnşa (BraceletSimulator3D.tsx)

Mevcut SVG halka, dairesel dizilim ve döndürme yüzünden hâlâ ucuz görünüyor. Yerine **dümdüz, gerçekçi yatay bileklik** yapılacak (Pandora / Trendyol takı ürün fotoğrafı estetiği).

**Yeni tasarım:**
- Bileklik yatay, hafif bombeli bir eğri (SVG `path` kübik bezier) — iki uçta metalik kapaklar ve halka.
- İp/deri dokusu: `pattern` ile örgü/tel doku + drop shadow + iç ışık.
- Boncuklar/harfler ve süsler ipe **soldan sağa** dizilir. Fazla slot yok — sadece isim harfleri + süsler + araya küçük ayırıcı boncuklar (ilk/son + charmlar arası).
- Harf boncukları: kare değil, gerçekçi küp (perspektif için hafif eğim + gradient + üstte parlama).
- Süsler: gerçek `image_url` `<image>` içinde, üstünde asma halkası + gölge; imaj yoksa renkli disk + baş harf.
- Boyut: yükseklik önemsiz, bileklik container'ın %90'ını yatayda kullanır — mobilde de düzgün.
- Otomatik döndürme kaldırılır (yatayda mantıksız); yerine **hover'da hafif salınım** + "kolda gör" seçeneği (arka planı el fotoğrafına çeviren toggle).
- Doku seçenekleri: deri / ip / metal zincir (üçü de farklı pattern).
- Canlı sayaç: "N harf • N süs • ~cm uzunluk" tahmini.
- İndir: mevcut PNG export korunur, boyut ürün fotoğrafı oranında (1600×900).

## 2. Ana Sayfa Hero — Dinamik Ürün Vitrini
- Sağdaki büyük logo kartını kaldır → yerine **3 ürünlü dönen kart yığını** (öne çıkan / en çok satan / yeni). Auto-slide 4sn, Framer Motion.
- Sol tarafa: rozet ("★ 4.8 • X memnun müşteri"), altında **canlı akış**: "Son sipariş: Ali K. — 3 dk önce" (`orders`'tan son 5).
- CTA butonlarına gerçek parıltı (mevcut var, iyileştirilecek) + ikon micro-animation.

## 3. Ürün Kartları — Belirgin Fark
- Hover: kart 6px yukarı + primary glow shadow + resim hafif zoom (`scale-105`).
- Sol üst köşede **çok katmanlı rozetler**: indirim %'si (kırmızı gradient), "Yeni" (yeşil pulse), "Son X adet" (turuncu flame animasyonu).
- Sağ alta hızlı aksiyonlar (kalp + hızlı görünüm + karşılaştır) — hover'da fade in, mobilde daima görünür.
- Fiyat: eski fiyat üstü çizili + yeni fiyat büyük + "₺X tasarruf" chip.
- Yıldız puanı satırı + değerlendirme sayısı görünür.

## 4. Navbar
- Scroll'da glassmorphism (`backdrop-blur-xl bg-background/70`) + shrink (padding küçülür).
- Aktif route altına animasyonlu underline (Framer `layoutId`).
- Sepet ikonuna ürün eklendiğinde bounce + kırmızı ping badge.

## 5. Ürün Detay Sayfası
- Mobilde sticky alt bar: fiyat + "Sepete Ekle" (her zaman erişilebilir).
- Galeri: ana resim yanında dikey thumbnails, hover'da magnifier lens.
- "3 kişi bu ürüne bakıyor" (var olan urgency ile) — daha büyük ve dikkat çekici konumlandırma.
- Sekmeler (Açıklama / Yorumlar / Sorular / Kargo): animasyonlu underline tab.

## 6. Sepet / Checkout
- Görsel adım göstergesi: Sepet → Adres → Ödeme → Onay (progress bar + tik animasyonu).
- Boş sepet: illüstrasyon + "Öne çıkan ürünler" carousel.
- Kupon kutusu: inline yeşil tik / kırmızı X anında feedback + toast.
- Toplam kartı sticky (desktop sağda, mobil altta).

## 7. Mobil Bottom Nav
- Aktif item: pill background + üstte küçük primary indicator + scale animation.
- Sepet/Favori ikonlarında dinamik badge (canlı sayı).
- Ortaya "Ürünler" için **çıkıntılı FAB** (floating action button) — Trendyol tarzı.

## 8. Genel Görsel Sistem
- `index.css`'e ek tokenler: `--shadow-glow-primary`, `--shadow-card-hover`, `--gradient-mesh` (aurora arka plan), `--animation-shimmer`.
- Skeleton loader standardı: shimmer efekti (mevcut ProductSkeleton dahil).
- Sayfa geçişlerinde üstte ince progress bar (`RouteProgressBar`).
- Görüntü yükleme: blur-up placeholder.
- Reduce-motion prefers desteği (mevcut kısmen var, sistemleştirilecek).

## 9. Küçük Ama Görünür Eklemeler
- "Sizin İçin Seçtiklerimiz" — ürün listesinin üstünde, ziyaret geçmişine göre kişisel öneri şeridi.
- Ana sayfa alt tarafına **son değerlendirmeler carousel'i** (5 yıldızlı gerçek yorumlar).
- Fiyat düşüşü bildirimi rozeti (favorideki ürün ucuzladıysa hero'da toast).
- "Bugünün fırsatı" geri sayımlı büyük banner (mevcut CampaignBanner'ın yanı sıra).

## Teknik Özet

**Yeni dosyalar:**
- `src/components/HeroProductShowcase.tsx` — dönen 3'lü ürün kartı yığını
- `src/components/HeroLiveActivity.tsx` — canlı sipariş akışı
- `src/components/RouteProgressBar.tsx` — sayfa geçiş progress
- `src/components/CheckoutSteps.tsx` — 4 adımlı progress
- `src/components/HomeReviewsCarousel.tsx` — anasayfa yorum şeridi
- `src/components/PersonalRecommendations.tsx` — ürün sayfası önerileri

**Güncellenecek:**
- `src/components/BraceletSimulator3D.tsx` — tamamen yeniden yazılır (yatay, gerçekçi)
- `HeroSection.tsx`, `Navbar.tsx`, `MobileBottomNav.tsx`, `ProductCardImage.tsx` + ürün listesi kartı JSX'i (Products.tsx)
- `ProductDetail.tsx` (sticky bar, tab, magnifier)
- `CartPage.tsx` (adım göstergesi, boş state)
- `index.css` (yeni tokenler + shimmer/aurora keyframes)
- `tailwind.config.ts` (yeni shadow/animation)

**Backend:** Değişiklik yok — mevcut RLS/tablo yapıları kullanılır. Canlı sipariş akışı `orders` tablosundan (var olan RLS ile isim maskelenerek: `Ali K.`) çekilir.

**Kalite çıtası:** Her değişiklik build sonrası preview'da görsel doğrulama. Bileklik için Playwright screenshot alınıp yeni tasarımın gerçekten farklı ve düzgün göründüğü teyit edilir.
