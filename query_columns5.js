import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL || 'https://qnwjkwlhmreenqotufvw.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('orders').insert({
    id: "e501ddb9-1111-4111-1111-111111111111",
    user_id: "00000000-0000-0000-0000-000000000000",
    shop_id: "21",
    product_name: "Test",
    quantity: 1,
    price: 100,
    delivery_fee: 15,
    total_price: 115,
    customer_name: "test",
    phone: "test",
    address: "test",
    city: "test",
    country: "test",
    amount: 100
  });
  console.log('Result string:', data, error);
}
test();
