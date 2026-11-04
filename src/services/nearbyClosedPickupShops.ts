import {distanceKm} from "./pickupDisplayCache.ts";
import type {Shop} from "../types";

type Point={lat:number;lng:number};
export type ClosedPickupShopPreview={
 id:string;name:string;logo:string;address:string;distanceKm:number;
 description:string;category:string;rating:number|null;
 openingTime:string|null;closingTime:string|null;
};

function pilotArea(location:unknown):boolean {
 return typeof location==="string" && /\b(?:tembisa|thembisa|ivory\s+park)\b/i.test(location);
}
function realPoint(point:Point|null):point is Point {
 return Boolean(point && Number.isFinite(point.lat) && Math.abs(point.lat)<=90 &&
  Number.isFinite(point.lng) && Math.abs(point.lng)<=180);
}
function cleanHours(value:unknown):string|null {
 return typeof value==="string" && /^\d{2}:\d{2}(?::\d{2})?$/.test(value) ? value.slice(0,5) : null;
}
// For a READ-ONLY storefront preview. This must never be fed into cart,
// checkout, quote, price calculation or pickup order submission.
export function nearbyClosedPickupShops(rows:unknown,location:Point|null):ClosedPickupShopPreview[] {
 if(!realPoint(location) || !Array.isArray(rows))return [];
 const seen=new Set<string>();
 const closed:ClosedPickupShopPreview[]=[];
 for(const candidate of rows){
  if(!candidate || typeof candidate!=="object" || Array.isArray(candidate))continue;
  const shop=candidate as Record<string,unknown>;
  // Only previously approved records returned by the public catalog can enter
  // here; manual/permanently disabled stores must never be marketed as open-soon.
  if(shop.stored_is_active!==true || shop.effective_is_active!==false ||
     shop.is_active!==false || !pilotArea(shop.location) ||
     typeof shop.id!=="string" || !shop.id || typeof shop.name!=="string" || !shop.name)continue;
  const lat=shop.lat ?? shop.latitude,lng=shop.lng ?? shop.longitude;
  if(typeof lat!=="number" || typeof lng!=="number" ||
     !Number.isFinite(lat) || !Number.isFinite(lng) ||
     Math.abs(lat)>90 || Math.abs(lng)>180)continue;
  const km=distanceKm(location,{lat,lng});
  if(km>4 || seen.has(shop.id))continue;
  seen.add(shop.id);
  closed.push({
   id:shop.id,name:shop.name,
   logo:typeof shop.logo_url==="string" && /^https:\/\//.test(shop.logo_url)?shop.logo_url:"",
   address:shop.location as string,distanceKm:km,
   description:typeof shop.description==="string"?shop.description:"",
   category:typeof shop.category==="string"?shop.category:"",
   rating:typeof shop.rating==="number" && Number.isFinite(shop.rating) && shop.rating>0 && shop.rating<=5 ? shop.rating : null,
   openingTime:cleanHours(shop.opening_time),closingTime:cleanHours(shop.closing_time),
  });
 }
 return closed.sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,30);
}

// This adapter supplies the ORIGINAL visual ShopCard with real public metadata,
// without ever promoting a closed preview into the orderable 'shops' state.
// Empty menu and false active status are deliberate safety controls.
export function closedPickupCardData(preview:ClosedPickupShopPreview):Shop {
 return {
  id:preview.id,name:preview.name,logo:preview.logo,
  images:preview.logo?[preview.logo]:[],
  description:preview.description,category:preview.category,
  address:preview.address,rating:preview.rating??0,
  distance:preview.distanceKm,
  opening_time:preview.openingTime??undefined,closing_time:preview.closingTime??undefined,
  menu:[],isOpen:false,is_active:false,
 };
}
