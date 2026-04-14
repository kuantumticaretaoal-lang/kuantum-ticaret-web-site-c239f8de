
-- ============================================
-- 1. RESTORE ALL MISSING TRIGGERS
-- ============================================

-- Order status change notification
DROP TRIGGER IF EXISTS trigger_notify_order_status ON public.orders;
CREATE TRIGGER trigger_notify_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- Auto income on delivery
DROP TRIGGER IF EXISTS trigger_auto_income_on_delivery ON public.orders;
CREATE TRIGGER trigger_auto_income_on_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_income_on_delivery();

-- Loyalty points on delivery
DROP TRIGGER IF EXISTS trigger_give_loyalty_points ON public.orders;
CREATE TRIGGER trigger_give_loyalty_points
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.give_loyalty_points_on_delivery();

-- Product purchase pairs
DROP TRIGGER IF EXISTS trigger_update_purchase_pairs ON public.orders;
CREATE TRIGGER trigger_update_purchase_pairs
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_purchase_pairs();

-- Zero stock notification
DROP TRIGGER IF EXISTS trigger_notify_zero_stock ON public.products;
CREATE TRIGGER trigger_notify_zero_stock
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_zero_stock();

-- Return request admin notification
DROP TRIGGER IF EXISTS trigger_notify_admin_return ON public.return_requests;
CREATE TRIGGER trigger_notify_admin_return
  AFTER INSERT ON public.return_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_return_request();

-- Email notification on new notification
DROP TRIGGER IF EXISTS trigger_send_email_notification ON public.notifications;
CREATE TRIGGER trigger_send_email_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.send_email_notification();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. TWO-FACTOR AUTH SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.two_factor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.two_factor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own 2FA settings"
  ON public.two_factor_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA settings"
  ON public.two_factor_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own 2FA settings"
  ON public.two_factor_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_two_factor_settings_updated_at ON public.two_factor_settings;
CREATE TRIGGER update_two_factor_settings_updated_at
  BEFORE UPDATE ON public.two_factor_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. LOGIN VERIFICATION CODES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.login_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_verification_codes ENABLE ROW LEVEL SECURITY;

-- Public can read (needed for edge function with service role, but also anon verification)
CREATE POLICY "Service can manage login codes"
  ON public.login_verification_codes FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
