-- Product translations table
CREATE TABLE public.product_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, language_code)
);

-- Enable RLS
ALTER TABLE public.product_translations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view product translations" 
ON public.product_translations FOR SELECT USING (true);

CREATE POLICY "Admins can manage product translations" 
ON public.product_translations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Shipping companies table
CREATE TABLE public.shipping_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  tracking_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_companies ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view shipping companies" 
ON public.shipping_companies FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage shipping companies" 
ON public.shipping_companies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for translations
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_translations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipping_companies;