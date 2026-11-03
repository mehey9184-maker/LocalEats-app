import type {Shop, MenuItem} from "../types";

export const P7_MY_KOTA_ID="shop-my-kota-ivory-park";

/**
 * Browser-only demo location for the owner in Preview, never a merchant location
 * update or evidence of pickup eligibility. Uses REAL approved shop metadata
 * and REAL public menu rows. No coordinates are changed or sent to the API.
 */
export function p7PreviewEnabled(flag:string|undefined,hostname:string):boolean {
  return flag==="true" &&
    /^project-x7cvt-[a-z0-9-]+-mehey9184-makers-projects\.vercel\.app$/.test(hostname);
}

export function previewMyKotaShop(shop:unknown,items:unknown):Shop|null {
  if(!shop || typeof shop!=="object" || Array.isArray(shop) || !Array.isArray(items))return null;
  const s=shop as Record<string,unknown>;
  if(s.id!==P7_MY_KOTA_ID || typeof s.name!=="string" || !s.name.trim() ||
     s.stored_is_active!==true || s.effective_is_active!==true || s.is_active!==true ||
     typeof s.location!=="string" || !/ivory\s+park/i.test(s.location))return null;
  const lat=s.lat??s.latitude,lng=s.lng??s.longitude;
  if(typeof lat!=="number" || typeof lng!=="number" || !Number.isFinite(lat) ||
     !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 ||
     (typeof s.latitude==="number" && Math.abs(s.latitude-lat)>0.00001) ||
     (typeof s.longitude==="number" && Math.abs(s.longitude-lng)>0.00001))return null;
  const menu:MenuItem[]=[];
  for(const raw of items) {
    if(!raw || typeof raw!=="object" || Array.isArray(raw))return null;
    const item=raw as Record<string,unknown>;
    if(typeof item.id!=="string" || !item.id || typeof item.name!=="string" ||
       !item.name.trim() || typeof item.price!=="number" || !Number.isFinite(item.price) ||
       item.price<0)return null;
    if(item.shop_id!==undefined && item.shop_id!==s.id)return null;
    menu.push({
      id:item.id,name:item.name,price:item.price,
      displayPrice:`R ${item.price.toFixed(2)}`,
      image:typeof item.image_url==="string"?item.image_url:"",
      description:typeof item.description==="string"?item.description:"",
      category:typeof item.category==="string"?item.category:"Menu",
      is_available:item.is_available===true,
      customizations:[],
    });
  }
  if(!menu.some(item=>item.is_available))return null;
  return {
    id:P7_MY_KOTA_ID,name:s.name.trim(),logo:typeof s.logo_url==="string"?s.logo_url:"",
    logo_url:typeof s.logo_url==="string"?s.logo_url:"",
    rating:typeof s.rating==="number"&&Number.isFinite(s.rating)?s.rating:0,
    description:typeof s.description==="string"?s.description:"",
    address:s.location,category:typeof s.category==="string"?s.category:"Local Food",
    latitude:lat,longitude:lng,menu,images:[],isOpen:true,is_active:true,
    opening_time:typeof s.opening_time==="string"?s.opening_time:undefined,
    closing_time:typeof s.closing_time==="string"?s.closing_time:undefined,
    is_test_store:true,pickup_payment_methods:Array.isArray(s.pickup_payment_methods)
      ?s.pickup_payment_methods.filter(x=>x==="cash"||x==="card_machine") as ("cash"|"card_machine")[]
      :[],
  };
}

/** A Preview visual placement only. Never use this to submit quotes/orders. */
export function previewDisplayShop(realShops:Shop[],testShop:Shop|null):Shop[] {
  if(!testShop || !testShop.is_test_store || realShops.some(s=>s.id===testShop.id))return realShops;
  return [...realShops,testShop];
}
