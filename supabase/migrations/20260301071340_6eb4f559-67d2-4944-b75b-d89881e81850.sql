
-- Add link_url to campaign_banners for clickable banners
ALTER TABLE public.campaign_banners ADD COLUMN IF NOT EXISTS link_url text DEFAULT NULL;
