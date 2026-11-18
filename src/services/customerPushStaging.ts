/** Verified L3-N2 staging connection. Keep regular Production registration separate.
 * An arbitrary PR Preview must never be able to register its browser against
 * a live API by merely opting into Firebase environment mode.
 */
export interface CustomerPushStagingContext {
  origin:string;
  configuredOrigin:string|undefined;
  apiUrl:string|undefined;
  configSource:string|undefined;
  firebaseProjectId:string|undefined;
  orderingEnabled:string|undefined;
  vapidKey:string|undefined;
}
export const CUSTOMER_STAGING_API_ORIGINS = [
  "https://localeats-api-staging-r52d.vercel.app",
  "https://localeats-api-staging-r52d-mehey9184-makers-projects.vercel.app",
] as const;

export function isVerifiedCustomerPushStagingContext(c:CustomerPushStagingContext):boolean {
  if(c.configSource!=="environment" || c.firebaseProjectId!=="localeats-staging" ||
     c.orderingEnabled!=="false" || !c.vapidKey ||
     !c.configuredOrigin || c.configuredOrigin!==c.origin) return false;
  try {
    const site=new URL(c.origin);
    if(site.protocol!=="https:" || site.href!==site.origin+"/" ||
       !/^localeats-customer-staging-r52d(?:-[a-z0-9-]+)?\.vercel\.app$/.test(site.hostname)) return false;
    const api=new URL(c.apiUrl||"");
    return api.protocol==="https:" && api.href===api.origin+"/" &&
      (CUSTOMER_STAGING_API_ORIGINS as readonly string[]).includes(api.origin);
  } catch { return false; }
}
