import test from "node:test";
import assert from "node:assert/strict";
import {GET,POST} from "../api/profile.ts";

test("Client same-origin function denies unsigned profile reads as JSON",async()=>{
  const response=await GET(new Request("https://client-preview.example/api/profile?uid=other-user"));
  assert.equal(response.status,401);
  assert.match(response.headers.get("content-type")??"",/application\/json/);
  const body=await response.json();
  assert.equal(body.success,false);
  assert.equal(body.profile,undefined);
});

test("Client same-origin function denies unsigned profile writes without side effects",async()=>{
  const response=await POST(new Request("https://client-preview.example/api/profile",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({user_id:"other-user",role:"admin",fullName:"Fake"}),
  }));
  assert.equal(response.status,401);
  assert.match(response.headers.get("content-type")??"",/application\/json/);
  const body=await response.json();
  assert.equal(body.success,false);
  assert.equal(body.profile,undefined);
});

test("Client profile function rejects malformed ID before accessing auth or DB",async()=>{
  const response=await GET(new Request("https://client-preview.example/api/profile?uid=../other"));
  assert.equal(response.status,400);
});
