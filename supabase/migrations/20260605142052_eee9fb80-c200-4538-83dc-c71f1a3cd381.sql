
ALTER TABLE public.cart ADD COLUMN IF NOT EXISTS bracelet_cord_color text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS bracelet_cord_color text;

CREATE TABLE IF NOT EXISTS public.security_advisor_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  prompt text NOT NULL,
  response text,
  model text,
  status_code integer,
  error_code text,
  latency_ms integer,
  message_count integer,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_advisor_logs TO authenticated;
GRANT ALL ON public.security_advisor_logs TO service_role;

ALTER TABLE public.security_advisor_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read advisor logs"
  ON public.security_advisor_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_advisor_logs_created ON public.security_advisor_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisor_logs_user ON public.security_advisor_logs(user_id);
