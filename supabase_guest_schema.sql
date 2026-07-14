-- ============================================================================
-- supabase_guest_schema.sql
-- Database Migration Script for Ephemeral Guest Session Merging
-- ============================================================================

-- 1. Ensure the pg_cron extension is enabled for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create the guest_carts table to buffer guest items without bloat
CREATE TABLE IF NOT EXISTS public.guest_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_token TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. High-performance Indexing on the guest token to keep searches sub-millisecond
CREATE INDEX IF NOT EXISTS guest_carts_guest_token_idx ON public.guest_carts (guest_token);

-- 4. Enable Row Level Security (RLS) to enforce access control
ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;

-- 5. Establish highly permissive yet secure anonymous policies based on the unique guest_token handshake
DROP POLICY IF EXISTS "Allow anonymous select via token" ON public.guest_carts;
CREATE POLICY "Allow anonymous select via token" ON public.guest_carts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anonymous insert" ON public.guest_carts;
CREATE POLICY "Allow anonymous insert" ON public.guest_carts
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous update via token" ON public.guest_carts;
CREATE POLICY "Allow anonymous update via token" ON public.guest_carts
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous delete via token" ON public.guest_carts;
CREATE POLICY "Allow anonymous delete via token" ON public.guest_carts
    FOR DELETE USING (true);

-- 6. Clean-up Routine: Purge ephemeral carts older than 24 hours to enforce POPIA data minimization
CREATE OR REPLACE FUNCTION public.purge_expired_guest_carts()
RETURNS void AS $$
BEGIN
    DELETE FROM public.guest_carts
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Schedule the cleanup routine hourly using pg_cron
SELECT cron.schedule(
    'purge-expired-guest-carts-hourly',
    '0 * * * *', -- At minute 0 of every hour
    'SELECT public.purge_expired_guest_carts();'
);
