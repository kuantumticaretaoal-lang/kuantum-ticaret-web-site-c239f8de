-- Tighten overly-permissive RLS policies flagged by linter

-- search_history: replace permissive insert policy
DROP POLICY IF EXISTS "Anyone can create search history" ON public.search_history;
CREATE POLICY "Anyone can create search history"
ON public.search_history
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
);

-- visitor_analytics: replace permissive insert policy
DROP POLICY IF EXISTS "Anyone can insert analytics" ON public.visitor_analytics;
CREATE POLICY "Anyone can insert analytics"
ON public.visitor_analytics
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- cookie_consents: replace permissive insert policy
DROP POLICY IF EXISTS "Anyone can create consent" ON public.cookie_consents;
CREATE POLICY "Anyone can create consent"
ON public.cookie_consents
FOR INSERT
WITH CHECK (
  device_id IS NOT NULL
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- banner_dismissals: replace permissive insert policy
DROP POLICY IF EXISTS "Anyone can dismiss banners" ON public.banner_dismissals;
CREATE POLICY "Anyone can dismiss banners"
ON public.banner_dismissals
FOR INSERT
WITH CHECK (
  (device_id IS NOT NULL)
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- product_analytics: replace permissive insert/update policies
DROP POLICY IF EXISTS "Anyone can update product analytics" ON public.product_analytics;
CREATE POLICY "Anyone can update product analytics"
ON public.product_analytics
FOR INSERT
WITH CHECK (product_id IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can increment analytics" ON public.product_analytics;
CREATE POLICY "Anyone can increment analytics"
ON public.product_analytics
FOR UPDATE
USING (product_id IS NOT NULL)
WITH CHECK (product_id IS NOT NULL);

-- contact_messages: replace permissive insert policy
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can insert contact messages"
ON public.contact_messages
FOR INSERT
WITH CHECK (
  (user_id IS NULL) OR (user_id = auth.uid())
);
