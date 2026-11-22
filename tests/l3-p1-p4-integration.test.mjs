/**
 * P1–P4 combined-source gate: never writes to remote APIs or creates orders.
 * Exercises actual React components as one build, not separate PR versions.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {build} from "esbuild";
import {createRequire} from "node:module";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {shopCardTrustState} from "../src/services/shopCardTrustState.ts";
import {resolveDataSaverPreference} from "../src/services/dataSaverPreference.ts";
import {readOfflineShopDirectory,saveOfflineShopDirectory,OFFLINE_DIRECTORY_STORAGE_KEY} from "../src/services/offlineShopDirectory.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const load=async path=>{
 const result=await build({entryPoints:[path],bundle:true,write:false,platform:"node",format:"cjs",packages:"external"});
 const mod={exports:{}};
 new Function("require","module","exports",result.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
 return mod.exports;
};
const {BlurUpImage}=await load("src/components/BlurUpImage.tsx");
const {ShopCard}=await load("src/components/ShopCard.tsx");
const rendered=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));

test("P1 sized image + P2 Data Saver work in same actual component",()=>{
 const props={src:"https://photos.example.test/kota.jpg",alt:"Kota from shop",imageWidth:160,fallbackKind:"food"};
 const hidden=rendered(BlurUpImage,{...props,dataSaverEnabled:true});
 assert.match(hidden,/Photo hidden to save data/);
 assert.match(hidden,/Tap to load photo/);
 assert.doesNotMatch(hidden,/<img\b/,"Data Saver must not mount remote image");
 const normal=rendered(BlurUpImage,{...props,dataSaverEnabled:false});
 assert.match(normal,/<img\b/);
 assert.match(normal,/w=160/,"thumbnail optimized width survives P2");
 assert.doesNotMatch(normal,/Photo hidden to save data/);
 assert.equal(resolveDataSaverPreference("false",true),false,"user OFF wins browser Save-Data");
});

test("P3 reduced-motion ShopCard + P4 truthful inactive state remain together",()=>{
 const shop={id:"fixture-1",name:"Demo Kota Shop",is_active:false,category:"Kota",
  distance:1,latitude:-26,longitude:28,menu:[],rating:0,
  logo_url:"",description:"Fixture only",address:"Fixture address"};
 const markup=rendered(ShopCard,{shop,isFollowed:false,onStoreInfo:()=>{},
   triggerHaptic:()=>{},dataSaverEnabled:true});
 assert.match(markup,/Not taking orders/);
 assert.match(markup,/Browse menu only/);
 assert.doesNotMatch(markup,/>Open Now</);
 assert.doesNotMatch(markup,/>Pickup at shop</);
 assert.match(read("src/components/ShopCard.tsx"),/useReducedMotion\(\)/);
 const state=shopCardTrustState({outsidePickupArea:true,locationUnknown:false,
  notAcceptingOrders:false,isOpen:true});
 assert.equal(state.actionHint,"Browse menu only");
 assert.equal(state.badge,"Outside 4 km");
});

test("P1 progressive catalog persists only P2 names-only complete directory",()=>{
 const app=read("src/App.tsx");
 assert.match(app,/readPublicBrowseCatalogProgressive\(showVerifiedProgress,\{force:_force\}\)/);
 assert.match(app,/readPickupCatalog\(userLocation,\{force:true,onProgress:showVerifiedProgress\}\)/);
 assert.match(app,/if\(!result\.incomplete\)\{[\s\S]{0,250}saveOfflineShopDirectory\(result\.shops/);
 assert.match(app,/document\.visibilityState==="visible" && navigator\.onLine/);
 assert.match(app,/navigator\.onLine===false/);
 assert.match(app,/catalogGeneration\.current\+\+/);
 const storage=new Map();
 const fake={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),
  removeItem:k=>storage.delete(k)};
 saveOfflineShopDirectory([{id:"private-shop-id",name:"Local Kota",category:"Kota",
   distance:2,phone:"0712345678",menu:[{price:25}],rating:5,isOpen:true}],fake,1000);
 const raw=storage.get(OFFLINE_DIRECTORY_STORAGE_KEY);
 assert.ok(raw);
 for(const key of ["private-shop-id","0712345678","price","distance","rating","isOpen","menu"])
  assert.equal(raw.includes(key),false,`Offline directory leaked ${key}`);
 assert.deepEqual(readOfflineShopDirectory(fake,1001)?.shops,[{name:"Local Kota",category:"Kota"}]);
});
test("P3 accessible cart and P4 shop trust cannot bypass pickup eligibility or server price",()=>{
 const card=read("src/components/ShopCard.tsx");
 const sheet=read("src/components/BottomSheet.tsx");
 const cart=read("src/components/FloatingCartButton.tsx");
 const app=read("src/App.tsx");
 assert.match(sheet,/role="dialog"/);
 assert.match(sheet,/aria-modal="true"/);
 assert.match(sheet,/previouslyFocused/);
 assert.match(cart,/Est\. R \{subtotal\.toFixed\(2\)\}/);
 assert.match(cart,/safe-area-inset-bottom/);
 assert.match(card,/shopCardTrustState\(/);
 assert.match(card,/const notAcceptingOrders = status\.message/);
 assert.match(app,/pickupOrderingEnabled/);
 assert.match(app,/!isWithinPickupArea\(shop\)/);
 assert.doesNotMatch(app,/setShops\(DEFAULT_FALLBACK_SHOPS\)/);
});
test("canonical business idea register remains unapproved; real-order gates unchanged",()=>{
 const register=read("docs/LOCALEATS_SCALABLE_IDEA_REGISTER.md");
 const p1=read("docs/L3_P1_CUSTOMER_SPEED_ACCURACY_IMAGES_20261122.md");
 const p2=read("docs/L3_P2_DATA_SAVER_SAFE_OFFLINE_20261122.md");
 const p3=read("docs/L3_P3_MOTION_FEEDBACK_NAVIGATION_20261122.md");
 const p4=read("docs/L3_P4_CUSTOMER_TRUST_20261122.md");
 for(const phase of [p1,p2,p3,p4])assert.ok(phase.length>300);
 assert.match(register,/LE-02/);
 assert.match(register,/DO NOT IMPLEMENT NOW/);
 assert.match(register,/explicit owner approval/i);
 const api=read("src/services/customerPickup.ts");
 const mapping=read("src/services/pickupMapping.ts");
 assert.match(api,/VITE_PICKUP_ORDERING_ENABLED/);
 assert.match(mapping,/PICKUP_ORDER_RADIUS_KM\s*=\s*4/);
 assert.doesNotMatch(read("src/sw.ts"),/cache\.put\(request.*api/i);
});
