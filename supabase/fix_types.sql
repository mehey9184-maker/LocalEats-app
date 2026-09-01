-- FIX: Align shop_id types across tables and recreate Foreign Key constraints

-- 1. First, we need to know what type `shops.id` is. 
-- Assuming `shops.id` is TEXT (which is best for UUIDs/Firebase IDs).
-- If `shops.id` is BIGINT in your DB, please change `TEXT` below to `BIGINT`.

DO $$
BEGIN
    -- Drop existing constraints that might block type changes
    ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_shop_id_fkey;
    ALTER TABLE IF EXISTS public.promo_codes DROP CONSTRAINT IF EXISTS promo_codes_shop_id_fkey;
    ALTER TABLE IF EXISTS public.menu_items DROP CONSTRAINT IF EXISTS menu_items_shop_id_fkey;
END $$;

-- 2. Alter the shops table ID to TEXT (if not already)
ALTER TABLE public.shops ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- 3. Alter the referencing columns to TEXT
ALTER TABLE public.orders ALTER COLUMN shop_id TYPE TEXT USING shop_id::TEXT;
ALTER TABLE public.promo_codes ALTER COLUMN shop_id TYPE TEXT USING shop_id::TEXT;
ALTER TABLE public.menu_items ALTER COLUMN shop_id TYPE TEXT USING shop_id::TEXT;

-- 4. Recreate the Foreign Key constraints securely
ALTER TABLE public.orders 
    ADD CONSTRAINT orders_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

ALTER TABLE public.promo_codes 
    ADD CONSTRAINT promo_codes_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

ALTER TABLE public.menu_items 
    ADD CONSTRAINT menu_items_shop_id_fkey 
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- 5. Ensure missing columns exist in orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB;

-- Note: We also reload schema cache in PostgREST just in case
NOTIFY pgrst, 'reload schema';
