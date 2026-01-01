-- Premium üyelik sistemi
CREATE TABLE public.premium_plans (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric NOT NULL DEFAULT 0,
    duration_days integer NOT NULL DEFAULT 30,
    discount_percent numeric DEFAULT 0,
    free_shipping boolean DEFAULT false,
    early_access boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.premium_benefits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid REFERENCES public.premium_plans(id) ON DELETE CASCADE,
    benefit_text text NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.premium_memberships (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    plan_id uuid REFERENCES public.premium_plans(id),
    status text NOT NULL DEFAULT 'pending', -- pending, active, expired, cancelled
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_trial boolean DEFAULT false,
    trial_days integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.premium_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    plan_id uuid REFERENCES public.premium_plans(id),
    status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Kampanya banner sistemi
CREATE TABLE public.campaign_banners (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    background_image_url text,
    background_color text DEFAULT '#000000',
    text_color text DEFAULT '#ffffff',
    countdown_end timestamp with time zone,
    is_active boolean DEFAULT true,
    show_countdown boolean DEFAULT true,
    scrolling_text text,
    -- Sayfa hedefleme
    show_on_all_pages boolean DEFAULT true,
    show_on_homepage boolean DEFAULT false,
    show_on_products boolean DEFAULT false,
    -- Segment hedefleme
    target_all_users boolean DEFAULT true,
    target_new_users boolean DEFAULT false,
    target_premium_users boolean DEFAULT false,
    target_cart_users boolean DEFAULT false,
    -- Kapatma sonrası gizleme
    hide_days_after_close integer DEFAULT 0,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.banner_dismissals (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    banner_id uuid REFERENCES public.campaign_banners(id) ON DELETE CASCADE,
    user_id uuid,
    device_id text,
    dismissed_at timestamp with time zone DEFAULT now()
);

-- Politika ve çerez yönetimi
CREATE TABLE public.site_policies (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_type text NOT NULL UNIQUE, -- privacy, cookie, return, terms
    title text NOT NULL,
    content text,
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.cookie_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    is_required boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.cookie_consents (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    device_id text NOT NULL,
    category_id uuid REFERENCES public.cookie_categories(id) ON DELETE CASCADE,
    accepted boolean DEFAULT false,
    consented_at timestamp with time zone DEFAULT now()
);

-- Çoklu dil ve para birimi
CREATE TABLE public.supported_languages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code text NOT NULL UNIQUE, -- tr, en, de, etc.
    name text NOT NULL,
    native_name text NOT NULL,
    currency_code text NOT NULL, -- TRY, USD, EUR
    currency_symbol text NOT NULL, -- ₺, $, €
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.exchange_rates (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    from_currency text NOT NULL DEFAULT 'TRY',
    to_currency text NOT NULL,
    rate numeric NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Stok/Aciliyet ayarları
CREATE TABLE public.urgency_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key text NOT NULL UNIQUE,
    is_enabled boolean DEFAULT false,
    display_text text,
    threshold integer, -- örn: son 3 ürün için 3
    updated_at timestamp with time zone DEFAULT now()
);

-- Ürün görüntülenme ve sepete ekleme sayıları
CREATE TABLE public.product_analytics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    view_count integer DEFAULT 0,
    cart_add_count integer DEFAULT 0,
    last_viewed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Bu ürünü alanlar bunları da aldı
CREATE TABLE public.product_purchase_pairs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    paired_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    purchase_count integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(product_id, paired_product_id)
);

-- Sepet terk hatırlatma
CREATE TABLE public.abandoned_cart_reminders (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    cart_snapshot jsonb,
    email_sent boolean DEFAULT false,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Arama geçmişi (öneriler için)
CREATE TABLE public.search_history (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    session_id text,
    search_query text NOT NULL,
    results_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Varsayılan dil ekle
INSERT INTO public.supported_languages (code, name, native_name, currency_code, currency_symbol, is_default, sort_order) VALUES
('tr', 'Türkçe', 'Türkçe', 'TRY', '₺', true, 1),
('en', 'English', 'English', 'USD', '$', false, 2),
('de', 'German', 'Deutsch', 'EUR', '€', false, 3);

-- Varsayılan çerez kategorileri
INSERT INTO public.cookie_categories (name, description, is_required, sort_order) VALUES
('Zorunlu Çerezler', 'Site çalışması için gerekli temel çerezler', true, 1),
('Analitik Çerezler', 'Site kullanımını analiz etmemize yardımcı olur', false, 2),
('Pazarlama Çerezleri', 'Kişiselleştirilmiş reklamlar için kullanılır', false, 3);

-- Varsayılan aciliyet ayarları
INSERT INTO public.urgency_settings (setting_key, is_enabled, display_text, threshold) VALUES
('low_stock_warning', true, 'Son {count} ürün!', 3),
('view_count_display', true, 'Bugün {count} kişi görüntüledi', null),
('cart_add_count', true, '{count} kişi sepete ekledi', null);

-- Varsayılan politikalar
INSERT INTO public.site_policies (policy_type, title, content) VALUES
('privacy', 'Gizlilik Politikası', 'Gizlilik politikası içeriği buraya gelecek...'),
('cookie', 'Çerez Politikası', 'Çerez politikası içeriği buraya gelecek...'),
('return', 'İade ve İptal Politikası', 'İade ve iptal politikası içeriği buraya gelecek...'),
('terms', 'Kullanım Koşulları', 'Kullanım koşulları içeriği buraya gelecek...');

-- RLS Politikaları
ALTER TABLE public.premium_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urgency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_purchase_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_cart_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Premium Plans - Herkes görebilir, admin yönetir
CREATE POLICY "Anyone can view active premium plans" ON public.premium_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage premium plans" ON public.premium_plans FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Premium Benefits
CREATE POLICY "Anyone can view premium benefits" ON public.premium_benefits FOR SELECT USING (true);
CREATE POLICY "Admins can manage premium benefits" ON public.premium_benefits FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Premium Memberships
CREATE POLICY "Users can view their own membership" ON public.premium_memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage memberships" ON public.premium_memberships FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Premium Requests
CREATE POLICY "Users can create their own requests" ON public.premium_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own requests" ON public.premium_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage requests" ON public.premium_requests FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Campaign Banners
CREATE POLICY "Anyone can view active banners" ON public.campaign_banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage banners" ON public.campaign_banners FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Banner Dismissals
CREATE POLICY "Anyone can dismiss banners" ON public.banner_dismissals FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their dismissals" ON public.banner_dismissals FOR SELECT USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR device_id IS NOT NULL);

-- Site Policies
CREATE POLICY "Anyone can view active policies" ON public.site_policies FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage policies" ON public.site_policies FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Cookie Categories
CREATE POLICY "Anyone can view cookie categories" ON public.cookie_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage cookie categories" ON public.cookie_categories FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Cookie Consents
CREATE POLICY "Anyone can create consent" ON public.cookie_consents FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their consents" ON public.cookie_consents FOR SELECT USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR device_id IS NOT NULL);
CREATE POLICY "Users can update their consents" ON public.cookie_consents FOR UPDATE USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR device_id IS NOT NULL);

-- Languages
CREATE POLICY "Anyone can view languages" ON public.supported_languages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage languages" ON public.supported_languages FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Exchange Rates
CREATE POLICY "Anyone can view exchange rates" ON public.exchange_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage exchange rates" ON public.exchange_rates FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Urgency Settings
CREATE POLICY "Anyone can view urgency settings" ON public.urgency_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage urgency settings" ON public.urgency_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Product Analytics
CREATE POLICY "Anyone can view product analytics" ON public.product_analytics FOR SELECT USING (true);
CREATE POLICY "Anyone can update product analytics" ON public.product_analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can increment analytics" ON public.product_analytics FOR UPDATE USING (true);

-- Product Purchase Pairs
CREATE POLICY "Anyone can view purchase pairs" ON public.product_purchase_pairs FOR SELECT USING (true);
CREATE POLICY "System can manage purchase pairs" ON public.product_purchase_pairs FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Abandoned Cart Reminders
CREATE POLICY "Users can view their reminders" ON public.abandoned_cart_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage reminders" ON public.abandoned_cart_reminders FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Search History
CREATE POLICY "Anyone can create search history" ON public.search_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their search history" ON public.search_history FOR SELECT USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR session_id IS NOT NULL);

-- Premium üyelik durumu kontrolü için fonksiyon
CREATE OR REPLACE FUNCTION public.is_premium_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.premium_memberships
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- Premium üyelik otomatik sona erdirme trigger
CREATE OR REPLACE FUNCTION public.check_premium_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.premium_memberships
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at <= now();
  RETURN NULL;
END;
$$;

-- Ürün görüntülenme sayısını artır
CREATE OR REPLACE FUNCTION public.increment_product_view(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.product_analytics (product_id, view_count, last_viewed_at)
  VALUES (p_product_id, 1, now())
  ON CONFLICT (product_id)
  DO UPDATE SET 
    view_count = product_analytics.view_count + 1,
    last_viewed_at = now();
END;
$$;

-- product_analytics için unique constraint ekle
ALTER TABLE public.product_analytics ADD CONSTRAINT unique_product_analytics UNIQUE (product_id);