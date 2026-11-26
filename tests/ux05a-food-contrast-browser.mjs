// Actual accepted synthetic catalog fixture, one deliberately scoped style substitution.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=process.cwd(),out=resolve(process.argv[2]);mkdirSync(out,{recursive:true});
const require=createRequire(join(root,'package.json'));const {chromium}=require('playwright');
const {createServer}=await import(require.resolve('vite'));
const source=readFileSync('src/components/ShopCard.tsx','utf8');const base=execFileSync('git',['show','6ca02fdb81f3ad75de79df81919d34115319a653:src/components/ShopCard.tsx'],{encoding:'utf8'});assert.equal(source.replace('font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors truncate','font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-orange-600 transition-colors truncate').replace('font-black text-orange-700 dark:text-orange-400 text-sm tracking-tight','font-black text-orange-600 dark:text-orange-400 text-sm tracking-tight'),base);
function sample(el){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 const rgba=v=>{ctx.clearRect(0,0,1,1);ctx.fillStyle='#000';ctx.fillStyle=v;ctx.fillRect(0,0,1,1);const a=[...ctx.getImageData(0,0,1,1).data];return [a[0],a[1],a[2],a[3]/255];};
 const over=(a,b)=>[0,1,2].map(i=>a[i]*a[3]+b[i]*(1-a[3])).concat(1);
 const chain=[];for(let n=el;n;n=n.parentElement){const c=getComputedStyle(n);if(c.backgroundImage!=='none'||Number(c.opacity)!==1||c.filter!=='none')throw Error('Contrast requires flat unfiltered backgrounds: '+n.tagName);const v=rgba(c.backgroundColor);chain.push(v);if(v[3]===1)break;}
 let bg=[255,255,255,1];for(const v of chain.reverse())bg=over(v,bg);
 const c=getComputedStyle(el),fg=over(rgba(c.color),bg),lum=a=>a.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const l=lum(bg),k=lum(fg),r=el.getBoundingClientRect();return {text:el.innerText,color:c.color,fg:fg.slice(0,3),bg:bg.slice(0,3),ratio:(Math.max(l,k)+.05)/(Math.min(l,k)+.05),font:c.fontSize,weight:c.fontWeight,x:r.x,y:r.y,w:r.width,h:r.height};
}
const server=await createServer({root,configFile:join(root,'vite.config.ts'),server:{host:'127.0.0.1',port:0}});
let browser;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;browser=await chromium.launch({headless:true});let cases=0;
 for(const [width,height] of [[320,568],[390,844],[768,1024],[1366,900]])for(const dark of [false,true])for(const muted of ['unknown','outside']){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:false,hasTouch:false,reducedMotion:'reduce',serviceWorkers:'block',permissions:[]});const writes=[],errors=[];
  await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method())){writes.push(req.method());return r.abort();}if(u.origin===origin)return r.continue();if(u.hostname==='images.weserv.nl')return r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/B7sAAAAASUVORK5CYII=','base64')});return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
  try{await p.goto(origin+'/tests/ux03-depth-catalog-fixture.html?muted='+muted,{waitUntil:'domcontentloaded'});await p.getByText('All verified demo menus loaded').waitFor();await p.evaluate(d=>{document.documentElement.classList.toggle('dark',d);document.querySelector('main').classList.toggle('bg-white',!d);document.querySelector('main').style.background=d?'#020617':'';},dark);
   const label=width+'-'+(dark?'dark':'light')+'-'+muted;await p.waitForTimeout(550);
   const card=p.getByTestId('shop-slow-shop').locator(':scope > div').nth(1);const title=card.locator('h4');await title.scrollIntoViewIfNeeded();await title.hover();await p.waitForTimeout(350);
   assert.equal(await title.evaluate(e=>e.matches(':hover')),true);
   const capture=async mode=>{
     const v=await p.evaluate(({sampleSource})=>{const sample=Function('return ('+sampleSource+')')();const cards=[...document.querySelectorAll('[data-testid^="shop-"]')].map(n=>{const c=n.children[1],r=c.getBoundingClientRect();return {id:n.dataset.testid,text:c.innerText,rect:[r.x,r.y,r.width,r.height],title:sample(c.querySelector('h4')),price:sample(c.querySelector('p.shrink-0')),button:c.querySelector('button').innerText,shopName:n.firstElementChild.firstElementChild.getAttribute('aria-label')};});return {cards,scrollWidth:document.documentElement.scrollWidth};},{sampleSource:sample.toString()});
     await p.screenshot({path:join(out,'customer-'+label+'-'+mode+'.png'),fullPage:true});return v;
   };
   const after=await capture('new');
   await p.evaluate(()=>{for(const n of document.querySelectorAll('[data-testid^="shop-"]')){const c=n.children[1],price=c.querySelector('p.shrink-0'),title=c.querySelector('h4');price.classList.remove('text-orange-700');price.classList.add('text-orange-600');title.classList.remove('group-hover:text-orange-700','dark:group-hover:text-orange-400');title.classList.add('group-hover:text-orange-600');}});
   await p.waitForTimeout(350);const before=await capture('old');
   assert.equal(after.cards.length,2);assert.equal(before.scrollWidth,width);assert.equal(after.scrollWidth,width);
   const identity=({color,fg,bg,ratio,...r})=>r;
   for(let i=0;i<2;i++){const n=after.cards[i],o=before.cards[i];assert.deepEqual({...n,title:identity(n.title),price:identity(n.price)},{...o,title:identity(o.title),price:identity(o.price)});assert.ok(n.price.ratio>=4.5,JSON.stringify(n.price));assert.ok(n.title.ratio>=4.5,JSON.stringify(n.title));if(!dark)assert.ok(n.price.ratio>o.price.ratio);}
   if(!dark)assert.ok(after.cards.find(x=>x.id==='shop-slow-shop').title.ratio>before.cards.find(x=>x.id==='shop-slow-shop').title.ratio);
   assert.ok(after.cards.find(x=>x.id==='shop-fast-shop').shopName.includes(muted==='outside'?'Outside the 4 kilometer pickup area':'Location needed to order'));assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
   writeFileSync(join(out,'customer-'+label+'.json'),JSON.stringify({label,before,after,writes,errors},null,2));console.log('UX05_CUSTOMER '+JSON.stringify({label,before:before.cards.map(c=>({id:c.id,title:c.title.ratio,price:c.price.ratio})),after:after.cards.map(c=>({id:c.id,title:c.title.ratio,price:c.price.ratio}))}));cases++;

  }finally{await ctx.close();}
 }
 console.log('UX05_CUSTOMER_PASS '+JSON.stringify({cases,scope:'actual synthetic MenuItemCard; rendered sRGB foreground and composited flat background; native pointer; exact colour-only baseline substitution'}));
}finally{await browser?.close();await server.close();}
