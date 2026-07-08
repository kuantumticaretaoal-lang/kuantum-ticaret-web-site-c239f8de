
-- ============ IBAN: restrict to authenticated only ============
DROP POLICY IF EXISTS "Anyone can view active iban settings" ON public.iban_settings;

CREATE POLICY "Authenticated users can view active iban settings"
ON public.iban_settings
FOR SELECT
TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.iban_settings FROM anon;

-- ============ visitor_analytics: lock down UPDATE ============
DROP POLICY IF EXISTS "Users can update their own analytics" ON public.visitor_analytics;

-- Only authenticated users can update, and only their own rows
CREATE POLICY "Users can update own analytics rows"
ON public.visitor_analytics
FOR UPDATE
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid())
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- Tighten INSERT: prevent anon from pre-setting duration/left_at
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.visitor_analytics;

CREATE POLICY "Insert own analytics rows"
ON public.visitor_analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (auth.uid() IS NULL AND user_id IS NULL)
  )
  AND duration IS NULL
  AND left_at IS NULL
);

-- Trigger to prevent tampering: anonymous rows cannot be updated at all,
-- authenticated rows can only change left_at / duration and only within
-- 24 hours of visited_at.
CREATE OR REPLACE FUNCTION public.guard_visitor_analytics_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id IS NULL THEN
    RAISE EXCEPTION 'Anonymous analytics rows are immutable';
  END IF;
  IF OLD.visited_at < now() - INTERVAL '24 hours' THEN
    RAISE EXCEPTION 'Analytics row too old to update';
  END IF;
  -- Prevent identity/PII fields from being changed on update
  NEW.user_id := OLD.user_id;
  NEW.page_path := OLD.page_path;
  NEW.visited_at := OLD.visited_at;
  IF NEW.duration IS NOT NULL AND (NEW.duration < 0 OR NEW.duration > 60*60*6) THEN
    NEW.duration := LEAST(GREATEST(NEW.duration, 0), 60*60*6);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_visitor_analytics_update ON public.visitor_analytics;
CREATE TRIGGER guard_visitor_analytics_update
BEFORE UPDATE ON public.visitor_analytics
FOR EACH ROW EXECUTE FUNCTION public.guard_visitor_analytics_update();
