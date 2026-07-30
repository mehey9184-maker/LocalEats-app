import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL || 'https://qnwjkwlhmreenqotufvw.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';
const supabase = createClient(url, key);

async function run() {
  const payload = {
    user_id: '98bba4e0-6234-4037-88ff-1b74f79dcf90',
    fullName: 'Test',
    email: 'test@test.com',
    phone: '123456789',
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase.from('profiles').upsert(payload);
  console.log('Upsert result:', data, error);
}
run();
