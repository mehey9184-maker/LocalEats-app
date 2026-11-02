import type {MenuItem,Shop} from "../types";

// Home may display only known, validated shop metrics; do not silently
// invent social proof, distances or preparation/delivery promises.
export function homeRating(shop:Shop):number|null {
 const value=shop.rating;
 return typeof value==="number" && Number.isFinite(value) && value>0 && value<=5 ? value : null;
}
export function homeReviewCount(shop:Shop):number|null {
 const value=shop.reviewCount;
 return typeof value==="number" && Number.isSafeInteger(value) && value>0 ? value : null;
}
export function homeDistance(shop:Shop):string|null {
 const value=shop.distance;
 return typeof value==="number" && Number.isFinite(value) && value>=0 && value<=4
  ? `${value.toFixed(1)} km` : null;
}
export function homeDeliveryEta(shop:Shop):string|null {
 const value=shop.delivery_eta;
 return typeof value==="string" && /^\d{1,3}\s*-\s*\d{1,3}\s*min(?:s)?$/i.test(value.trim())
  ? value.trim() : null;
}
// The API-supplied pickup catalog and its saved menu are the sole source for
// an "Order Again" shortcut. Historical prices/items never create new cart rows.
export function homeReorderMenuItem(shop:Shop|undefined,itemName:string,itemId:string):MenuItem|null {
 if(!shop || shop.is_active!==true || shop.isOpen!==true || !Array.isArray(shop.menu))return null;
 const match=shop.menu.find(item=>(item.id===itemId || (typeof itemName==="string" && item.name.toLowerCase()===itemName.toLowerCase())) &&
  item.is_available!==false && typeof item.price==="number" && Number.isFinite(item.price) && item.price>=0);
 return match??null;
}
