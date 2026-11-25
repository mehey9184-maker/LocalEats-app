// Read production-built files locally. No hosted auth/catalog, no real accounts.
import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFileSync,existsSync,statSync,readdirSync} from "node:fs";
import {resolve,extname,sep} from "node:path";
import {gzipSync} from "node:zlib";
import {once} from "node:events";
import assert from "node:assert/strict";
const types={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg",".woff2":"font/woff2"};
const roots=[["Customer",resolve("dist")],["Merchant",resolve(process.argv[2])]];
const browser=await chromium.launch({headless:true});
try{
 for(const [component,root] of roots){
  assert.ok(existsSync(resolve(root,"index.html")));
  const index=readFileSync(resolve(root,"index.html"),"utf8");
  const files=readdirSync(resolve(root,"assets")).filter(x=>/\.(js|css)$/.test(x));
  for(const file of files){const body=readFileSync(resolve(root,"assets",file));console.log("H4A_ASSET "+JSON.stringify({component,file,raw_bytes:body.length,gzip_bytes:gzipSync(body,{level:9}).length,html_reference:index.includes("/assets/"+file)}));}
  const server=createServer((req,res)=>{
   const pathname=new URL(req.url,"http://localhost").pathname;
   const file=resolve(root,"."+pathname);
   if(!file.startsWith(root+sep)||!existsSync(file)||!statSync(file).isFile()){
    if(pathname!=="/"){res.writeHead(404);res.end();return;}
   }
   const target=pathname==="/"?resolve(root,"index.html"):file;
   const data=readFileSync(target),ext=extname(target);
   const compress=[".js",".css",".html",".json",".svg"].includes(ext);
   const body=compress?gzipSync(data,{level:6}):data;
   res.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream","Content-Length":body.length,"Cache-Control":"no-store",...(compress?{"Content-Encoding":"gzip"}:{})});res.end(body);
  });
  server.listen(0,"127.0.0.1");await once(server,"listening");
  const base="http://127.0.0.1:"+server.address().port;
  try{
   for(let i=0;i<3;i++){
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:"block",permissions:[],reducedMotion:"reduce"});
    const blocked=new Set(),errors=[];
    await context.route("**/*",route=>{
     const url=new URL(route.request().url());
     if(url.origin===base && ["GET","HEAD"].includes(route.request().method()))return route.continue();
     blocked.add(url.hostname);return route.abort();
    });
    const page=await context.newPage();
    page.on("pageerror",()=>errors.push("runtime-error"));
    const cdp=await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled",{cacheDisabled:true});
    // Same mobile profile for all samples. No real network/provider latency.
    await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
    await cdp.send("Network.emulateNetworkConditions",{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750,connectionType:"cellular3g"});
    try{
     await page.goto(base,{waitUntil:"load",timeout:45000});
     await page.waitForTimeout(1000);
     const metrics=await page.evaluate(()=>{
      const nav=performance.getEntriesByType("navigation")[0];
      const local=performance.getEntriesByType("resource").filter(x=>new URL(x.name).origin===location.origin);
      const js=local.filter(x=>new URL(x.name).pathname.endsWith(".js"));
      const css=local.filter(x=>new URL(x.name).pathname.endsWith(".css"));
      return {dom_content_loaded_ms:Math.round(nav.domContentLoadedEventEnd),load_ms:Math.round(nav.loadEventEnd),fcp_ms:Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime??0),js_encoded_bytes:js.reduce((s,x)=>s+x.encodedBodySize,0),css_encoded_bytes:css.reduce((s,x)=>s+x.encodedBodySize,0),local_resources:local.length,root_has_children:!!document.querySelector("#root")?.children.length};
     });
     console.log("H4A_BROWSER "+JSON.stringify({component,sample:i+1,...metrics,blocked_external_hosts:blocked.size,runtime_errors:errors.length}));
    }finally{await context.close();}
   }
  }finally{server.close();await once(server,"close");}
 }
}finally{await browser.close();}
