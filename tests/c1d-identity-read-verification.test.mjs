import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  C1D_STAGING_API, C1D_PATHS, c1dStagingEnabled, runC1DReadOnlyChecks,
} from "../src/services/c1dIdentityRead.ts";

const origin = "https://localeats-customer-staging-r52d-mehey9184-makers-projects.vercel.app";
const env = {
  VITE_FIREBASE_CONFIG_SOURCE: "environment",
  VITE_PICKUP_ORDERING_ENABLED: "false",
  VITE_PROFILE_WRITES_ENABLED: "false",
  VITE_LOCALEATS_API_URL: C1D_STAGING_API,
};
const browser = "localeats-customer-staging-r52d-mehey9184-makers-projects.vercel.app";
const makeResponse = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type":"application/json",
      "Cache-Control":"no-store",
      "Access-Control-Allow-Origin":origin,
      ...headers,
    },
  });
const ident = uid => ({uid, isAnonymous:false, getIdToken:async () => "synthetic-test-value-never-reveal"});

test("C1D diagnostic unavailable in Production, ordinary Preview, write-enabled mode, and arbitrary origin",()=>{
  assert.equal(c1dStagingEnabled(env,browser,"?c1d=1"),true);
  assert.equal(c1dStagingEnabled(env,browser,""),false);
  assert.equal(c1dStagingEnabled(env,"www.localeatssa.co.za","?c1d=1"),false);
  assert.equal(c1dStagingEnabled({...env,VITE_FIREBASE_CONFIG_SOURCE:"bundled"},browser,"?c1d=1"),false);
  assert.equal(c1dStagingEnabled({...env,VITE_PICKUP_ORDERING_ENABLED:"true"},browser,"?c1d=1"),false);
  assert.equal(c1dStagingEnabled({...env,VITE_PROFILE_WRITES_ENABLED:"true"},browser,"?c1d=1"),false);
  assert.equal(c1dStagingEnabled({...env,VITE_LOCALEATS_API_URL:"https://other.example.invalid"},browser,"?c1d=1"),false);
});

test("C1D missing or anonymous account makes no HTTP request",async()=>{
  let count=0;
  const transport=async()=>{count++;throw Error("unexpected network")};
  assert.deepEqual(await runC1DReadOnlyChecks(()=>null,origin,transport),{
    outcome:"completed",authenticated:false,results:[]
  });
  assert.deepEqual(await runC1DReadOnlyChecks(()=>({...ident("guest"),isAnonymous:true}),origin,transport),{
    outcome:"completed",authenticated:false,results:[]
  });
  assert.equal(count,0);
});

test("C1D two allowlisted GETs with a valid test identity, sanitized result and empty-history caveat",async()=>{
  const seen=[];
  const transport=async(url,options)=>{
    seen.push({url,method:options.method,cache:options.cache,credentials:options.credentials,redirect:options.redirect,auth:options.headers.Authorization});
    return url.endsWith("/profiles/me")
      ? makeResponse(200,{success:true,profile:{user_id:"tester-A",email:"A-private@example.invalid"}})
      : makeResponse(200,{success:true,orders:[]});
  };
  const result=await runC1DReadOnlyChecks(()=>ident("tester-A"),origin,transport);
  assert.deepEqual(seen.map(x=>x.url),C1D_PATHS.map(path=>C1D_STAGING_API+path));
  assert.deepEqual(seen.map(x=>x.method),["GET","GET"]);
  assert.ok(seen.every(x=>x.cache==="no-store"&&x.credentials==="omit"&&x.redirect==="error"));
  assert.ok(seen.every(x=>x.auth.startsWith("Bearer fb-")));
  assert.deepEqual(result.results.map(x=>x.ownership),["match","empty"]);
  assert.deepEqual(result.results.map(x=>x.noStore),[true,true]);
  assert.deepEqual(result.results.map(x=>x.corsMatches),[true,true]);
  const exported=JSON.stringify(result);
  assert.doesNotMatch(exported,/tester-A|A-private|synthetic-test-value|Authorization|Bearer/);
});

