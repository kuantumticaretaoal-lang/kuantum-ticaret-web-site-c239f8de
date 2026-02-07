-- Social media items tablosu (çoklu sosyal medya hesabı için)
CREATE TABLE public.social_media_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  logo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS etkinleştir
ALTER TABLE public.social_media_items ENABLE ROW LEVEL SECURITY;

-- Adminler yönetebilir
CREATE POLICY "Admins can manage social media items"
ON public.social_media_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Herkes görebilir
CREATE POLICY "Anyone can view active social media items"
ON public.social_media_items
FOR SELECT
USING (is_active = true);

-- Updated at trigger
CREATE TRIGGER update_social_media_items_updated_at
BEFORE UPDATE ON public.social_media_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Logo için storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('social-logos', 'social-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view social logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-logos');

CREATE POLICY "Admins can upload social logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'social-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update social logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'social-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete social logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'social-logos' AND has_role(auth.uid(), 'admin'::app_role));