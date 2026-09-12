import type { Shop, MenuItem } from "../types";

export type CatalogShop = {
  id: string; name: string; is_active: boolean;
  description?: string | null; location?: string | null; category?: string | null;
  logo_url?: string | null; rating?: number | null; opening_time?: string | null;
  closing_time?: string | null; story?: string | null;
  latitude?: number | null; longitude?: number | null; lat?: number | null; lng?: number | null;
};
export type CatalogMenuItem = {
  id: string; shop_id: string; name: string; price: number; is_available: boolean;
  description?: string | null; image_url?: string | null; category?: string | null;
  popularity_score?: number | null; customizations?: { name: string; price: number }[] | null;
  created_at?: string | null;
};
export class CatalogApiError extends Error {
  constructor(message: string, public status?: number) { super(message); this.name = "CatalogApiError"; }
}
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CatalogApiError("Invalid catalog response.");
  return value as Record<string, unknown>;
};
const id = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) throw new CatalogApiError("Invalid catalog ID.");
  return value;
};
const text = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) throw new CatalogApiError("Invalid catalog name.");
  return value;
};
const bool = (value: unknown): boolean => {
  if (typeof value !== "boolean") throw new CatalogApiError("Invalid catalog availability.");
  return value;
};
const price = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new CatalogApiError("Invalid catalog price.");
  return value;
};
function optionalStrings(row: Record<string, unknown>, fields: string[]) {
  const result: Record<string, string | null> = {};
  for (const field of fields) {
    if (row[field] === undefined) continue;
    if (row[field] !== null && typeof row[field] !== "string") throw new CatalogApiError("Invalid catalog text.");
    result[field] = row[field] as string | null;
  }
  return result;
}
export const validLatitude = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
export const validLongitude = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
export function coordinates(row: { latitude?: unknown; longitude?: unknown; lat?: unknown; lng?: unknown }) {
  return {
    latitude: validLatitude(row.latitude) ? row.latitude : validLatitude(row.lat) ? row.lat : undefined,
    longitude: validLongitude(row.longitude) ? row.longitude : validLongitude(row.lng) ? row.lng : undefined,
  };
}
export function hasCoordinates(row: { latitude?: unknown; longitude?: unknown }) {
  return validLatitude(row.latitude) && validLongitude(row.longitude);
}
type Position = { latitude?: number; longitude?: number };
type UserPosition = { lat: number; lng: number } | null;
export function catalogDistance(shop: Position, user: UserPosition): number | null {
  if (!user || !validLatitude(user.lat) || !validLongitude(user.lng) || !hasCoordinates(shop)) return null;
  const radians = (value: number) => value * Math.PI / 180;
  const a = Math.sin(radians(shop.latitude! - user.lat) / 2) ** 2 +
    Math.cos(radians(user.lat)) * Math.cos(radians(shop.latitude!)) *
    Math.sin(radians(shop.longitude! - user.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
export function compareShopDistance(a: Position, b: Position, user: UserPosition): number {
  const da = catalogDistance(a, user);
  const db = catalogDistance(b, user);
  if (da === null) return db === null ? 0 : 1;
  if (db === null) return -1;
  return da - db;
}
export function isNearbyShop(shop: Position, user: UserPosition, radius: number | null = 4): boolean {
  if (!user || !validLatitude(user.lat) || !validLongitude(user.lng)) return true;
  const distance = catalogDistance(shop, user);
  return distance !== null && distance <= Math.min(radius ?? 4, 4);
}
export function parseShop(value: unknown): CatalogShop {
  const row = object(value);
  if (row.rating != null && (typeof row.rating !== "number" || !Number.isFinite(row.rating) || row.rating < 0 || row.rating > 5)) throw new CatalogApiError("Invalid catalog rating.");
  return {
    id: id(row.id), name: text(row.name), is_active: bool(row.is_active),
    ...optionalStrings(row, ["description", "location", "category", "logo_url", "opening_time", "closing_time", "story"]),
    ...(row.rating === undefined ? {} : { rating: row.rating as number | null }),
    ...coordinates(row),
  };
}
export function parseMenuItem(value: unknown, shopId: string): CatalogMenuItem {
  const row = object(value);
  if (id(row.shop_id) !== shopId) throw new CatalogApiError("Catalog menu belongs to another shop.");
  let customizations: CatalogMenuItem["customizations"];
  if (row.customizations != null) {
    if (!Array.isArray(row.customizations)) throw new CatalogApiError("Unsupported catalog customizations.");
    customizations = row.customizations.map((entry) => {
      const item = object(entry);
      return { name: text(item.name), price: price(item.price) };
    });
  }
  if (row.popularity_score != null && (typeof row.popularity_score !== "number" || !Number.isFinite(row.popularity_score))) throw new CatalogApiError("Invalid catalog popularity.");
  return {
    id: id(row.id), shop_id: shopId, name: text(row.name), price: price(row.price), is_available: bool(row.is_available),
    ...optionalStrings(row, ["description", "image_url", "category", "created_at"]),
    ...(row.customizations === undefined ? {} : { customizations: customizations ?? null }),
    ...(row.popularity_score === undefined ? {} : { popularity_score: row.popularity_score as number | null }),
  };
}

export function createCatalogApi(getBase: () => string | undefined, request: typeof fetch = fetch) {
  async function get(path: string) {
    const configured = getBase()?.trim();
    if (!configured) throw new CatalogApiError("LocalEats catalog is not configured.");
    const base = configured.replace(/\/+$/, "");
    let response: Response;
    try { response = await request(base + "/api/v1/catalog" + path); }
    catch { throw new CatalogApiError("Unable to reach the LocalEats catalog."); }
    if (!response.ok) throw new CatalogApiError("LocalEats catalog request failed.", response.status);
    if (!response.headers.get("content-type")?.includes("application/json")) throw new CatalogApiError("Invalid catalog response.");
    let data: Record<string, unknown>;
    try { data = object(await response.json()); }
    catch { throw new CatalogApiError("Invalid catalog JSON."); }
    if (data.success !== true) throw new CatalogApiError("Catalog request was not successful.");
    return data;
  }
  return {
    async getShops(): Promise<CatalogShop[]> {
      const data = await get("/shops");
      if (!Array.isArray(data.shops)) throw new CatalogApiError("Invalid catalog shops.");
      return data.shops.map(parseShop);
    },
    async getShop(shopId: string): Promise<CatalogShop> {
      const data = await get("/shops/" + encodeURIComponent(id(shopId)));
      const shop = parseShop(data.shop);
      if (shop.id !== shopId) throw new CatalogApiError("Unexpected catalog shop.");
      return shop;
    },
    async getMenu(shopId: string): Promise<CatalogMenuItem[]> {
      const data = await get("/shops/" + encodeURIComponent(id(shopId)) + "/menu");
      if (!Array.isArray(data.menu)) throw new CatalogApiError("Invalid catalog menu.");
      return data.menu.map((row) => parseMenuItem(row, shopId));
    },
  };
}
export const CatalogApi = createCatalogApi(() => import.meta.env?.VITE_LOCALEATS_API_URL);
export const AUTHORITATIVE_CATALOG_CACHE_KEY = "localeats_authoritative_catalog_v1";
export type CatalogSnapshot = { shops: CatalogShop[]; menus: CatalogMenuItem[][] };

export function mapCatalogShop(shop: CatalogShop, menu: CatalogMenuItem[]): Shop {
  return {
    id: shop.id, name: shop.name, logo: shop.logo_url ?? "", logo_url: shop.logo_url ?? undefined,
    description: shop.description ?? "No description provided", address: shop.location ?? "Location unavailable",
    category: shop.category ?? "", rating: shop.rating ?? null, is_active: shop.is_active,
    opening_time: shop.opening_time ?? undefined, closing_time: shop.closing_time ?? undefined,
    ...coordinates(shop),
    menu: menu.map((item): MenuItem => ({
      id: item.id, shop_id: item.shop_id, name: item.name, price: item.price,
      displayPrice: "R" + item.price.toFixed(2), image: item.image_url ?? "",
      image_url: item.image_url ?? undefined, description: item.description ?? undefined,
      category: item.category ?? undefined, is_available: item.is_available,
      customizations: item.customizations ?? undefined,
    })),
  };
}
// Three in-flight menu reads maximum. No embedded/default menu hydration.
export async function loadCatalog(api = CatalogApi): Promise<CatalogSnapshot> {
  const shops = await api.getShops();
  const menus: CatalogMenuItem[][] = new Array(shops.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, shops.length) }, async () => {
    while (next < shops.length) {
      const index = next++;
      menus[index] = await api.getMenu(shops[index].id);
    }
  }));
  return { shops, menus };
}
export function displayCatalog(snapshot: CatalogSnapshot): Shop[] {
  return snapshot.shops.map((shop, index) => mapCatalogShop(shop, snapshot.menus[index]));
}
