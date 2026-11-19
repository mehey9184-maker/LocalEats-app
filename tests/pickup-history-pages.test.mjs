import test from "node:test";
import assert from "node:assert/strict";
import { createPickupApi } from "../src/pickup/client.ts";
import { build } from "esbuild";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const before = {id:"550e8400-e29b-41d4-a716-446655440000",created_at:"2026-11-18T10:00:00.123456+00:00"};

test("older order history preserves its cursor precision and requires authenticated uncached reads", async () => {
  const controller = new AbortController();
  const api = createPickupApi("https://orders.example.test", async () => "fixture-token", async (url, init) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/api/v1/orders/history");
    assert.equal(parsed.searchParams.get("before_id"), before.id);
    assert.equal(parsed.searchParams.get("before_created_at"), before.created_at);
    assert.equal(init.headers.Authorization, "Bearer fb-fixture-token");
    assert.equal(init.cache, "no-store");
    assert.equal(init.signal, controller.signal);
    return Response.json({success:true,orders:[],has_more:false});
  });
  assert.deepEqual(await api.history(before,controller.signal),{orders:[],has_more:false});
});

test("unsupported or oversized history responses remain failures", async () => {
  for (const result of [{orders:[]},{orders:null,has_more:false},{orders:Array(51).fill({}),has_more:true}]) {
    const api = createPickupApi("https://orders.example.test", async () => "token", async () =>
      Response.json({success:true,...result}));
    await assert.rejects(api.history(before), /could not be verified/);
  }
});

test("mixed legacy history keeps older pickups reachable even when recent pickup cards are fewer than 50", async () => {
  const artifact = await build({
    stdin:{contents:'export {OrderHistoryScreen} from "./src/screens/OrderHistoryScreen";',resolveDir:process.cwd()},
    bundle:true,write:false,platform:"node",format:"cjs",packages:"external",
  });
  const mod = {exports:{}};
  new Function("require","module","exports",artifact.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
  const props = {signedIn:true,error:false,refreshing:false,shops:[],readOrder:async()=>({}),
    readOlder:async()=>({orders:[],has_more:false}),historyCursor:{...before,user_id:"customer"},
    onBack(){},onRetry(){},onSignIn(){},onBrowse(){},onStoreInfo(){}};
  for (const count of [0,49]) {
    const orders = Array.from({length:count},(_,i)=>({...before,id:String(i),user_id:"customer",
      status:"collected",delivery_type:"collection",items:[],total_price:25}));
    const html = renderToStaticMarkup(React.createElement(mod.exports.OrderHistoryScreen,{...props,orders}));
    assert.match(html,/Load older orders/);
    if(count===0)assert.match(html,/No pickups in recent orders/);
  }
});
