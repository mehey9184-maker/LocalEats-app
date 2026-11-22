/**
 * Real React ShopCard/MenuItemCard + source reader, synthetic in-memory API.
 * Never signs in, requests real GPS, creates orders or reaches a real backend.
 * Screenshots are isolated UI fixtures, NOT Production acceptance evidence.
 */
import {chromium} from "playwright";
import {createServer} from "vite";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import {tmpdir} from "node:os";

const root=fileURLToPath(new URL("..",import.meta.url));
const dir=process.env.L3_P1_ARTIFACT_DIR||path.join(tmpdir(),"localeats-l3-p1-home");
await mkdir(dir,{recursive:true});
const server=await createServer({root,configFile:path.join(root,"vite.config.ts"),
 server:{host:"127.0.0.1",port:0}});
let browser;
const pixel=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/B7sAAAAASUVORK5CYII=","base64");
try{
 await server.listen();
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[390,844],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,
   isMobile:width<500,hasTouch:width<500,reducedMotion:"reduce",serviceWorkers:"block",permissions:[]});
  const imageWidths=[],outbound=[],writes=[];
  await context.route("**/*",async route=>{
   const request=route.request(),url=new URL(request.url());
   if(request.method()!=="GET" && request.method()!=="HEAD")writes.push(request.url());
   if(url.hostname==="127.0.0.1")return route.continue();
   if(url.hostname==="images.weserv.nl"){
     imageWidths.push(url.searchParams.get("w"));
     return route.fulfill({status:200,contentType:"image/png",body:pixel});
   }
   outbound.push(url.origin+url.pathname);
   return route.abort();
  });
  const page=await context.newPage(),errors=[];
  page.setDefaultTimeout(15000);
  page.on("pageerror",err=>errors.push(String(err)));
  await page.goto(base+"/tests/l3-p1-home-fixture.html",{waitUntil:"domcontentloaded"});
  await page.getByTestId("shop-fast-shop").waitFor();
  const firstStats=await page.evaluate(()=>window.__l3p1BrowserStats?.());
  assert.ok(firstStats && firstStats.firstCardMs!==null && firstStats.finishedMs===null,
    "First verified shop must appear before the slow menu has completed.");
  assert.equal(firstStats.menuRequests,2);
  await page.screenshot({path:path.join(dir,`01-first-verified-${width}.png`),fullPage:true});
  await page.getByText("All verified demo menus loaded").waitFor();
  assert.equal(await page.getByTestId("shop-slow-shop").count(),1);
  const finalStats=await page.evaluate(()=>window.__l3p1BrowserStats?.());
  assert.ok(finalStats.finishedMs>finalStats.firstCardMs+350,
    `Progressive first-card latency not distinguishable: ${JSON.stringify(finalStats)}`);
  // A real uploaded menu photo uses 160px for the 80px thumbnail;
  // the original shop-hero image is still eligible for 600px.
  await page.locator('[aria-label="Verified shop cards"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  assert.ok(imageWidths.includes("160"),`Missing 160px thumbnail request: ${imageWidths}`);
  assert.ok(imageWidths.includes("600"),`Missing existing 600px hero request: ${imageWidths}`);
  assert.equal(await page.getByText("No rating available").count()>=1,true);
  assert.equal(await page.getByText("Location needed").count()>=1,true);
  assert.equal(await page.getByText("Browse menu only").count()>=1,true);
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(dims.scroll<=dims.viewport+1,`Horizontal overflow at ${width}: ${JSON.stringify(dims)}`);
  await page.screenshot({path:path.join(dir,`02-complete-${width}.png`),fullPage:true});
  await page.getByLabel("Data Saver preview").check();
  await page.getByText("[ Image Hidden - Data Saver ]").first().waitFor();
  await page.screenshot({path:path.join(dir,`03-data-saver-${width}.png`),fullPage:true});
  await page.getByTestId("shop-fast-shop").getByText("R25 Demo Kota").click();
  await page.getByText(/Location needed: You can browse real menus/).waitFor();
  assert.deepEqual(writes,[],"Isolated test must not submit any writes");
  assert.equal(outbound.some(u=>/identitytoolkit|supabase|api\/v1\/orders|api\/v1\/catalog/i.test(u)),false);
  assert.deepEqual(errors,[],`React runtime errors at ${width}px`);
  console.log(`L3_P1_BROWSER_PASS width=${width} first_ms=${Math.round(finalStats.firstCardMs)} finish_ms=${Math.round(finalStats.finishedMs)} verified_shops=2 menu_requests=2 image_px=160,600 no_writes=true`);
  await context.close();
 }
 console.log("L3_P1_ISOLATED_BROWSER_ALL_PASS");
}finally{
 await browser?.close();
 await server.close();
}
