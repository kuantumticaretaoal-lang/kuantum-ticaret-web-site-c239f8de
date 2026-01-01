-- Kargo ücreti ayarları için tablo
CREATE TABLE public.shipping_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_type text NOT NULL UNIQUE,
  base_fee numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shipping settings"
ON public.shipping_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage shipping settings"
ON public.shipping_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Varsayılan kargo ayarları
INSERT INTO public.shipping_settings (delivery_type, base_fee, is_active) VALUES
('home_delivery', 50, true),
('pickup', 0, true);