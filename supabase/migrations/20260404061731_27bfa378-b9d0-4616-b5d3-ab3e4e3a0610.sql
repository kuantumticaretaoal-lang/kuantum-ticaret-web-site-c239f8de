
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON public.cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON public.cart(session_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON public.favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_visited_at ON public.visitor_analytics(visited_at);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Add customer_note to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_note text;

-- Add tags and video_url to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url text;

-- FAQ table
CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active FAQs" ON public.faq_items FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage FAQs" ON public.faq_items FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Order notes table (internal admin notes)
CREATE TABLE public.order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage order notes" ON public.order_notes FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Stock notification requests
CREATE TABLE public.stock_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  notified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create stock notifications" ON public.stock_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own notifications" ON public.stock_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.stock_notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage stock notifications" ON public.stock_notifications FOR ALL USING (has_role(auth.uid(), 'admin'));
