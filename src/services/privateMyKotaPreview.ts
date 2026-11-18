import type {Shop} from "../types";
import {mapPickupShop} from "./pickupMapping";

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
type Token=()=>Promise<string>;
type PrivateStatus={success?:boolean;eligible?:boolean;mode?:string};
type PrivateFixture={success?:boolean;shop?:{id:string;test_only?:boolean;distance_km:number};menu_items?:unknown[];simulated_location?:boolean;can_submit?:boolean;preview_only?:boolean};
const strictFetch=async(base:string,path:string,token:Token,signal:AbortSignal,transport:typeof fetch)=>{
  const result=await transport(base+path,{
    method:"GET",signal,cache:"no-store",credentials:"omit",
    headers:{"Authorization":"Bearer fb-"+await token(),"Accept":"application/json"}
  });
  if(!result.ok)return null;
  try{return await result.json();}catch{return null;}
};
export async function checkPrivateMyKotaAccess(base:string,token:Token,signal:AbortSignal,
  transport:typeof fetch=fetch):Promise<boolean>{
  const r=await strictFetch(base,"/api/v1/private-test/my-kota/status",token,signal,transport) as PrivateStatus|null;
  return r?.success===true && r.eligible===true && r.mode==="PRIVATE_TEST_ONLY";
}
export async function readPrivateMyKotaFixture(base:string,token:Token,signal:AbortSignal,
  transport:typeof fetch=fetch):Promise<Shop>{
  const r=await strictFetch(base,"/api/v1/private-test/my-kota/shop?mode=simulated",token,signal,transport) as PrivateFixture|null;
  if(!r || r.success!==true ||r.preview_only!==true ||r.simulated_location!==true ||
      r.can_submit!==false || r.shop?.id!==PRIVATE_MY_KOTA_SHOP_ID ||
      r.shop.test_only!==true ||!Array.isArray(r.menu_items))
    throw new Error("Private My-Kota is not available for this test account.");
  const shop=mapPickupShop(r.shop,r.menu_items);
  if(shop.id!==PRIVATE_MY_KOTA_SHOP_ID ||!shop.name.includes("PRIVATE TEST"))
    throw new Error("Invalid private test fixture.");
  return shop;
}
export function blockPrivateMyKotaOrder(shopId:string){
  if(shopId===PRIVATE_MY_KOTA_SHOP_ID)
    throw new Error("PRIVATE MY-KOTA TEST ONLY. Sample location/menu cannot create an order or charge payment.");
}
