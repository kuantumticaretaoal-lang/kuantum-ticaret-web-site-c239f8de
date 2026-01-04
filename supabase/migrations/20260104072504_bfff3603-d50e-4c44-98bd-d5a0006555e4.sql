-- Çeviri yönetimi için translations tablosu
CREATE TABLE public.translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language_code TEXT NOT NULL,
  translation_key TEXT NOT NULL,
  translation_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(language_code, translation_key)
);

-- Enable RLS
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view translations"
ON public.translations FOR SELECT
USING (true);

CREATE POLICY "Admins can manage translations"
ON public.translations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_translations_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Varsayılan Türkçe çeviriler ekle
INSERT INTO public.translations (language_code, translation_key, translation_value) VALUES
-- Navbar
('tr', 'nav.home', 'Ana Sayfa'),
('tr', 'nav.products', 'Ürünler'),
('tr', 'nav.contact', 'İletişim'),
('tr', 'nav.cart', 'Sepet'),
('tr', 'nav.favorites', 'Favoriler'),
('tr', 'nav.account', 'Hesabım'),
('tr', 'nav.login', 'Giriş Yap'),
('tr', 'nav.register', 'Kayıt Ol'),
('tr', 'nav.logout', 'Çıkış Yap'),
('tr', 'nav.premium', 'Premium'),
-- Footer
('tr', 'footer.quickLinks', 'Hızlı Linkler'),
('tr', 'footer.contact', 'İletişim'),
('tr', 'footer.language', 'Dil & Para Birimi'),
('tr', 'footer.rights', 'Tüm hakları saklıdır'),
-- Genel
('tr', 'common.loading', 'Yükleniyor...'),
('tr', 'common.save', 'Kaydet'),
('tr', 'common.cancel', 'İptal'),
('tr', 'common.delete', 'Sil'),
('tr', 'common.edit', 'Düzenle'),
('tr', 'common.add', 'Ekle'),
('tr', 'common.search', 'Ara'),
('tr', 'common.noResults', 'Sonuç bulunamadı'),
-- Ürünler
('tr', 'products.title', 'Ürünler'),
('tr', 'products.addToCart', 'Sepete Ekle'),
('tr', 'products.outOfStock', 'Stokta Yok'),
('tr', 'products.inStock', 'Stokta Var'),
('tr', 'products.price', 'Fiyat'),
('tr', 'products.description', 'Açıklama'),
-- Sepet
('tr', 'cart.title', 'Sepetim'),
('tr', 'cart.empty', 'Sepetiniz boş'),
('tr', 'cart.total', 'Toplam'),
('tr', 'cart.checkout', 'Siparişi Tamamla'),
('tr', 'cart.shipping', 'Kargo Ücreti'),
('tr', 'cart.subtotal', 'Ara Toplam'),
-- Auth
('tr', 'auth.login', 'Giriş Yap'),
('tr', 'auth.register', 'Kayıt Ol'),
('tr', 'auth.email', 'E-posta'),
('tr', 'auth.password', 'Şifre'),
('tr', 'auth.forgotPassword', 'Şifremi Unuttum'),
-- English translations
('en', 'nav.home', 'Home'),
('en', 'nav.products', 'Products'),
('en', 'nav.contact', 'Contact'),
('en', 'nav.cart', 'Cart'),
('en', 'nav.favorites', 'Favorites'),
('en', 'nav.account', 'My Account'),
('en', 'nav.login', 'Login'),
('en', 'nav.register', 'Register'),
('en', 'nav.logout', 'Logout'),
('en', 'nav.premium', 'Premium'),
('en', 'footer.quickLinks', 'Quick Links'),
('en', 'footer.contact', 'Contact'),
('en', 'footer.language', 'Language & Currency'),
('en', 'footer.rights', 'All rights reserved'),
('en', 'common.loading', 'Loading...'),
('en', 'common.save', 'Save'),
('en', 'common.cancel', 'Cancel'),
('en', 'common.delete', 'Delete'),
('en', 'common.edit', 'Edit'),
('en', 'common.add', 'Add'),
('en', 'common.search', 'Search'),
('en', 'common.noResults', 'No results found'),
('en', 'products.title', 'Products'),
('en', 'products.addToCart', 'Add to Cart'),
('en', 'products.outOfStock', 'Out of Stock'),
('en', 'products.inStock', 'In Stock'),
('en', 'products.price', 'Price'),
('en', 'products.description', 'Description'),
('en', 'cart.title', 'My Cart'),
('en', 'cart.empty', 'Your cart is empty'),
('en', 'cart.total', 'Total'),
('en', 'cart.checkout', 'Checkout'),
('en', 'cart.shipping', 'Shipping'),
('en', 'cart.subtotal', 'Subtotal'),
('en', 'auth.login', 'Login'),
('en', 'auth.register', 'Register'),
('en', 'auth.email', 'Email'),
('en', 'auth.password', 'Password'),
('en', 'auth.forgotPassword', 'Forgot Password'),
-- German translations  
('de', 'nav.home', 'Startseite'),
('de', 'nav.products', 'Produkte'),
('de', 'nav.contact', 'Kontakt'),
('de', 'nav.cart', 'Warenkorb'),
('de', 'nav.favorites', 'Favoriten'),
('de', 'nav.account', 'Mein Konto'),
('de', 'nav.login', 'Anmelden'),
('de', 'nav.register', 'Registrieren'),
('de', 'nav.logout', 'Abmelden'),
('de', 'nav.premium', 'Premium'),
('de', 'footer.quickLinks', 'Schnelllinks'),
('de', 'footer.contact', 'Kontakt'),
('de', 'footer.language', 'Sprache & Währung'),
('de', 'footer.rights', 'Alle Rechte vorbehalten'),
('de', 'common.loading', 'Laden...'),
('de', 'common.save', 'Speichern'),
('de', 'common.cancel', 'Abbrechen'),
('de', 'common.delete', 'Löschen'),
('de', 'common.edit', 'Bearbeiten'),
('de', 'common.add', 'Hinzufügen'),
('de', 'common.search', 'Suchen'),
('de', 'common.noResults', 'Keine Ergebnisse gefunden'),
('de', 'products.title', 'Produkte'),
('de', 'products.addToCart', 'In den Warenkorb'),
('de', 'products.outOfStock', 'Ausverkauft'),
('de', 'products.inStock', 'Auf Lager'),
('de', 'products.price', 'Preis'),
('de', 'products.description', 'Beschreibung'),
('de', 'cart.title', 'Mein Warenkorb'),
('de', 'cart.empty', 'Ihr Warenkorb ist leer'),
('de', 'cart.total', 'Gesamt'),
('de', 'cart.checkout', 'Zur Kasse'),
('de', 'cart.shipping', 'Versand'),
('de', 'cart.subtotal', 'Zwischensumme'),
('de', 'auth.login', 'Anmelden'),
('de', 'auth.register', 'Registrieren'),
('de', 'auth.email', 'E-Mail'),
('de', 'auth.password', 'Passwort'),
('de', 'auth.forgotPassword', 'Passwort vergessen');

-- Varsayılan döviz kurlarını ekle
INSERT INTO public.exchange_rates (from_currency, to_currency, rate) VALUES
('TRY', 'USD', 0.029),
('TRY', 'EUR', 0.027),
('TRY', 'GBP', 0.023)
ON CONFLICT DO NOTHING;