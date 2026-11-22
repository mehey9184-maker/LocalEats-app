import {chromium} from "playwright";
import {createServer} from "vite";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import {mkdir} from "node:fs/promises";
import path from "node:path";
import {tmpdir} from "node:os";

/**
 * Simulates the real React screens from Welcome to Home.
 * Never presses the actual account-creation button or authenticates.
 * A fixture-local transition stands in for server-side signup success.
 */
const root=fileURLToPath(new URL("..",import.meta.url));
const dir=process.env.SIGNUP_UX_ARTIFACT_DIR||path.join(tmpdir(),"localeats-signup-ux");
await mkdir(dir,{recursive:true});
const server=await createServer({root,configFile:path.join(root,"vite.config.ts"),server:{host:"127.0.0.1",port:0}});
let browser;
try {
 await server.listen();
 const base=`http://127.0.0.1:${server.httpServer.address().port}`;
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[390,844],[320,568]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,
    serviceWorkers:"block",permissions:[],reducedMotion:"reduce"});
  const outbound=[];
  await context.route("**/*",route=>{
   const url=new URL(route.request().url());
   if(url.hostname==="127.0.0.1")return route.continue();
   outbound.push(url.origin+url.pathname);
   return route.abort();
  });
  const page=await context.newPage();
  page.setDefaultTimeout(13000);
  const errors=[];
  page.on("pageerror",err=>errors.push(String(err)));
  await page.goto(base+"/tests/signup-home-ux-fixture.html",{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:/Find your next legendary kota/i}).waitFor();
  await page.getByRole("button",{name:/Explore local food/}).waitFor();
  await page.screenshot({path:path.join(dir,`01-welcome-${width}.png`),fullPage:true});
  await page.getByRole("button",{name:"Create an account"}).click();
  await page.getByRole("heading",{name:"Let's get you set up."}).waitFor();
  await page.getByText("Step 1 of 2").waitFor();
  await page.getByRole("button",{name:"Continue to password"}).click();
  await page.getByText("Enter your full name").waitFor();
  await page.getByLabel("Full name").fill("Thando Mokoena");
  await page.getByLabel("Email address").fill("not-an-email");
  await page.getByLabel("Phone number").click();
  await page.getByText("Enter a valid email address").waitFor();
  await page.getByLabel("Email address").fill("thando@example.com");
  await page.getByLabel("Phone number").fill("0712345678");
  await page.screenshot({path:path.join(dir,`02-signup-${width}.png`),fullPage:true});
  await page.getByRole("button",{name:"Continue to password"}).click();
  await page.getByRole("heading",{name:/Make it yours,\\s*keep it secure/i}).waitFor();
  await page.getByText("Step 2 of 2").waitFor();
  assert.equal(await page.getByRole("button",{name:"Create account"}).isDisabled(),true);
  await page.getByLabel("Password",{exact:true}).fill("my-long-pass123");
  await page.getByLabel("Confirm password").fill("my-long-pass123");
  await page.getByRole("button",{name:"Show password"}).click();
  assert.equal(await page.getByLabel("Password",{exact:true}).getAttribute("type"),"text");
  await page.screenshot({path:path.join(dir,`03-password-${width}.png`),fullPage:true});
  // Fixture-only success bypass. Do NOT invoke supabase.auth.signUp.
  await page.evaluate(()=>window.__localeatsSimulateSubmission?.());
  await page.getByRole("heading",{name:"Check your inbox."}).waitFor();
  await page.getByText("thando@example.com").waitFor();
  await page.screenshot({path:path.join(dir,`04-verify-${width}.png`),fullPage:true});
  await page.getByRole("button",{name:/Browse menus for now/}).click();
  await page.getByRole("heading",{name:"Explore local kitchens."}).waitFor();
  await page.getByText("Location needed to order",{exact:true}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Home",exact:true}).count(),1);
  assert.equal(await page.getByRole("button",{name:"Discover",exact:true}).count(),1);
  assert.equal(await page.getByRole("button",{name:"Map",exact:true}).count(),1);
  assert.equal(await page.getByRole("button",{name:"Orders",exact:true}).count(),1);
  assert.equal(await page.getByRole("button",{name:"Profile",exact:true}).count(),1);
  await page.screenshot({path:path.join(dir,`05-home-${width}.png`),fullPage:true});
  const size=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:window.innerWidth}));
  assert.ok(size.doc<=size.viewport+1,`Horizontal overflow ${width}px: ${JSON.stringify(size)}`);
  assert.deepEqual(errors,[],`Browser runtime error: ${width}px`);
  assert.equal(outbound.some(u=>/supabase.*auth|firebase.*identity|api\/v1\/orders|\/signup/i.test(u)),false,
    "No authentication, orders, or account requests were made");
  console.log(`SIGNUP_TO_HOME_UX_PASS width=${width} no_account_created=true`);
  // Test the QR-style guest route independently.
  await page.reload({waitUntil:"domcontentloaded"});
  await page.getByRole("button",{name:/Explore local food/}).click();
  await page.getByRole("heading",{name:"Explore local kitchens."}).waitFor();
  await context.close();
 }
 console.log("SIGNUP_TO_HOME_UX_ISOLATED_BROWSER_PASS");
} finally {
 await browser?.close();
 await server.close();
}
