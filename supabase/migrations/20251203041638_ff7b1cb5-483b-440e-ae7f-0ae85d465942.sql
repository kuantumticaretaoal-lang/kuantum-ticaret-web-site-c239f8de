-- Create favorites table for wishlist functionality
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies for favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);

-- Create function for order status change notifications
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  status_text TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'confirmed' THEN status_text := 'onaylandı';
      WHEN 'preparing' THEN status_text := 'hazırlanıyor';
      WHEN 'ready' THEN status_text := 'hazır';
      WHEN 'in_delivery' THEN status_text := 'teslimatta';
      WHEN 'delivered' THEN status_text := 'teslim edildi';
      WHEN 'rejected' THEN status_text := 'reddedildi';
      ELSE status_text := NEW.status::TEXT;
    END CASE;
    
    INSERT INTO public.notifications (user_id, message)
    VALUES (NEW.user_id, 'Siparişiniz (' || NEW.order_code || ') ' || status_text || '.');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS order_status_notification_trigger ON public.orders;
CREATE TRIGGER order_status_notification_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();