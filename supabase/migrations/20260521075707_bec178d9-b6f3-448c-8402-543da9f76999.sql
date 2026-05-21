-- Revoke EXECUTE from anon for SECURITY DEFINER functions that don't need public access
REVOKE EXECUTE ON FUNCTION public.is_premium_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, uuid, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_referral_owner(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_submission_count(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_backup_code(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_hashed_backup_code(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.hash_backup_code(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) FROM anon;