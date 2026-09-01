-- Migration: Standardize Firebase UID Identity Column Types as TEXT
-- Target: public.profiles, public.orders, public.shops

-- 1. Alter profiles.user_id to TEXT
ALTER TABLE public.profiles 
  ALTER COLUMN user_id TYPE TEXT;

-- 2. Alter orders.user_id to TEXT
ALTER TABLE public.orders 
  ALTER COLUMN user_id TYPE TEXT;

-- 3. Alter shops.owner_id to TEXT
ALTER TABLE public.shops 
  ALTER COLUMN owner_id TYPE TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
