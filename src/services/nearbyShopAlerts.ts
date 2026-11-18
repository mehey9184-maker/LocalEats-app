import type {Shop} from "../types";
import {isWithinPickupArea} from "./pickupMapping";

export type CatalogBaseline = {locationKey: string; knownShopIds: ReadonlySet<string>};

export function compareNearbyCatalog(
  baseline: CatalogBaseline | null,
  locationKey: string,
  shops: Shop[],
): {baseline: CatalogBaseline; newShop?: Shop} {
  const known = baseline?.locationKey === locationKey ? baseline.knownShopIds : undefined;
  const next = new Set(known);
  let newShop: Shop | undefined;

  for (const shop of shops) {
    if (known && !next.has(shop.id) && isWithinPickupArea(shop) &&
      (!newShop || shop.distance! < newShop.distance!)) newShop = shop;
    next.add(shop.id);
  }

  return {baseline: {locationKey, knownShopIds: next}, newShop};
}
