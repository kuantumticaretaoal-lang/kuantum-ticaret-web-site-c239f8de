
-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Loyalty points table
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own points" ON public.loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage points" ON public.loyalty_points FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_loyalty_points_user ON public.loyalty_points(user_id);

-- Referral codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  used_by_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referral" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own referral" ON public.referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage referrals" ON public.referral_codes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view referral codes for lookup" ON public.referral_codes FOR SELECT USING (true);

-- Referral usages table
CREATE TABLE IF NOT EXISTS public.referral_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  coupon_given boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);
ALTER TABLE public.referral_usages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.referral_usages FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Admins can manage referral usages" ON public.referral_usages FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert referral usages" ON public.referral_usages FOR INSERT WITH CHECK (auth.uid() = referred_id);

-- Trigger to give loyalty points when order delivered
CREATE OR REPLACE FUNCTION public.give_loyalty_points_on_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    INSERT INTO public.loyalty_points (user_id, points, description, order_id)
    VALUES (NEW.user_id, GREATEST(1, FLOOR(NEW.total_amount / 10)::int), 'Sipariş puanı: #' || NEW.order_code, NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_loyalty_on_delivery ON public.orders;
CREATE TRIGGER trigger_loyalty_on_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.give_loyalty_points_on_delivery();

-- Avatar storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
