import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const stagingFlag='import.meta.env.VITE_FIREBASE_CONFIG_SOURCE === "environment"';

test("R5.2R follow-up: staging location reads cannot reuse a five-minute-old GPS fix",()=>{
  assert.ok(app.includes(`maximumAge: ${stagingFlag} ? 0 : 300000`));
});
test("R5.2R follow-up: staging does not launch the second GPS reader that clears a valid fix",()=>{
  const legacyBlock=app.slice(app.indexOf('if ("geolocation" in navigator)'),app.indexOf('if ("geolocation" in navigator)')+700);
  assert.ok(legacyBlock.includes("setUserLocation(null)"),"legacy reader still has its original fallback for normal builds");
  assert.match(app, /if \(import\.meta\.env\.VITE_FIREBASE_CONFIG_SOURCE === "environment"\) return;\s*if \("geolocation" in navigator\)/);
});
test("R5.2R follow-up: no testing coordinates baked into Customer source",()=>{
  assert.ok(!app.includes('setUserLocation({lat:-26,lng:28})'));
  assert.ok(!app.includes('setUserLocation({ lat: -26, lng: 28 })'));
});
