import type {Shop} from "../types";
import {discoverShopCoordinates,discoverShopDistance,discoverCategoryMatches,discoverSortShops} from "./discoverTrustPolicy.ts";
import {homeRating} from "./homeTrustPolicy.ts";
import {isRealHomePoint,type HomePoint} from "./homeProximity.ts";

export type MapSort="rating"|"distance"|"name";
export type MapFilter={
 query:string;category:string;favorites:readonly string[];
 minRating:number;onlyOpen:boolean;maxDistance:number|null;
 location:HomePoint|null;sort:MapSort;isOpen:(shop:Shop)=>boolean;
};

// The map never promotes a shop without actual shop coordinates to a pin.
// A valid catalog distance can still be shown in the LIST if device location
// is available, but cannot manufacture a shop position.
export const mapShopCoordinates=discoverShopCoordinates;
export const mapShopDistance=discoverShopDistance;
export function mapVisibleShops(shops:readonly Shop[],filters:MapFilter):Shop[]{
 const {query,category,favorites,minRating,onlyOpen,maxDistance,location,sort,isOpen}=filters;
 const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const candidates=shops.filter(shop=>{
  if(category==="Favorites" && !favorites.includes(shop.id))return false;
  if(!discoverCategoryMatches(shop,category))return false;
  const text=[shop.name,shop.description,shop.category,shop.address,shop.cuisine_type??""]
   .filter(value=>typeof value==="string").join(" ").toLocaleLowerCase();
  const food=Array.isArray(shop.menu)?shop.menu.filter(item=>item?.is_available!==false &&
   typeof item?.name==="string").map(item=>[item.name,item.category??""].join(" ").toLocaleLowerCase()):[];
  if(terms.length && !terms.every(term=>text.includes(term)) &&
     !food.some(item=>terms.every(term=>item.includes(term))))return false;
  const rating=homeRating(shop);
  if(minRating>0 && (rating===null || rating<minRating))return false;
  if(onlyOpen && !isOpen(shop))return false;
  if(category==="Nearby" || maxDistance!==null){
   const distance=mapShopDistance(shop,location);
   if(!Number.isFinite(distance) || maxDistance!==null && distance>maxDistance)return false;
  }
  return true;
 });
 const metricSort=category==="Nearby"?"distance":sort;
 if(metricSort!=="name")return discoverSortShops(candidates,metricSort,location,isOpen);
 return [...candidates].sort((a,b)=>{
  if(isOpen(a)!==isOpen(b))return isOpen(a)?-1:1;
  return a.name.localeCompare(b.name)||String(a.id).localeCompare(String(b.id));
 });
}
export function mapInitialCenter(
 selected:Shop|undefined,location:HomePoint|null,visible:readonly Shop[],
):[number,number]{
 const selectedCoords=selected?mapShopCoordinates(selected):null;
 if(selectedCoords)return [selectedCoords.lat,selectedCoords.lng];
 if(isRealHomePoint(location))return [location.lat,location.lng];
 const first=visible.map(mapShopCoordinates).find(point=>point!==null);
 if(first)return [first.lat,first.lng];
 // Neutral Tembisa/Ivory map viewport only: never marked as a device
 // location or a restaurant. No fake location pin is created.
 return [-25.9964,28.2268];
}
