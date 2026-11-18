import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sw=read("public/firebase-messaging-sw.js");
const app=read("src/App.tsx");
const id="550e8400-e29b-41d4-a716-446655440000";
function worker() {
  const shown=[];
  const hooks={};
  const ctx={
    self:{location:{origin:"https://staging.localeats.invalid"},
      registration:{showNotification:(title,options)=>{shown.push({title,options});return Promise.resolve("display-accepted");}},
      addEventListener:(name,handler)=>{hooks[name]=handler;}},
    firebase:{initializeApp:()=>{},messaging:()=>({onBackgroundMessage:fn=>{hooks.background=fn;}})},
    importScripts:()=>{},URL,clients:{matchAll:async()=>[],openWindow:async()=>{}}
  };
  vm.runInNewContext(sw,ctx);
  return {shown,hooks};
}
test("L3-N1 background FCM test shows an isolated safe alert and returns the browser promise",async()=>{
  const {shown,hooks}=worker();
  const result=hooks.background({data:{type:"customer_push_test",test_id:id,order_id:"private-order",phone:"private-phone",url:"https://evil.test"}});
  assert.equal(await result,"display-accepted");
  assert.equal(shown.length,1);
  assert.equal(shown[0].title,"LocalEats notification test");
  assert.equal(shown[0].options.tag,"localeats-customer-test-"+id);
  assert.ok(!JSON.stringify(shown).includes("private-order"));
  assert.ok(!JSON.stringify(shown).includes("private-phone"));
  assert.ok(!JSON.stringify(shown).includes("evil.test"));
  assert.equal(shown[0].options.data.type,"customer_push_test");
});
test("bad test IDs, unexpected types, SDK notification payload never cause duplicate tests",()=>{
  const {shown,hooks}=worker();
  hooks.background({data:{type:"customer_push_test",test_id:"bad"}});
  hooks.background({data:{type:"customer_push_test"}});
  hooks.background({data:{type:"other",test_id:id}});
  hooks.background({data:{type:"pickup_new_order",test_id:id}});
  hooks.background({notification:{title:"SDK-owned"},data:{type:"customer_push_test",test_id:id}});
  assert.equal(shown.length,0);
});
test("real Ready behavior and notification click remain independent of tests",async()=>{
  const {shown,hooks}=worker();
  hooks.background({data:{type:"pickup_ready",event_id:"real-ready"}});
  assert.equal(shown[0].options.tag,"localeats-pickup-real-ready");
  assert.match(sw,/event\.notification\.data\?\.type === 'pickup_ready'/);
  assert.match(sw,/new URL\('\/', self\.location\.origin\)/);
  assert.doesNotMatch(sw,/openWindow\(.*payload\.data/);
});
test("foreground test is distinct from ordinary order push and never auto-acks collection",()=>{
  const portion=app.slice(app.indexOf("// Listen for FCM foreground"),app.indexOf("const fetchUserProfile",app.indexOf("// Listen for FCM foreground")));
  assert.match(portion,/payload\?\.data\?\.type === "customer_push_test"/);
  assert.match(portion,/Test reached this open app\. No order was created\./);
  assert.match(portion,/if \(payload\.data\?\.type === "pickup_ready"\)/);
  assert.doesNotMatch(portion,/confirm_payment|confirm-receipt|collect\(/);
  assert.doesNotMatch(portion,/Notification\.requestPermission/);
  assert.doesNotMatch(read("src/screens/SettingsScreen.tsx"),/Test browser alert|Test Firebase push/);
});
