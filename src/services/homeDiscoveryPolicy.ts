import type { Shop } from "../types";
import type { ClosedPickupShopPreview } from "./nearbyClosedPickupShops";

// A customer search must not hide approved closed shops: their menus remain
// browseable, but they are never promoted into the orderable shop list.
export type HomeShopSuggestion = { id: string; name: string; closed: boolean };

export function homeSearchMatches(
  shop: Pick<Shop, "name" | "description" | "category"> & { cuisine_type?: string },
  query: string,
): boolean {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const searchable = [shop.name, shop.description, shop.category, shop.cuisine_type ?? ""]
    .filter((value) => typeof value === "string").join(" ").toLocaleLowerCase();
  return words.every((word) => searchable.includes(word));
}

export function homeSearchSuggestions(
  shops: Shop[],
  closedShops: ClosedPickupShopPreview[],
  query: string,
  limit = 5,
): HomeShopSuggestion[] {
  if (query.trim().length < 2 || limit <= 0) return [];
  const seen = new Set<string>();
  const results: HomeShopSuggestion[] = [];
  for (const [items, closed] of [[shops, false], [closedShops, true]] as const) {
    for (const shop of items) {
      if (seen.has(shop.id) || !homeSearchMatches(shop, query)) continue;
      seen.add(shop.id);
      results.push({ id: shop.id, name: shop.name, closed });
      if (results.length >= limit) return results;
    }
  }
  return results;
}

// Only parse explicit, reasonable preparation time values, not a fabricated
// default or arbitrary first number from an unrelated string.
export function homePrepMinutes(shop: Pick<Shop, "prepTime">): number | null {
  const raw = shop.prepTime?.trim();
  if (!raw) return null;
  const match = /^(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*(?:min|mins|minutes)$/i.exec(raw);
  if (!match) return null;
  const min = Number(match[1]);
  const max = match[2] ? Number(match[2]) : min;
  return min >= 1 && max >= min && max <= 240 ? min : null;
}

export function homeFastestShopIds(shops: Shop[]): Set<string> {
  const withTimes = shops.map((shop) => ({ id: shop.id, minutes: homePrepMinutes(shop) }))
    .filter((value): value is { id: string; minutes: number } => value.minutes !== null);
  if (!withTimes.length) return new Set();
  const fastest = Math.min(...withTimes.map(({ minutes }) => minutes));
  return new Set(withTimes.filter(({ minutes }) => minutes === fastest).map(({ id }) => id));
}

// An explicit menu-item dietary tag can support "Halal options" (not
// certification of the entire shop). Never infer it from free-text marketing.
export function homeHasHalalOptions(shop: Pick<Shop, "menu">): boolean {
  return Array.isArray(shop.menu) && shop.menu.some((item) =>
    item.is_available !== false &&
    Array.isArray(item.dietary_tags) &&
    item.dietary_tags.some((tag) => typeof tag === "string" && /^halaal?$/i.test(tag.trim()))
  );
}
