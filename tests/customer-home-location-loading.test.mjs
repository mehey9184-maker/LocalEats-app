import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createPickupApi} from "../src/pickup/client.ts";

test("Home requests device location once; failed or unresolved permission exits skeleton",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.equal((app.match(/navigator\.geolocation\.getCurrentPosition\(/g)||[]).length,1);
 assert.match(app,/requestLocation\(true\);/);
 assert.match(app,/locationTimeoutRef\.current = setTimeout\(\(\) => \{/);
 assert.match(app,/setLoadingShops\(false\);\s*setFetchError\(message\);/);
 assert.match(app,/locationAttemptRef\.current\+\+/);
 assert.doesNotMatch(app,/setUserLocation\(null\)/);
 assert.match(app,/if \(!userLocation\) return;/);
 assert.match(app,/\{shops\.length === 0\s*\? \(fetchError/);
 assert.match(app,/Reload Shops & Live Data/);
});

test("catalog API uses bounded read-only signal; order mutations do not get the public timeout",async()=>{
 const calls=[];
 const transport=async(url,options)=>{
  calls.push({url,method:options.method,signal:options.signal});
  return new Response(JSON.stringify({success:true,shops:[],quote:{}}),{status:200,headers:{"Content-Type":"application/json"}});
 };
 const api=createPickupApi("https://api.example.test",async()=>"token",transport);
 const result=await api.shops({lat:-26,lng:28});
 assert.deepEqual(result.shops,[]);
 assert.equal(calls[0].method,"GET");
 assert.ok(calls[0].signal instanceof AbortSignal);
 assert.equal(calls[0].signal.aborted,false);
 await api.quote({});
 assert.equal(calls[1].method,"POST");
 assert.equal(calls[1].signal,undefined);
});

test("existing pickup tracking and no-fake-data protections remain",()=>{
 const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
 assert.match(app,/readPickupCatalog\(userLocation\)/);
 assert.doesNotMatch(app,/setShops\(DEFAULT_FALLBACK_SHOPS\)/);
 assert.match(app,/readDisplayCatalog\(userLocation\)/);
 assert.match(app,/distanceKm\(loadedCatalogLocation\.current,userLocation\)>0\.15/);
});
