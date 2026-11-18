import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
const ui=read("src/screens/SettingsScreen.tsx"),firebase=read("src/lib/firebase.ts");
const api=read("src/pickup/client.ts"),app=read("src/App.tsx");
test("Customer staging test control is not mounted on Production or ordinary Preview",()=>{
 const guard=ui.slice(ui.indexOf("const isolatedCustomerPushPreview ="),ui.indexOf("const isAdmin =",ui.indexOf("const isolatedCustomerPushPreview =")));
 assert.match(guard,/VITE_FIREBASE_CONFIG_SOURCE==="environment"/);
 assert.match(guard,/VITE_PICKUP_ORDERING_ENABLED==="false"/);
 assert.match(guard,/VITE_FIREBASE_PROJECT_ID!=="localeats-5e26e"/);
 assert.match(guard,/VITE_CUSTOMER_PUSH_STAGING_ORIGIN===window.location.origin/);
 assert.match(guard,/localeatssa.co.za/);
 assert.match(ui,/isolatedCustomerPushPreview && <IsolatedCustomerPushCheck/);
});
test("staging test requires explicit click and never grants permission or creates an order",()=>{
 const body=ui.slice(ui.indexOf("function IsolatedCustomerPushCheck"),ui.indexOf("export function SettingsScreen"));
 assert.match(body,/onClick=\{\(\)=>\{void send\(\);\}\}/);
 assert.match(body,/auth.currentUser\?\.uid!==accountId/);
 assert.match(body,/Notification.permission!=="granted"/);
 assert.match(body,/sendIsolatedCustomerPushTest\(accountId\)/);
 assert.match(body,/Firebase accepted the test/);
 assert.doesNotMatch(body,/requestPermission\(|createPickup|confirm_payment|collect\(/);
});
test("test request uses existing Firebase identity and UUID, no raw FCM token in the browser call",()=>{
 const fn=firebase.slice(firebase.indexOf("export async function sendIsolatedCustomerPushTest"));
 assert.match(fn,/auth.currentUser\?\.uid!==userId/);
 assert.match(fn,/VITE_CUSTOMER_PUSH_STAGING_ORIGIN!==window.location.origin/);
 assert.match(fn,/customerPickupApi.customerDeviceTest\(installation\)/);
 assert.doesNotMatch(fn,/getToken\(|fcmToken|localStorage\.setItem/);
 assert.match(api,/customerDeviceTest:\(id:string\)=>request\("\/api\/v1\/customer-push-subscriptions\//);
 assert.doesNotMatch(ui,/Test browser alert|Test Firebase push/);
});
test("normal Customer product remains unchanged by staging test sender",()=>{
 assert.match(app,/canRegisterCustomerPushOnThisOrigin/);
 assert.match(app,/localeatssa.co.za/);
 assert.match(app,/VITE_CUSTOMER_PUSH_STAGING_ORIGIN/);
 assert.doesNotMatch(ui,/pickupOrderingEnabled\(\)/);
});
