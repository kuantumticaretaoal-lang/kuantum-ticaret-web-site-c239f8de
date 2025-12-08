-- 1. Ürünlere indirimli fiyat kolonu ekle
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discounted_price numeric DEFAULT NULL;

-- 2. Çoklu kategori desteği için junction table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, category_id)
);

-- Enable RLS on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_categories
CREATE POLICY "Anyone can view product categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage product categories" ON public.product_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Mevcut category_id verilerini junction table'a migrate et
INSERT INTO public.product_categories (product_id, category_id)
SELECT id, category_id FROM public.products WHERE category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO NOTHING;

-- 3. Kupon doğrulama fonksiyonunu güncelle (daha güvenilir)
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_user_id uuid, p_order_total numeric)
RETURNS TABLE(is_valid boolean, coupon_id uuid, discount_type text, discount_value numeric, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_user_usage_count INTEGER;
BEGIN
  -- Kuponu bul (büyük/küçük harf duyarsız)
  SELECT c.* INTO v_coupon
  FROM public.coupons c
  WHERE UPPER(TRIM(c.code)) = UPPER(TRIM(p_code))
  AND c.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::boolean, NULL::uuid, NULL::text, NULL::numeric, 'Geçersiz kupon kodu'::text;
    RETURN;
  END IF;
  
  -- Süre kontrolü
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN QUERY SELECT false::boolean, NULL::uuid, NULL::text, NULL::numeric, 'Bu kuponun süresi dolmuş'::text;
    RETURN;
  END IF;
  
  -- Maksimum kullanım kontrolü
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false::boolean, NULL::uuid, NULL::text, NULL::numeric, 'Bu kupon kullanım limitine ulaşmış'::text;
    RETURN;
  END IF;
  
  -- Minimum sipariş tutarı kontrolü
  IF v_coupon.min_order_amount IS NOT NULL AND p_order_total < v_coupon.min_order_amount THEN
    RETURN QUERY SELECT false::boolean, NULL::uuid, NULL::text, NULL::numeric, 
      ('Minimum sipariş tutarı: ' || v_coupon.min_order_amount || ' TL')::text;
    RETURN;
  END IF;
  
  -- Kullanıcının bu kuponu daha önce kullanıp kullanmadığını kontrol et
  SELECT COUNT(*) INTO v_user_usage_count
  FROM public.coupon_usages
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
  
  IF v_user_usage_count > 0 THEN
    RETURN QUERY SELECT false::boolean, NULL::uuid, NULL::text, NULL::numeric, 'Bu kuponu daha önce kullandınız'::text;
    RETURN;
  END IF;
  
  -- Kupon geçerli
  RETURN QUERY SELECT true::boolean, v_coupon.id::uuid, v_coupon.discount_type::text, v_coupon.discount_value::numeric, NULL::text;
END;
$$;