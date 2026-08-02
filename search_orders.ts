import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://qnwjkwlhmreenqotufvw.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';

const supabase = createClient(DEFAULT_URL, DEFAULT_KEY);

async function search() {
    console.log("Searching for orders...");
    const { data: orders, error: oErr } = await supabase.from('orders').select('*').limit(5);
    if (oErr) console.error("Error orders:", oErr);
    else console.log("Orders found:", JSON.stringify(orders, null, 2));
}

search();
