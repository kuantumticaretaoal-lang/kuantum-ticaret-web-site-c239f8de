-- Add allowed_file_types column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS allowed_file_types text[] DEFAULT '{}';

-- Add extra_fee and extra_fee_reason columns to orders for admin fee requests
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extra_fee numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extra_fee_reason text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extra_fee_requested_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS extra_fee_paid boolean DEFAULT false;

-- Create custom-files storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) VALUES ('custom-files', 'custom-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for custom-files bucket
CREATE POLICY "Users can upload custom files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'custom-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their custom files" ON storage.objects
FOR SELECT USING (bucket_id = 'custom-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can view all custom files" ON storage.objects
FOR SELECT USING (bucket_id = 'custom-files' AND has_role(auth.uid(), 'admin'::app_role));