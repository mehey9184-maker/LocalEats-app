/**
 * P4: truthful, consistent, human-readable discovery status.
 * This is PRESENTATION ONLY. Eligibility and pricing still come from
 * the authoritative pickup mapping/API, not this helper.
 */
export type ShopCardTrustState = {
  badge: "Outside 4 km" | "Location needed" | "Temporarily away" | "Open Now" | "Closed";
  actionHint: "Pickup at shop" | "Browse menu only";
  hoursHint: string | null;
};

export function shopCardTrustState(input:{
  outsidePickupArea:boolean;
  locationUnknown:boolean;
  away:boolean;
  isOpen:boolean;
  nextOpeningTime?:string|null;
}):ShopCardTrustState{
  const browseOnly=input.outsidePickupArea||input.locationUnknown||input.away||!input.isOpen;
  const badge=input.outsidePickupArea?"Outside 4 km":
    input.locationUnknown?"Location needed":
    input.away?"Temporarily away":
    input.isOpen?"Open Now":"Closed";
  // Never invent "Soon" if actual hours are not available.
  const hoursHint=!browseOnly || input.outsidePickupArea || input.locationUnknown || input.away
    ? null
    : input.nextOpeningTime?.trim() ? `Opens ${input.nextOpeningTime.trim()}` : "Opening time unavailable";
  return {badge,actionHint:browseOnly?"Browse menu only":"Pickup at shop",hoursHint};
}
