import assert from "node:assert/strict";
import path from "node:path";
import {tmpdir} from "node:os";
import {mkdir} from "node:fs/promises";
import {chromium} from "playwright";
import {createServer} from "vite";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const out=process.env.L3_BROWSER_ARTIFACT_DIR || path.join(tmpdir(),"localeats-l3-welcome");
await mkdir(out,{recursive:true});
const server=await createServer({
  root,configFile:path.join(root,"vite.config.ts"),
  server:{host:"127.0.0.1",port:0,hmr:false},
});
await server.listen();
const url="http://127.0.0.1:"+server.httpServer.address().port+"/tests/l3-popia-welcome-fixture.html";
let browser;
const results=[];
try {
  browser=await chromium.launch({headless:true,...(process.env.L3_BROWSER_CHANNEL?{channel:process.env.L3_BROWSER_CHANNEL}:{})});
  for(const variant of [
    {width:390,height:844,fontScale:1},
    {width:320,height:650,fontScale:1},
    {width:320,height:568,fontScale:1},
    {width:320,height:650,fontScale:2},
  ]) {
    const context=await browser.newContext({
      viewport:{width:variant.width,height:variant.height},
      deviceScaleFactor:1,hasTouch:true,isMobile:true,
      reducedMotion:"reduce",serviceWorkers:"block",
    });
    await context.route("**/*",route=>{
      const u=new URL(route.request().url());
      return u.hostname==="127.0.0.1" ? route.continue() : route.abort();
    });
    const page=await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(url,{waitUntil:"domcontentloaded"});
    if(variant.fontScale===2) {
      await page.addStyleTag({content:"html {font-size:32px!important}"});
    }
    const notice=page.getByRole("region",{name:"Privacy notice"});
    await notice.waitFor({state:"visible"});
    await page.waitForTimeout(100); // allow ResizeObserver to publish measured height
    const before=await page.evaluate(()=>{
      const bar=document.getElementById("popia-legal-bar");
      return {
        barHeight:Math.ceil(bar.getBoundingClientRect().height),
        measured:getComputedStyle(document.documentElement).getPropertyValue("--localeats-popia-notice-height").trim(),
        consent:localStorage.getItem("localeats_popia_consent"),
        horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+1,
      };
    });
    assert.equal(before.consent,null,"First visit must not auto-accept POPIA");
    assert.equal(before.horizontalOverflow,false,"No horizontal scrollbars at narrow viewport");
    assert.equal(before.measured,String(before.barHeight)+"px","Measured POPIA height must reflect the actual bar");
    const geometry=await page.evaluate(()=>{
      const rect=selector=>{
        const el=document.querySelector(selector),r=el?.getBoundingClientRect();
        return r ? {top:r.top,bottom:r.bottom,height:r.height,scrollHeight:el.scrollHeight,overflowY:getComputedStyle(el).overflowY,paddingBottom:getComputedStyle(el).paddingBottom} : null;
      };
      return {
        viewportHeight:innerHeight,
        docScrollHeight:document.documentElement.scrollHeight,
        bodyScrollHeight:document.body.scrollHeight,
        main:rect(".customer-welcome-shell"), actions:rect(".customer-welcome-actions"),
        started:rect("button.bg-brand-orange"),notice:rect("#popia-legal-bar"),
      };
    });
    console.log("L3_LAYOUT_GEOMETRY",JSON.stringify({...variant,...geometry}));
    await page.screenshot({path:path.join(out,"before-"+variant.width+"-"+variant.height+"-font"+variant.fontScale+".png"),fullPage:true});
    for(const name of ["Get Started","Explore as Guest","Log In"]) {
      const button=page.getByRole("button",{name,exact:true});
      await button.click({trial:true,timeout:15000}); // actual pointer hit test, scrolling allowed
      const hit=await button.evaluate(element=>{
        const b=element.getBoundingClientRect(),notice=document.getElementById("popia-legal-bar").getBoundingClientRect();
        const x=b.x+b.width/2,y=b.y+b.height/2;
        const top=document.elementFromPoint(x,y);
        return {buttonBottom:b.bottom,noticeTop:notice.top,hit:top===element||element.contains(top),scrollY:window.scrollY};
      });
      assert.ok(hit.hit,name+" must receive pointer events: "+JSON.stringify(hit));
      assert.ok(hit.buttonBottom<=(hit.noticeTop+1),name+" must remain visually above POPIA notice: "+JSON.stringify(hit));
    }
    await page.getByRole("button",{name:"Log In",exact:true}).click();
    assert.equal(await page.getByTestId("l3-login-clicks").innerText(),"1","Log In must execute without accepting the notice");
    assert.equal(await notice.count(),1,"Privacy notice remains available after opening Log In");
    assert.equal(await page.evaluate(()=>localStorage.getItem("localeats_popia_consent")),null,"No implicit privacy acceptance");
    const filename="welcome-"+variant.width+"-"+variant.height+"-font"+variant.fontScale+".png";
    await page.screenshot({path:path.join(out,filename),fullPage:true});
    await notice.getByRole("button",{name:"Accept",exact:true}).click();
    await notice.waitFor({state:"detached"});
    results.push({...variant,barHeight:before.barHeight,passed:true});
    console.log("L3_CUSTOMER_LOGIN_HIT_TEST_PASSED",JSON.stringify(variant));
    await context.close();
  }
  console.log("L3_CUSTOMER_WELCOME_ALL_VIEWPORTS_PASSED",JSON.stringify(results));
} finally {
  await browser?.close();
  await server.close();
}
