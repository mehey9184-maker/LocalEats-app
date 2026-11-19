import type {Shop} from "../types";
import {mapPickupShop} from "./pickupMapping";

import {PRIVATE_MY_KOTA_SHOP_ID} from "./privateMyKotaPolicy";
export {PRIVATE_MY_KOTA_SHOP_ID,isPrivateMyKotaPreview,blockPrivateMyKotaOrder} from "./privateMyKotaPolicy";
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
