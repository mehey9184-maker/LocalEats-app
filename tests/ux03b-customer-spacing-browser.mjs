// Actual accepted synthetic catalog fixture, one deliberately scoped style substitution.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=process.cwd(),out=resolve(process.argv[2]);mkdirSync(out,{recursive:true});
const require=createRequire(join(root,'package.json'));const {chromium}=require('playwright');
const {createServer}=await import(require.resolve('vite'));
const source=readFileSync('src/components/ShopCard.tsx','utf8');const base=execFileSync('git',['show','98cadc5f551c81c95ecd5318299dfb715ff2de80:src/components/ShopCard.tsx'],{encoding:'utf8'});assert.equal(source.replace('flex gap-3 sm:gap-4 animate-pulse shadow-sm','flex gap-4 animate-pulse shadow-sm').replace('flex gap-3 sm:gap-4 group hover:border-orange-500/40','flex gap-4 group hover:border-orange-500/40'),base);
const server=await createServer({root,configFile:join(root,'vite.config.ts'),server:{host:'127.0.0.1',port:0}});
let browser;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;browser=await chromium.launch({headless:true});let cases=0;
 for(const [width,height] of [[320,568],[390,844],[768,1024],[1366,900]])for(const dark of [false,true])for(const muted of ['unknown','outside']){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce',serviceWorkers:'block',permissions:[]});const writes=[],errors=[];
  await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method())){writes.push(req.method());return r.abort();}if(u.origin===origin)return r.continue();if(u.hostname==='images.weserv.nl')return r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/B7sAAAAASUVORK5CYII=','base64')});return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
  try{await p.goto(origin+'/tests/ux03-depth-catalog-fixture.html?muted='+muted,{waitUntil:'domcontentloaded'});await p.getByText('All verified demo menus loaded').waitFor();await p.evaluate(d=>{document.documentElement.classList.toggle('dark',d);document.querySelector('main').classList.toggle('bg-white',!d);document.querySelector('main').style.background=d?'#020617':'';},dark);
   const label=width+'-'+(dark?'dark':'light')+'-'+muted;await p.waitForTimeout(550);
   const settle=()=>p.waitForTimeout(350);
   const capture=async mode=>{await settle();let v=await p.evaluate(()=>{const nodes=[...document.querySelectorAll('[data-testid^="shop-"]')].flatMap(n=>[{e:n.firstElementChild.firstElementChild,kind:'shop',muted:n.dataset.testid==='shop-fast-shop'},{e:n.children[1],kind:'food',muted:false}]);return {scrollWidth:document.documentElement.scrollWidth,cards:nodes.map(({e,kind,muted})=>{const r=e.getBoundingClientRect();const c=getComputedStyle(e),child=e.children[1],button=e.querySelector('button');const rect=x=>{if(!x)return null;const q=x.getBoundingClientRect();return {x:q.x-r.x,y:q.y-r.y,w:q.width,h:q.height,right:q.right-r.x,bottom:q.bottom-r.y}};return {kind,muted,x:r.x,y:r.y,w:r.width,h:r.height,text:e.innerText,shadow:c.boxShadow,role:e.getAttribute('role'),name:e.getAttribute('aria-label'),gap:c.columnGap,content:kind==='food'?rect(child):null,image:kind==='food'?rect(e.firstElementChild):null,button:kind==='food'?rect(button):null};})};});await p.screenshot({path:join(out,'customer-'+label+'-'+mode+'.png'),fullPage:true});return v;};
   const after=await capture('new');assert.equal(after.cards.length,4);assert.equal(after.cards.filter(x=>x.muted).length,1);assert.ok(after.cards.find(x=>x.muted).name.includes(muted==='outside'?'Outside the 4 kilometer pickup area':'Location needed to order'));
   await p.evaluate(()=>{for(const el of document.querySelectorAll('[data-testid^="shop-"]')){const card=el.children[1];card.classList.remove('gap-3','sm:gap-4');card.classList.add('gap-4');}});
   const before=await capture('old');assert.equal(after.scrollWidth,width);assert.equal(before.scrollWidth,width);
   const identity=x=>({kind:x.kind,muted:x.muted,x:x.x,w:x.w,text:x.text,shadow:x.shadow,role:x.role,name:x.name});
   assert.deepEqual(before.cards.map(identity),after.cards.map(identity));
   for(let i=0;i<after.cards.length;i++){const n=after.cards[i],o=before.cards[i];if(n.kind==='shop'){assert.equal(n.h,o.h);continue;}assert.equal(o.gap,'16px');assert.equal(n.gap,width<640?'12px':'16px');assert.equal(n.image.w,o.image.w);assert.equal(n.image.h,o.image.h);assert.ok(Math.abs(n.content.w-o.content.w-(width<640?4:0))<1.5,JSON.stringify({n,o}));assert.ok(n.h<=o.h+1,JSON.stringify({n,o}));assert.ok(n.button.x>=n.content.x-1&&n.button.right<=n.content.right+1&&n.button.bottom<=n.h+1,JSON.stringify(n));if(width>=640)assert.deepEqual(n.content,o.content);}
   assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
   writeFileSync(join(out,'customer-'+label+'.json'),JSON.stringify({before,after,writes,errors},null,2));console.log('UX03B_CUSTOMER '+JSON.stringify({label,food:after.cards.flatMap((n,i)=>n.kind==='food'?[{beforeGap:before.cards[i].gap,afterGap:n.gap,beforeContent:before.cards[i].content.w,afterContent:n.content.w,beforeHeight:before.cards[i].h,afterHeight:n.h}]:[])}));cases++;
  }finally{await ctx.close();}
 }
 console.log('UX03B_CUSTOMER_PASS '+JSON.stringify({cases,scope:'actual synthetic ShopCard and MenuItemCard; responsive gap only; exact source guard; synthetic dark canvas, distances and mocked images; unchanged muted shop'}));
}finally{await browser?.close();await server.close();}
