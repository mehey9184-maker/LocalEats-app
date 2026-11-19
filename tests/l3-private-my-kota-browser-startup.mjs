import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {setTimeout as delay} from "node:timers/promises";
import {chromium} from "playwright";

// Local browser-only startup gate: no credentials, backend writes or cloud push.
// A TypeScript/build pass does not establish that React can mount.
const base="http://127.0.0.1:4179";
const vite=spawn(process.execPath,["node_modules/vite/bin/vite.js","preview","--host","127.0.0.1","--port","4179","--strictPort"],{
  cwd:process.cwd(),stdio:["ignore","pipe","pipe"],env:process.env
});
let stderr="";
vite.stderr.on("data",buf=>{stderr+=String(buf).slice(0,2000);});
let browser;
try{
  let started=false;
  for(let i=0;i<80;i++){
    if(vite.exitCode!==null)throw new Error("Vite preview stopped: "+stderr.slice(-300));
    try{const r=await fetch(base);if(r.ok){started=true;break;}}catch{}
    await delay(150);
  }
  assert.ok(started,"The private staging Vite build must be previewable");
  browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  for(const caseName of ["fresh","invalid-cart","invalid-preferences"]){
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"});
    await context.route("**/*",route=>{
      const url=new URL(route.request().url());
      return url.hostname==="127.0.0.1" ? route.continue() : route.abort("blockedbyclient");
    });
    const page=await context.newPage();
    const errors=[];
    page.on("pageerror",err=>errors.push("pageerror: "+String(err.message).slice(0,450)));
    page.on("console",msg=>{
      if(msg.type()==="error" && /Uncaught error:|Cannot access|Maximum update depth|Invalid hook call|Objects are not valid|reading '.*'/.test(msg.text()))
        errors.push("console: "+msg.text().slice(0,450));
    });
    if(caseName!=="fresh"){
      await page.addInitScript(name=>{
        if(name==="invalid-cart")localStorage.setItem("cart",'{invalid json');
        if(name==="invalid-preferences")localStorage.setItem("userProfile",'{invalid json');
      },caseName);
    }
    const response=await page.goto(base,{waitUntil:"domcontentloaded",timeout:30000});
    assert.equal(response?.status(),200,caseName+" must serve HTML");
    await page.waitForTimeout(4000);
    const boundary=await page.getByText("Something went wrong",{exact:true}).count();
    if(boundary || errors.length)throw new Error(
      "Private My-Kota browser startup failed ["+caseName+"] boundary="+boundary+
      " error="+JSON.stringify(errors.slice(0,4))
    );
    const body=await page.locator("body").innerText();
    assert.ok(body.length>30,"Expected React UI to mount: "+caseName);
    console.log("L3_MYKOTA_BROWSER_STARTUP_OK",caseName);
    await context.close();
  }
}finally{
  await browser?.close();
  vite.kill("SIGTERM");
}
