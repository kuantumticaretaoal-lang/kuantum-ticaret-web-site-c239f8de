-- İsteğe göre stok özelliği ekle
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS made_to_order BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.products.made_to_order IS 'Sipariş sonrası üretim seçeneği';

-- Urgency settings için trigger güncelle (eğer mevcut değilse)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM urgency_settings WHERE setting_key = 'low_stock') THEN
    INSERT INTO urgency_settings (setting_key, is_enabled, threshold, display_text) 
    VALUES ('low_stock', true, 5, 'Son {count} adet kaldı!');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM urgency_settings WHERE setting_key = 'view_count') THEN
    INSERT INTO urgency_settings (setting_key, is_enabled, threshold, display_text) 
    VALUES ('view_count', true, 50, 'Bugün {count} kişi görüntüledi');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM urgency_settings WHERE setting_key = 'cart_count') THEN
    INSERT INTO urgency_settings (setting_key, is_enabled, threshold, display_text) 
    VALUES ('cart_count', true, 10, '{count} kişi sepetine ekledi');
  END IF;
END $$;