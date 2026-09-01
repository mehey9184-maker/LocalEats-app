-- ==========================================
-- RLS CONFIGURATION & POLICIES ONLY
-- (Safely casted to ::text to support both UUID and BIGINT schemas)
-- ==========================================

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);

-- 2. SHOPS
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shops_select_public ON public.shops;
CREATE POLICY shops_select_public ON public.shops FOR SELECT USING (true);

DROP POLICY IF EXISTS shops_write_owner ON public.shops;
CREATE POLICY shops_write_owner ON public.shops FOR ALL USING (owner_id::text = auth.uid()::text) WITH CHECK (owner_id::text = auth.uid()::text);

-- 3. MENU ITEMS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS menu_items_select_public ON public.menu_items;
CREATE POLICY menu_items_select_public ON public.menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS menu_items_write_owner ON public.menu_items;
CREATE POLICY menu_items_write_owner ON public.menu_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shops WHERE public.shops.id::text = menu_items.shop_id::text AND public.shops.owner_id::text = auth.uid()::text)
);

-- 4. ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_select_customer ON public.orders;
CREATE POLICY orders_select_customer ON public.orders FOR SELECT USING (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS orders_select_rider ON public.orders;
-- Check if rider_id exists in their schema before enforcing rider policy. 
-- Using a safe wrapper just in case rider_id isn't in their orders table yet.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'rider_id') THEN
    EXECUTE 'CREATE POLICY orders_select_rider ON public.orders FOR SELECT USING (rider_id::text = auth.uid()::text)';
  END IF;
END $$;

DROP POLICY IF EXISTS orders_select_shop ON public.orders;
CREATE POLICY orders_select_shop ON public.orders FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.shops WHERE public.shops.id::text = orders.shop_id::text AND public.shops.owner_id::text = auth.uid()::text)
);

-- NOTE: We intentionally DO NOT allow customers to INSERT into `orders` via RLS!
-- Orders MUST be created securely via the LocalEats API endpoint.
