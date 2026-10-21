DROP POLICY IF EXISTS "System inserts webhook logs" ON public.webhook_logs;
REVOKE INSERT, UPDATE, DELETE ON public.webhook_logs FROM anon, authenticated;
GRANT SELECT ON public.webhook_logs TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;