const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function test() {
  const envFile = fs.readFileSync('.env.example', 'utf8');
  let url = '';
  let key = '';
  for (const line of envFile.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
  }
  
  if (!url || !key) {
    console.log('No url or key found');
    return;
  }
  
  const supabase = createClient(url, key);
  
  const { data, error } = await supabase.rpc('is_shop_owner', { user_id: '123' });
  console.log('RPC result:', data, error);
}

test();
