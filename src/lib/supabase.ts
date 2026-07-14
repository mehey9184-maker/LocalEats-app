import { createClient } from '@supabase/supabase-js';

// Fallback values provided by the user
const DEFAULT_URL = 'https://qnwjkwlhmreenqotufvw.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFud2prd2xobXJlZW5xb3R1ZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzY0MDIsImV4cCI6MjA4OTI1MjQwMn0.6eDarz59X1XvPWzWiENvDDQAWAygSEEm8tFWBUCmcSo';

// Check if we are using environment variables or fallback
const hasEnvVars = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!hasEnvVars) {
  console.warn('Supabase configuration: Using default fallback project. For personal data persistence, please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your project settings.');
}

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.includes('supabase.co') && !import.meta.env.VITE_SUPABASE_URL.includes('your-project') ? import.meta.env.VITE_SUPABASE_URL : DEFAULT_URL).replace(/\/$/, '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY.length > 50 && !import.meta.env.VITE_SUPABASE_ANON_KEY.includes('your-anon-key') ? import.meta.env.VITE_SUPABASE_ANON_KEY : DEFAULT_KEY).trim();



// App URL for redirects
export const APP_URL = window.location.origin;

// Ensure we have a valid URL before creating the client
if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error('Invalid Supabase URL configuration. Expected a URL starting with http/https.');
}


const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);
  const pushLog = (window as any).__pushDebugLog;
  
  if (pushLog) {
    const method = init?.method || "GET";
    const cleanUrl = url.split("?")[0];
    pushLog("network", `${method} ${cleanUrl}`, "pending");
  }
  
  try {
    const response = await window.fetch(input, init);
    if (pushLog) {
      const cleanUrl = url.split("?")[0];
      pushLog("network", `${init?.method || "GET"} ${cleanUrl}`, response.ok ? "success" : "error", `Status: ${response.status}`);
    }
    return response;
  } catch (error: any) {
    if (pushLog) {
      const cleanUrl = url.split("?")[0];
      pushLog("network", `${init?.method || "GET"} ${cleanUrl}`, "error", error.message);
    }
    throw error;
  }
};

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
      lock: async (name, acquireTimeout, fn) => {
        return fn();
      },
    },
    global: {
      fetch: customFetch
    }
  }
);
