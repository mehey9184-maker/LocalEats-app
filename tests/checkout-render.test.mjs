import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToString} from 'react-dom/server';
// Only provider/browser boundaries are stubbed. The actual CheckoutScreen,
// React hooks, cart rendering and pricing components run unchanged.
const result=await build({entryPoints:['src/screens/CheckoutScreen.tsx'],write:false,bundle:true,platform:'node',format:'cjs',packages:'external',plugins:[{name:'offline-provider-boundaries',setup(b){
 b.onLoad({filter:/[\\/]lib[\\/](firebase|supabase|audioHelper|profileService)\.ts$|[\\/]components[\\/]MapComponents\.tsx$/},args=>({contents:args.path.endsWith('firebase.ts')?'export const FirestoreService={};export const registerAndSyncPushToken=()=>{};export const ensureAnonymousAuth=()=>{};':args.path.endsWith('supabase.ts')?'export const supabase={};':args.path.endsWith('audioHelper.ts')?'export const audioHelper={};':args.path.endsWith('profileService.ts')?'export const upsertProfileWithRPC=()=>{};':'export const LocationPickerMap=()=>null;',loader:'js'}));
 b.onLoad({filter:/[\\/]customerPickup\.ts$/},()=>({contents:'export const pickupOrderingEnabled=()=>false;export const submitPickupQuote=()=>{throw Error("No network in render test")};export const quotePickupCart=()=>{throw Error("No network in render test")};export const blockPickupSubmission=()=>{throw Error("Ordering not enabled")};',loader:'js'}));
 b.onResolve({filter:/^react-leaflet$/},()=>({path:'react-leaflet',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const MapContainer=()=>null,TileLayer=()=>null,Marker=()=>null,Popup=()=>null;',loader:'js'}));
}}]});
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {CheckoutScreen}=module.exports;
globalThis.localStorage={getItem:()=>null};globalThis.window={innerWidth:1200};
const item={id:'regression-item',name:'Cart item',price:25,quantity:1,shopId:'cart-shop',image:''};
const props={userProfile:{fullName:'',phone:'',address:''},session:null,cart:[item],userLocation:null,isOnline:true,triggerHaptic:()=>{}};
for(const [label,shops] of [['empty discovery',[]],['different shop',[{id:'different',name:'Wrong shop'}]],['matching shop',[{id:'cart-shop',name:'Cart shop',menu:[item]}]]])test(`checkout renders with ${label} and preserves the cart`,()=>{
 const html=renderToString(React.createElement(CheckoutScreen,{...props,shops}));
 assert.match(html,/Secure Checkout/);assert.match(html,/Cart Summary Preview/);assert.match(html,/25\.00/);assert.match(html,/Ordering is temporarily disabled/);
 assert.doesNotMatch(html,/Checkout failed to load|Wrong shop|Order Tax Invoice|Tax \/ VAT \(15% Included\)/);
 assert.doesNotMatch(html,/27\.50/);
 if(label!=='matching shop')assert.match(html,/Pickup shop details are unavailable/);
 assert.equal(props.cart[0].quantity,1);
});
