ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_context text,
  ADD COLUMN IF NOT EXISTS avg_deal_value numeric;