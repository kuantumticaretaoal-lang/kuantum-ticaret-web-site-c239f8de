DROP POLICY IF EXISTS "Cart select own" ON public.cart;
DROP POLICY IF EXISTS "Cart insert own" ON public.cart;
DROP POLICY IF EXISTS "Cart update own" ON public.cart;
DROP POLICY IF EXISTS "Cart delete own" ON public.cart;
REVOKE ALL ON public.cart FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart TO authenticated;
GRANT ALL ON public.cart TO service_role;
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cart select own" ON public.cart FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Cart insert own" ON public.cart FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND session_id IS NULL);
CREATE POLICY "Cart update own" ON public.cart FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()) AND session_id IS NULL);
CREATE POLICY "Cart delete own" ON public.cart FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
COMMENT ON COLUMN public.cart.session_id IS 'DEPRECATED for guest access: guests use browser-local carts; never use request headers for ownership.';
CREATE OR REPLACE FUNCTION public.import_guest_cart(p_items jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  item jsonb;
  accessory jsonb;
  product public.products%ROWTYPE;
  ornament public.product_ornaments%ROWTYPE;
  canonical_ornaments jsonb;
  caller uuid := auth.uid();
  item_id uuid;
  amount integer;
  accessory_amount integer;
  imported integer := 0;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'Invalid cart selection';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    item_id := (item->>'id')::uuid;
    amount := (item->>'quantity')::integer;
    IF item_id IS NULL OR amount IS NULL OR amount < 1 OR amount > 999
       OR (item->>'quantity')::numeric <> amount THEN RAISE EXCEPTION 'Invalid cart quantity'; END IF;
    -- A retry after a lost response must never add the same selection twice.
    IF EXISTS (SELECT 1 FROM public.cart WHERE id = item_id AND user_id = caller) THEN
      imported := imported + 1;
      CONTINUE;
    END IF;
    SELECT * INTO product FROM public.products WHERE id = (item->>'product_id')::uuid;
    IF NOT FOUND OR product.stock_status = 'out_of_stock' THEN RAISE EXCEPTION 'Product unavailable'; END IF;
    IF product.stock_quantity IS NOT NULL AND amount > product.stock_quantity THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
    IF product.is_name_customizable AND NULLIF(btrim(item->>'custom_name'), '') IS NULL THEN RAISE EXCEPTION 'Name required'; END IF;
    IF cardinality(product.available_sizes) > 0 AND NOT COALESCE((item->>'selected_size') = ANY(product.available_sizes), false) THEN RAISE EXCEPTION 'Size required'; END IF;
    IF product.allows_custom_photo AND NULLIF(item->>'custom_photo_url', '') IS NULL THEN RAISE EXCEPTION 'Photo required'; END IF;
    IF length(COALESCE(item->>'custom_name','')) > 2048 OR length(COALESCE(item->>'selected_size','')) > 2048
       OR length(COALESCE(item->>'custom_photo_url','')) > 2048 OR length(COALESCE(item->>'bracelet_cord_color','')) > 2048 THEN RAISE EXCEPTION 'Selection too long'; END IF;
    IF jsonb_typeof(item->'selected_ornaments') IS DISTINCT FROM 'array' OR jsonb_array_length(item->'selected_ornaments') > 100 THEN RAISE EXCEPTION 'Invalid accessories'; END IF;
    canonical_ornaments := '[]'::jsonb;
    FOR accessory IN SELECT value FROM jsonb_array_elements(item->'selected_ornaments') LOOP
      SELECT * INTO ornament FROM public.product_ornaments WHERE id = (accessory->>'id')::uuid AND product_id = product.id AND is_active = true;
      accessory_amount := (accessory->>'quantity')::integer;
      IF NOT FOUND OR accessory_amount IS NULL OR accessory_amount < 1 OR accessory_amount > 999
         OR (accessory->>'quantity')::numeric <> accessory_amount
         OR (ornament.max_per_product IS NOT NULL AND accessory_amount > ornament.max_per_product)
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(canonical_ornaments) v WHERE v->>'id' = ornament.id::text)
      THEN RAISE EXCEPTION 'Invalid accessory'; END IF;
      canonical_ornaments := canonical_ornaments || jsonb_build_array(jsonb_build_object('id', ornament.id, 'name', ornament.name, 'extra_price', ornament.extra_price, 'quantity', accessory_amount));
    END LOOP;
    INSERT INTO public.cart (id, user_id, session_id, product_id, quantity, custom_name, selected_size, custom_photo_url, selected_ornaments, bracelet_cord_color)
    VALUES (item_id, caller, NULL, product.id, amount, NULLIF(item->>'custom_name',''), NULLIF(item->>'selected_size',''), NULLIF(item->>'custom_photo_url',''), canonical_ornaments, NULLIF(item->>'bracelet_cord_color',''))
    ON CONFLICT (id) DO NOTHING;
    IF NOT EXISTS (SELECT 1 FROM public.cart WHERE id = item_id AND user_id = caller) THEN RAISE EXCEPTION 'Cart ownership conflict' USING ERRCODE = '42501'; END IF;
    imported := imported + 1;
  END LOOP;
  RETURN imported;
END;
$$;
REVOKE ALL ON FUNCTION public.import_guest_cart(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_guest_cart(jsonb) TO authenticated, service_role;