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
 * with graceful fallback to standard table upsert.
 */
export async function upsertProfileWithRPC(profileData: ProfileUpsertData) {
  if (!profileData.user_id) {
    return { data: null, error: new Error("User ID is required for profile upsert") };
  }

  const sanitizedPhone = toDBPhone(profileData.phone);

  try {
    // 1. Call server-side RPC database function
    const { data: rpcData, error: rpcError } = await supabase.rpc('safe_upsert_profile', {
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
      p_latitude: profileData.latitude ?? null,
      p_longitude: profileData.longitude ?? null,
      p_favorites: profileData.favorites || []
    });

    if (!rpcError) {
      return { data: rpcData, error: null };
    }

    console.warn("[Profile RPC] safe_upsert_profile RPC fallback to direct table operation:", rpcError.message);
  } catch (err: any) {
    console.warn("[Profile RPC] Exception executing RPC, falling back to direct table update:", err?.message || err);
  }

  // 2. Direct table upsert fallback
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
    latitude: profileData.latitude,
    longitude: profileData.longitude,
    favorites: profileData.favorites || [],
    updated_at: new Date().toISOString()
  };

  return await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' });
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
