-- Add customization options to products table
ALTER TABLE public.products 
ADD COLUMN is_name_customizable boolean DEFAULT false,
ADD COLUMN available_sizes text[] DEFAULT '{}',
ADD COLUMN allows_custom_photo boolean DEFAULT false;

-- Add customization fields to cart table
ALTER TABLE public.cart 
ADD COLUMN custom_name text,
ADD COLUMN selected_size text,
ADD COLUMN custom_photo_url text;

-- Add customization fields to order_items table
ALTER TABLE public.order_items 
ADD COLUMN custom_name text,
ADD COLUMN selected_size text,
ADD COLUMN custom_photo_url text;

-- Create storage bucket for custom photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('custom-photos', 'custom-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for custom-photos bucket
CREATE POLICY "Users can upload their custom photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'custom-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own custom photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'custom-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all custom photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'custom-photos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete custom photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'custom-photos' AND has_role(auth.uid(), 'admin'));