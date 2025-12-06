-- Kupon kullanım sayısını artıran fonksiyon
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE id = p_coupon_id;
END;
$$;