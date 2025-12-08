-- Drop the existing function and recreate with fixed variable naming
DROP FUNCTION IF EXISTS public.validate_coupon(text, uuid, numeric);

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_user_id uuid, p_order_total numeric)
RETURNS TABLE(is_valid boolean, coupon_id uuid, discount_type text, discount_value numeric, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  FROM public.coupon_usages cu
  WHERE cu.coupon_id = v_coupon.id AND cu.user_id = p_user_id;
  
  IF v_user_usage_count > 0 THEN
    RETURN QUERY SELECT false::boolean, NULL::uuid, NULL::text, NULL::numeric, 'Bu kuponu daha önce kullandınız'::text;
    RETURN;
  END IF;
  
  -- Kupon geçerli - return sonuçları için farklı isimler kullan
  RETURN QUERY SELECT 
    true::boolean AS is_valid, 
    v_coupon.id::uuid AS coupon_id, 
    v_coupon.discount_type::text AS discount_type, 
    v_coupon.discount_value::numeric AS discount_value, 
    NULL::text AS error_message;
END;
$$;