/**
 * Preview-only customer test position derived from the live, approved My-Kota
 * catalog record. Never moves the stored restaurant and never supplies fake
 * pricing, menu data or an order. The UI must label this as a simulated
 * customer position; it is NOT the device's GPS.
 */
export function verifiedMyKotaPreviewPosition(rows:unknown):{lat:number;lng:number}|null {
  if(!Array.isArray(rows))return null;
  const candidate=rows.find(row=>
    row && typeof row==="object" && !Array.isArray(row) &&
    (row as Record<string,unknown>).id==="shop-my-kota-ivory-park");
  if(!candidate)return null;
  const row=candidate as Record<string,unknown>;
  if(row.name!=="My-Kota" || row.stored_is_active!==true ||
     row.effective_is_active!==true || row.is_active!==true ||
     typeof row.location!=="string" || !/Ivory\s+Park/i.test(row.location))return null;
  const lat=row.lat ?? row.latitude,lng=row.lng ?? row.longitude;
  if(typeof lat!=="number" || typeof lng!=="number" ||
     !Number.isFinite(lat) || !Number.isFinite(lng) ||
     lat < -26.2 || lat > -25.8 || lng < 28.0 || lng > 28.4)return null;
  return {lat,lng};
}
