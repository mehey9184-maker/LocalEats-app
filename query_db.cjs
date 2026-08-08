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
  const supabase = createClient(url, key);
  
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  console.log(await res.json());
}
test();
