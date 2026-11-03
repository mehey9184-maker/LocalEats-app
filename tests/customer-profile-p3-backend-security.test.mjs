import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {requireProfileOwner,buildCustomerProfilePatch,createCustomerProfileRecord,ProfilePolicyError} from "../profileApiPolicy.ts";

const server=readFileSync(new URL("../server.ts",import.meta.url),"utf8");
const route=server.slice(server.indexOf("// Profile API P3:"),server.indexOf("// API Endpoint for resilient Order Placement & Sync"));
const throwsStatus=(action,status)=>assert.throws(action,e=>e instanceof ProfilePolicyError && e.status===status);

test("P3 requires exact verified owner identity; no anonymous or cross-user exceptions",()=>{
 assert.equal(requireProfileOwner("customer-A","customer-A"),"customer-A");
 throwsStatus(()=>requireProfileOwner("customer-A","customer-B"),403);
 throwsStatus(()=>requireProfileOwner("anon","customer-A"),401);
 throwsStatus(()=>requireProfileOwner(undefined,"customer-A"),401);
 throwsStatus(()=>requireProfileOwner("customer-A","anon"),400);
 throwsStatus(()=>requireProfileOwner("customer-A",undefined),400);
});

test("P3 only permits ordinary profile fields and strips role, admin flags, email and arbitrary properties",()=>{
 const patch=buildCustomerProfilePatch({
   user_id:"customer-B",id:"customer-B",role:"super_admin",is_admin:true,
   email:"attacker@example.com",fullName:"  A Customer  ",phone:"071 234 5678",
   address:"  Tembisa  ",city:"Tembisa",country:"South Africa",
   language:"en",latitude:-26.01,longitude:28.2,photo_url:"",favorites:["shop-A","shop-A"],
   updated_at:"2000-01-01",
 });
 assert.deepEqual(patch,{
   fullName:"A Customer",address:"Tembisa",phone:"+27712345678",city:"Tembisa",
   country:"South Africa",language:"en",photo_url:"",latitude:-26.01,
   longitude:28.2,favorites:["shop-A"],
 });
 assert.ok(!("role" in patch));
 assert.ok(!("email" in patch));
 assert.ok(!("user_id" in patch));
 assert.ok(!("updated_at" in patch));
});

test("P3 protected role and verified email only appear on first server-controlled insert",()=>{
 const patch=buildCustomerProfilePatch({fullName:"Customer"});
 const record=createCustomerProfileRecord("uid-1","verified@example.com",patch);
 assert.deepEqual(record,{user_id:"uid-1",role:"customer",fullName:"Customer",email:"verified@example.com"});
 assert.equal(createCustomerProfileRecord("uid-1","invalid",patch).email,undefined);
 assert.equal(buildCustomerProfilePatch({fullName:"Customer",email:"forged@local.com",role:"admin"}).role,undefined);
});

test("P3 validates edits, bounds, and prevents arbitrary client photo URLs",()=>{
 for(const bad of [{fullName:""},{fullName:null},{phone:"invalid"},{latitude:94},
   {longitude:-181},{favorites:["ok",3]},{favorites:Array(101).fill("shop")},
   {photoURL:"https://evil.example/avatar.png"},{photo_url:"https://storage.example/avatars/file.png"}]){
  assert.throws(()=>buildCustomerProfilePatch(bad),ProfilePolicyError);
 }
 assert.deepEqual(buildCustomerProfilePatch({phone:""}),{phone:null});
 assert.deepEqual(buildCustomerProfilePatch({phone:"+27712345678"}),{phone:"+27712345678"});
 assert.deepEqual(buildCustomerProfilePatch({photoURL:""}),{photo_url:""});
 assert.deepEqual(buildCustomerProfilePatch({address:""}),{address:""});
 assert.throws(()=>buildCustomerProfilePatch({role:"admin"}),/No editable profile/);
});

test("P3 Express endpoints use verified identity and never acknowledge writes without durable DB storage",()=>{
 assert.match(server,/import \{ProfilePolicyError,requireProfileOwner,buildCustomerProfilePatch,createCustomerProfileRecord\}/);
 assert.match(route,/app\.post\("\/api\/profiles", authenticateJWT/);
 assert.match(route,/app\.get\("\/api\/profiles\/:id",authenticateJWT/);
 assert.match(route,/requireProfileOwner\(req\.user\?\.id \?\? req\.user\?\.uid, body\?\.user_id \?\? body\?\.id\)/);
 assert.match(route,/requireProfileOwner\(req\.user\?\.id \?\? req\.user\?\.uid,req\.params\?\.id\)/);
 assert.match(route,/return res\.status\(503\)\.json\(\{success:false,error:"Profile storage unavailable/);
 assert.match(route,/existing\s*\? supabaseAdmin\.from\("profiles"\)\.update\(pending\)\.eq\("user_id",uid\)/);
 assert.match(route,/createCustomerProfileRecord\(uid,req\.user\?\.email,pending\)/);
 assert.match(route,/if\(writeError \|\| !stored \|\| String\(stored\.user_id\)!==uid\)/);
 assert.doesNotMatch(route,/serverProfiles|role', 'language'|user\.id !== 'anon'|\.upsert\(/);
 assert.match(route,/Cache-Control","no-store"/);
});

test("P3 is isolated from real ordering and the static Vercel routing limitation remains an explicit release gate",()=>{
 const vercel=JSON.parse(readFileSync(new URL("../vercel.json",import.meta.url),"utf8"));
 assert.deepEqual(vercel.rewrites,[{source:"/(.*)",destination:"/index.html"}]);
 assert.match(server,/app\.post\("\/api\/orders"/);
 assert.doesNotMatch(route,/app\.post\("\/api\/orders"/);
});
