import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const sites = [
  ["customer", "https://localeats-original-customer-preview.pages.dev/"],
  ["merchant", "https://localeats-original-merchant-preview.pages.dev/"]
];
mkdirSync("artifacts/preview", {recursive:true});
const browser = await chromium.launch({headless:true, args:["--no-sandbox"]});
let errors=0;
try {
 for(const [name,url] of sites) {
  for(const width of [390,1280]) {
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
   try {
    const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
    if(!response || response.status()!==200)throw Error("HTTP "+response?.status());
    const csp=response.headers()["content-security-policy"]??"";
    if(!csp.includes("connect-src 'none'"))throw Error("Missing no-network CSP");
    if(!csp.includes("frame-ancestors 'none'"))throw Error("Missing frame protection");
    await page.locator("#root > *").first().waitFor({state:"attached",timeout:22000});
    await page.waitForTimeout(1800);
    const details=await page.evaluate(()=>({title:document.title,rootChildren:document.querySelector("#root")?.childElementCount,visibleText:document.body.innerText.replace(/\\s+/g," ").slice(0,160),horizontalOverflow:document.documentElement.scrollWidth-innerWidth}));
    await page.screenshot({path:`artifacts/preview/${name}-${width}.png`,fullPage:false});
    console.log("HOSTED_ORIGINAL_UI_PASS",JSON.stringify({name,width,details}));
    if(details.horizontalOverflow>4)console.log("REVIEW_OVERFLOW",name,width,details.horizontalOverflow);
   } catch(e) {
    errors++;console.error("HOSTED_ORIGINAL_UI_FAIL",name,width,e.message);
   } finally {await page.close();}
  }
 }
} finally {await browser.close();}
if(errors)process.exitCode=1;
