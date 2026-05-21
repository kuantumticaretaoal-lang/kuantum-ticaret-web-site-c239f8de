-- Drop duplicate triggers, keep one of each
DROP TRIGGER IF EXISTS trigger_send_email_notification ON public.notifications;
DROP TRIGGER IF EXISTS order_status_notification_trigger ON public.orders;
DROP TRIGGER IF EXISTS trigger_notify_order_status ON public.orders;
DROP TRIGGER IF EXISTS trigger_auto_income_on_delivery ON public.orders;
DROP TRIGGER IF EXISTS trigger_give_loyalty_points ON public.orders;
DROP TRIGGER IF EXISTS trigger_loyalty_on_delivery ON public.orders;
DROP TRIGGER IF EXISTS trigger_update_purchase_pairs ON public.orders;