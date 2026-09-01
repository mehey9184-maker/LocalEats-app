import { auth } from './firebase';
import { supabase } from './supabase';

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        return { Authorization: `Bearer fb-${token}` };
      }
    }
  } catch (e) {
    console.warn("[apiAuth] Firebase currentUser auth check failed:", e);
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer fb-${session.access_token}` };
    }
  } catch (e) {
    console.warn("[apiAuth] Supabase wrapper session check failed:", e);
  }

  return {};
}
