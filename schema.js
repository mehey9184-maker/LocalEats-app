const url = 'https://qnwjkwlhmreenqotufvw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';

async function run() {
  const res = await fetch(`${url}/rest/v1/`, { headers: { apikey: key } });
  const json = await res.json();
  const defs = json.definitions || json.components?.schemas;
  console.log(Object.keys(defs || {}));
}
run();
