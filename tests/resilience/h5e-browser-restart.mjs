// Real Chromium documents/sessionStorage; actual bundled recovery modules.
// All users, order responses and transport state fabricated; no hosted traffic.
import {chromium} from 'playwright';
import {build,transformSync} from 'esbuild';
import ts from 'typescript';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const merchant=resolve(process.argv[2]);
const uid='fixture-a',shop='fixture-shop',id='fixture-order';
const customerKey='pickup-create:'+uid,merchantKey='pickup-command:'+uid+':'+id;
const review={intent:{idempotency_key:'12345678-1234-4123-8123-123456789abc',shop_id:shop,payment_method:'cash'},quote:{can_submit:true,total_minor:2500,pricing_fingerprint:'a'.repeat(64)}};
const order={id,user_id:uid,shop_id:shop,delivery_type:'collection',status:'pending',revision:0,total_price:25,payment_method:'cash'};
const command={path:'accept',body:{command_id:'12345678-1234-4123-8123-123456789abd',expected_revision:0}};
const report=(id,data)=>console.log('H5E_BROWSER '+JSON.stringify({id,...data}));
const app=readFileSync('src/App.tsx','utf8');
const tree=ts.createSourceFile('App.tsx',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let sync;
function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='syncOfflineOrders')sync=n.initializer.arguments[0].getText(tree);ts.forEachChild(n,visit);}
visit(tree);assert.ok(sync);
const syncCode=transformSync('globalThis.legacySync='+sync,{loader:'tsx',target:'es2022'}).code;
const merchantSource=readFileSync(resolve(merchant,'src/App.tsx'),'utf8');
const merchantTree=ts.createSourceFile('MerchantApp.tsx',merchantSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let reconcileEffect;function visitMerchant(n){if(ts.isCallExpression(n)&&n.expression.getText(merchantTree)==='useEffect'&&n.arguments[0]?.getText(merchantTree).includes('const reconcileFromServer ='))reconcileEffect=n.arguments[0].getText(merchantTree);ts.forEachChild(n,visitMerchant);}
visitMerchant(merchantTree);assert.ok(reconcileEffect);
const reconcileCode=transformSync('globalThis.merchantReconnectEffect='+reconcileEffect,{loader:'tsx',target:'es2022'}).code;
const browserEntry=`
import * as customer from './src/services/customerPickup.ts';
import {createMerchantPickupRecovery} from ${JSON.stringify(resolve(merchant,'src/services/merchantPickupRecovery.ts'))};
globalThis.customer=customer;
globalThis.user='fixture-a';
let merchantGeneration=0;
globalThis.switchUser=uid=>{merchantGeneration++;const next={uid,getIdToken:async()=>uid};globalThis.before?.(next);globalThis.user=uid;globalThis.observer?.(next);};
globalThis.merchant=createMerchantPickupRecovery({identity:()=>globalThis.user,captureSession:()=>{const ticket=merchantGeneration;return ()=>ticket===merchantGeneration;},enabled:()=>true,storage:sessionStorage,mapOrder:o=>o,transport:async(o,c,signal,uid)=>{
 const r=await fetch('/merchant-command',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer fb-'+uid},body:JSON.stringify(c),signal});
 return {status:r.status,data:await r.json()};
}});
${syncCode}
// Exercise the actual effect against synthetic event targets and read-only spies.
globalThis.exerciseMerchantReconnect=()=>{
 const events=new Map(),workerEvents=new Map(),reads=[];
 const target=(map)=>({addEventListener:(name,fn)=>map.set(name,fn),removeEventListener:name=>map.delete(name)});
 const window=target(events),navigator={serviceWorker:target(workerEvents)};
 const merchantShopGate={status:'ready'},currentShop={id:'fixture-shop'};
 const fetchOrders=(wake)=>reads.push('orders:'+wake),fetchShops=()=>reads.push('shops'),fetchAllMenuItems=()=>reads.push('menu');
 const setIsOffline=()=>{},setIsHeartbeatFailed=()=>{},setDismissedOfflineOverlay=()=>{};
 ${reconcileCode}
 const cleanup=globalThis.merchantReconnectEffect();
 events.get('offline')();events.get('online')();workerEvents.get('message')({data:{type:'TRIGGER_OFFLINE_SYNC'}});
 merchantShopGate.status='unverified';events.get('online')();workerEvents.get('message')({data:{type:'TRIGGER_OFFLINE_SYNC'}});
 cleanup();return {reads,remainingListeners:events.size+workerEvents.size};
};
`;
const bundle=(await build({stdin:{contents:browserEntry,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife',define:{'import.meta.env':JSON.stringify({VITE_PICKUP_ORDERING_ENABLED:'true',VITE_LOCALEATS_API_URL:'',PROD:false})},plugins:[{name:'fixture-auth',setup(b){b.onLoad({filter:/[\\/]lib[\\/]firebase\.ts$/},()=>({loader:'js',contents:'export const auth={get currentUser(){const uid=globalThis.user||"fixture-a";return {uid,getIdToken:async()=>uid}},beforeAuthStateChanged(fn){globalThis.before=fn;return ()=>{}},onAuthStateChanged(fn){globalThis.observer=fn;return ()=>{}}};'}));}}]})).outputFiles[0].text;
const server=createServer((req,res)=>{const body=req.url==='/bundle.js'?bundle:'<!doctype html><meta charset="utf-8"><script src="/bundle.js"></script>';res.writeHead(200,{'Content-Type':req.url==='/bundle.js'?'application/javascript':'text/html','Cache-Control':'no-store'});res.end(body)});
server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});const context=await browser.newContext({serviceWorkers:'block'});
let mode='lose',requests=[],ledger=new Map();
await context.route('**/*',async route=>{
 const req=route.request(),url=new URL(req.url());if(url.origin!==base)return route.abort();
 if(req.method()==='GET')return route.continue();
 if(req.method()!=='POST')return route.abort();
 const body=req.postDataJSON(),auth=req.headers().authorization;requests.push({path:url.pathname,body,auth});
 const merchant=url.pathname==='/merchant-command',key=merchant?body.body.command_id:body.idempotency_key;
 if(!ledger.has(key))ledger.set(key,{merchant,auth,body});
 if(mode==='lose')return route.abort('connectionreset');
 if(mode==='conflict')return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'Unknown gateway response'})});
 if(merchant)return route.fulfill({json:{success:true,replayed:true,order:{...order,status:'preparing',revision:1},command_receipt:{command_id:body.body.command_id,order_id:id,actor_uid:uid,kind:'accepted',revision:1}}});
 return route.fulfill({json:{success:true,replayed:true,order}});
});
const page=await context.newPage();
const run=(fn,arg)=>page.evaluate(async({source,arg})=>{try{return {ok:true,value:await (0,eval)(source)(arg)}}catch(e){return {ok:false,error:String(e)}}},{source:String(fn),arg});
const saved=key=>page.evaluate(key=>sessionStorage.getItem(key),key);
try{
 await page.goto(base);
 assert.equal((await run(r=>customer.submitPickupQuote(r),review)).ok,false);
 const original=await saved(customerKey);assert.ok(original);assert.equal(requests.length,1);
 await page.reload();assert.equal(await saved(customerKey),original);assert.equal(requests.length,1);
 await page.evaluate(()=>switchUser('fixture-b'));assert.equal((await run(()=>customer.submitPickupQuote(null))).ok,false);assert.equal(requests.length,1);assert.equal(await saved(customerKey),original);
 await page.evaluate(()=>switchUser('fixture-a'));mode='ok';assert.equal((await run(()=>customer.submitPickupQuote(null))).ok,true);assert.equal(requests.length,2);assert.deepEqual(requests[0].body,requests[1].body);assert.equal(await saved(customerKey),null);assert.equal(ledger.size,1);
 report('R03_CUSTOMER_RELOAD',{reloadRetained:true,accountBTransmissions:0,exactReplay:true,fixtureOrders:1,automaticMutations:0});
 // Actual Chromium corrupt and denied storage, no outbound mutation.
 await page.evaluate(key=>sessionStorage.setItem(key,'{bad'),customerKey);const before=requests.length;
 assert.equal((await run(()=>customer.submitPickupQuote(null))).ok,false);assert.equal(await saved(customerKey),'{bad');
 await page.evaluate(key=>sessionStorage.removeItem(key),customerKey);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;globalThis.restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(){throw new DOMException('denied','SecurityError')}});
 assert.equal((await run(r=>customer.submitPickupQuote(r),review)).ok,false);await page.evaluate(()=>restoreStorage());assert.equal(requests.length,before);
 report('R03_STORAGE',{corruptRetained:true,deniedBlocked:true,transmissions:0});
 // Legacy callback is actual extracted code. Stored old queue must not replay on reconnect.
 await page.evaluate(()=>localStorage.setItem('offline_orders_queue',JSON.stringify([{id:'old-fixture',shop_id:'fixture-shop'}])));
 await context.setOffline(true);await page.evaluate(()=>legacySync());await context.setOffline(false);
 await page.evaluate(()=>{window.dispatchEvent(new Event('online'));return legacySync()});
 assert.equal(requests.length,before);assert.ok(await page.evaluate(()=>localStorage.getItem('offline_orders_queue')));
 report('R11_LEGACY',{actualCallback:true,offlineReconnect:true,transmissions:0,legacyRecordRetained:true});
 const reconnect=await page.evaluate(()=>exerciseMerchantReconnect());assert.deepEqual(reconnect.reads,['orders:true','shops','menu','orders:true','shops','menu']);assert.equal(reconnect.remainingListeners,0);assert.equal(requests.length,before);
 report('R11_MERCHANT_LEGACY',{actualCallback:true,verifiedWakeReads:6,unverifiedWakeReads:0,mutations:0});
 // Merchant recovery service persists in actual browser storage across reload.
 mode='lose';assert.equal((await run(({order,command})=>merchant.send(order,command),{order,command})).ok,false);
 const merchantOriginal=await saved(merchantKey);assert.ok(merchantOriginal);const n=requests.length;
 await page.reload();assert.equal(await saved(merchantKey),merchantOriginal);assert.equal(requests.length,n);
 await page.evaluate(()=>switchUser('fixture-b'));assert.equal((await run(o=>merchant.retry(o),order)).ok,false);assert.equal(requests.length,n);
 await page.evaluate(()=>switchUser('fixture-a'));mode='conflict';assert.equal((await run(o=>merchant.retry(o),order)).ok,false);
 const retained=!!await saved(merchantKey);
 assert.equal(retained,true);assert.equal(await saved(merchantKey),merchantOriginal);
 report('R03_MERCHANT_AMBIGUOUS',{pendingRetained:retained,requests:requests.length-n,accountBTransmissions:0});
 mode='ok';assert.equal((await run(o=>merchant.retry(o),order)).ok,true);assert.equal(await saved(merchantKey),null);
 assert.deepEqual(requests[n-1].body,requests[n].body);assert.deepEqual(requests[n].body,requests[n+1].body);
 assert.equal(ledger.size,2);
 report('R03_MERCHANT_RELOAD',{exactReplay:true,fixtureCommands:1,automaticMutations:0});
 await page.evaluate(key=>sessionStorage.setItem(key,'{bad'),merchantKey);const mBefore=requests.length;
 assert.equal((await run(o=>merchant.retry(o),order)).ok,false);assert.equal(await saved(merchantKey),'{bad');
 await page.evaluate(key=>sessionStorage.removeItem(key),merchantKey);
 await page.evaluate(()=>{const original=Storage.prototype.setItem;globalThis.restoreStorage=()=>Storage.prototype.setItem=original;Storage.prototype.setItem=function(){throw new DOMException('denied','SecurityError')}});
 assert.equal((await run(({order,command})=>merchant.send(order,command),{order,command})).ok,false);await page.evaluate(()=>restoreStorage());assert.equal(requests.length,mBefore);
 report('R03_MERCHANT_STORAGE',{corruptRetained:true,deniedBlocked:true,transmissions:0});
 // Seed unresolved fixture to verify independent tab isolation, without transmitting.
 await page.evaluate(({key,value})=>sessionStorage.setItem(key,value),{key:merchantKey,value:merchantOriginal});
 // Record scope limit: independent new tab without opener has no sessionStorage.
 const newTab=await context.newPage();await newTab.goto(base);assert.equal(await newTab.evaluate(key=>sessionStorage.getItem(key),merchantKey),null);await newTab.close();
 report('R03_NEW_TAB',{sessionStorageShared:false,note:'no guarantee of recovery after tab closure or new tab'});
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r))}
