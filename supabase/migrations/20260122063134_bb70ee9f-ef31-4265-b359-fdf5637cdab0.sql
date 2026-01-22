-- Orders: store pricing snapshot
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applied_coupon_code text,
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'TRY';

-- Admin visibility for favorites & cart
-- Favorites: allow admins to view all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='favorites' AND policyname='Admins can view all favorites'
  ) THEN
    CREATE POLICY "Admins can view all favorites"
    ON public.favorites
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Cart: allow admins to view all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='cart' AND policyname='Admins can view all carts'
  ) THEN
    CREATE POLICY "Admins can view all carts"
    ON public.cart
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Live support (AI chat) tables
CREATE TABLE IF NOT EXISTS public.live_support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_support_threads_device_id
  ON public.live_support_threads (device_id);

ALTER TABLE public.live_support_threads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='live_support_threads' AND policyname='Admins can view live support threads'
  ) THEN
    CREATE POLICY "Admins can view live support threads"
    ON public.live_support_threads
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.live_support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.live_support_threads(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_support_messages_thread_id
  ON public.live_support_messages (thread_id);

ALTER TABLE public.live_support_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='live_support_messages' AND policyname='Admins can view live support messages'
  ) THEN
    CREATE POLICY "Admins can view live support messages"
    ON public.live_support_messages
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Product files (admin uploads arbitrary file types per product)
CREATE TABLE IF NOT EXISTS public.product_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NULL,
  content_type text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_files_product_id
  ON public.product_files (product_id);

ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_files' AND policyname='Admins can manage product files'
  ) THEN
    CREATE POLICY "Admins can manage product files"
    ON public.product_files
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_files' AND policyname='Anyone can view product files'
  ) THEN
    CREATE POLICY "Anyone can view product files"
    ON public.product_files
    FOR SELECT
    USING (true);
  END IF;
END $$;