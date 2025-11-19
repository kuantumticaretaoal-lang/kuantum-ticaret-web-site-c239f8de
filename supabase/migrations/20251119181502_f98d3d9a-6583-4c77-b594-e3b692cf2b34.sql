-- Backup codes table for account recovery
CREATE TABLE IF NOT EXISTS public.backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.backup_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backup code"
  ON public.backup_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup code"
  ON public.backup_codes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert backup codes"
  ON public.backup_codes FOR INSERT
  WITH CHECK (true);

-- Add trashed status to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS trashed BOOLEAN DEFAULT FALSE;

-- Contact messages replied tracking
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS replied BOOLEAN DEFAULT FALSE;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS reply_message TEXT;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;

-- Admin visibility settings
CREATE TABLE IF NOT EXISTS public.admin_visibility_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  visible BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_visibility_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Main admins can manage visibility settings"
  ON public.admin_visibility_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Designate main admin
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_main_admin BOOLEAN DEFAULT FALSE;

-- Update existing main admin
UPDATE public.user_roles 
SET is_main_admin = TRUE 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'kuantum.ticaret.aoal@gmail.com'
) AND role = 'admin';

-- Insert default visibility settings
INSERT INTO public.admin_visibility_settings (setting_key, visible)
VALUES 
  ('users_email', TRUE),
  ('users_phone', TRUE),
  ('users_address', TRUE)
ON CONFLICT (setting_key) DO NOTHING;