import { createClient } from '@supabase/supabase-js';

// Fallback values provided by the user
const DEFAULT_URL = 'https://qnwjkwlhmreenqotufvw.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).replace(/\/$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY).trim();

// App URL for redirects
export const APP_URL = window.location.hostname === 'localhost' 
  ? window.location.origin 
  : window.location.origin; // Dynamically use the current origin

// Ensure we have a valid URL before creating the client
if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error('Invalid Supabase URL. Please check your environment variables.');
} else {
  // Simple connectivity check - using a slightly more robust method
  fetch(`${supabaseUrl}/rest/v1/`, { method: 'GET', headers: { 'apikey': supabaseAnonKey } })
    .then(res => {
      if (res.status === 200 || res.status === 204 || res.status === 401 || res.status === 404) {
        console.log('Supabase connectivity: Client reached server');
      }
    })
    .catch((err) => console.warn('Supabase connectivity check failed. This might be due to ad-blockers or network restrictions:', err));
}

export const supabase = createClient(
  supabaseUrl || DEFAULT_URL, 
  supabaseAnonKey || DEFAULT_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: `sb-${supabaseUrl.split('.')[0].split('//')[1]}-auth-token`,
      flowType: 'pkce',
    }
  }
);
