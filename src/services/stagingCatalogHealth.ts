/**
 * Isolated Customer staging only: check the SAME server-side catalogue reader
 * that Home/Discover uses. A public SELECT through the LocalEats API is enough
 * to verify the staging database is reachable without exposing a Supabase key.
 * No browser-to-Supabase requests, cookies, order writes or changes to Production.
 */
import {pickupApiOrigin} from "../pickup/client";

export const isolatedCustomerStaging = import.meta.env.VITE_FIREBASE_CONFIG_SOURCE === "environment";

export async function checkStagingCatalogHealth(
  signal?: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<boolean> {
  const origin = pickupApiOrigin(import.meta.env.VITE_LOCALEATS_API_URL || "", true);
  const response = await transport(origin + "/api/v1/catalog/shops", {
    method: "GET",
    cache: "no-store",
    headers: {"Accept": "application/json"},
    ...(signal ? {signal} : {}),
  });
  if (!response.ok) return false;
  const data: unknown = await response.json();
  return !!data && typeof data === "object" &&
    (data as {success?: unknown}).success === true &&
    Array.isArray((data as {shops?: unknown}).shops);
}
