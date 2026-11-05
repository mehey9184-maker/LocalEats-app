import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('pickup route cannot mount legacy delivery tracking effects',()=>{
 const app=readFileSync('src/App.tsx','utf8');
 assert.equal(/import\("\.\/screens\/OrderTrackingScreen"\)/.test(app),false);
 assert.match(app,/import\("\.\/screens\/PickupTrackingScreen"\)/);
});
const bundle=await build({entryPoints:['src/screens/PickupTrackingScreen.tsx'],bundle:true,write:false,format:'cjs',platform:'node',external:['react','react-dom']});
const module={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {PickupTrackingScreen}=module.exports;
const order={id:'pickup-1',shop_id:'shop',user_id:'customer',delivery_type:'collection',status:'pending',revision:0,payment_status:'unpaid',total_price:30,items:[{name:'Fixture meal',quantity:1}]};
const props={signedIn:true,orders:[order],error:false,refreshing:false,shops:[{id:'shop',name:'Fixture kitchen'}],changesEnabled:true,hasPendingCancellation:()=>false,onCancel:async()=>{},onRetry:()=>{},onBack:()=>{},onHistory:()=>{},onSignIn:()=>{},onBrowse:()=>{}};
const render=extra=>renderToStaticMarkup(React.createElement(PickupTrackingScreen,{...props,...extra}));
test('pending pickup waits for acceptance without delivery, countdown or success claims',()=>{
 const html=render({});assert.match(html,/Waiting for the shop to accept/);assert.match(html,/R 30\.00/);assert.match(html,/Cancel pickup/);
 assert.doesNotMatch(html,/rider|courier|Delivered|Confirmed by Kitchen|countdown|Arrived|Mark as received/i);
});
test('Preparing and Ready use confirmed pickup facts and keep payment separate',()=>{
 const preparing=render({orders:[{...order,status:'preparing'}]});assert.match(preparing,/is preparing your food/);assert.doesNotMatch(preparing,/Cancel pickup/);
 const ready=render({orders:[{...order,status:'ready_for_pickup'}]});assert.match(ready,/Ready for pickup/);assert.match(ready,/Unpaid/);assert.doesNotMatch(ready,/driver|transfer|on the way/i);
});
test('stale statuses stay visible with recovery and mutations disabled',()=>{
 const html=render({error:true});assert.match(html,/last successful update/);assert.match(html,/Retry/);assert.match(html,/<button[^>]+disabled=""[^>]*>Cancel pickup/);
});
test('guest, loading and empty states do not invent an order',()=>{
 const guest=render({signedIn:false,orders:null});assert.match(guest,/Sign in/);assert.doesNotMatch(guest,/Fixture kitchen/);
 assert.match(render({orders:null}),/Loading pickup orders/);
 assert.match(render({orders:[]}),/No active pickups/);
});
test('finished orders link to history rather than remaining in the active queue',()=>{
 const html=render({orders:[{...order,status:'collected',payment_status:'paid'}]});assert.match(html,/No active pickups/);assert.match(html,/View order history/);
});
