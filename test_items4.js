import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL || 'https://qnwjkwlhmreenqotufvw.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';
const supabase = createClient(url, key);

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function test() {
  const uuid = generateUUID();
  const orderData = [{
    id: uuid,
    user_id: null,
    shop_id: 21,
    customer_name: 'Fix Test Customer',
    phone: '0123456789',
    address: '123 Main St',
    city: 'Johannesburg',
    country: 'SA',
    payment_method: 'cash',
    product_name: "test",
    quantity: 1,
    price: 100,
    total_price: 115,
    delivery_fee: 15,
  }];
  const { data, error } = await supabase.from('orders').insert(orderData);
  console.log('Result:', data, error);
}
test();
