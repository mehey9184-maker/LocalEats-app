import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function load(path){const b=await build({entryPoints:[path],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].contents).toString('base64')+'#'+Math.random());}
const entry=await load('src/services/customerEntry.ts');
const invite=await load('src/services/menuInstallInvite.ts');

test('QR entry accepts one nonempty bounded shop ID, never duplicate or malformed IDs',()=>{
 assert.equal(entry.qrShopId('?shopId=shop-my-kota-ivory-park'),'shop-my-kota-ivory-park');
 assert.equal(entry.qrShopId('?shopId=shop%20one'),'shop one');
 for(const q of ['', '?shopId=', '?shopId=%20', '?shopId=a&shopId=b', '?shopId=%00bad', '?shopId='+('x'.repeat(201))])assert.equal(entry.qrShopId(q),null);
 assert.equal(entry.withoutShopLink('/?shopId=a&source=counter#menu'),'/?source=counter#menu');
});
test('checkout return requires real matching Firebase account; failure/cancel preserves pending destination',()=>{
 const flow=entry.createCheckoutReturn();
 assert.equal(flow.destination(),null);
 flow.request();
 for(const user of [null,{uid:'a',isAnonymous:true},{uid:'b',isAnonymous:false}])assert.equal(flow.resolve(user,'a'),null);
 assert.equal(flow.destination(),'checkout');
 assert.equal(flow.resolve({uid:'a',isAnonymous:false},'a'),'checkout');
 assert.equal(flow.destination(),'checkout','Do not consume until checkout actually mounts');
 flow.complete();assert.equal(flow.destination(),null);
});
test('install invitation waits for two different items, cannot be triggered by repeated clicks',()=>{
 const p=invite.createMenuInstallInvite(null,()=>100);
 assert.equal(p.visible(),false);p.viewItem('s','a');p.viewItem('s','a');assert.equal(p.visible(),false);
 p.viewItem('s','b');assert.equal(p.visible(),true);
});
test('install dismissal lasts seven days across reload, including exact expiry',()=>{
 const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};let now=1_000_000;
 const first=invite.createMenuInstallInvite(storage,()=>now);first.viewItem('s','a');first.viewItem('s','b');first.dismiss();assert.equal(first.visible(),false);
 const next=invite.createMenuInstallInvite(storage,()=>now);next.viewItem('s','a');next.viewItem('s','b');assert.equal(next.visible(),false);
 now+=604_800_000;assert.equal(next.visible(),true);
});
test('blocked/corrupt storage never crashes, and dismissal suppresses the current page',()=>{
 const bad={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 const p=invite.createMenuInstallInvite(bad,()=>123);p.viewItem('s','a');p.viewItem('s','b');p.dismiss();assert.equal(p.visible(),false);
 for(const value of ['bad','Infinity','-1','999999999999999999']){
  const c=invite.createMenuInstallInvite({getItem:()=>value,setItem(){}},()=>999);c.viewItem('s','a');c.viewItem('s','b');assert.equal(c.visible(),true);
 }
});
test('native install never prompts automatically, is single-use, and only installed evidence hides it',async()=>{
 const previous=globalThis.window;const previousNav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const events=new EventTarget(),media=new EventTarget();media.matches=false;events.matchMedia=()=>media;
 globalThis.window=events;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{standalone:false}});
 try{
  const p=await load('src/services/pwaInstallInvite.ts');let prompted=0;
  const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{prompted++;return {outcome:'accepted'}};
  events.dispatchEvent(e);assert.equal(prompted,0);assert.equal(e.defaultPrevented,true);
  assert.equal(await p.requestNativeInstall(),'accepted');assert.equal(prompted,1);assert.equal(p.appAlreadyInstalled(),false);
  assert.equal(await p.requestNativeInstall(),'unavailable');assert.equal(prompted,1);
  events.dispatchEvent(new Event('appinstalled'));assert.equal(p.appAlreadyInstalled(),true);assert.equal(p.availableInstallEvent(),null);
 }finally{globalThis.window=previous;if(previousNav)Object.defineProperty(globalThis,'navigator',previousNav);else delete globalThis.navigator;}
});
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

