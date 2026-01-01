-- Sipariş tamamlandığında (delivered olduğunda) product_purchase_pairs tablosunu güncelleyen fonksiyon
CREATE OR REPLACE FUNCTION public.update_product_purchase_pairs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item1 RECORD;
  item2 RECORD;
BEGIN
  -- Sadece delivered durumuna geçişte çalış
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Siparişe ait tüm ürünleri al
    FOR item1 IN 
      SELECT product_id FROM order_items WHERE order_id = NEW.id
    LOOP
      FOR item2 IN 
        SELECT product_id FROM order_items WHERE order_id = NEW.id AND product_id != item1.product_id
      LOOP
        -- Her ürün çifti için purchase_pairs tablosunu güncelle
        INSERT INTO product_purchase_pairs (product_id, paired_product_id, purchase_count)
        VALUES (item1.product_id, item2.product_id, 1)
        ON CONFLICT (product_id, paired_product_id)
        DO UPDATE SET 
          purchase_count = product_purchase_pairs.purchase_count + 1,
          updated_at = now();
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- product_purchase_pairs tablosuna unique constraint ekle (conflict için gerekli)
ALTER TABLE public.product_purchase_pairs 
ADD CONSTRAINT unique_product_pair UNIQUE (product_id, paired_product_id);

-- Trigger oluştur
CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_purchase_pairs();