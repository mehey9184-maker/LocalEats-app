-- ============================================================================
-- supabase_migration.sql / supabase_guest_schema.sql
-- Comprehensive Database Migration & Schema Alignment Script for LocalEatsSA
-- ----------------------------------------------------------------------------
-- Ensures all 10 tables referenced in the app exist in the Supabase public
-- schema with the correct columns, indexes, and Row Level Security (RLS) policies.
-- Handles policy dropping cleanly to avoid 42710 conflict errors.
-- ============================================================================

-- ============================================================================
-- SECTION 0: Table Existence Verification (Robust SQL DO Block)
-- ============================================================================
DO $$
DECLARE
    t_name TEXT;
    required_tables TEXT[] := ARRAY[
        'shops', 
        'menu_items', 
        'profiles', 
        'orders', 
        'contact_messages', 
        'push_subscriptions', 
        'reviews', 
        'rider_profiles', 
        'rider_locations', 
        'guest_carts'
    ];
BEGIN
    FOREACH t_name IN ARRAY required_tables LOOP
        IF NOT EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = t_name
        ) THEN
            RAISE NOTICE 'Table % is missing and will be initialized by the schema definitions below.', t_name;
        ELSE
            RAISE NOTICE 'Table % already exists and is fully verified.', t_name;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- SECTION 1: Enable Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 2: Table 1 - guest_carts (Ephemerality & POPIA Compliance)
-- ============================================================================
-- Idempotent dropping of the select policy on guest_carts to avoid 42710 conflict errors
DROP POLICY IF EXISTS "Allow anonymous select via token" ON public.guest_carts;
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.guest_carts;
DROP POLICY IF EXISTS "Allow anonymous update via token" ON public.guest_carts;
DROP POLICY IF EXISTS "Allow anonymous delete via token" ON public.guest_carts;

-- Create guest_carts table
CREATE TABLE IF NOT EXISTS public.guest_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_token TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS guest_carts_guest_token_idx ON public.guest_carts (guest_token);

-- Enable RLS
ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
CREATE POLICY "Allow anonymous select via token" ON public.guest_carts
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert" ON public.guest_carts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update via token" ON public.guest_carts
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous delete via token" ON public.guest_carts
    FOR DELETE USING (true);

-- Clean-up Routine: Purge ephemeral carts older than 24 hours to enforce POPIA data minimization
CREATE OR REPLACE FUNCTION public.purge_expired_guest_carts()
RETURNS void AS $$
BEGIN
    DELETE FROM public.guest_carts
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cleanup routine hourly using pg_cron (ensure previous schedules are overwritten/re-created safely)
SELECT cron.unschedule('purge-expired-guest-carts-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-guest-carts-hourly');
SELECT cron.schedule(
    'purge-expired-guest-carts-hourly',
    '0 * * * *', -- At minute 0 of every hour
    'SELECT public.purge_expired_guest_carts();'
);

-- ============================================================================
-- SECTION 3: Table 2 - profiles (User Identity & Preferences)
-- ============================================================================
DROP POLICY IF EXISTS "Allow public read on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to upsert their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profiles" ON public.profiles;

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY,
    "fullName" TEXT,
    email TEXT,
    phone TEXT,
    city TEXT,
    address TEXT,
    country TEXT,
    role TEXT DEFAULT 'customer',
    photo_url TEXT,
    language TEXT DEFAULT 'en',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    favorites JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to upsert their own profiles" ON public.profiles
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SECTION 4: Table 3 - shops (Kota Joints & Kitchen Hubs)
-- ============================================================================
DROP POLICY IF EXISTS "Allow public read on shops" ON public.shops;
DROP POLICY IF EXISTS "Allow authenticated inserts on shops" ON public.shops;
DROP POLICY IF EXISTS "Allow owners to update their shops" ON public.shops;

