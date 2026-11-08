import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("R5.2F legacy Customer-side server has preview-only POST/PUT/PATCH/DELETE API block before any routes",()=>{
 const s=read("server.ts");
 const pos=s.indexOf('app.use((req, res, next) => {');
 const firstLegacyRoute=s.indexOf('app.post("/api/orders"');
 assert.ok(pos>0 && pos<firstLegacyRoute,"staging middleware must execute before legacy write routes");
 assert.match(s,/process\.env\.LOCALEATS_STAGING_ONLY === "true"/);
 assert.match(s,/\["GET", "HEAD", "OPTIONS"\]/);
 assert.match(s,/req\.path\.startsWith\("\/api\/"\)/);
 assert.match(s,/status\(403\)\.json\(\{error: "STAGING_CUSTOMER_WRITES_DISABLED"\}\)/);
});

test("R5.2F production behavior remains behind opt-in and order-create is not activated",()=>{
 const s=read("server.ts");
 const guard=s.indexOf('if (process.env.LOCALEATS_STAGING_ONLY === "true"');
 assert.ok(guard>0);
 assert.match(s,/app\.use\(legacyOrderGuard\)/);
 const pickup=read("src/services/customerPickup.ts");
 assert.match(pickup,/VITE_PICKUP_ORDERING_ENABLED === "true"/);
});

test("R5.2F Customer must explicitly use staging Firebase config with no Production fallback",()=>{
 const s=read("src/lib/firebaseConfigPolicy.ts");
 assert.match(s,/R52_STAGING_FIREBASE_CONFIG_INVALID/);
 assert.match(s,/required\.projectId\.startsWith\("demo-"\)/);
 assert.match(s,/mixesBundledValues/);
});

test("R5.2F Customer builds cannot be claimed complete without original branding and API route review",()=>{
 const index=read("index.html");
 const vite=read("vite.config.ts");
 const packageJson=JSON.parse(read("package.json"));
 const vercel=JSON.parse(read("vercel.json"));
 assert.match(index,/\/logo\.png/);
 assert.match(vite,/\/logo\.png/);
 assert.ok(packageJson.scripts.build.includes("vite build"));
 assert.ok(packageJson.scripts.build.includes("esbuild server.ts"));
 assert.ok(vercel.rewrites.some(x=>x.source==="/(.*)"&&x.destination==="/index.html"));
 // The static rewrite is NOT a substitute for /api/v1/shops.
 const shops=read("src/hooks/useShopsData.ts");
 assert.match(shops,/fetch\("\/api\/v1\/shops"\)/);
});
