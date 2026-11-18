/** Private My-Kota Preview feature policy. Never used to authorize a server
 * response: Firebase Admin verifies the UID on the API independently.
 */
export const PRIVATE_MY_KOTA_SHOP_ID="private-test-my-kota-preview";
export type PrivateMyKotaPreviewEnv={
  projectId?:string;configSource?:string;orderingEnabled?:string;apiOrigin?:string;
};
export function isPrivateMyKotaPreview(origin:string,env:PrivateMyKotaPreviewEnv):boolean{
  try{
    const u=new URL(origin),api=new URL(env.apiOrigin||"");
    return u.protocol==="https:" && u.origin===origin &&
      /^localeats-customer-staging-r52d(?:-[a-z0-9-]+)?\.vercel\.app$/.test(u.hostname) &&
      api.protocol==="https:" && api.origin===env.apiOrigin &&
      /^localeats-api-staging-r52d-[a-z0-9-]+-mehey9184-makers-projects\.vercel\.app$/.test(api.hostname) &&
      env.projectId==="localeats-staging" && env.configSource==="environment" &&
      env.orderingEnabled==="false";
  }catch{return false;}
}
export function blockPrivateMyKotaOrder(shopId:string){
  if(shopId===PRIVATE_MY_KOTA_SHOP_ID)
    throw new Error("PRIVATE MY-KOTA TEST ONLY. Sample location/menu cannot create an order or charge payment.");
}
