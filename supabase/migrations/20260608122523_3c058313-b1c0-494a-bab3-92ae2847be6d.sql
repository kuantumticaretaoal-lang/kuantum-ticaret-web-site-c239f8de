
CREATE TABLE public.filter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  device_id TEXT,
  event_type TEXT NOT NULL,
  filter_key TEXT NOT NULL,
  filter_value TEXT,
  result_count INTEGER,
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.filter_events TO anon;
GRANT SELECT, INSERT ON public.filter_events TO authenticated;
GRANT ALL ON public.filter_events TO service_role;

ALTER TABLE public.filter_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert filter events"
  ON public.filter_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read filter events"
  ON public.filter_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_filter_events_created_at ON public.filter_events(created_at DESC);
CREATE INDEX idx_filter_events_key ON public.filter_events(filter_key);
