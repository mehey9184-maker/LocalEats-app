import type { MenuItem, Shop } from "../types";
import {discoverShopDistance} from "./discoverTrustPolicy.ts";
import type {HomePoint} from "./homeProximity.ts";

export type DiscoverFoodPreview={
 id:string;shopId:string;shopName:string;itemName:string;price:number;
 image:string;description:string;distance:number;open:boolean;
};
export type DiscoverSearchSuggestion={
 key:string;label:string;shopName?:string;query:string;kind:"shop"|"food";
};
const words=(query:string)=>query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
const includesWords=(haystack:string,terms:string[])=>terms.every(word=>haystack.toLocaleLowerCase().includes(word));
const validItem=(item:MenuItem):boolean=>
 item?.is_available!==false &&
 typeof item.id==="string" && item.id.trim().length>0 &&
 typeof item.name==="string" && item.name.trim().length>0 &&
 typeof item.price==="number" && Number.isFinite(item.price) && item.price>=0;

export function discoverAvailableMenuItems(shop:Shop):MenuItem[]{
 return Array.isArray(shop.menu)?shop.menu.filter(validItem):[];
}
export function discoverItemMatches(item:MenuItem,query:string):boolean{
 const terms=words(query);
 if(!terms.length)return true;
 return validItem(item) && includesWords([item.name,item.category??"",item.description??""].join(" "),terms);
}
export function discoverMatchesShopOrFood(shop:Shop,query:string):boolean{
 const terms=words(query);
 if(!terms.length)return true;
 if(includesWords([shop.name,shop.description,shop.category,shop.cuisine_type??""].filter(x=>typeof x==="string").join(" "),terms))return true;
 return discoverAvailableMenuItems(shop).some(item=>discoverItemMatches(item,query));
}

// Suggestions are lookup hints only. Selecting one filters shops / real menu
// rows; it never creates a cart item or trusts a previously cached price.
export function discoverFoodSuggestions(
 shops:readonly Shop[],query:string,limit=6,
):DiscoverSearchSuggestion[]{
 const terms=words(query);
 if(query.trim().length<2 || !terms.length || limit<=0)return [];
 const result:DiscoverSearchSuggestion[]=[];
 const unique=new Set<string>();
 // Relevant food matches first, followed by actual matching shop names.
 for(const shop of shops){
  for(const item of discoverAvailableMenuItems(shop)){
   if(!discoverItemMatches(item,query))continue;
   const key=`food:${shop.id}:${item.id}`;
   if(unique.has(key))continue;
   unique.add(key);
   result.push({key,kind:"food",label:item.name,shopName:shop.name,query:item.name});
   if(result.length>=limit)return result;
  }
 }
 for(const shop of shops){
  if(!includesWords(shop.name,terms))continue;
  const key=`shop:${shop.id}`;
  if(unique.has(key))continue;
  unique.add(key);
  result.push({key,kind:"shop",label:shop.name,query:shop.name});
  if(result.length>=limit)return result;
 }
 return result;
}

// Pictured items must exist in the CURRENT authorized menu, with genuine
// nonnegative catalog prices. Never fall back to invented prices/images.
// Without a search, surface diverse shops; when searching, show only menu
// items whose name/category/description actually match the full query.
export function discoverFoodPreviews(
 shops:readonly Shop[],query:string,location:HomePoint|null,
 isOpen:(shop:Shop)=>boolean,limit=8,
):DiscoverFoodPreview[]{
 if(limit<=0)return [];
 const searching=words(query).length>0;
 const ranked=[...shops].sort((a,b)=>{
  const open=Number(isOpen(b))-Number(isOpen(a));
  if(open!==0)return open;
  const kmA=discoverShopDistance(a,location);
  const kmB=discoverShopDistance(b,location);
  return kmA-kmB || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
 });
 const groups=ranked.map(shop=>({
  shop,
  distance:discoverShopDistance(shop,location),
  open:isOpen(shop),
  items:discoverAvailableMenuItems(shop).filter(item=>
   (!searching || discoverItemMatches(item,query)) &&
   typeof item.image==="string" && /^(?:https?:\/\/|\/(?!\/))/i.test(item.image.trim())
  )
 }));
 const result:DiscoverFoodPreview[]=[];
 const taken=new Set<string>();
 const maxCount=Math.max(0,...groups.map(group=>group.items.length));
 for(let index=0;index<maxCount && result.length<limit;index++){
  for(const group of groups){
   const item=group.items[index];
   if(!item)continue;
   const id=`${group.shop.id}:${item.id}`;
   if(taken.has(id))continue;
   taken.add(id);
   result.push({
    id,shopId:group.shop.id,shopName:group.shop.name,itemName:item.name,
    price:item.price,image:item.image.trim(),
    description:item.description?.trim() || `From ${group.shop.name}`,
    distance:group.distance,open:group.open,
   });
   if(result.length>=limit)break;
  }
 }
 return result;
}
