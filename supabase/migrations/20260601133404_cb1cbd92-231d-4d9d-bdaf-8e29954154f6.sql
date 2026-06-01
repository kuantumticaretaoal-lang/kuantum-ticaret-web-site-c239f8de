
-- 1. Extend orders with payment & loyalty fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS iban_reference text,
  ADD COLUMN IF NOT EXISTS loyalty_points_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_discount_amount numeric NOT NULL DEFAULT 0;

-- 2. IBAN settings table
CREATE TABLE IF NOT EXISTS public.iban_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_holder text NOT NULL,
  iban text NOT NULL,
  swift_code text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.iban_settings TO anon, authenticated;
GRANT ALL ON public.iban_settings TO service_role;

ALTER TABLE public.iban_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active iban settings" ON public.iban_settings;
CREATE POLICY "Anyone can view active iban settings"
  ON public.iban_settings FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage iban settings" ON public.iban_settings;
CREATE POLICY "Admins manage iban settings"
  ON public.iban_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Loyalty balance function
CREATE OR REPLACE FUNCTION public.get_loyalty_balance(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points), 0)::int
  FROM public.loyalty_points
  WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_loyalty_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_loyalty_balance(uuid) TO authenticated, service_role;

-- 4. Atomic loyalty redemption RPC (server-validated, prevents overspend)
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(p_points integer, p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_balance integer;
  v_order_owner uuid;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Giriş yapın'); END IF;
  IF p_points IS NULL OR p_points <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Geçersiz puan miktarı'); END IF;
  SELECT user_id INTO v_order_owner FROM public.orders WHERE id = p_order_id;
  IF v_order_owner IS NULL OR v_order_owner <> v_user THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sipariş erişimi reddedildi');
  END IF;
  SELECT COALESCE(SUM(points),0) INTO v_balance FROM public.loyalty_points WHERE user_id = v_user;
  IF p_points > v_balance THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Yetersiz puan');
  END IF;
  INSERT INTO public.loyalty_points (user_id, points, description, order_id)
  VALUES (v_user, -p_points, 'Puan harcaması: sipariş #' || p_order_id::text, p_order_id);
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_loyalty_points(integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(integer, uuid) TO authenticated;

-- 5. Detect whether an email has a password identity (used by login edge function only)
CREATE OR REPLACE FUNCTION public.email_has_password(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.provider = 'email'
      AND lower(i.identity_data->>'email') = lower(p_email)
  );
$$;

REVOKE ALL ON FUNCTION public.email_has_password(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_has_password(text) TO service_role;

-- 6. Seed default IBAN row if table empty (placeholder, admin should update)
INSERT INTO public.iban_settings (bank_name, account_holder, iban, notes, is_active)
SELECT 'Banka adınızı girin', 'Hesap sahibi', 'TR00 0000 0000 0000 0000 0000 00', 'Açıklama kısmına sipariş kodunuzu yazın.', false
WHERE NOT EXISTS (SELECT 1 FROM public.iban_settings);
