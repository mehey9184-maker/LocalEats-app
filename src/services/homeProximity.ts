import type {Shop} from "../types";
import {distanceKm} from "./pickupDisplayCache.ts";

export type HomePoint={lat:number;lng:number};
export function isRealHomePoint(point:HomePoint|null|undefined):point is HomePoint {
 return !!point && Number.isFinite(point.lat) && Math.abs(point.lat)<=90 &&
  Number.isFinite(point.lng) && Math.abs(point.lng)<=180;
}

// GPS coordinates are preferred over an older API distance whenever available.
// Never generate a synthetic location, claim a distance outside the 4 km radius,
// or treat unverified coordinates as a nearby restaurant.
export function nearestHomeDistance(shop:Shop,location:HomePoint|null):number {
 if(!isRealHomePoint(location))return Number.POSITIVE_INFINITY;
 if(typeof shop.latitude==="number" && typeof shop.longitude==="number" &&
    isRealHomePoint({lat:shop.latitude,lng:shop.longitude})){
  const km=distanceKm(location,{lat:shop.latitude,lng:shop.longitude});
  return km>=0 && km<=4 ? km : Number.POSITIVE_INFINITY;
 }
 const saved=shop.distance;
 return typeof saved==="number" && Number.isFinite(saved) && saved>=0 && saved<=4
  ? saved : Number.POSITIVE_INFINITY;
}

export function shouldUpdateHomeLocation(
 previous:HomePoint|null,next:HomePoint,lastUpdatedAt:number,now:number,
):boolean {
 if(!isRealHomePoint(next))return false;
 if(!previous)return true;
 if(!isRealHomePoint(previous) || now-lastUpdatedAt<45_000)return false;
 return distanceKm(previous,next)>=0.1;
}
