import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL || 'https://qnwjkwlhmreenqotufvw.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('orders').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    shop_id: 21,
    quantity: 1,
    price: 100,
    total_price: 100,
    delivery_fee: 0,
    product_name: "test",
    customer_name: "test"
  });
  console.log("Error:", error);
}
test();
