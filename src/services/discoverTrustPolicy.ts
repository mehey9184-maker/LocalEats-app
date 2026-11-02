import type {Shop} from "../types";
import {homePrepMinutes} from "./homeDiscoveryPolicy.ts";
import {homeRating} from "./homeTrustPolicy.ts";
import {isRealHomePoint,nearestHomeDistance,type HomePoint} from "./homeProximity.ts";

export type DiscoverSort="smart"|"distance"|"rating"|"speed";
export type DiscoverCoordinates={lat:number;lng:number};

// No synthetic coordinates. An unknown shop position is not a map pin.
export function discoverShopCoordinates(shop:Shop):DiscoverCoordinates|null{
 const lat=shop.latitude,lng=shop.longitude;
 if(typeof lat!=="number" || typeof lng!=="number" ||
    !isRealHomePoint({lat,lng}) || (lat===0 && lng===0))return null;
 return {lat,lng};
}

// An API-provided shop distance can be used when precise shop coordinates
// are missing; otherwise prefer the actual device-to-shop distance.
export function discoverShopDistance(shop:Shop,userLocation:HomePoint|null):number{
 return nearestHomeDistance(shop,userLocation);
}

export function discoverCategoryMatches(shop:Shop,selected:string):boolean{
 if(selected==="All" || selected==="Favorites" || selected==="Nearby")return true;
 const normalize=(value:string)=>value.trim().toLocaleLowerCase().replace(/s$/,"");
 const selectedKind=normalize(selected);
 if(normalize(shop.category||"")===selectedKind)return true;
 // Only an actual, available menu item's name may qualify a shop for
 // a food tile. Generic promotional descriptions cannot.
 const foodWord=selectedKind==="kota"?"kota":selectedKind==="burger"?"burger":selectedKind==="drink"?"drink":null;
 if(!foodWord)return false;
 return Array.isArray(shop.menu) && shop.menu.some(item=>
  item.is_available!==false &&
  typeof item.name==="string" &&
  new RegExp(`\\b${foodWord}s?\\b`,"i").test(item.name));
}

export function discoverSortShops(
 shops:readonly Shop[],sort:DiscoverSort,location:HomePoint|null,
 status:(shop:Shop)=>boolean,
):Shop[]{
 return [...shops].sort((a,b)=>{
  const openDiff=Number(status(b))-Number(status(a));
  if(openDiff!==0)return openDiff; // even explicit sorts keep closed previews last
  const distanceA=discoverShopDistance(a,location),distanceB=discoverShopDistance(b,location);
  const ratingA=homeRating(a),ratingB=homeRating(b);
  const prepA=homePrepMinutes(a),prepB=homePrepMinutes(b);
  const numeric=(left:number,right:number)=>{
   if(left===right)return 0;
   return left<right?-1:1;
  };
  let diff=0;
  if(sort==="speed")diff=numeric(prepA??Infinity,prepB??Infinity);
  else if(sort==="rating")diff=numeric(-(ratingA??-1),-(ratingB??-1));
  else diff=numeric(distanceA,distanceB);
  if(diff!==0)return diff;
  // Stable, truthful tie breaks without fabricated ranks or ETA.
  diff=numeric(distanceA,distanceB);
  if(diff!==0)return diff;
  diff=numeric(-(ratingA??-1),-(ratingB??-1));
  return diff!==0?diff:a.name.localeCompare(b.name)||String(a.id).localeCompare(String(b.id));
 });
}
