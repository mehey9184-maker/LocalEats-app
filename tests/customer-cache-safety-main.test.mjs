import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const workerAlias = readFileSync(new URL("../public/service-worker.js", import.meta.url), "utf8");

test("browser errors do not clear credentials, local drafts or versioned app caches", async () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  const handlers = new Map();
  const calls = [];
  const context = {
    window: { location: { hostname: "preview.example" },
      addEventListener: (name, fn) => handlers.set(name, fn) },
    navigator: { serviceWorker: { getRegistrations: async () => [] } },
    document: {},
    console: { error() {}, log() {} },
    localStorage: { clear: () => calls.push("localStorage.clear") },
    sessionStorage: { clear: () => calls.push("sessionStorage.clear") },
    caches: { keys: async () => ["app-shell"], delete: () => calls.push("caches.delete") },
    setTimeout: () => calls.push("reloadTimer")
  };
  vm.runInNewContext(script, context);
  assert.equal(typeof handlers.get("error"), "function");
  handlers.get("error")({message:"random script failure",filename:"bundle.js",lineno:1,colno:1});
  await Promise.resolve();
  assert.deepEqual(calls, []);
});

test("legacy worker copies stay identical and retire private API caches", () => {
  assert.equal(worker, workerAlias);
  assert.doesNotMatch(worker, /CACHE_NAME_API|cache\.put\(request, responseToCache\).*API/s);
  assert.match(worker, /fetch\(request, \{ cache: 'no-store' \}\)/);
  assert.match(worker, /const activeCacheNames = \[CACHE_NAME_APP_SHELL\]/);
});

test("offline private API GET fails closed instead of replaying another account's cached response", async () => {
  const handlers = new Map();
  const uses = [];
  const self = {location:{origin:"https://localeatssa.co.za"},addEventListener:(type, fn)=>handlers.set(type, fn)};
  const caches = {match: async()=>{uses.push("cache match");return new Response('private order');},
    open: async()=>{uses.push("cache open");return {put:()=>{uses.push("cache put");}}}};
  vm.runInNewContext(worker,{self,caches,fetch:async()=>{throw Error("offline");},console:{log(){}},Request,Response,URL,Date});
  let response;
  const event={request:new Request("https://localeatssa.co.za/api/v1/orders", {headers:{Authorization:"Bearer secret"}}),
    respondWith:promise=>{response=promise;}};
  handlers.get("fetch")(event);
  const result=await response;
  assert.equal(result.status,503);
  assert.equal((await result.json()).offline,true);
  assert.deepEqual(uses,[]);
});
