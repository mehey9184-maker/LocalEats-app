/** L3-P3 isolated browser test using the real customer components.
 * All data are synthetic. No account, server, order, GPS or photo fetch.
 */
import {chromium} from "playwright";
import assert from "node:assert/strict";
import {createServer} from "vite";
import {fileURLToPath} from "node:url";
import {mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";

const root=fileURLToPath(new URL("..",import.meta.url));
const dir=process.env.L3_P3_ARTIFACT_DIR||path.join(tmpdir(),"localeats-l3-p3");
await mkdir(dir,{recursive:true});
const server=await createServer({root,configFile:path.join(root,"vite.config.ts"),
 server:{host:"127.0.0.1",port:0}});
let browser;
try{
 await server.listen();
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 const warm=await fetch(base+"/tests/l3-p3-navigation-fixture.tsx");
 assert.equal(warm.status,200,"P3 fixture must compile.");
 const module=await warm.text();
 assert.match(module,/createRoot/);
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[390,844],[1440,900]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,
   isMobile:width<500,hasTouch:width<500,reducedMotion:"reduce",
   serviceWorkers:"block",permissions:[]});
  const writes=[],outbound=[];
  await ctx.route("**/*",route=>{
   const req=route.request(),url=new URL(req.url());
   if(!["GET","HEAD"].includes(req.method()))writes.push(req.url());
   if(url.hostname==="127.0.0.1")return route.continue();
   if(url.hostname==="fonts.googleapis.com")
     return route.fulfill({status:200,contentType:"text/css",body:""});
   outbound.push(url.origin);
   return route.abort();
  });
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(String(err)));
  page.setDefaultTimeout(15000);
  await page.goto(base+"/tests/l3-p3-navigation-fixture.html",{waitUntil:"domcontentloaded"});
  await page.getByTestId("p3-ready").waitFor();
  assert.equal(await page.locator("nav#persistent-bottom-navigation button").count(),5);
  assert.equal(await page.getByTestId("nav-moves").innerText(),"0");
  await page.locator("#nav-tab-home").click();
  assert.equal(await page.getByTestId("nav-moves").innerText(),"0","Active tab must not reroute Home.");
  assert.equal(await page.getByTestId("haptics").innerText(),"0","Active tab must not vibrate.");
  await page.locator("#nav-tab-discover").click();
  assert.equal(await page.getByTestId("screen-name").innerText(),"discover");
  assert.equal(await page.getByTestId("nav-moves").innerText(),"1");
  assert.equal(await page.getByTestId("haptics").innerText(),"1");
  assert.equal(await page.locator('#nav-tab-discover[aria-current="page"]').count(),1);
  await page.locator("#nav-tab-discover").click();
  assert.equal(await page.getByTestId("nav-moves").innerText(),"1");
  const orders=page.getByRole("button",{name:"Orders, 2 active pickups"});
  assert.equal(await orders.count(),1);
  await orders.click();
  assert.equal(await page.getByTestId("screen-name").innerText(),"order-tracking");
  assert.equal(await page.getByTestId("nav-moves").innerText(),"2");
  await page.locator("#nav-tab-orders").click();
  assert.equal(await page.getByTestId("nav-moves").innerText(),"2");
  await page.locator("#nav-tab-home").click();
  assert.equal(await page.getByTestId("nav-moves").innerText(),"3");
  // The floating cart is not a checkout quote; label is explicitly estimated.
  const cart=page.getByRole("button",{name:/View shopping cart: 1 item, estimated subtotal R 25\.00/i});
  await cart.waitFor();
  assert.match(await cart.innerText(),/Est. R 25\.00/);
  await page.screenshot({path:path.join(dir,`01-navigation-${width}.png`),fullPage:false});
  await cart.click();
  const dialog=page.getByRole("dialog",{name:"Your pickup cart"});
  await dialog.waitFor();
  assert.equal(await dialog.getAttribute("aria-modal"),"true");
  assert.equal(await page.evaluate(()=>document.activeElement?.closest('[role="dialog"]')!==null),true,
   "Opening pickup cart must move keyboard focus inside the sheet.");
  assert.equal(await dialog.getByRole("button",{name:"Close sheet"}).count(),2);
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.evaluate(()=>document.activeElement?.closest('[role="dialog"]')!==null),true,
   "Shift+Tab must stay in the dialog.");
  await page.screenshot({path:path.join(dir,`02-dialog-${width}.png`),fullPage:false});
  await page.keyboard.press("Escape");
  await dialog.waitFor({state:"hidden"});
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute("aria-label")?.startsWith("View shopping cart")),true,
   "Escape must return keyboard focus to the cart trigger.");
  await page.locator("#trigger-test-notice").click();
  const notice=page.getByTestId("global-notification-toast");
  await notice.waitFor();
  assert.equal(await notice.getAttribute("role"),"status");
  const pos=await notice.boundingBox();
  assert.ok(pos && pos.y>=0 && pos.y<160,`Feedback must appear at top, not bottom: ${JSON.stringify(pos)}`);
  await page.screenshot({path:path.join(dir,`03-top-feedback-${width}.png`),fullPage:false});
  await page.getByRole("button",{name:"Dismiss notification"}).click();
  await page.locator("#trigger-test-persistent").click();
  const prompt=page.getByRole("alertdialog",{name:"LocalEats confirmation"});
  await prompt.waitFor();
  assert.equal(await prompt.getAttribute("aria-modal"),"true");
  await page.getByRole("button",{name:"Confirm demo"}).click();
  await prompt.waitFor({state:"hidden"});
  const dims=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(dims.scroll<=dims.viewport+1,`Unexpected horizontal overflow at ${width}px: ${JSON.stringify(dims)}`);
  assert.deepEqual(writes,[],"P3 must not make real orders or settings writes");
  assert.equal(outbound.some(o=>/supabase|firebase|api\.|images\.weserv/.test(o)),false);
  assert.deepEqual(errors,[],`React errors at ${width}px`);
  console.log(`L3_P3_BROWSER_PASS width=${width} no_duplicate_tab_actions=true focus_trapped=true focus_restored=true reduced_motion=true top_feedback=true no_writes=true`);
  await ctx.close();
 }
 console.log("L3_P3_BROWSER_ALL_PASS");
}finally{
 await browser?.close();
 await server.close();
}
