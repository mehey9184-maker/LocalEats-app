import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeProfileInput,ownerMatches,ProfileInputError} from "../api/_lib/profilePolicy.ts";
const source=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("profile policy only accepts a signed-in owner's allowed fields",()=>{
 const input={
  user_id:"firebase-user-A",fullName:"  Ada Lovelace ",phone:"0123456789",
  city:"Johannesburg",favorites:["shop-1","shop-1"],
  role:"admin",is_admin:true,email:"attacker@example.com",
  balance:999999,latitude:100,longitude:999,
 };
 const result=normalizeProfileInput(input,"firebase-user-A","verified@example.com");
 assert.deepEqual(result,{
  user_id:"firebase-user-A",email:"verified@example.com",
  fullName:"Ada Lovelace",phone:"0123456789",city:"Johannesburg",
  favorites:["shop-1"],
 });
 assert.equal("role" in result,false);
 assert.equal("balance" in result,false);
 assert.equal("latitude" in result,false);
});

test("profile rejects cross-account updates and malformed fields",()=>{
 assert.throws(()=>normalizeProfileInput({user_id:"user-B"},"user-A"),ProfileInputError);
 assert.throws(()=>normalizeProfileInput({}, "user-A"),ProfileInputError);
 assert.throws(()=>normalizeProfileInput({user_id:"user-A",fullName:{x:1}},"user-A"),ProfileInputError);
 assert.throws(()=>normalizeProfileInput({user_id:"user-A",favorites:["x",0]},"user-A"),ProfileInputError);
 assert.throws(()=>normalizeProfileInput({user_id:"user-A",address:"a".repeat(401)},"user-A"),ProfileInputError);
 assert.equal(ownerMatches("user-A","user-A"),true);
 assert.equal(ownerMatches("user-B","user-A"),false);
});

test("server route verifies Firebase token, denies other UIDs and keeps DB keys server-only",()=>{
 const server=source("../api/_lib/profileServer.ts");
 const get=source("../api/profiles/[id].ts");
 const post=source("../api/profiles/index.ts");
 assert.match(server,/verifyIdToken\(match\[1\],true\)/);
 assert.match(server,/ownerMatches\(id,signed.uid\)/);
 assert.match(server,/\.eq\("user_id",signed\.uid\)/);
 assert.match(server,/PROFILE_API_WRITES_ENABLED!=="true"/);
 assert.match(server,/process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(server,/process\.env\.FIREBASE_PRIVATE_KEY/);
 assert.match(server,/upsert\(\{\.\.\.input,updated_at:/);
 assert.doesNotMatch(server,/"role"\s*:/);
 assert.doesNotMatch(server,/console\.log\(/);
 assert.match(get,/getProfile\(request,id\)/);
 assert.match(post,/putProfile\(request\)/);
});
