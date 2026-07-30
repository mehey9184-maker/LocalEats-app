import { createClient } from '@supabase/supabase-js';
const url = process.env.VITE_SUPABASE_URL || 'https://qnwjkwlhmreenqotufvw.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';
const supabase = createClient(url, key);

async function testOrderInsert() {
  const testOrderId = '00000000-0000-0000-0000-000000000000';
  const orderData = [{
    id: testOrderId,
    user_id: null,
    shop_id: '1',
    customer_name: 'Test Customer',
    phone: '0123456789',
    email: 'test@example.com',
    city: 'Johannesburg',
    address: '123 Main St',
    country: 'South Africa',
    product_name: 'Test Burger',
    product_variant: '',
    quantity: 1,
    price: 100,
    notes: 'Test note',
    delivery_instructions: 'Leave at gate',
    status: 'pending',
    payment_method: 'cash',
    is_delivery: true,
    delivery_fee: 15,
    delivery_status: 'finding_rider',
    latitude: -26.2,
    longitude: 28.0,
  }];

  const { data, error } = await supabase.from('orders').insert(orderData).select();
  console.log('Result:', data, error);
}

testOrderInsert();
