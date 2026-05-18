
-- Revoke EXECUTE from public/anon/authenticated on trigger-only SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  trigger_only_fns text[] := ARRAY[
    'mark_order_returned()',
    'auto_income_on_delivery()',
    'handle_new_user()',
    'notify_admin_return_request()',
    'notify_admin_zero_stock()',
    'check_premium_expiry()',
    'generate_order_code()',
    'notify_stock_back()',
    'update_updated_at_column()',
    'send_email_notification()',
    'update_product_purchase_pairs()',
    'hash_backup_code(text)',
    'notify_order_status_change()',
    'give_loyalty_points_on_delivery()'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_only_fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not revoke %: %', fn, SQLERRM;
    END;
  END LOOP;
END $$;

-- Revoke EXECUTE from anon on user-only (must be signed in) functions
REVOKE EXECUTE ON FUNCTION public.verify_backup_code(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_hashed_backup_code(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_submission_count(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_premium_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(text, uuid, numeric) FROM anon;
