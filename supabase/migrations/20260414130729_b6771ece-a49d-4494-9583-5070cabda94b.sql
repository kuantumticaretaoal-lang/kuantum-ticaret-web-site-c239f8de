
-- Fix overly permissive RLS on login_verification_codes
DROP POLICY IF EXISTS "Service can manage login codes" ON public.login_verification_codes;

-- Only allow reading own codes (for client-side check if needed)
CREATE POLICY "Users can view own login codes"
  ON public.login_verification_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin/service management 
CREATE POLICY "Admins can manage login codes"
  ON public.login_verification_codes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
