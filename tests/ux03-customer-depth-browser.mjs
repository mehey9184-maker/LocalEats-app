// Actual accepted synthetic catalog fixture, one deliberately scoped style substitution.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=process.cwd(),out=resolve(process.argv[2]);mkdirSync(out,{recursive:true});
const require=createRequire(join(root,'package.json'));const {chromium}=require('playwright');
const {createServer}=await import(require.resolve('vite'));
const shop='shadow-[0_2px_8px_rgba(15,23,42,0.08),0_6px_18px_rgba(15,23,42,0.04)]';
const food='shadow-[0_1px_4px_rgba(15,23,42,0.08),0_3px_10px_rgba(15,23,42,0.04)]';
const source=readFileSync('src/components/ShopCard.tsx','utf8');const base=execFileSync('git',['show','a3b5fedfbbe695e855e4285c907cb055745983e4:src/components/ShopCard.tsx'],{encoding:'utf8'});assert.equal(source.replace(shop,'shadow-sm').replace(food,'shadow-xs'),base);
const server=await createServer({root,configFile:join(root,'vite.config.ts'),server:{host:'127.0.0.1',port:0}});
let browser;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;browser=await chromium.launch({headless:true});let cases=0;
 for(const [width,height] of [[320,568],[390,844],[768,1024],[1366,900]])for(const dark of [false,true]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce',serviceWorkers:'block',permissions:[]});const writes=[],errors=[];
  await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method())){writes.push(req.method());return r.abort();}if(u.origin===origin)return r.continue();if(u.hostname==='images.weserv.nl')return r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/B7sAAAAASUVORK5CYII=','base64')});return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
  try{await p.goto(origin+'/tests/l3-p1-home-fixture.html',{waitUntil:'domcontentloaded'});await p.getByText('All verified demo menus loaded').waitFor();await p.evaluate(d=>{document.documentElement.classList.toggle('dark',d);document.querySelector('main').classList.toggle('bg-white',!d);document.querySelector('main').style.background=d?'#020617':'';},dark);
   const label=width+'-'+(dark?'dark':'light');await p.waitForTimeout(550);
   const settle=()=>p.waitForTimeout(350);
   const capture=async mode=>{await settle();let v=await p.evaluate(({shop,food,mode})=>{const nodes=[...document.querySelectorAll('[data-testid^="shop-"]')].flatMap(n=>[n.firstElementChild.firstElementChild,n.children[1]]);return {scrollWidth:document.documentElement.scrollWidth,cards:nodes.map((e,i)=>{const r=e.getBoundingClientRect();return {kind:i%2?'food':'shop',x:r.x,y:r.y,w:r.width,h:r.height,text:e.innerText,shadow:getComputedStyle(e).boxShadow,role:e.getAttribute('role'),expected:e.classList.contains(mode==='new'?(i%2?food:shop):(i%2?'shadow-xs':'shadow-sm'))}})};},{shop,food,mode});await p.screenshot({path:join(out,'customer-'+label+'-'+mode+'.png'),fullPage:true});return v;};
   const after=await capture('new');assert.equal(after.cards.length,4);assert.ok(after.cards.every(x=>x.expected));
   await p.evaluate(({shop,food})=>{for(const el of document.querySelectorAll('[class]')){if(el.classList.contains(shop)){el.classList.remove(shop);el.classList.add('shadow-sm');}if(el.classList.contains(food)){el.classList.remove(food);el.classList.add('shadow-xs');}}},{shop,food});
   const before=await capture('old');assert.equal(after.scrollWidth,width);assert.ok(before.cards.every(x=>x.expected));assert.deepEqual(before.cards.map(({shadow,...r})=>r),after.cards.map(({shadow,...r})=>r));assert.ok(after.cards.every((x,i)=>x.shadow!==before.cards[i].shadow&&x.shadow!=='none'));assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
   writeFileSync(join(out,'customer-'+label+'.json'),JSON.stringify({before,after,writes,errors},null,2));console.log('UX03_CUSTOMER '+JSON.stringify({label,before:before.cards.map(x=>({kind:x.kind,shadow:x.shadow})),after:after.cards.map(x=>({kind:x.kind,shadow:x.shadow})),geometryUnchanged:true}));cases++;
  }finally{await ctx.close();}
 }
 console.log('UX03_CUSTOMER_PASS '+JSON.stringify({cases,scope:'actual synthetic ShopCard and MenuItemCard; exact CSS class substitution for baseline; synthetic dark canvas and mocked images'}));
}finally{await browser?.close();await server.close();}
