// Actual before/after BottomSheet components, same accepted navigation fixture.
import {readFileSync,writeFileSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=process.cwd(),out=resolve(process.argv[2]);mkdirSync(out,{recursive:true});
const require=createRequire(join(root,'package.json'));const {chromium}=require('playwright');
const {createServer}=await import(require.resolve('vite'));
const source=readFileSync('src/components/BottomSheet.tsx','utf8');
const old=execFileSync('git',['show','248bc0a00dd68f78181362bcb52b6d07a6b60650:src/components/BottomSheet.tsx'],{encoding:'utf8'});
assert.equal(source.replace('exit={reduceMotion ? {opacity:1,y:0} : { y: "100%", opacity: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}','exit={reduceMotion ? {opacity:1,y:0} : { y: "100%", opacity: 0 }}').replace('transition={reduceMotion ? {duration:0} : { type: "tween", duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}','transition={reduceMotion ? {duration:0} : { type: "spring", stiffness: 350, damping: 32 }}'),old);
const oldPath='tests/ux04-temp-old-sheet.tsx',fixturePath='tests/ux04-temp-motion.tsx',htmlPath='tests/ux04-temp-motion.html';
for(const path of [oldPath,fixturePath,htmlPath])assert.ok(!existsSync(path),'fixture path already exists');
const fixture=readFileSync('tests/l3-p3-navigation-fixture.tsx','utf8').replace('import {BottomSheet} from "../src/components/BottomSheet";','import {BottomSheet as NewSheet} from "../src/components/BottomSheet";\nimport {BottomSheet as OldSheet} from "./ux04-temp-old-sheet";\nconst BottomSheet=new URLSearchParams(location.search).get("variant")==="old"?OldSheet:NewSheet;');
assert.ok(fixture.includes('OldSheet'));
writeFileSync(oldPath,old);writeFileSync(fixturePath,fixture);
writeFileSync(htmlPath,'<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/ux04-temp-motion.tsx"></script></body></html>');
let server,browser;
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
try{
 server=await createServer({root,configFile:join(root,'vite.config.ts'),server:{host:'127.0.0.1',port:0}});await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;browser=await chromium.launch({headless:true});let cases=0;
 for(const [width,height] of [[320,568],[390,844],[768,1024],[1366,900]])for(const mode of ['no-preference','reduce']){
  const rows={old:[],new:[]};
  for(let trial=0;trial<3;trial++)for(const variant of trial%2?['new','old']:['old','new']){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500,reducedMotion:mode,serviceWorkers:'block',permissions:[]});
   const writes=[],errors=[];await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method())){writes.push(req.method());return r.abort();}return u.origin===origin?r.continue():r.abort();});
   const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));p.setDefaultTimeout(15000);
   try{
    await p.goto(origin+'/'+htmlPath+'?variant='+variant,{waitUntil:'domcontentloaded'});await p.getByTestId('p3-ready').waitFor();await p.waitForTimeout(550);
    const cart=p.getByRole('button',{name:/View shopping cart/});await cart.focus();
    const opened=await cart.evaluate(async el=>{const start=performance.now();el.click();let stable=0,last='',first=null,maxTranslation=0;const frames=[];while(performance.now()-start<2200){await new Promise(requestAnimationFrame);const d=document.querySelector('[role=dialog]');if(!d)continue;const now=performance.now()-start;if(first===null)first=now;const r=d.getBoundingClientRect(),c=getComputedStyle(d),y=c.transform==='none'?0:new DOMMatrixReadOnly(c.transform).m42;maxTranslation=Math.max(maxTranslation,Math.abs(y));frames.push([Math.round(now),Math.round(y*10)/10,Number(c.opacity)]);const key=[r.x,r.y,r.width,r.height].map(n=>Math.round(n*10)/10).join(',');stable=key===last&&Math.abs(y)<.5&&Number(c.opacity)>.99?stable+1:0;last=key;if(stable>=5)return {firstMs:Math.round(first),settledMs:Math.round(now),maxTranslation,frames,geometry:{x:r.x,y:r.y,w:r.width,h:r.height}};}throw Error('Cart did not settle');});
    const dialog=p.getByRole('dialog',{name:'Your pickup cart'});await dialog.waitFor();assert.ok(await p.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')));
    await p.keyboard.press('Shift+Tab');assert.ok(await p.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')));
    const target=dialog.getByRole('button',{name:'Close sheet'});assert.equal(await target.count(),2);
    for(const b of await target.all()){const r=await b.boundingBox();assert.ok(r.width>=44&&r.height>=44);}
    if(trial===0)await p.screenshot({path:join(out,'customer-'+width+'-'+mode+'-'+variant+'.png')});
    const closed=await target.last().evaluate(async el=>{const start=performance.now();el.click();const frames=[];let maxTranslation=0;while(performance.now()-start<2200){await new Promise(requestAnimationFrame);const d=document.querySelector('[role=dialog]'),now=performance.now()-start;if(!d)return {removedMs:Math.round(now),maxTranslation,frames};const c=getComputedStyle(d),y=c.transform==='none'?0:new DOMMatrixReadOnly(c.transform).m42;maxTranslation=Math.max(maxTranslation,Math.abs(y));frames.push([Math.round(now),Math.round(y*10)/10,Number(c.opacity)]);}throw Error('Cart did not close');});
    assert.ok(await cart.evaluate(e=>document.activeElement===e));assert.equal(await p.evaluate(()=>document.body.style.overflow),'');assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
    if(mode==='reduce'){assert.ok(opened.maxTranslation<.5&&closed.maxTranslation<.5);assert.ok(opened.settledMs<300&&closed.removedMs<300);}
    if(variant==='new'&&mode==='no-preference'){assert.ok(opened.settledMs<500&&closed.removedMs<450);}
    rows[variant].push({trial,opened,closed,focusRestored:true});
   }finally{await ctx.close();}
  }
  for(let j=0;j<3;j++)assert.deepEqual(rows.old[j].opened.geometry,rows.new[j].opened.geometry);
  const values=variant=>({open:median(rows[variant].map(r=>r.opened.settledMs)),close:median(rows[variant].map(r=>r.closed.removedMs)),first:median(rows[variant].map(r=>r.opened.firstMs))});
  const before=values('old'),after=values('new');if(mode==='no-preference'){assert.ok(after.open+30<before.open,JSON.stringify({before,after}));assert.ok(after.close+30<before.close,JSON.stringify({before,after}));}
  const label=width+'-'+mode;writeFileSync(join(out,'customer-'+label+'.json'),JSON.stringify({label,before,after,rows},null,2));console.log('UX04_CUSTOMER '+JSON.stringify({label,before,after,trials:3}));cases++;
 }
 console.log('UX04_CUSTOMER_PASS '+JSON.stringify({cases,pairedTrials:cases*3,scope:'actual BottomSheet in existing synthetic navigation fixture, no live data'}));
}finally{await browser?.close();await server?.close();for(const path of [oldPath,fixturePath,htmlPath])rmSync(path,{force:true});}
