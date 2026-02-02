-- Admin action verification codes (for sensitive admin actions)
CREATE TABLE IF NOT EXISTS public.admin_action_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  target_id uuid NOT NULL,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_action_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_action_verifications'
      AND policyname = 'Admins can manage admin action verifications'
  ) THEN
    CREATE POLICY "Admins can manage admin action verifications"
    ON public.admin_action_verifications
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_action_verifications_lookup
  ON public.admin_action_verifications (action_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_verifications_expires
  ON public.admin_action_verifications (expires_at);