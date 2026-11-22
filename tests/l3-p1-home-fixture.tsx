/**
 * Isolated browser rendering fixture for L3-P1.
 * Uses the real ShopCard, MenuItemCard and public catalog reader, but ONLY
 * synthetic in-memory data. No auth, geolocation, real API, orders or writes.
 */
import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {ShopCard,MenuItemCard} from "../src/components/ShopCard";
import {LocalEatsLogo} from "../src/components/LocalEatsLogo";
import {createPublicBrowseCatalogReader} from "../src/services/publicBrowseCatalog";
import {mapPickupShop} from "../src/services/pickupMapping";
import type {Shop} from "../src/types";
import "../src/index.css";

declare global{
 interface Window {
   __l3p1BrowserStats?:()=>({firstCardMs:number|null,finishedMs:number|null,menuRequests:number});
 }
}
const fakeShops=[
 {id:"slow-shop",name:"Slow Kota Kitchen",category:"Kota",location:"Demo Ivory Park",is_active:true,lat:-26.01,lng:28.19,rating:0},
 {id:"fast-shop",name:"Kota Express",category:"Kota",location:"Demo Ivory Park",is_active:true,lat:-26.01,lng:28.19,rating:0},
];
const fakeItem={id:"demo-kota",name:"R25 Demo Kota",price:25,is_available:true,image_url:"https://example.invalid/real-upload-placeholder.png"};
let started=0,firstCardMs:number|null=null,finishedMs:number|null=null,menuRequests=0;
const reader=createPublicBrowseCatalogReader({
 shops:async()=>({shops:fakeShops}),
 menu:async(id,signal)=>{
   menuRequests++;
   // First source shop is intentionally slow: progressive Home must show
   // Kota Express while its verified demo neighbor is still pending.
   await new Promise<void>((resolve,reject)=>{
     const t=setTimeout(resolve,id==="slow-shop"?1100:80);
     signal.addEventListener("abort",()=>{clearTimeout(t);reject(Error("Aborted"));},{once:true});
   });
   return {menu_items:[{...fakeItem,id:id+"-item"}]};
 }
},mapPickupShop);
function L3P1HomeFixture(){
 const [shops,setShops]=useState<Shop[]>([]);
 const [ready,setReady]=useState(false);
 const [dataSaver,setDataSaver]=useState(false);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
   let live=true;started=performance.now();firstCardMs=null;finishedMs=null;menuRequests=0;
   void reader({force:true,onProgress:partial=>{
     if(!live)return;
     if(partial.shops.length && firstCardMs===null)firstCardMs=performance.now()-started;
     setShops(partial.shops);
   }}).then(result=>{
     if(!live)return;
     finishedMs=performance.now()-started;
     setShops(result.shops);setReady(true);
   }).catch(error=>{if(live)setNotice(String(error));});
   window.__l3p1BrowserStats=()=>({firstCardMs,finishedMs,menuRequests});
   return()=>{live=false;delete window.__l3p1BrowserStats;};
 },[]);
 return <main className="min-h-[100dvh] bg-white pb-12 text-slate-900">
  <header className="sticky top-0 z-10 flex justify-between border-b border-slate-100 bg-white p-4">
   <LocalEatsLogo width={112} height={30}/>
   <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">Isolated Preview</span>
  </header>
  <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
   <h1 className="text-2xl font-black">Explore local kitchens.</h1>
   <p className="text-sm text-slate-600">Synthetic GPS-free Home test. Browse only — orders disabled.</p>
   <label className="flex items-center gap-3 text-sm font-semibold">
    <input type="checkbox" checked={dataSaver} onChange={e=>setDataSaver(e.target.checked)}/>
    Data Saver preview
   </label>
   <p aria-live="polite" role="status" data-testid="catalog-state">
    {notice||(!ready?"Loading verified menus…":"All verified demo menus loaded")}
   </p>
   <section aria-label="Verified shop cards" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
     {shops.map((shop,index)=><div key={shop.id} data-testid={"shop-"+shop.id} className="min-w-0 space-y-3">
       {/* The real Home places each ShopCard in its own grid slot. Do not let
           this synthetic stacked menu preview stretch ShopCard h-full. */}
       <div className="shrink-0">
        <ShopCard shop={shop} isFollowed={false} onStoreInfo={()=>setNotice("Browse menu only — no GPS verified")}
          triggerHaptic={()=>{}} dataSaverEnabled={dataSaver} priorityImage={index===0}/>
       </div>
       <MenuItemCard shop={shop} item={shop.menu[0]} showAlert={(title,message)=>setNotice(title+": "+message)}/>
     </div>)}
   </section>
  </div>
 </main>;
}
createRoot(document.getElementById("root")!).render(<L3P1HomeFixture/>);
