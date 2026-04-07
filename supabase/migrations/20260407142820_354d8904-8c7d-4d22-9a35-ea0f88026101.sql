
-- Drop all potentially existing triggers first, then recreate

DROP TRIGGER IF EXISTS trigger_notify_order_status ON public.orders;
DROP TRIGGER IF EXISTS trigger_auto_income_on_delivery ON public.orders;
DROP TRIGGER IF EXISTS trigger_give_loyalty_points ON public.orders;
DROP TRIGGER IF EXISTS trigger_update_purchase_pairs ON public.orders;
DROP TRIGGER IF EXISTS trigger_notify_zero_stock ON public.products;
DROP TRIGGER IF EXISTS trigger_notify_admin_return ON public.return_requests;
DROP TRIGGER IF EXISTS trigger_send_email_notification ON public.notifications;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

-- 1. Order status change notification
CREATE TRIGGER trigger_notify_order_status
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();

-- 2. Auto income on delivery
CREATE TRIGGER trigger_auto_income_on_delivery
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_income_on_delivery();

-- 3. Loyalty points on delivery
CREATE TRIGGER trigger_give_loyalty_points
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.give_loyalty_points_on_delivery();

-- 4. Product purchase pairs on delivery
CREATE TRIGGER trigger_update_purchase_pairs
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_product_purchase_pairs();

-- 5. Zero stock notification
CREATE TRIGGER trigger_notify_zero_stock
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_zero_stock();

-- 6. Return request admin notification
CREATE TRIGGER trigger_notify_admin_return
AFTER INSERT ON public.return_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_return_request();

-- 7. Email notification on new notification
CREATE TRIGGER trigger_send_email_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.send_email_notification();

-- 8. Updated_at triggers
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
