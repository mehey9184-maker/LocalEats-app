import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://qnwjkwlhmreenqotufvw.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';
const supabase = createClient(url, key);

async function checkOffendingPhones() {
  console.log("Checking profiles table for offending phone numbers...");
  const { data: profiles, error } = await supabase.from('profiles').select('user_id, fullName, phone, email');
  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }
  
  const regex = /^(?:\+27|0)[0-9]{9}$/;
  const offending = profiles.filter(p => p.phone !== null && p.phone !== undefined && !regex.test(p.phone));
  
  console.log(`Total profiles checked: ${profiles.length}`);
  console.log(`Offending profiles count: ${offending.length}`);
  if (offending.length > 0) {
    console.log("Offending profiles:", JSON.stringify(offending, null, 2));
  } else {
    console.log("No offending phone numbers found in stored profiles data!");
  }
}

checkOffendingPhones();