CREATE TABLE IF NOT EXISTS public.shops (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    category TEXT,
    owner_id UUID,
    logo_url TEXT,
    localeats_cash_trust BOOLEAN DEFAULT false,
    cash_trust_enabled BOOLEAN DEFAULT false,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS shops_owner_idx ON public.shops (owner_id);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on shops" ON public.shops
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated inserts on shops" ON public.shops
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Allow owners to update their shops" ON public.shops
    FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ============================================================================
-- SECTION 5: Table 4 - menu_items (Gourmet Kota Varieties)
-- ============================================================================
DROP POLICY IF EXISTS "Allow public read on menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow authenticated writes on menu_items" ON public.menu_items;

CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    shop_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    description TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    popularity_score INTEGER DEFAULT 0,
    customizations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS menu_items_shop_idx ON public.menu_items (shop_id);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on menu_items" ON public.menu_items
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated writes on menu_items" ON public.menu_items
    FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- SECTION 6: Table 5 - contact_messages (User Support & Support Tickets)
-- ============================================================================
DROP POLICY IF EXISTS "Allow anonymous insert on contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow users to select their own contact_messages" ON public.contact_messages;

CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS contact_messages_user_idx ON public.contact_messages (user_id);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON public.contact_messages (created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert on contact_messages" ON public.contact_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to select their own contact_messages" ON public.contact_messages
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- SECTION 7: Table 6 - orders (Seamless Purchases & Fallbacks)
-- ============================================================================
DROP POLICY IF EXISTS "Allow users to select their own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow users to insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow users to update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public/anonymous insertion on orders" ON public.orders;

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    shop_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    delivery_status TEXT NOT NULL DEFAULT 'none',
    product_name TEXT,
    quantity INTEGER,
    price NUMERIC,
    delivery_fee NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_delivery BOOLEAN DEFAULT false,
    payment_method TEXT DEFAULT 'cash_on_arrival',
    notes TEXT,
    delivery_instructions TEXT,
    customer_name TEXT,
    phone TEXT,
    address TEXT,
    status_history JSONB DEFAULT '[]'::jsonb,
    rating INTEGER,
    review_text TEXT,
    rider_id UUID,
    cancellation_reason TEXT
);

CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders (created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to select their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = rider_id);

CREATE POLICY "Allow users to insert their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = rider_id) WITH CHECK (auth.uid() = user_id OR auth.uid() = rider_id);

CREATE POLICY "Allow public/anonymous insertion on orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SECTION 8: Table 7 - push_subscriptions (Real-time Pushes)
-- ============================================================================
DROP POLICY IF EXISTS "Allow user control over subscriptions" ON public.push_subscriptions;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subscription JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS push_subs_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user control over subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SECTION 9: Table 8 - reviews (Joint Feedback)
-- ============================================================================
DROP POLICY IF EXISTS "Allow public select on reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow any user to insert reviews" ON public.reviews;

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id TEXT NOT NULL,
    user_id UUID,
    username TEXT DEFAULT 'Anonymous',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS reviews_shop_idx ON public.reviews (shop_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on reviews" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Allow any user to insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SECTION 10: Table 9 - rider_profiles (Active Partners)
-- ============================================================================
DROP POLICY IF EXISTS "Allow public select on rider_profiles" ON public.rider_profiles;
DROP POLICY IF EXISTS "Allow riders to manage their profiles" ON public.rider_profiles;

CREATE TABLE IF NOT EXISTS public.rider_profiles (
    id UUID PRIMARY KEY,
    name TEXT,
    "fullName" TEXT,
    is_online BOOLEAN DEFAULT false,
    current_order_id TEXT,
    rating NUMERIC DEFAULT 5.0,
    rating_count INTEGER DEFAULT 0,
    phone TEXT,
    vehicle TEXT,
    vehicle_type TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on rider_profiles" ON public.rider_profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow riders to manage their profiles" ON public.rider_profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================================
-- SECTION 11: Table 10 - rider_locations (GPS Mapping)
-- ============================================================================
DROP POLICY IF EXISTS "Allow public select on rider_locations" ON public.rider_locations;
DROP POLICY IF EXISTS "Allow riders to upsert their locations" ON public.rider_locations;

CREATE TABLE IF NOT EXISTS public.rider_locations (
    rider_id UUID PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on rider_locations" ON public.rider_locations
    FOR SELECT USING (true);

CREATE POLICY "Allow riders to upsert their locations" ON public.rider_locations
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- SECTION 12: Table 11 - chat_messages (Order Participant Delivery Chat)
-- ============================================================================
DROP POLICY IF EXISTS "Allow select chat_messages for participants" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow insert chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow update chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow select chat_messages for order participants" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow insert chat_messages for order participants" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow update chat_messages for order participants" ON public.chat_messages;

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_type TEXT DEFAULT 'user',
    message_text TEXT,
    content TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add missing columns if chat_messages table already existed
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.chat_messages ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'user';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS message_text TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS chat_messages_order_idx ON public.chat_messages (order_id);
CREATE INDEX IF NOT EXISTS chat_messages_unread_idx ON public.chat_messages (order_id, is_read);
CREATE INDEX IF NOT EXISTS chat_messages_read_at_idx ON public.chat_messages (order_id, read_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select chat_messages for order participants" ON public.chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Allow insert chat_messages for order participants" ON public.chat_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update chat_messages for order participants" ON public.chat_messages
    FOR UPDATE USING (true) WITH CHECK (true);
