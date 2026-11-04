import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {distanceKm,saveDisplayCatalog,readDisplayCatalog,saveDisplayInbox,readDisplayInbox} from "../src/services/pickupDisplayCache.ts";

function storage(){
 const data=new Map();
 return {getItem:(key)=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}};
}
const location={lat:-26.011,lng:28.183};
const shop={id:"my-kota",name:"My Kota",latitude:-26.012,longitude:28.183,is_active:true,menu:[
 {id:"kota-01",name:"Kota",price:25,is_available:true}
]};

test("public catalog hydration is same-location, short-lived and uses real saved API items",()=>{
 const store=storage(),now=1_800_000;
 assert.equal(readDisplayCatalog(location,store,now),null);
 saveDisplayCatalog(location,[shop],store,now);
 assert.deepEqual(readDisplayCatalog(location,store,now+1_000),[shop]);
 assert.equal(readDisplayCatalog({lat:-26.1,lng:28.18},store,now+1_000),null);
 assert.equal(readDisplayCatalog(location,store,now+5*60_000+1),null);
 assert.ok(distanceKm(location,location)<0.001);
});

test("old/out-of-range cache cannot expose shops more than 4km from user's real location",()=>{
 const store=storage(),now=1_800_000;
 const edgeShop={...shop,id:"outside",latitude:-26.05};
 saveDisplayCatalog(location,[edgeShop,shop],store,now);
 assert.deepEqual(readDisplayCatalog(location,store,now+500),[shop]);
 // No fabricated demo shop if API returned an empty valid catalog.
 saveDisplayCatalog(location,[],store,now+2_000);
 assert.deepEqual(readDisplayCatalog(location,store,now+3_000),[]);
});

test("inbox cache is bound to the authenticated user, tab and short lifetime",()=>{
 const store=storage(),now=1_800_000;
 const msg={id:"ready-1",title:"Pickup ready",message:"At the shop",read:false,timestamp:now,type:"order"};
 saveDisplayInbox("customer-A",[msg],store,now);
 assert.deepEqual(readDisplayInbox("customer-A",store,now+100),[msg]);
 assert.equal(readDisplayInbox("customer-B",store,now+100),null);
 assert.equal(readDisplayInbox("customer-A",store,now+16*60_000),null);
 saveDisplayInbox("customer-A",[{...msg,read:true}],store,now+1_000);
 assert.equal(readDisplayInbox("customer-A",store,now+2_000)?.[0].read,true);
});

test("navigation does not reset live catalog or authenticated inbox",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 const notice=readFileSync(new URL("../src/screens/NotificationsScreen.tsx",import.meta.url),"utf8");
 assert.match(app,/const locationChanged=loadedCatalogLocation.current!==null/);
 assert.match(app,/if \(locationChanged\) \{setShops\(\[\]\);setClosedPickupShops\(\[\]\);\}/);
 assert.doesNotMatch(app,/setShops\(\[\]\); setLoadingShops\(true\)/);
 assert.match(app,/\}, \[session\?\.user\?\.id\]\);/);
 assert.doesNotMatch(app,/\[session\?\.user\?\.id,currentScreen\]/);
 assert.doesNotMatch(app,/safeLocalStorageSet\("app_notifications"/);
 assert.doesNotMatch(app,/localStorage\.setItem\("app_notifications"/);
 assert.match(notice,/Checking for order updates/);
});
