-- Restore EXECUTE permission for generate_order_code (used as DEFAULT for orders.order_code)
-- and other trigger/utility functions that may be invoked indirectly during user inserts.
GRANT EXECUTE ON FUNCTION public.generate_order_code() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_premium_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_view(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_referral_owner(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_submission_count(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_backup_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_hashed_backup_code(uuid) TO authenticated;