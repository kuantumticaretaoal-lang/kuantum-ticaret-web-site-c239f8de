-- Ürün kategorileri tablosu
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS politikaları
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Products tablosuna category_id kolonu ekle
ALTER TABLE public.products 
ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Varsayılan kategorileri ekle
INSERT INTO public.categories (name, description, icon, sort_order) VALUES
('Elektronik', 'Elektronik ürünler ve aksesuarlar', 'Smartphone', 1),
('Giyim', 'Kıyafetler ve aksesuarlar', 'Shirt', 2),
('Ev & Yaşam', 'Ev dekorasyon ve mutfak ürünleri', 'Home', 3),
('Kozmetik', 'Kozmetik ve kişisel bakım ürünleri', 'Sparkles', 4),
('Spor', 'Spor ekipmanları ve giyim', 'Dumbbell', 5),
('Kitap & Kırtasiye', 'Kitaplar ve kırtasiye ürünleri', 'Book', 6),
('Diğer', 'Diğer ürünler', 'Package', 99);

-- Coupons tablosuna admin için görünürlük politikası ekle
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;

CREATE POLICY "Admins can view all coupons"
ON public.coupons
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert coupons"
ON public.coupons
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update coupons"
ON public.coupons
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete coupons"
ON public.coupons
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));