/**
 * Live Production readiness smoke. Only unauthenticated GET and OPTIONS.
 * No login, GPS, cookies, private data, order submission, push or writes.
 */
import test from "node:test";
import assert from "node:assert/strict";

const customer="https://www.localeatssa.co.za";
const merchant="https://dashboard.localeatssa.co.za";
const api="https://localeats-api.vercel.app";
const publicCoordinates="lat=-26.1&lng=28.1"; // synthetic constant, not a customer location
async function publicRead(url,options={}) {
  const response=await fetch(url,{redirect:"manual",cache:"no-store",
    signal:AbortSignal.timeout(12000),...options});
  const status=response.status;
  const type=response.headers.get("content-type")??"";
  const length=response.headers.get("content-length")??"unreported";
  const cors=response.headers.get("access-control-allow-origin")??"none";
  const body=await response.text();
  return {status,type,length,cors,body};
}
test("public Customer and Merchant homepages serve HTML",async()=>{
  for(const url of [customer,merchant]){
    const r=await publicRead(url);
    console.log(JSON.stringify({url,status:r.status,contentType:r.type}));
    assert.equal(r.status,200);
    assert.match(r.type,/text\/html/i);
    assert.match(r.body,/<html|<div id=/i);
  }
});
test("Customer PWA manifest and service worker are installable public assets",async()=>{
  const manifest=await publicRead(customer+"/manifest.webmanifest");
  const sw=await publicRead(customer+"/sw.js");
  console.log(JSON.stringify({file:"manifest.webmanifest",status:manifest.status,type:manifest.type}));
  console.log(JSON.stringify({file:"sw.js",status:sw.status,type:sw.type}));
  assert.equal(manifest.status,200,"Manifest must be a public JSON response");
  assert.ok(/json/.test(manifest.type),"Manifest cannot be an HTML fallback");
  const json=JSON.parse(manifest.body);
  assert.ok(json.name||json.short_name,"Manifest must name LocalEats");
  assert.ok(Array.isArray(json.icons)&&json.icons.length>=1,"Manifest must declare app icons");
  assert.equal(sw.status,200,"PWA service worker must load");
  assert.ok(/javascript/.test(sw.type),"Service worker cannot be an HTML fallback");
  assert.match(sw.body,/serviceworker|precache|skipwaiting|addEventListener/i);
});
test("public canonical Customer CORS, API health and catalog can be read",async()=>{
  for(const path of ["/health","/api/v1/catalog/shops","/api/v1/catalog/pickup-shops?"+publicCoordinates]){
    const opts=await publicRead(api+path,{method:"OPTIONS",headers:{Origin:customer,"Access-Control-Request-Method":"GET","Access-Control-Request-Headers":"content-type"}});
    const get=await publicRead(api+path,{headers:{Origin:customer}});
    console.log(JSON.stringify({apiPath:path,preflight:opts.status,get:get.status,cors:get.cors}));
    assert.equal(opts.status,204,"Canonical Customer preflight must succeed");
    assert.equal(get.status,200,"Canonical Customer public GET must succeed");
    assert.equal(get.cors,customer,"CORS must return the exact canonical Customer origin");
    if(path.startsWith("/api/v1/catalog/"))assert.equal(JSON.parse(get.body).success,true);
  }
});
