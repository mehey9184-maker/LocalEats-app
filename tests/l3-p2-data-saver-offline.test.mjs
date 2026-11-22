import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {build} from "esbuild";
import {createRequire} from "node:module";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {
 resolveDataSaverPreference,readDataSaverEnabled,DATA_SAVER_CHANGE_EVENT,
} from "../src/services/dataSaverPreference.ts";
import {
 saveOfflineShopDirectory,readOfflineShopDirectory,
 OFFLINE_DIRECTORY_STORAGE_KEY,OFFLINE_DIRECTORY_TTL_MS,OFFLINE_DIRECTORY_MAX_SHOPS,
} from "../src/services/offlineShopDirectory.ts";

const makeStorage=()=>{
 const entries=new Map();
 return {getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,String(value)),
  removeItem:key=>entries.delete(key),entries};
};
const shop=(name,extra={})=>({
 name,category:"Kota",menu:[{id:"menu-1",price:25,name:"Kota",image:"secret.jpg"}],
 distance:1.5,latitude:-26,longitude:28,logo:"https://some-shop.example/photo.jpg",
 phone:"0712345678",rating:4.9,reviewCount:100,isOpen:true,price:25,
 ...extra,
});
const loadSource=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("browser Save-Data enables the first-use default; explicit user choice always wins",()=>{
 assert.equal(resolveDataSaverPreference(null,true),true);
 assert.equal(resolveDataSaverPreference(null,false),false);
 assert.equal(resolveDataSaverPreference("false",true),false);
 assert.equal(resolveDataSaverPreference("true",false),true);
 assert.equal(resolveDataSaverPreference("unexpected",true),true);
 assert.equal(DATA_SAVER_CHANGE_EVENT,"localeats:data-saver-change");
});
test("browser preference helper survives blocked localStorage",()=>{
 const previousWindow=globalThis.window,previousNavigator=globalThis.navigator;
 try {
  globalThis.window={localStorage:{getItem:()=>{throw Error("blocked");}}};
  Object.defineProperty(globalThis,"navigator",{configurable:true,value:{connection:{saveData:true}}});
  assert.equal(readDataSaverEnabled(),true);
  globalThis.window={localStorage:{getItem:()=> "false"}};
  assert.equal(readDataSaverEnabled(),false);
 }finally{
  if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
  if(previousNavigator===undefined)delete globalThis.navigator;
  else Object.defineProperty(globalThis,"navigator",{configurable:true,value:previousNavigator});
 }
});
test("offline reference stores public names/categories ONLY, with no prices, photos or GPS",()=>{
 const storage=makeStorage();
 saveOfflineShopDirectory([shop("My-Kota"),shop("Another Kota")],storage,1000);
 const wire=storage.getItem(OFFLINE_DIRECTORY_STORAGE_KEY);
 assert.ok(wire);
 for(const secret of ["menu","price","latitude","longitude","distance","phone","rating","photo","logo","reviewCount","0712345678"])
  assert.equal(wire.includes(secret),false,secret+" must not be persisted");
 assert.deepEqual(readOfflineShopDirectory(storage,2000),{
  savedAt:1000,shops:[{name:"My-Kota",category:"Kota"},{name:"Another Kota",category:"Kota"}],
 });
});
test("directory expires after 24 hours, can be cleared, and has bounded entries",()=>{
 const storage=makeStorage(),many=Array.from({length:120},(_,i)=>shop("Kitchen "+i));
 saveOfflineShopDirectory(many,storage,1000);
 assert.equal(readOfflineShopDirectory(storage,1001).shops.length,OFFLINE_DIRECTORY_MAX_SHOPS);
 assert.equal(readOfflineShopDirectory(storage,1000+OFFLINE_DIRECTORY_TTL_MS-1)!==null,true);
 assert.equal(readOfflineShopDirectory(storage,1000+OFFLINE_DIRECTORY_TTL_MS),null);
 saveOfflineShopDirectory([],storage,2000);
 assert.equal(storage.getItem(OFFLINE_DIRECTORY_STORAGE_KEY),null);
});
test("tampered offline directory cannot inject menu, live status or order actions",()=>{
 const storage=makeStorage();
 const invalid=[
  {savedAt:1000,shops:[{name:"Kota",category:"Food",price:25}]},
  {savedAt:1000,shops:[{name:"Kota",category:"Food",open:true}]},
  {savedAt:1000,shops:[{name:"Kota",category:"Food",lat:-26}]},
  {savedAt:9999,shops:[{name:"Kota",category:"Food"}]},
  {savedAt:1000,shops:"not an array"},
 ];
 for(const row of invalid){
  storage.setItem(OFFLINE_DIRECTORY_STORAGE_KEY,JSON.stringify(row));
  assert.equal(readOfflineShopDirectory(storage,2000),null);
 }
});
test("offline storage exceptions are fail-safe",()=>{
 const storage={getItem(){throw Error("blocked")},setItem(){throw Error("quota")},removeItem(){throw Error("blocked")}};
 assert.doesNotThrow(()=>saveOfflineShopDirectory([shop("My-Kota")],storage,1000));
 assert.equal(readOfflineShopDirectory(storage,1000),null);
});
async function loadComponent(path){
 const {outputFiles}=await build({entryPoints:[path],write:false,bundle:true,platform:"node",format:"cjs",packages:"external"});
 const module={exports:{}};
 new Function("require","module","exports",outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
 return module.exports;
}
const {BlurUpImage}=await loadComponent("src/components/BlurUpImage.tsx");
const {OfflineShopDirectory}=await loadComponent("src/components/OfflineShopDirectory.tsx");
test("Data Saver does not mount image request until a specific photo is chosen",()=>{
 const hidden=renderToStaticMarkup(React.createElement(BlurUpImage,{
  src:"https://cdn.example/kota.jpg",alt:"Actual Kota",dataSaverEnabled:true,
 }));
 assert.match(hidden,/Photo hidden to save data/);
 assert.match(hidden,/Tap to load photo/);
 assert.match(hidden,/Uses mobile data/);
 assert.doesNotMatch(hidden,/<img\b/i);
 const normal=renderToStaticMarkup(React.createElement(BlurUpImage,{
  src:"https://cdn.example/kota.jpg",alt:"Actual Kota",dataSaverEnabled:false,
 }));
 assert.match(normal,/<img\b/i);
 assert.match(normal,/w=600/);
 const noPhoto=renderToStaticMarkup(React.createElement(BlurUpImage,{
  src:"",alt:"Missing Kota",dataSaverEnabled:true,
 }));
 assert.match(noPhoto,/No photo yet/);
 assert.doesNotMatch(noPhoto,/Tap to load photo/);
});
test("last-seen shop list is nonclickable, clearly non-authoritative and price free",()=>{
 const previousWindow=globalThis.window;
 const store=makeStorage();
 saveOfflineShopDirectory([shop("My-Kota")],store,Date.now());
 try{
  globalThis.window={localStorage:store};
  const html=renderToStaticMarkup(React.createElement(OfflineShopDirectory));
  assert.match(html,/Previously seen shops/);
  assert.match(html,/Saved names only, not a live menu/);
  assert.match(html,/Offline ordering is unavailable/);
  assert.match(html,/My-Kota/);
  assert.doesNotMatch(html,/<button|href=|R25|price="|Pickup at shop|Open Now/);
 }finally{
  if(previousWindow===undefined)delete globalThis.window;
  else globalThis.window=previousWindow;
 }
});
test("active App only saves a COMPLETE verified catalog, and cannot order from offline directory",()=>{
 const app=loadSource("src/App.tsx");
 const offline=loadSource("src/components/OfflineShopDirectory.tsx");
 const sw=loadSource("src/sw.ts");
 assert.match(app,/if\(!result\.incomplete\)\{[\s\S]*?saveOfflineShopDirectory\(result\.shops/);
 assert.match(app,/navigator\.onLine===false/);
 assert.match(app,/setShops\(\[\]\)/);
 assert.match(app,/shops\.length===0 && fetchError && <OfflineShopDirectory/);
 assert.match(app,/document\.visibilityState==="visible" && navigator\.onLine/);
 assert.doesNotMatch(offline,/quotePickupCart|submitPickupQuote|onStoreInfo|setCurrentScreen|fetch\(/);
 assert.match(sw,/Business reads\/writes are network-only/);
 assert.doesNotMatch(sw,/cache\.put\(request.*api/i);
});
