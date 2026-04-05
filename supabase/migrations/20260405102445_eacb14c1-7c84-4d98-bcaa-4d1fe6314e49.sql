
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'live_support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_support_messages;
  END IF;
END $$;

-- Auto income on delivery trigger
CREATE OR REPLACE FUNCTION public.auto_income_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    INSERT INTO public.expenses (type, amount, description, order_id)
    VALUES ('income', NEW.total_amount, 'Sipariş teslim edildi: #' || NEW.order_code, NEW.id);
  END IF;
  IF OLD.status = 'delivered' AND NEW.status != 'delivered' THEN
    DELETE FROM public.expenses WHERE order_id = NEW.id AND type = 'income';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_income_on_delivery ON public.orders;
CREATE TRIGGER trigger_auto_income_on_delivery
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_income_on_delivery();

-- Admin notification on return request
CREATE OR REPLACE FUNCTION public.notify_admin_return_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  order_code_val TEXT;
BEGIN
  SELECT order_code INTO order_code_val FROM public.orders WHERE id = NEW.order_id;
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, message)
    VALUES (admin_record.user_id, '📦 Yeni iade talebi: Sipariş #' || COALESCE(order_code_val, NEW.order_id::TEXT));
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admin_return_request ON public.return_requests;
CREATE TRIGGER trigger_notify_admin_return_request
AFTER INSERT ON public.return_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_return_request();