test("C1D denies false pass for wrong profile or order owners",async()=>{
  const r=await runC1DReadOnlyChecks(()=>ident("tester-B"),origin,async url=>
    url.endsWith("/profiles/me")
      ? makeResponse(200,{success:true,profile:{user_id:"tester-A",phone:"a-private"}})
      : makeResponse(200,{success:true,orders:[{user_id:"tester-A",id:"a-private-order"}]})
  );
  assert.deepEqual(r.results.map(x=>x.ownership),["mismatch","mismatch"]);
  assert.doesNotMatch(JSON.stringify(r),/tester-A|a-private/);
});

test("C1D 404 absent profile, 503 missing order schema and 401 are unverified, not isolation passes",async()=>{
  const responses=[makeResponse(404,{success:false,code:"PROFILE_NOT_FOUND"}),makeResponse(503,{success:false,code:"DATABASE_UNAVAILABLE"})];
  let i=0;
  const r=await runC1DReadOnlyChecks(()=>ident("tester-B"),origin,async()=>responses[i++]);
  assert.deepEqual(r.results.map(x=>x.status),[404,503]);
  assert.deepEqual(r.results.map(x=>x.ownership),["unverified","unverified"]);
  assert.deepEqual(r.results.map(x=>x.code),["PROFILE_NOT_FOUND","DATABASE_UNAVAILABLE"]);
  i=0;
  const denied=await runC1DReadOnlyChecks(()=>ident("tester-B"),origin,async()=>makeResponse(401,{error:"Unauthorized"}));
  assert.deepEqual(denied.results.map(x=>x.ownership),["unverified","unverified"]);
});

test("C1D stops pending requests and removes all results if a user changes from tester A to tester2",async()=>{
  let active=ident("tester-A");
  let release;
  const gate=new Promise(resolve=>{release=resolve});
  const called=[];
  const inFlight=runC1DReadOnlyChecks(()=>active,origin,async url=>{
    called.push(url);
    await gate;
    return makeResponse(200,{success:true,profile:{user_id:"tester-A"}});
  });
  await Promise.resolve();await Promise.resolve();
  active=ident("tester-B");
  release();
  const r=await inFlight;
  assert.equal(r.outcome,"account-changed");
  assert.deepEqual(r.results,[]);
  assert.equal(called.length,1);
});

test("C1D tester switch during token refresh results in zero API requests",async()=>{
  let active=ident("tester-A");
  let resume;
  const waiting=new Promise(resolve=>{resume=resolve;});
  active.getIdToken=async()=>{await waiting;return "synthetic-test-only"};
  let calls=0;
  const current=runC1DReadOnlyChecks(()=>active,origin,async()=>{calls++;throw Error("must not fetch")});
  active=ident("tester-B");
  resume();
  assert.equal((await current).outcome,"account-changed");
  assert.equal(calls,0);
});

test("C1D JSX is manually opted in, makes no write HTTP calls and does not expose tokens or private response bodies",()=>{
  const source=readFileSync(new URL("../src/components/C1DIdentityPanel.tsx",import.meta.url),"utf8");
  const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
  const probe=readFileSync(new URL("../src/services/c1dIdentityRead.ts",import.meta.url),"utf8");
  assert.match(app,/import \{ C1DIdentityPanel \} from "\.\/components\/C1DIdentityPanel"/);
  assert.match(app,/<C1DIdentityPanel \/>/);
  assert.match(source,/c1dStagingEnabled\(/);
  assert.match(source,/onIdTokenChanged\(auth/);
  assert.match(source,/Run two read-only GET checks/);
  assert.doesNotMatch(source,/localStorage|sessionStorage|console\.(log|warn|error)/);
  assert.doesNotMatch(probe,/method:\s*"(POST|PUT|PATCH|DELETE)"|localStorage|sessionStorage|console\.log/);
  assert.match(probe,/method:\s*"GET"/);
  assert.match(probe,/redirect: "error"/);
  assert.match(probe,/return \{ outcome: "account-changed", authenticated: false, results: \[\] \}/);
});
