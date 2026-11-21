/**
 * L3-N8U-Y local/browser contract, NOT a real Customer sign-in or paired API Preview.
 * 320px/390px Chromium checks actual ShopCard/MenuItemCard, synthetic menu,
 * CSS layout and disabled no-GPS/outside-4-km actions; no spoofed GPS.
 */
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('..',import.meta.url));
const server=await createServer({root,configFile:path.join(root,'vite.config.ts'),server:{host:'127.0.0.1',port:0}});
let browser;
try {
 await server.listen();
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true});
 for(const width of [320,390]){
  for(const mode of ['no-gps','outside']){
   const context=await browser.newContext({viewport:{width,height:720},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce',permissions:[]});
   // No Production/API/Firebase/image/font calls; only the isolated Vite fixture.
   await context.route('**/*',route=>{
     const url=new URL(route.request().url());
     return url.hostname==='127.0.0.1'?route.continue():route.abort();
   });
   const page=await context.newPage();
   page.setDefaultTimeout(10000);
   const errors=[];
   page.on('pageerror',err=>errors.push(String(err)));
   await page.goto(base+`/tests/pilot-mobile-fixture.html?mode=${mode}`,{waitUntil:'domcontentloaded'});
   const card=page.locator('[data-testid="shop-card"] [role="button"]');
   await card.waitFor();
   assert.match(await card.getAttribute('aria-label'),mode==='no-gps'?/Location needed to order[.] Browse menu only/:/Outside the 4 kilometer pickup area[.] Browse menu only/);
   assert.equal(await page.getByText('No rating available').count(),1);
   assert.equal(await page.getByText('4.8',{exact:true}).count(),0,'Never display unsubstantiated rating');
   assert.equal(await page.getByText('POPIA Safe',{exact:true}).count(),0);
   assert.equal(await page.locator('[title="Pickup kitchen"]').count(),0);
   await card.click();
   await page.locator('[data-testid="shop-menu"]').waitFor();
   assert.match(await page.locator('[data-testid="shop-menu"]').innerText(),/CHEEZE, PALONE AND MEAT/);
   assert.match(await page.locator('[data-testid="shop-menu"]').innerText(),/R\s*25[.]00/);
   const button=page.locator('[data-testid="shop-menu"] button');
   await button.waitFor();
   assert.match(await button.innerText(),mode==='no-gps'?/LOCATION NEEDED/i:/OUTSIDE AREA/i);
   await button.click();
   assert.match(await page.locator('[data-testid="notice"]').innerText(),mode==='no-gps'?/Location needed/:/Outside your pickup area/);
   assert.equal(await page.locator('[data-testid="cart-add-count"]').innerText(),'0');
   assert.equal(await page.locator('[data-testid="item-selection-count"]').innerText(),'0');
   const geometry=await page.evaluate(()=>{
     const selectors=['[data-testid="pilot-root"]','[data-testid="shop-card"]','[data-testid="shop-menu"]','[data-testid="shop-menu"] button'];
     return {viewport:window.innerWidth,documentWidth:document.documentElement.scrollWidth,boxes:selectors.map(s=>{
       const el=document.querySelector(s);const box=el?.getBoundingClientRect();
       return {selector:s,left:box?.left,right:box?.right,width:box?.width};
     })};
   });
   assert.ok(geometry.documentWidth<=geometry.viewport+1,`Horizontal scroll at ${width}/${mode}: ${JSON.stringify(geometry)}`);
   for(const box of geometry.boxes){
     assert.ok(box.left!==undefined && box.left>=-1 && box.right<=geometry.viewport+1,`Clipped ${box.selector} at ${width}/${mode}: ${JSON.stringify(geometry)}`);
   }
   assert.deepEqual(errors,[],`Unexpected JS exceptions at ${width}/${mode}`);
   console.log(`PILOT_MOBILE_COMPONENT_PASS width=${width} mode=${mode} cartAdds=0`);
   await context.close();
  }
 }
 console.log('L3_N8U_Y_COMPONENT_BROWSER_PASS');
} finally {
 await browser?.close();
 await server.close();
}
