import {chromium} from "playwright";
import {createServer} from "vite";
import {fileURLToPath} from "node:url";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import {tmpdir} from "node:os";
import assert from "node:assert/strict";

/** The real LoginScreen and AppNotificationToast, but no auth/network writes. */
const root=fileURLToPath(new URL("..",import.meta.url));
const shots=process.env.LOGIN_FEEDBACK_SCREENSHOTS||path.join(tmpdir(),"localeats-login-feedback");
await mkdir(shots,{recursive:true});
const server=await createServer({root,configFile:path.join(root,"vite.config.ts"),server:{host:"127.0.0.1",port:0}});
let browser;
try {
 await server.listen();
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true});
 for(const width of [320,390,1440]){
  const height=width===320?568:width===390?844:900;
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,
   hasTouch:width<500,serviceWorkers:"block",permissions:[],reducedMotion:"reduce"});
  const outbound=[];
  await context.route("**/*",route=>{
   const url=new URL(route.request().url());
   if(url.hostname==="127.0.0.1")return route.continue();
   outbound.push(url.origin+url.pathname);
   return route.abort();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(12000);
  const errors=[];
  page.on("pageerror",err=>errors.push(String(err)));
  await page.goto(base+"/tests/login-feedback-fixture.html",{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:/Welcome Back/i}).waitFor();
  const apple=page.locator("#apple-oauth-btn");
  assert.equal(await apple.isDisabled(),true,"Apple OAuth must remain unavailable until configured");
  assert.match(await apple.innerText(),/Continue with Apple/);
  assert.match(await apple.innerText(),/Coming soon/);
  assert.equal(await apple.locator("svg path").count(),1,"Apple branding uses genuine SVG, not Lucide fruit");
  await page.locator("#login-submit-btn").waitFor();
  await page.screenshot({path:path.join(shots,`01-login-${width}.png`),fullPage:true});
  await page.locator("#trigger-test-notice").click();
  const toast=page.locator('[data-testid="global-notification-toast"]');
  await toast.waitFor();
  // Motion animates from y=-24. Verify the settled, fully visible toast,
  // not its transient first animation frame.
  await page.waitForFunction(()=>{
   const el=document.querySelector('[data-testid="global-notification-toast"]');
   const r=el?.getBoundingClientRect();
   return Boolean(r && r.top>=0 && r.top<110 && r.height<240);
  },null,{timeout:5000});
  const box=await toast.boundingBox();
  assert.ok(box && box.y>=0 && box.y<110,`Transient toast must be at top of ${width}px viewport: ${JSON.stringify(box)}`);
  assert.ok(box.x>=-1&&box.x+box.width<=width+1,`Toast clipped horizontally: ${JSON.stringify(box)}`);
  assert.ok(await page.getByText("This is a synthetic on-screen notification.").isVisible());
  await page.screenshot({path:path.join(shots,`02-top-notification-${width}.png`),fullPage:false});
  await page.getByRole("button",{name:"Dismiss notification"}).click();
  await page.locator("#trigger-test-persistent").click();
  await page.getByText("This is a synthetic centered prompt.").waitFor();
  const overlay=await page.locator('[data-testid="global-notification-container"]').boundingBox();
  assert.ok(overlay && overlay.height>=height-1,`Persistent notice must still use full screen: ${JSON.stringify(overlay)}`);
  await page.getByRole("button",{name:"Dismiss prompt"}).click();
  await page.getByRole("heading",{name:/Welcome Back/i}).waitFor();
  const w=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(w.document<=w.viewport+1,`Horizontal document overflow ${width}px: ${JSON.stringify(w)}`);
  assert.deepEqual(errors,[],`Browser runtime errors at ${width}px`);
  assert.equal(outbound.some(x=>/identitytoolkit|securetoken|\/api\/v1\/orders|\/signup/.test(x)),false,
   "No authentication or ordering requests");
  console.log(`LOGIN_APPLE_TOP_TOAST_PASS width=${width} no_auth=true`);
  await context.close();
 }
 console.log("LOGIN_APPLE_TOP_TOAST_BROWSER_PASS");
} finally {
 await browser?.close();
 await server.close();
}
