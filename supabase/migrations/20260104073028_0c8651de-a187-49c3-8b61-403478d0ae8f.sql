-- exchange_rates tablosuna unique constraint ekle
ALTER TABLE public.exchange_rates 
ADD CONSTRAINT exchange_rates_from_to_unique 
UNIQUE (from_currency, to_currency);