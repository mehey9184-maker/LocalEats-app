import { createClient } from '@supabase/supabase-js';

// Fallback values provided by the user
const DEFAULT_URL = 'https://qnwjkwlhmreenqotufvw.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';

// Check if we are using environment variables or fallback
const hasEnvVars = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!hasEnvVars) {
  console.warn('Supabase configuration: Using default fallback project. For personal data persistence, please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your project settings.');
}

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).replace(/\/$/, '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY).trim();

// App URL for redirects
export const APP_URL = window.location.origin;

// Ensure we have a valid URL before creating the client
if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error('Invalid Supabase URL configuration. Expected a URL starting with http/https.');
} else {
  // Simple connectivity check
  fetch(`${supabaseUrl}/rest/v1/`, { 
    method: 'GET', 
    headers: { 'apikey': supabaseAnonKey },
    mode: 'cors'
  })
    .then(res => {
      if (res.ok || res.status === 401 || res.status === 404) {
        console.log('Supabase connectivity check: Server reached successfully');
      } else {
        console.warn(`Supabase connectivity: Server returned status ${res.status}`);
      }
    })
    .catch((err) => {
      console.error('CRITICAL: Supabase connection failed (Failed to fetch).', {
        url: supabaseUrl,
        error: err.message,
        hint: 'This usually means the Supabase project is paused, the URL is incorrect, or your network is blocking the request (check ad-blockers).'
      });
    });
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
