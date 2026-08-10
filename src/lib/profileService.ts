import { supabase } from './supabase';
import { toDBPhone } from '../utils';

export interface ProfileUpsertData {
  user_id: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  country?: string | null;
  role?: string | null;
  photo_url?: string | null;
  language?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  favorites?: any[];
}

/**
 * Executes a server-side Supabase Database Function (RPC `safe_upsert_profile`) 
 * to handle phone number validation and sanitization during insertion,
 * with graceful fallback to standard table upsert and local persistence.
 */
export async function upsertProfileWithRPC(profileData: ProfileUpsertData): Promise<{ data: any; error: any }> {
  if (!profileData.user_id) {
    return { data: null, error: new Error("User ID is required for profile upsert") };
  }

  const sanitizedPhone = toDBPhone(profileData.phone);

  // 1. Instantly persist to local storage for offline and fast recovery
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const cached = localStorage.getItem("userProfile");
      const existing = cached ? JSON.parse(cached) : {};
      const updated = {
        ...existing,
        id: profileData.user_id,
        user_id: profileData.user_id,
        fullName: profileData.fullName ?? existing.fullName,
        email: profileData.email ?? existing.email,
        phone: sanitizedPhone ?? profileData.phone ?? existing.phone,
        city: profileData.city ?? existing.city,
        address: profileData.address ?? existing.address,
        country: profileData.country ?? existing.country ?? 'South Africa',
        role: profileData.role ?? existing.role ?? 'user',
        photoURL: profileData.photo_url ?? existing.photoURL,
        language: profileData.language ?? existing.language ?? 'en',
        latitude: profileData.latitude ?? existing.latitude,
        longitude: profileData.longitude ?? existing.longitude,
        favorites: profileData.favorites ?? existing.favorites ?? [],
      };
      localStorage.setItem("userProfile", JSON.stringify(updated));
    }
  } catch (e) {
    // Ignore local storage error
  }

  // If client is offline, resolve successfully with locally cached profile
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { data: { offline: true }, error: null };
  }

  // Fast helper to run promises with strict 2.5-second timeout
  const withFastTimeout = <T,>(p: PromiseLike<T> | Promise<T>, timeoutMs = 2500): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error("RPC_TIMEOUT")), timeoutMs);
      Promise.resolve(p).then((val) => {
        clearTimeout(timeoutId);
        resolve(val);
      }).catch((err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    });
  };

  try {
    // 2. Call server-side RPC database function if available with timeout
    const rpcPromise = supabase.rpc('safe_upsert_profile', {
      p_user_id: profileData.user_id,
      p_full_name: profileData.fullName || null,
      p_email: profileData.email || null,
      p_phone: sanitizedPhone,
      p_city: profileData.city || null,
      p_address: profileData.address || null,
      p_country: profileData.country || 'South Africa',
      p_role: profileData.role || 'user',
      p_photo_url: profileData.photo_url || null,
      p_language: profileData.language || 'en',
      // p_latitude: profileData.latitude ?? null, // Removed due to schema constraint
      // p_longitude: profileData.longitude ?? null, // Removed due to schema constraint
      p_favorites: profileData.favorites || []
    });

    const res: any = await withFastTimeout(rpcPromise, 2500);
    const rpcData = res.data;
    const rpcError = res.error;

    if (!rpcError) {
      return { data: rpcData, error: null };
    }

    // Only log diagnostic info if not a network failure or standard missing function
    const isNetworkOrMissing = 
      rpcError.message?.includes("Failed to fetch") || 
      rpcError.message?.includes("function") || 
      rpcError.message?.includes("not found");
    if (!isNetworkOrMissing) {
      console.info("[Profile RPC] safe_upsert_profile RPC fallback to direct table operation:", rpcError.message);
    }
  } catch (err: any) {
    if (!err?.message?.includes("Failed to fetch") && err?.message !== "RPC_TIMEOUT") {
      console.info("[Profile RPC] Exception executing RPC, falling back to direct table update:", err?.message || err);
    }
  }

  // 3. Direct table upsert fallback with timeout
  const payload: Record<string, any> = {
    user_id: profileData.user_id,
    fullName: profileData.fullName,
    email: profileData.email,
    phone: sanitizedPhone,
    city: profileData.city,
    address: profileData.address,
    country: profileData.country || 'South Africa',
    role: profileData.role || 'user',
    photo_url: profileData.photo_url,
    language: profileData.language || 'en',
    // latitude: profileData.latitude, // Removed due to schema constraint
    // longitude: profileData.longitude, // Removed due to schema constraint
    favorites: profileData.favorites || [],
    updated_at: new Date().toISOString()
  };

  try {
    const tablePromise = supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
    const res: any = await withFastTimeout(tablePromise, 2500);
    if (res.error) {
      const isFetchErr = 
        res.error.message?.includes("Failed to fetch") || 
        res.error.message?.includes("upstream connect error") ||
        res.error.message?.includes("NetworkError");
      if (isFetchErr) {
        return { data: { cached: true, offline: true }, error: null };
      }
    }
    return res;
  } catch (err: any) {
    // Local profile is already saved to localStorage, so return graceful success
    return { data: { cached: true, offline: true }, error: null };
  }
}

/**
 * Runs a query to identify any specific rows in 'public.profiles' where 'phone' 
 * contains characters that do not strictly match the SA phone regex constraint '^(?:\+27|0)[0-9]{9}$'.
 */
export async function findOffendingProfilePhones() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, fullName, email, phone');

  if (error) {
    console.error("Error querying profiles for non-conforming phone numbers:", error);
    return { offending: [], error };
  }

  const saPhoneRegex = /^(?:\+27|0)[0-9]{9}$/;
  const offending = (profiles || []).filter(
    (p) => p.phone !== null && p.phone !== undefined && p.phone !== '' && !saPhoneRegex.test(p.phone)
  );

  return { offending, error: null };
}
