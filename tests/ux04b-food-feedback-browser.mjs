// Native pointer feedback in the actual catalog components; synthetic selections only.
import {readFileSync,writeFileSync,mkdirSync,existsSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=process.cwd(),out=resolve(process.argv[2]);mkdirSync(out,{recursive:true});
const require=createRequire(join(root,'package.json'));const {chromium}=require('playwright');
const {createServer}=await import(require.resolve('vite'));
const source=readFileSync('src/components/ShopCard.tsx','utf8');
const base=execFileSync('git',['show','11f49faf912fc7e9e4d6b979b3c7186923344717:src/components/ShopCard.tsx'],{encoding:'utf8'});
const reversals=[
 ['whileHover={reduceMotion ? undefined : { scale: 1.01, transition: { duration: 0.18 } }}','whileHover={reduceMotion ? undefined : { scale: 1.01 }}'],
 ['whileTap={reduceMotion ? undefined : { scale: 0.98, transition: { duration: 0.1 } }}','whileTap={{ scale: 0.98 }}'],
 ['duration-[220ms] motion-reduce:group-hover:scale-100 motion-reduce:transition-none','duration-500'],
 ['whitespace-nowrap shadow-sm transition-[color,background-color,border-color,box-shadow,filter,scale,transform] duration-100 motion-reduce:transition-none text-[11px]','whitespace-nowrap shadow-sm transition-all text-[11px]'],
 ['group-hover:bg-orange-700 active:scale-95 active:brightness-90 motion-reduce:active:scale-100 cursor-pointer','group-hover:bg-orange-700 active:scale-95 cursor-pointer']
];let reverted=source;for(const [a,b] of reversals){assert.equal(reverted.split(a).length,2);reverted=reverted.replace(a,b);}assert.equal(reverted,base);
const fx='tests/ux04b-temp-feedback.tsx',html='tests/ux04b-temp-feedback.html';
assert.ok(!existsSync(fx)&&!existsSync(html));let fixture=readFileSync('tests/ux03-depth-catalog-fixture.tsx','utf8');
const marker='showAlert={(title,message)=>setNotice(title+": "+message)}';
assert.ok(fixture.includes(marker));fixture=fixture.replace(marker,'onSelect={()=>{document.body.dataset.selected=String(Number(document.body.dataset.selected||0)+1);setNotice("Synthetic selection");}} showAlert={(title,message)=>{document.body.dataset.alerts=String(Number(document.body.dataset.alerts||0)+1);setNotice(title+": "+message);}}');
writeFileSync(fx,fixture);writeFileSync(html,'<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/ux04b-temp-feedback.tsx"></script></body></html>');
let server,browser;
try{
 server=await createServer({root,configFile:join(root,'vite.config.ts'),server:{host:'127.0.0.1',port:0}});await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;browser=await chromium.launch({headless:true});let cases=0;
 for(const [width,height] of [[320,568],[390,844],[768,1024],[1366,900]])for(const mode of ['no-preference','reduce'])for(const muted of ['unknown','outside']){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:false,hasTouch:false,reducedMotion:mode,serviceWorkers:'block',permissions:[]});const errors=[],writes=[];
  await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method())){writes.push(req.method());return r.abort();}if(u.origin===origin)return r.continue();if(u.hostname==='images.weserv.nl')return r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/B7sAAAAASUVORK5CYII=','base64')});return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
  try{
   await p.goto(origin+'/'+html+'?muted='+muted,{waitUntil:'domcontentloaded'});await p.getByText('All verified demo menus loaded').waitFor();assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),mode==='reduce');
   const card=p.getByTestId('shop-slow-shop').locator(':scope > div').nth(1),button=card.getByRole('button',{name:'Add',exact:true});await button.scrollIntoViewIfNeeded();await button.hover();await p.waitForTimeout(400);
   const state=()=>button.evaluate(e=>{const card=e.parentElement.parentElement.parentElement,img=card.firstElementChild.firstElementChild;const b=getComputedStyle(e),c=getComputedStyle(card),i=getComputedStyle(img),r=card.getBoundingClientRect();return {filter:b.filter,scale:b.scale,transform:c.transform,imageScale:i.scale,property:b.transitionProperty,duration:b.transitionDuration,imageProperty:i.transitionProperty,imageDuration:i.transitionDuration,w:r.width,h:r.height,selected:Number(document.body.dataset.selected||0),alerts:Number(document.body.dataset.alerts||0)};});
   const before=await state();assert.equal(before.selected,0);assert.equal(before.alerts,0);
   if(mode==='reduce'){assert.equal(before.property,'none');assert.equal(before.imageProperty,'none');assert.ok(before.scale==='none'||before.scale==='1');}else{assert.equal(parseFloat(before.duration),.1);assert.equal(parseFloat(before.imageDuration),.22);}
   await button.evaluate(e=>{window.uxPress=new Promise(resolve=>e.addEventListener('pointerdown',()=>{const start=performance.now(),frames=[];let first=null;const sample=()=>{const t=performance.now()-start,c=getComputedStyle(e),card=e.parentElement.parentElement.parentElement;const f=c.filter,sc=c.scale,transform=getComputedStyle(card).transform;frames.push({ms:Math.round(t),filter:f,scale:sc,transform,running:e.getAnimations().some(a=>a.playState==='running'||a.pending)});if(first===null&&f!=='none'&&f!=='brightness(1)')first=t;if(/brightness\(0\.9\)/.test(f)||t>500){resolve({firstMs:first===null?null:Math.round(first),settledMs:Math.round(t),frames,filter:f});return;}requestAnimationFrame(sample);};requestAnimationFrame(sample);},{once:true}));});
   await p.mouse.down();const press=await p.evaluate(()=>window.uxPress);assert.ok(/brightness\(0\.9\)/.test(press.filter),JSON.stringify(press));assert.ok(press.firstMs!==null&&press.firstMs<250&&press.settledMs<450,JSON.stringify(press));
   const pressed=await state();assert.equal(pressed.selected,0);assert.equal(pressed.alerts,0);
   if(mode==='reduce'){assert.ok(press.frames.every(f=>!f.running&&(f.scale==='none'||f.scale==='1')&&f.transform===before.transform));assert.equal(pressed.imageScale,before.imageScale);}
   const label=width+'-'+mode+'-'+muted;await p.screenshot({path:join(out,'customer-'+label+'-pressed.png')});
   await p.mouse.up();await p.getByText('Synthetic selection',{exact:true}).waitFor();assert.equal((await state()).selected,1);
   const mutedButton=p.getByTestId('shop-fast-shop').getByRole('button',{name:muted==='outside'?'Outside area':'Location needed',exact:true});await mutedButton.click();await p.getByTestId('catalog-state').filter({hasText:muted==='outside'?'Outside your pickup area':'Location needed'}).waitFor();assert.equal(await p.evaluate(()=>Number(document.body.dataset.selected||0)),1);assert.equal(await p.evaluate(()=>Number(document.body.dataset.alerts||0)),1);
   assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await p.screenshot({path:join(out,'customer-'+label+'-muted.png')});
   writeFileSync(join(out,'customer-'+label+'.json'),JSON.stringify({label,before,pressed,press,selected:1,alerts:1},null,2));console.log('UX04B_CUSTOMER '+JSON.stringify({label,firstMs:press.firstMs,settledMs:press.settledMs,selected:1,alerts:1}));cases++;
  }finally{await ctx.close();}
 }
 console.log('UX04B_CUSTOMER_PASS '+JSON.stringify({cases,scope:'actual food card, native mouse pointer at emulated widths; synthetic selection and unavailable explanation; no live orders'}));
}finally{await browser?.close();await server?.close();rmSync(fx,{force:true});rmSync(html,{force:true});}
