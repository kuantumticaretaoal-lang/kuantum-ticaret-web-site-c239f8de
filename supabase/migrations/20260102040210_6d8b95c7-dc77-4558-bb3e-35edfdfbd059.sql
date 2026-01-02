-- campaign_banners tablosuna is_dismissible sütunu ekle
ALTER TABLE public.campaign_banners 
ADD COLUMN IF NOT EXISTS is_dismissible boolean DEFAULT true;