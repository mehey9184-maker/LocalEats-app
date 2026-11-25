// Diagnostic only. Built assets, loopback, no accounts or provider requests.
import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFileSync,existsSync,statSync} from "node:fs";
import {resolve,extname,sep} from "node:path";
import {gzipSync} from "node:zlib";
import {once} from "node:events";
import assert from "node:assert/strict";
const types={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg",".woff2":"font/woff2"};
const browser=await chromium.launch({headless:true});
try{
 for(const [component,root] of [["Customer",resolve("dist")],["Merchant",resolve(process.argv[2])]]){
  const requests=[];
  const server=createServer((req,res)=>{
   const pathname=new URL(req.url,"http://localhost").pathname;
   if(!["GET","HEAD"].includes(req.method)){res.writeHead(405);res.end();return;}
   if(pathname==="/__h4e1_lab"){res.writeHead(200,{"Content-Type":"text/html","Cache-Control":"no-store"});res.end("<!doctype html><title>Isolated worker lab</title>");return;}
   const file=resolve(root,"."+ (pathname==="/"?"/index.html":pathname));
   if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return;}
   const data=readFileSync(file),ext=extname(file);
   const compress=[".js",".css",".html",".json",".svg"].includes(ext);
   const body=compress?gzipSync(data,{level:6}):data;
   requests.push({path:pathname,bytes:req.method==="HEAD"?0:body.length});
   res.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream","Content-Length":body.length,"Cache-Control":"no-store",...(compress?{"Content-Encoding":"gzip"}:{})});res.end(req.method==="HEAD"?undefined:body);
  });
  server.listen(0,"127.0.0.1");await once(server,"listening");const base="http://127.0.0.1:"+server.address().port;
  try{
   for(let i=0;i<3;i++){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:"block",permissions:[],reducedMotion:"reduce"});
    await context.route("**/*",route=>new URL(route.request().url()).origin===base&&["GET","HEAD"].includes(route.request().method())?route.continue():route.abort());
    await context.addInitScript(()=>{
     const trace={shellSeen:null,shellRemoved:null,rootContent:null,longTasks:[],shifts:[]};
     window.__h4e1=trace;
     let hadShell=false;
     const inspect=()=>{
      const root=document.querySelector("#root"),shell=document.querySelector("#startup-shell");
      if(shell&&!hadShell){hadShell=true;trace.shellSeen=performance.now();}
      if(hadShell&&!shell&&trace.shellRemoved===null)trace.shellRemoved=performance.now();
      if(root?.children.length&&!shell&&trace.rootContent===null)trace.rootContent=performance.now();
     };
     new MutationObserver(inspect).observe(document,{childList:true,subtree:true});
     for(const [type,key] of [["longtask","longTasks"],["layout-shift","shifts"]]){
      try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)trace[key].push({start:e.startTime,duration:e.duration,value:e.value??0});}).observe({type,buffered:true});}catch{}
     }
    });
    const page=await context.newPage();let errors=0;page.on("pageerror",()=>errors++);
    const cdp=await context.newCDPSession(page);await cdp.send("Network.enable");await cdp.send("Network.setCacheDisabled",{cacheDisabled:true});await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});await cdp.send("Network.emulateNetworkConditions",{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:"cellular3g"});
    try{
     await page.goto(base,{waitUntil:"load",timeout:45000});await page.waitForTimeout(2000);
     const result=await page.evaluate(()=>{
      const nav=performance.getEntriesByType("navigation")[0],trace=window.__h4e1;
      const resources=performance.getEntriesByType("resource").filter(r=>new URL(r.name).origin===location.origin&&/\.(js|css)$/.test(new URL(r.name).pathname)).map(r=>({kind:new URL(r.name).pathname.endsWith(".css")?"css":"js",start:Math.round(r.startTime),end:Math.round(r.responseEnd),bytes:r.encodedBodySize}));
      const buttons=[...document.querySelectorAll("#root button")].filter(b=>!b.disabled&&b.getClientRects().length>0).length;
      return {fcp:Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime??0),ttfb:Math.round(nav.responseStart),htmlEnd:Math.round(nav.responseEnd),dcl:Math.round(nav.domContentLoadedEventEnd),load:Math.round(nav.loadEventEnd),shellSeen:trace.shellSeen,shellRemoved:trace.shellRemoved,rootContent:trace.rootContent,longTasks:trace.longTasks,cls:trace.shifts.reduce((s,x)=>s+x.value,0),visibleEnabledButtons:buttons,resources};
     });
     console.log("H4E1_STARTUP "+JSON.stringify({component,sample:i+1,errors,...result}));assert.equal(errors,0);assert.ok(result.fcp>0);
    }finally{await context.close();}
   }
   // Explicit registration on empty lab page measures the exact worker precache,
   // not the real app's production registration or installed device behavior.
   const context=await browser.newContext({serviceWorkers:"allow",permissions:[]});
   try{
    const page=await context.newPage();await page.goto(base+"/__h4e1_lab");
    requests.length=0;
    const install=await page.evaluate(async()=>{
     const reg=await navigator.serviceWorker.register("/sw.js",{scope:"/",type:"module"});
     await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error("worker ready timeout")),45000))]);
     // ready may resolve while an active worker is still in "activating".
     const deadline=performance.now()+45000;
     while(reg.active?.state!=="activated"){
      if(performance.now()>=deadline)throw Error("worker activation timeout");
      await new Promise(resolve=>setTimeout(resolve,50));
     }
     return {state:reg.active?.state??"unknown",cacheNames:await caches.keys(),entries:await Promise.all((await caches.keys()).map(async name=>(await (await caches.open(name)).keys()).length))};
    });
    const installRequests=requests.slice();requests.length=0;
    await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration("/");await reg.update();});
    const updateRequests=requests.slice();
    console.log("H4E1_PWA "+JSON.stringify({component,installRequests:installRequests.length,installBytes:installRequests.reduce((s,r)=>s+r.bytes,0),unchangedUpdateRequests:updateRequests.length,unchangedUpdateBytes:updateRequests.reduce((s,r)=>s+r.bytes,0),cacheEntries:install.entries.reduce((s,n)=>s+n,0),state:install.state,installAssets:installRequests.map(r=>({path:r.path,bytes:r.bytes}))}));
    assert.equal(install.state,"activated");assert.ok(install.entries.some(n=>n>0));
   }finally{await context.close();}
  }finally{server.close();await once(server,"close");}
 }
}finally{await browser.close();}