test('menu install invitation stays inline and renders only manual action before engagement',async()=>{
 const b=await build({entryPoints:['src/components/CustomerInstallOffer.tsx'],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',logLevel:'silent'});
 const mod={exports:{}};new Function('require','module','exports',b.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
 const C=mod.exports.CustomerInstallOffer;
 const old=Object.getOwnPropertyDescriptor(globalThis,'navigator');Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Mozilla/5.0 Chrome/130.0',maxTouchPoints:0}});
 try{
  const before=renderToStaticMarkup(React.createElement(C,{showInvite:false,onDismiss(){}}));
  assert.match(before,/Install LocalEats/);assert.doesNotMatch(before,/Keep your favourites one tap away/);
  const after=renderToStaticMarkup(React.createElement(C,{showInvite:true,onDismiss(){}}));
  assert.match(after,/Keep your favourites one tap away/);assert.match(after,/Not now/);assert.doesNotMatch(after,/aria-modal|fixed|notifications|Enable ordering/);
 }finally{if(old)Object.defineProperty(globalThis,'navigator',old);else delete globalThis.navigator;}
});
test('manifest icons contain the declared square PNG dimensions required for native installation',async()=>{
 const {readFileSync}=await import('node:fs');
 for(const size of [192,512]){
  const png=readFileSync(`public/pwa-icon-${size}.png`);
  assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
 const config=readFileSync('vite.config.ts','utf8');
 assert.match(config,/pwa-icon-192\.png/);assert.match(config,/pwa-icon-512\.png/);
 assert.doesNotMatch(config,/src: "\/logo\.png\?v=2"/);
});
test('checkout sign-in return replaces auth screens and Back reaches the original menu',()=>{
 assert.deepEqual(entry.checkoutNavigationStack(['splash','store-info','login']),['home','store-info','checkout']);
 assert.deepEqual(entry.checkoutNavigationStack(['home','discover','store-info','signup','setup-password','success']),['home','discover','store-info','checkout']);
 assert.deepEqual(entry.checkoutNavigationStack(['home','checkout']),['home','checkout']);
});
test('delayed sign-in callback cannot reopen checkout after Back or a cancelled login',()=>{
 assert.equal(entry.completedSignInScreen('login','checkout'),'checkout');
 assert.equal(entry.completedSignInScreen('checkout','checkout'),'checkout');
 assert.equal(entry.completedSignInScreen('store-info',null),'store-info');
 assert.equal(entry.completedSignInScreen('home',null),'home');
 assert.equal(entry.completedSignInScreen('login',null),'login-success');
});
test('standalone and iOS home-screen launches suppress install actions',async()=>{
 const previous=globalThis.window;const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const events=new EventTarget();const media=new EventTarget();media.matches=true;events.matchMedia=()=>media;
 globalThis.window=events;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{standalone:false}});
 try{const p=await load('src/services/pwaInstallInvite.ts');assert.equal(p.appAlreadyInstalled(),true);media.matches=false;navigator.standalone=true;assert.equal(p.appAlreadyInstalled(),true);navigator.standalone=false;assert.equal(p.appAlreadyInstalled(),false);
  const e=new Event('beforeinstallprompt',{cancelable:true});e.prompt=async()=>{throw Error('Install cancelled by browser')};events.dispatchEvent(e);assert.equal(await p.requestNativeInstall(),'error');assert.equal(p.availableInstallEvent(),null);
 }finally{globalThis.window=previous;if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
test('manual installation instructions fit Apple touch devices, Android and unsupported browsers',async()=>{
 const {getInstallInstructions}=await load('src/services/installInstructions.ts');
 assert.match(getInstallInstructions('iPhone Safari/605',1).join(' '),/Share.*Add to Home Screen/);
 assert.match(getInstallInstructions('Macintosh Safari/605',5).join(' '),/Add to Home Screen/);
 assert.match(getInstallInstructions('Android Chrome/130',1).join(' '),/browser menu/);
 assert.equal(getInstallInstructions('Unknown Browser'),null);
});
