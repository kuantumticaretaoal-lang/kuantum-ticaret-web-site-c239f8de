-- Kupon/İndirim Kodu Tablosu
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can manage coupons"
ON public.coupons FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Kupon kullanım takibi
CREATE TABLE public.coupon_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their coupon usage"
ON public.coupon_usages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert coupon usage"
ON public.coupon_usages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all coupon usages"
ON public.coupon_usages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Günlük yorum/soru sayısı kontrolü için fonksiyon
CREATE OR REPLACE FUNCTION public.get_daily_submission_count(
  p_user_id UUID,
  p_table_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_result INTEGER;
BEGIN
  IF p_table_name = 'product_reviews' THEN
    SELECT COUNT(*) INTO count_result
    FROM public.product_reviews
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
  ELSIF p_table_name = 'product_questions' THEN
    SELECT COUNT(*) INTO count_result
    FROM public.product_questions
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day';
  ELSE
    count_result := 0;
  END IF;
  
  RETURN count_result;
END;
$$;

-- Kupon doğrulama fonksiyonu
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_user_id UUID,
  p_order_total NUMERIC
)
RETURNS TABLE (
  is_valid BOOLEAN,
  coupon_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
  v_user_usage_count INTEGER;
BEGIN
  -- Kuponu bul
  SELECT * INTO v_coupon
  FROM public.coupons c
  WHERE UPPER(c.code) = UPPER(p_code)
  AND c.is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'Geçersiz kupon kodu'::TEXT;
    RETURN;
  END IF;
  
  -- Süre kontrolü
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'Bu kuponun süresi dolmuş'::TEXT;
    RETURN;
  END IF;
  
  -- Maksimum kullanım kontrolü
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'Bu kupon kullanım limitine ulaşmış'::TEXT;
    RETURN;
  END IF;
  
  -- Minimum sipariş tutarı kontrolü
  IF p_order_total < v_coupon.min_order_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 
      ('Minimum sipariş tutarı: ' || v_coupon.min_order_amount || ' TL')::TEXT;
    RETURN;
  END IF;
  
  -- Kullanıcının bu kuponu daha önce kullanıp kullanmadığını kontrol et
  SELECT COUNT(*) INTO v_user_usage_count
  FROM public.coupon_usages
  WHERE coupon_id = v_coupon.id AND user_id = p_user_id;
  
  IF v_user_usage_count > 0 THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, 'Bu kuponu daha önce kullandınız'::TEXT;
    RETURN;
  END IF;
  
  -- Kupon geçerli
  RETURN QUERY SELECT true, v_coupon.id, v_coupon.discount_type, v_coupon.discount_value, NULL::TEXT;
END;
$$;