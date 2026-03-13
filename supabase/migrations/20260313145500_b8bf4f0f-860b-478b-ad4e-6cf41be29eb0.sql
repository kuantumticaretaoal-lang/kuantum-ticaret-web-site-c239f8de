
CREATE OR REPLACE FUNCTION public.notify_admin_zero_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only trigger when stock_quantity changes to 0
  IF NEW.stock_quantity = 0 AND (OLD.stock_quantity IS NULL OR OLD.stock_quantity > 0) THEN
    -- Notify all admins
    FOR admin_record IN
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, message)
      VALUES (admin_record.user_id, '⚠️ Stok uyarısı: "' || NEW.title || '" ürününün stoğu tükendi!');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_zero_stock
  AFTER UPDATE OF stock_quantity ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_zero_stock();
