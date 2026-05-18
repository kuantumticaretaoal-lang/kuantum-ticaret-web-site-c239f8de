
-- Tighten SELECT policies: restrict device/session-scoped public reads

-- banner_dismissals: only authenticated owner can read
DROP POLICY IF EXISTS "Users can view their dismissals" ON public.banner_dismissals;
CREATE POLICY "Users can view their dismissals"
ON public.banner_dismissals
FOR SELECT
USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- cookie_consents: only authenticated owner can read/update
DROP POLICY IF EXISTS "Users can view their consents" ON public.cookie_consents;
CREATE POLICY "Users can view their consents"
ON public.cookie_consents
FOR SELECT
USING (user_id IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their consents" ON public.cookie_consents;
CREATE POLICY "Users can update their consents"
ON public.cookie_consents
FOR UPDATE
USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- search_history: only authenticated owner can read
DROP POLICY IF EXISTS "Users can view their search history" ON public.search_history;
CREATE POLICY "Users can view their search history"
ON public.search_history
FOR SELECT
USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- live_support_threads: scope updates and selects to actual owner
DROP POLICY IF EXISTS "Anyone can update their threads" ON public.live_support_threads;
CREATE POLICY "Owners can update their threads"
ON public.live_support_threads
FOR UPDATE
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (user_id IS NOT NULL AND auth.uid() = user_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- live_support_messages: only thread owner (authenticated) or admin can read
DROP POLICY IF EXISTS "Users can view thread messages" ON public.live_support_messages;
CREATE POLICY "Owners can view thread messages"
ON public.live_support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.live_support_threads t
    WHERE t.id = live_support_messages.thread_id
      AND t.user_id IS NOT NULL
      AND t.user_id = auth.uid()
  )
);

-- referral_codes: remove permissive public lookup; provide secure RPC
DROP POLICY IF EXISTS "Anyone can view referral codes for lookup" ON public.referral_codes;

CREATE OR REPLACE FUNCTION public.lookup_referral_owner(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.referral_codes
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code))
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.lookup_referral_owner(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_referral_owner(text) TO authenticated;
