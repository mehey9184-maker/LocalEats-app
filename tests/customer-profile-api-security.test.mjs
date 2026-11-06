import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ownsProfile,customerProfileFields} from "../src/services/profileOwnership.ts";
const source=readFileSync(new URL("../server.ts",import.meta.url),"utf8");
test("only an actual matching registered account can read or save a profile",()=>{
  assert.equal(ownsProfile({uid:"member-1"},"member-1"),true);
  assert.equal(ownsProfile({id:"member-1"},"member-1"),true);
  for(const id of ["member-2","anon","",null,undefined]){
    assert.equal(ownsProfile({uid:"member-1"},id),false);
  }
  assert.equal(ownsProfile(null,"member-1"),false);
  assert.equal(ownsProfile({uid:"anon"},"anon"),false);
  assert.equal(ownsProfile({uid:"member-1",isAnonymous:true},"member-1"),false);
  assert.equal(ownsProfile({uid:"member-1",is_anonymous:true},"member-1"),false);
  assert.equal(ownsProfile({uid:"member-1",firebase:{sign_in_provider:"anonymous"}},"member-1"),false);
});
test("profile GET and POST both enforce ownership before accessing storage",()=>{
  assert.equal((source.match(/if \(!ownsProfile\(req\.user, (?:userId|id)\)\)/g)||[]).length,2);
  assert.doesNotMatch(source,/req\.user\?\.id !== 'anon'/);
  assert.equal((source.match(/res\.status\(403\)/g)||[]).filter(Boolean).length>=2,true);
});
test("never return fabricated profile persistence when Supabase is unavailable",()=>{
  assert.doesNotMatch(source,/const serverProfiles: Record/);
  assert.doesNotMatch(source,/serverProfiles\[userId\]/);
  assert.doesNotMatch(source,/serverProfiles\[id\]/);
  const profiles=source.slice(source.indexOf('app.post("/api/profiles"'),source.indexOf('// API Endpoint for resilient Order Placement'));
  assert.equal((profiles.match(/res\.status\(503\)/g)||[]).length,2);
  assert.match(profiles,/Nothing was saved/);
});
test("customers cannot submit a privileged role through profile payload",()=>{
  assert.equal(customerProfileFields.includes("role"),false);
  assert.equal(customerProfileFields.includes("email"),true);
  assert.match(source,/for \(const key of customerProfileFields\)/);
  assert.doesNotMatch(source,/upsertPayload\[["']role["']\]/);
  assert.doesNotMatch(source,/upsertPayload\.role\s*=/);
});
test("verified Firebase uid wins over any custom claim named id",()=>{
  assert.equal((source.match(/\.\.\.decoded,\s*id: decoded\.uid,\s*uid: decoded\.uid/g)||[]).length,3);
});
