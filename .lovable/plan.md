# Siteye Bariz Etki Yapacak Geliştirmeler

Mevcut kodu inceledim. Aşağıdaki geliştirmeler kullanıcıların ilk bakışta hissedeceği, "vay" dedirten farklar yaratır — hepsi mevcut altyapıyla uyumlu.

## 1. Hero & Ana Sayfa Cilası
- Hero'ya canlı 3D bileklik önizlemesi (zaten var olan `BraceletSimulator3D`'yi küçük, otomatik dönen "showcase" modunda hero'nun sağına yerleştir).
- Sayı sayaçlı sosyal kanıt şeridi: "X+ mutlu müşteri • Y+ teslim edilen sipariş • Z ülkeye kargo" — `framer-motion` ile sayaç animasyonu.
- Hero CTA'ya parıltı (shine) ve mıknatıs-hover mikro etkileşimi.

## 2. Ürün Kartı & Liste Deneyimi
- Ürün kartına hover'da ikinci görsel geçişi + hızlı "Sepete Ekle" / "Hızlı Bakış" üst katman.
- Liste sayfasında **sticky filtre çubuğu** ve seçili filtreler için chip'ler (tek tıkla kaldır).
- Skeleton'ları gerçek karta birebir uyacak şekilde yenile (CLS sıfır).

## 3. Ürün Detayı Wow Faktörleri
- Görsel galeriye **360° dönen ürün modu** (zaten ImageZoom var, bunun yanına eklenir).
- "Birlikte tasarla" yapışkan yan paneli: kullanıcı isim yazdıkça hem 3D hem fiyat hem teslim tarihi anlık güncellenir.
- "Şu anda X kişi bakıyor" + "Son 24 saatte Y sipariş" canlı urgency rozeti (mevcut `UrgencyIndicators`'ı zenginleştir).

## 4. Sepet & Checkout Sürtünme Azaltma
- Sepete eklemede tam sayfa yerine **slide-over (Sheet) drawer** — kullanıcı listede kalır.
- Ücretsiz kargo eşiği için ilerleme çubuğu: "65₺ daha ekle, kargo bedava".
- Tek sayfalık checkout iyileştirmesi: adres + kargo + ödeme adımlarını accordion ile aynı sayfada.

## 5. Marka Hissi & Mikro-etkileşim
- Sayfa geçişlerinde framer-motion fade/slide.
- Buton, badge ve favori kalbi için tactile mikro animasyonlar (spring).
- Dark mode'a özel cam (glassmorphism) navbar.
- Tutarlı boş durum illüstrasyonları (`EmptyState`'i tüm sayfalarda kullan).

## 6. Güven & Dönüşüm Sinyalleri
- Üst bilgi şeridine: "Aynı gün kargo • 14 gün iade • Güvenli ödeme" rotasyonlu metin.
- Ürün detayı altına gerçek müşteri fotoğraflı yorum karuseli.
- Footer üstüne mini SSS akordeonu (en çok sorulan 4 soru).

---

## Teknik Detay
- Yeni paket gerekmez (`framer-motion`, `three`, `drei` zaten kurulu).
- Hero showcase için `BraceletSimulator3D`'ye `autoplay` + `compact` prop'u eklenir, lazy yüklenir (CWV korunur).
- Slide-over sepet için mevcut `Sheet` bileşeni kullanılır; `cart.ts` API'si değişmez.
- Sticky filtre + chip'ler `Products.tsx` içinde, mevcut filtre state'i üzerinden.
- Ücretsiz kargo eşiği `shipping_companies` tablosundan okunur (zaten var).
- Sayfa geçiş animasyonları `App.tsx`'te `AnimatePresence` ile sarılır.

## Öncelik Sırası (etki/efor)
1. Slide-over sepet + kargo eşiği çubuğu
2. Ürün kartı hover + ikinci görsel
3. Hero 3D showcase + sosyal kanıt sayaçları
4. Sticky filtre + chip'ler
5. Ürün detayı yapışkan tasarım paneli
6. Mikro-etkileşimler ve cam navbar

Hepsini sırayla uygulayabilirim, ya da sadece seçtiklerini. Onayla, başlayayım.