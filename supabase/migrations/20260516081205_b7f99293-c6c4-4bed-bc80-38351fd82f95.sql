
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS returned_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_order_returned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    UPDATE public.orders SET returned_at = now() WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS mark_order_returned_trg ON public.return_requests;
CREATE TRIGGER mark_order_returned_trg
AFTER UPDATE ON public.return_requests
FOR EACH ROW EXECUTE FUNCTION public.mark_order_returned();
