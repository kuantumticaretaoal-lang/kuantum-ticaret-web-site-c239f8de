-- Kampanya banner'larına kayma hızı ayarı ekle
ALTER TABLE public.campaign_banners 
ADD COLUMN IF NOT EXISTS scroll_speed INTEGER DEFAULT 15;

-- Orders tablosuna ek kargo ücreti ekle
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0;

-- Yorum: scroll_speed saniye cinsinden, varsayılan 15 saniye