import {chromium} from "playwright";
import {createServer} from "vite";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import {tmpdir} from "node:os";

const root=fileURLToPath(new URL("..",import.meta.url));
const dir=process.env.L3_P2_ARTIFACT_DIR||path.join(tmpdir(),"localeats-l3-p2-data");
await mkdir(dir,{recursive:true});
const server=await createServer({root,configFile:path.join(root,"vite.config.ts"),
 server:{host:"127.0.0.1",port:0}});
const pixel=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/B7sAAAAASUVORK5CYII=","base64");
let browser;
try{
 await server.listen();
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[390,844]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,
   isMobile:true,hasTouch:true,reducedMotion:"reduce",serviceWorkers:"block",permissions:[]});
  let proxyRequests=0,directRequests=0;
  const blocked=[],nonGets=[];
  await ctx.route("**/*",route=>{
   const request=route.request(),url=new URL(request.url());
   if(!["GET","HEAD"].includes(request.method()))nonGets.push(request.url());
   if(url.hostname==="127.0.0.1")return route.continue();
   if(url.hostname==="images.weserv.nl"){
    proxyRequests++;
    assert.equal(url.searchParams.get("w"),"600");
    return route.fulfill({status:200,contentType:"image/png",body:pixel});
   }
   if(url.hostname==="uploads.example.invalid"){
    directRequests++;
    return route.abort();
   }
   blocked.push(url.origin);
   return route.abort();
  });
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",err=>errors.push(String(err)));
  page.setDefaultTimeout(12000);
  await page.goto(base+"/tests/l3-p2-photo-fixture.html",{waitUntil:"domcontentloaded"});
  await page.getByRole("button",{name:/Load photo: Demo Kota photo/i}).waitFor();
  await page.getByText("Previously seen shops").waitFor();
  assert.equal(await page.locator("img").count(),0,"Saved Data Saver must not mount the remote photo.");
  assert.equal(proxyRequests+directRequests,0,"No photo transfer allowed before opt-in.");
  const directory=page.getByRole("region",{name:"Last seen shops, offline reference only"});
  assert.match(await directory.innerText(),/Saved names only, not a live menu/);
  assert.match(await directory.innerText(),/Offline ordering is unavailable/);
  assert.doesNotMatch(await directory.innerText(),/R25|4\.8|0710000000|26\.0|Pickup at shop/);
  assert.equal(await directory.locator("button, a[href]").count(),0);
  await page.screenshot({path:path.join(dir,`01-data-saver-${width}.png`),fullPage:true});
  await page.getByRole("button",{name:/Load photo: Demo Kota photo/i}).click();
  await page.getByRole("img",{name:"Demo Kota photo"}).waitFor();
  await page.waitForFunction(()=>document.querySelector("img")?.complete===true);
  assert.equal(proxyRequests,1,"Explicit reveal must fetch one optimized photo.");
  assert.equal(directRequests,0,"The direct source must not be fetched before a proxy error.");
  await page.screenshot({path:path.join(dir,`02-one-photo-revealed-${width}.png`),fullPage:true});
  const box=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(box.scroll<=box.viewport+1,`Horizontal overflow at ${width}px: ${JSON.stringify(box)}`);
  assert.deepEqual(nonGets,[],"No POST or order writes are allowed in the isolated fixture.");
  assert.equal(blocked.some(host=>/firebase|supabase/.test(host)),false);
  assert.deepEqual(errors,[],`React UI errors at ${width}px`);
  console.log(`L3_P2_BROWSER_PASS width=${width} initial_image_requests=0 opt_in_proxy_requests=${proxyRequests} direct=${directRequests} offline_names_only=true no_writes=true`);
  await ctx.close();
 }
 console.log("L3_P2_BROWSER_ALL_PASS");
}finally{
 await browser?.close();
 await server.close();
}
