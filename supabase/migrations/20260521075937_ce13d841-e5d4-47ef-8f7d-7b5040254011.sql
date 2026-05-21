ALTER TABLE public.product_reviews DROP CONSTRAINT IF EXISTS product_reviews_rating_check;
ALTER TABLE public.product_reviews ALTER COLUMN rating TYPE numeric(2,1) USING rating::numeric(2,1);
ALTER TABLE public.product_reviews ADD CONSTRAINT product_reviews_rating_range
  CHECK (rating >= 0.5 AND rating <= 5 AND (rating * 2) = floor(rating * 2));
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS hide_lastname boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.enforce_review_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
    WHERE o.user_id = NEW.user_id AND oi.product_id = NEW.product_id AND o.status = 'delivered'
  ) THEN
    RAISE EXCEPTION 'Bu ürünü satın almadan değerlendirme yapamazsınız.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_review_purchase_trg ON public.product_reviews;
CREATE TRIGGER enforce_review_purchase_trg BEFORE INSERT ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_review_purchase();

DROP POLICY IF EXISTS "Users can delete unused referral" ON public.referral_codes;
CREATE POLICY "Users can delete unused referral" ON public.referral_codes FOR DELETE
USING (auth.uid() = user_id AND COALESCE(used_by_count, 0) = 0);

CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_code_id uuid;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Giriş yapın'); END IF;
  SELECT id, user_id INTO v_code_id, v_owner FROM public.referral_codes
   WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code)) LIMIT 1;
  IF v_code_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Geçersiz davet kodu'); END IF;
  IF v_owner = v_user THEN RETURN jsonb_build_object('ok', false, 'error', 'Kendi kodunuzu kullanamazsınız'); END IF;
  IF EXISTS (SELECT 1 FROM public.referral_usages WHERE referred_id = v_user) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Daha önce bir davet kodu kullandınız');
  END IF;
  INSERT INTO public.referral_usages (referrer_id, referred_id) VALUES (v_owner, v_user);
  UPDATE public.referral_codes SET used_by_count = COALESCE(used_by_count, 0) + 1 WHERE id = v_code_id;
  INSERT INTO public.loyalty_points (user_id, points, description)
  VALUES (v_user, 50, 'Davet kodu kullanım bonusu'), (v_owner, 100, 'Davet ettiğin kullanıcı katıldı');
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.redeem_referral_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_approve_free_premium()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_price numeric; v_duration int;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  SELECT price, duration_days INTO v_price, v_duration FROM public.premium_plans WHERE id = NEW.plan_id;
  IF v_price = 0 THEN
    INSERT INTO public.premium_memberships (user_id, plan_id, status, is_trial, trial_days, starts_at, expires_at)
    VALUES (NEW.user_id, NEW.plan_id, 'active', true, COALESCE(v_duration, 7),
            now(), now() + (COALESCE(v_duration, 7) || ' days')::interval);
    NEW.status := 'approved';
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS auto_approve_free_premium_trg ON public.premium_requests;
CREATE TRIGGER auto_approve_free_premium_trg BEFORE INSERT ON public.premium_requests
FOR EACH ROW EXECUTE FUNCTION public.auto_approve_free_premium();

CREATE OR REPLACE FUNCTION public.restore_stock_on_return_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item RECORD;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.order_id LOOP
      UPDATE public.products SET stock_quantity = COALESCE(stock_quantity, 0) + item.quantity WHERE id = item.product_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS restore_stock_on_return_trg ON public.return_requests;
CREATE TRIGGER restore_stock_on_return_trg AFTER UPDATE ON public.return_requests
FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_return_approval();