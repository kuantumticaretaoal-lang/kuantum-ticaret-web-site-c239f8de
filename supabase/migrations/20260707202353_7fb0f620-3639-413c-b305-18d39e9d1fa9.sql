
-- CART: restrict anon access to caller's own session via x-session-id header
DROP POLICY IF EXISTS "Users can view their own cart" ON public.cart;
DROP POLICY IF EXISTS "Users can update their cart" ON public.cart;
DROP POLICY IF EXISTS "Users can delete from their cart" ON public.cart;
DROP POLICY IF EXISTS "Users can insert to their cart" ON public.cart;

CREATE POLICY "Cart select own" ON public.cart FOR SELECT USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (auth.uid() IS NULL AND session_id IS NOT NULL
      AND session_id = NULLIF(current_setting('request.headers', true)::json->>'x-session-id',''))
);
CREATE POLICY "Cart update own" ON public.cart FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (auth.uid() IS NULL AND session_id IS NOT NULL
      AND session_id = NULLIF(current_setting('request.headers', true)::json->>'x-session-id',''))
);
CREATE POLICY "Cart delete own" ON public.cart FOR DELETE USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (auth.uid() IS NULL AND session_id IS NOT NULL
      AND session_id = NULLIF(current_setting('request.headers', true)::json->>'x-session-id',''))
);
CREATE POLICY "Cart insert own" ON public.cart FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (auth.uid() IS NULL AND session_id IS NOT NULL
      AND session_id = NULLIF(current_setting('request.headers', true)::json->>'x-session-id',''))
);

-- LIVE SUPPORT MESSAGES: enforce thread ownership
DROP POLICY IF EXISTS "Users can create live support messages" ON public.live_support_messages;
CREATE POLICY "Users can create live support messages"
ON public.live_support_messages FOR INSERT WITH CHECK (
  thread_id IS NOT NULL AND role = 'user'
  AND EXISTS (
    SELECT 1 FROM public.live_support_threads t
    WHERE t.id = thread_id
      AND (
        (auth.uid() IS NOT NULL AND t.user_id = auth.uid())
        OR (auth.uid() IS NULL AND t.device_id IS NOT NULL
            AND t.device_id = NULLIF(current_setting('request.headers', true)::json->>'x-device-id',''))
      )
  )
);

DROP POLICY IF EXISTS "Owners can view thread messages" ON public.live_support_messages;
CREATE POLICY "Owners can view thread messages"
ON public.live_support_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.live_support_threads t
    WHERE t.id = live_support_messages.thread_id
      AND (
        (auth.uid() IS NOT NULL AND t.user_id = auth.uid())
        OR (auth.uid() IS NULL AND t.device_id IS NOT NULL
            AND t.device_id = NULLIF(current_setting('request.headers', true)::json->>'x-device-id',''))
      )
  )
);
