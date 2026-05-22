
-- Allow ornaments flag
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allows_ornaments boolean DEFAULT false;

-- Selected ornaments persisted to cart and order_items
ALTER TABLE public.cart ADD COLUMN IF NOT EXISTS selected_ornaments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_ornaments jsonb DEFAULT '[]'::jsonb;

-- Ornament catalog
CREATE TABLE IF NOT EXISTS public.product_ornaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text,
  extra_price numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  max_per_product integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_ornaments_product ON public.product_ornaments(product_id);

ALTER TABLE public.product_ornaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active ornaments" ON public.product_ornaments;
CREATE POLICY "Anyone can view active ornaments" ON public.product_ornaments
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage ornaments" ON public.product_ornaments;
CREATE POLICY "Admins can manage ornaments" ON public.product_ornaments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_product_ornaments_updated_at ON public.product_ornaments;
CREATE TRIGGER update_product_ornaments_updated_at
  BEFORE UPDATE ON public.product_ornaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
