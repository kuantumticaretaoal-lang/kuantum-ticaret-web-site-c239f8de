CREATE OR REPLACE FUNCTION public.send_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_order_id TEXT;
BEGIN
  -- Eğer sipariş ile ilgili bir bildirim ise order_id'yi çıkar
  v_order_id := NULL;
  IF NEW.message LIKE '%Sipariş #%' THEN
    v_order_id := substring(NEW.message from 'Sipariş #([A-Z0-9-]+)');
  END IF;

  -- E-posta gönder (async, hata olsa bile trigger başarılı olur)
  PERFORM net.http_post(
    url := (SELECT current_setting('app.supabase_url', true) || '/functions/v1/send-order-notification-email'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT current_setting('app.supabase_service_role_key', true))
    ),
    body := jsonb_build_object(
      'orderId', v_order_id,
      'userId', NEW.user_id,
      'message', NEW.message
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- E-posta hatası olsa bile notification kaydını oluştur
  RETURN NEW;
END;
$$;