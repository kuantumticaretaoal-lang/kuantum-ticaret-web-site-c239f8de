
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Newsletter
CREATE TABLE IF NOT EXISTS public.newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  user_id uuid,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz
);
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletters;
DROP POLICY IF EXISTS "Users view own subscription" ON public.newsletters;
DROP POLICY IF EXISTS "Admins manage newsletters" ON public.newsletters;
DROP POLICY IF EXISTS "Users can unsubscribe self" ON public.newsletters;
CREATE POLICY "Anyone can subscribe" ON public.newsletters FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own subscription" ON public.newsletters FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage newsletters" ON public.newsletters FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can unsubscribe self" ON public.newsletters FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body_html text NOT NULL,
  sent_at timestamptz,
  recipient_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage campaigns" ON public.newsletter_campaigns;
CREATE POLICY "Admins manage campaigns" ON public.newsletter_campaigns FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  variant_name text NOT NULL,
  variant_value text NOT NULL,
  stock_quantity integer DEFAULT 0,
  price_diff numeric DEFAULT 0,
  sku text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone view variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins manage variants" ON public.product_variants;
CREATE POLICY "Anyone view variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admins manage variants" ON public.product_variants FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text DEFAULT 'normal',
  category text,
  assigned_admin uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admins update tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users update own tickets" ON public.support_tickets;
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update tickets" ON public.support_tickets FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users update own tickets" ON public.support_tickets FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  is_admin boolean DEFAULT false,
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ticket members view messages" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Ticket members send messages" ON public.support_ticket_messages;
CREATE POLICY "Ticket members view messages" ON public.support_ticket_messages FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);
CREATE POLICY "Ticket members send messages" ON public.support_ticket_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND (
    has_role(auth.uid(), 'admin'::app_role) OR EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  )
);

-- Webhooks
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  event_types text[] NOT NULL DEFAULT '{}',
  secret text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage webhooks" ON public.webhooks;
CREATE POLICY "Admins manage webhooks" ON public.webhooks FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  response_status integer,
  response_body text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view webhook logs" ON public.webhook_logs;
DROP POLICY IF EXISTS "System inserts webhook logs" ON public.webhook_logs;
CREATE POLICY "Admins view webhook logs" ON public.webhook_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System inserts webhook logs" ON public.webhook_logs FOR INSERT WITH CHECK (true);

-- Active sessions
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text,
  user_agent text,
  ip_address text,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users delete own sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users insert own sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Users update own sessions" ON public.active_sessions;
DROP POLICY IF EXISTS "Admins view all sessions" ON public.active_sessions;
CREATE POLICY "Users view own sessions" ON public.active_sessions FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users delete own sessions" ON public.active_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.active_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.active_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Feature flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text,
  is_enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone view enabled flags" ON public.feature_flags;
DROP POLICY IF EXISTS "Admins manage flags" ON public.feature_flags;
CREATE POLICY "Anyone view enabled flags" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "Admins manage flags" ON public.feature_flags FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Exit popups
CREATE TABLE IF NOT EXISTS public.exit_intent_popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  cta_text text,
  cta_url text,
  coupon_code text,
  image_url text,
  is_active boolean DEFAULT true,
  show_on_exit boolean DEFAULT true,
  show_on_load boolean DEFAULT false,
  show_delay_ms integer DEFAULT 0,
  cooldown_hours integer DEFAULT 24,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.exit_intent_popups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone view active popups" ON public.exit_intent_popups;
DROP POLICY IF EXISTS "Admins manage popups" ON public.exit_intent_popups;
CREATE POLICY "Anyone view active popups" ON public.exit_intent_popups FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage popups" ON public.exit_intent_popups FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Column additions
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS admin_reply text;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS admin_reply_at timestamptz;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_badge text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sales_count integer DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON public.cart(session_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON public.products(stock_status);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON public.expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON public.expenses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_product_translations_product ON public.product_translations(product_id, language_code);
CREATE INDEX IF NOT EXISTS idx_stock_notifications_product ON public.stock_notifications(product_id) WHERE notified = false;

-- Triggers (drop & recreate)
DROP TRIGGER IF EXISTS auto_income_trg ON public.orders;
CREATE TRIGGER auto_income_trg AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.auto_income_on_delivery();
DROP TRIGGER IF EXISTS notify_order_status_trg ON public.orders;
CREATE TRIGGER notify_order_status_trg AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();
DROP TRIGGER IF EXISTS loyalty_points_trg ON public.orders;
CREATE TRIGGER loyalty_points_trg AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.give_loyalty_points_on_delivery();
DROP TRIGGER IF EXISTS purchase_pairs_trg ON public.orders;
CREATE TRIGGER purchase_pairs_trg AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_product_purchase_pairs();
DROP TRIGGER IF EXISTS zero_stock_trg ON public.products;
CREATE TRIGGER zero_stock_trg AFTER UPDATE OF stock_quantity ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_admin_zero_stock();
DROP TRIGGER IF EXISTS return_request_trg ON public.return_requests;
CREATE TRIGGER return_request_trg AFTER INSERT ON public.return_requests FOR EACH ROW EXECUTE FUNCTION public.notify_admin_return_request();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON public.feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stock-back trigger
CREATE OR REPLACE FUNCTION public.notify_stock_back()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE notif_record RECORD;
BEGIN
  IF (OLD.stock_quantity IS NULL OR OLD.stock_quantity = 0) AND NEW.stock_quantity > 0 THEN
    FOR notif_record IN SELECT user_id FROM stock_notifications WHERE product_id = NEW.id AND notified = false LOOP
      INSERT INTO notifications (user_id, message)
      VALUES (notif_record.user_id, '🎉 Beklediğiniz ürün stokta: "' || NEW.title || '"');
    END LOOP;
    UPDATE stock_notifications SET notified = true WHERE product_id = NEW.id AND notified = false;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS stock_back_trg ON public.products;
CREATE TRIGGER stock_back_trg AFTER UPDATE OF stock_quantity ON public.products FOR EACH ROW EXECUTE FUNCTION public.notify_stock_back();

-- Default flags
INSERT INTO public.feature_flags (key, description, is_enabled) VALUES
  ('exit_intent_popup', 'Çıkış niyeti popup gösterimi', true),
  ('newsletter_signup', 'Bülten kayıt formu görünür', true),
  ('product_comparison', 'Ürün karşılaştırma aktif', true),
  ('infinite_scroll', 'Ürünler sayfasında sonsuz scroll', true)
ON CONFLICT (key) DO NOTHING;

-- Realtime: only add new tables (orders/notifications already in publication)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
