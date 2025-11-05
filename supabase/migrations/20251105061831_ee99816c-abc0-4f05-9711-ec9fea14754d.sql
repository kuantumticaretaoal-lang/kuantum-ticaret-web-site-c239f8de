-- Hakkımızda tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.about_us (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS politikaları
ALTER TABLE public.about_us ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes hakkımızda bilgisini görebilir"
ON public.about_us
FOR SELECT
USING (true);

CREATE POLICY "Adminler hakkımızda bilgisini yönetebilir"
ON public.about_us
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Bildirimler tablosuna admin silme yetkisi için policy ekle
CREATE POLICY "Adminler bildirimleri silebilir"
ON public.notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));