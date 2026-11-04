import {distanceKm} from "./pickupDisplayCache";

type Point={lat:number;lng:number};
export type PilotBrowseShop={
  id:string;name:string;location:string;distanceKm:number|null;
  reason:"outside_radius"|"not_accepting"|"unconfirmed";
};

/**
 * Read-only pilot directory, from the API's approved public catalog.
 * Never pass these entries into orderable shops, cart, checkout, quotes or
 * production shop state. Availability and real 4km restrictions remain server
 * authoritative. This makes existing shops visible in a preview even when the
 * customer's actual GPS is outside the pilot area.
 */
export function verifiedPilotBrowseDirectory(
  rows:unknown,location:Point|null,orderableIds:ReadonlySet<string>=new Set(),
):PilotBrowseShop[]{
  if(!Array.isArray(rows))return [];
  const validLocation=!!location && Number.isFinite(location.lat) &&
    Number.isFinite(location.lng) && Math.abs(location.lat)<=90 && Math.abs(location.lng)<=180;
  const result:PilotBrowseShop[]=[];
  const seen=new Set<string>();
  for(const row of rows){
    if(!row || typeof row!=="object" || Array.isArray(row))continue;
    const s=row as Record<string,unknown>;
    if(typeof s.id!=="string" || !s.id || typeof s.name!=="string" ||
       !s.name.trim() || typeof s.location!=="string" ||
       !/\b(?:(?:tembisa|thembisa)|ivory\s+(?:park|2))\b/i.test(s.location) ||
       seen.has(s.id) || orderableIds.has(s.id))continue;
    const lat=s.lat??s.latitude,lng=s.lng??s.longitude;
    if(typeof lat!=="number" || typeof lng!=="number" ||
       !Number.isFinite(lat) || !Number.isFinite(lng) ||
       lat < -90 || lat > 90 || lng < -180 || lng > 180)continue;
    // Tembisa and Ivory Park pilot coordinates; never publish bad
    // foreign/placeholder coordinates as a nearby South African shop.
    if(lat < -27 || lat > -25 || lng < 27 || lng > 29)continue;
    const km=validLocation?distanceKm(location!,{lat,lng}):null;
    const available=s.stored_is_active===true &&
      s.effective_is_active===true && s.is_active===true;
    const reason:PilotBrowseShop["reason"]= !available?"not_accepting":
      km!==null && km>4?"outside_radius":"unconfirmed";
    seen.add(s.id);
    result.push({id:s.id,name:s.name.trim(),location:s.location,distanceKm:km,reason});
  }
  return result.sort((a,b)=>{
    if(a.distanceKm!==null && b.distanceKm!==null && a.distanceKm!==b.distanceKm)
      return a.distanceKm-b.distanceKm;
    return a.name.localeCompare(b.name);
  }).slice(0,12);
}
