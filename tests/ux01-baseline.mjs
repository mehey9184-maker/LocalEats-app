import {readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {scan,summarize} from './ux01-measure.mjs';
const component=process.argv[2],root=process.cwd(),out=resolve(process.argv[3]);
mkdirSync(out,{recursive:true});
const require=createRequire(join(root,'package.json'));
const save=(label,data)=>{writeFileSync(join(out,label+'.json'),JSON.stringify(data,null,2));console.log('UX01_MEASURE '+label+' '+JSON.stringify(summarize(data)));};
if(component==='Customer'){
 const {chromium}=require('playwright');
 const {createServer}=await import(require.resolve('vite'));
 const server=await createServer({root,configFile:join(root,'vite.config.ts'),server:{host:'127.0.0.1',port:0}});
 let browser;
 try{
  await server.listen();const base='http://127.0.0.1:'+server.httpServer.address().port;
  browser=await chromium.launch({headless:true});
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1366,900]])for(const mode of ['no-preference','reduce']){
   const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<500,hasTouch:width<500,reducedMotion:mode,serviceWorkers:'block',permissions:[]});
   const errors=[],writes=[],external=new Set();await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(!['GET','HEAD'].includes(req.method())){writes.push(req.method());return r.abort();}if(u.origin===base)return r.continue();external.add(u.hostname);if(u.hostname==='images.weserv.nl')return r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/B7sAAAAASUVORK5CYII=','base64')});return r.abort();});
   const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));p.setDefaultTimeout(15000);
   const key=width+'-'+mode;
   const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(true)))));
   async function capture(name){await settle();const data=await p.evaluate(scan);save('customer-'+key+'-'+name,data);if(name==='cart'||name==='notice'){const labels=name==='cart'?['Close sheet']:['Dismiss notification'];const targets=data.controls.filter(x=>labels.includes(x.label));assert.equal(targets.length,name==='cart'?2:1);assert.ok(targets.every(x=>x.w>=44&&x.h>=44&&x.centerHit),JSON.stringify(targets));}await p.screenshot({path:join(out,'customer-'+key+'-'+name+'.png')});}
   try{
    await p.goto(base+'/tests/l3-p1-home-fixture.html',{waitUntil:'domcontentloaded'});await p.getByText('All verified demo menus loaded').waitFor();await p.waitForTimeout(550);await capture('catalog');
    await p.evaluate(()=>document.documentElement.classList.add('dark'));await capture('catalog-dark');
    await p.goto(base+'/tests/l3-p3-navigation-fixture.html',{waitUntil:'domcontentloaded'});await p.getByTestId('p3-ready').waitFor();await p.waitForTimeout(550);await capture('navigation');
    const timing=await p.evaluate(async()=>{const target=document.querySelector('#nav-tab-discover');const t=performance.now();target.click();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {elapsedMs:Math.round(performance.now()-t),observed:document.querySelector('[data-testid=screen-name]').textContent};});assert.equal(timing.observed,'discover');
    await p.locator('#nav-tab-home').click();
    const cart=p.getByRole('button',{name:/View shopping cart/});await cart.waitFor();const cb=await cart.boundingBox(),nb=await p.locator('#persistent-bottom-navigation').boundingBox();
    await cart.focus();
    const opened=await cart.evaluate(async el=>{const start=performance.now();el.click();let last='',stable=0,first=null;while(performance.now()-start<1800){await new Promise(requestAnimationFrame);const d=document.querySelector('[role=dialog]');if(!d)continue;if(first===null)first=performance.now()-start;const r=d.getBoundingClientRect(),s=[r.x,r.y,r.width,r.height].map(n=>Math.round(n*10)/10).join(',');stable=s===last?stable+1:0;last=s;if(stable>=5)return {firstMs:Math.round(first),settledMs:Math.round(performance.now()-start),stable:true};}return {firstMs:first,settledMs:null,stable:false};});
    await p.getByRole('dialog',{name:'Your pickup cart'}).waitFor();await capture('cart');const focusInside=await p.evaluate(()=>!!document.activeElement?.closest('[role=dialog]'));await p.keyboard.press('Shift+Tab');const focusTrapped=await p.evaluate(()=>!!document.activeElement?.closest('[role=dialog]'));await p.keyboard.press('Escape');await p.getByRole('dialog',{name:'Your pickup cart'}).waitFor({state:'hidden'});const restored=await p.evaluate(()=>document.activeElement?.getAttribute('aria-label')?.startsWith('View shopping cart'));
    await p.locator('#trigger-test-notice').click();await p.getByTestId('global-notification-toast').waitFor();await capture('notice');
    await p.getByRole('button',{name:'Dismiss notification'}).click();
    const report={width,mode,navTwoFrameMs:timing.elapsedMs,cartOpened:opened,cartNavGap:nb.y-cb.y-cb.height,focusInside,focusTrapped,focusRestored:restored,blockedExternalHosts:[...external],writes: writes.length,errors};writeFileSync(join(out,'customer-'+key+'-interaction.json'),JSON.stringify(report,null,2));console.log('UX01_INTERACTION '+JSON.stringify(report));assert.equal(writes.length,0);assert.deepEqual(errors,[]);assert.equal(focusInside,true);assert.equal(focusTrapped,true);assert.equal(restored,true);
   }finally{await ctx.close();}
  }
 }finally{await browser?.close();await server.close();}
}else if(component==='Merchant'){
 // Instrument copies of accepted synthetic harnesses only. The actual app source and gates remain untouched.
 const helper=JSON.stringify(new URL('./ux01-measure.mjs',import.meta.url).href),outLiteral=JSON.stringify(out);
 const instrumentation='\n const {scan,summarize}=await import('+helper+'); const {writeFileSync}=await import("node:fs");\n const uxCapture=async label=>{await delay(550);const data=await evaluate("("+scan.toString()+")()");writeFileSync('+outLiteral+'+"/"+label+".json",JSON.stringify(data,null,2));console.log("UX01_MEASURE "+label+" "+JSON.stringify(summarize(data)));if(label.endsWith("-tour")){const targets=data.controls.filter(x=>["Skip tour","Skip Walkthrough","Let\u0027s Go"].includes(x.label));assert.equal(targets.length,3);assert.ok(targets.every(x=>x.w>=44&&x.h>=44&&x.centerHit),JSON.stringify(targets));}const png=await cdp("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});writeFileSync('+outLiteral+'+"/"+label+".png",Buffer.from(png.data,"base64"));};\n';
 const original='tests/l4-r2a1-mounted-onboarding-browser.mjs';
 let source=readFileSync(original,'utf8');
 const marker=' const state=()=>evaluate(\'harness.state()\');';assert.ok(source.includes(marker));source=source.replace(marker,instrumentation+marker);
 const hook="  await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:1,mobile:true});".trim();assert.ok(source.includes(hook));
 source=source.replace(hook,`for(const [width,height] of [[320,640],[390,844],[768,1024],[1366,900]])for(const mode of ['no-preference','reduce']){
   await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
   await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:mode}]});
   await evaluate("harness.mount('ok')");await until(s=>s.text.includes('Shop name')||s.text.includes('Business name')||s.text.includes('Create'));await uxCapture('merchant-'+width+'-'+mode+'-registration');
   await evaluate("harness.mount('tour')");await until(s=>s.text.includes('Welcome to LocalEats Merchant'));await uxCapture('merchant-'+width+'-'+mode+'-tour');
  }
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  `+hook);
 // No wait for specific heading during registration: mount is synchronous via fixture flushSync.
 source=source.replace("await until(s=>s.text.includes('Shop name')||s.text.includes('Business name')||s.text.includes('Create'));","");
 const temp='tests/.ux01-mounted-temp.mjs';writeFileSync(temp,source);
 try{const child=spawnSync(process.execPath,[temp],{stdio:'inherit'});assert.equal(child.status,0);}finally{rmSync(temp,{force:true});}
 const tags='tests/l4-h1d3-order-tags-browser.mjs';let tagSource=readFileSync(tags,'utf8');
 const start=tagSource.indexOf(' // CDP Enter needs'),end=tagSource.indexOf('}catch(error){',start);assert.ok(start>0&&end>start);
 tagSource=tagSource.slice(0,start)+instrumentation+`
 for(const width of [320,390,768,1366])for(const dark of [false,true]){
   await cdp('Emulation.setDeviceMetricsOverride',{width,height:320,deviceScaleFactor:1,mobile:false});
   await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:dark?'dark':'light'}]});
   await evaluate('window.harness.mount("new",["Rush","VIP","Special"],'+dark+')');
   await uxCapture('merchant-'+width+'-'+(dark?'dark':'light')+'-quick-tags');
 }
 `+tagSource.slice(end);
 const t='tests/.ux01-tags-temp.mjs';writeFileSync(t,tagSource);try{const child=spawnSync(process.execPath,[t],{stdio:'inherit'});assert.equal(child.status,0);}finally{rmSync(t,{force:true});}
}else throw Error('Unknown component');
