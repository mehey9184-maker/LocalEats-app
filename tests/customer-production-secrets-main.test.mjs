import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("browser Vite build never substitutes a private server Gemini API key",()=>{
  const vite=read("vite.config.ts");
  const server=read("server.ts");
  assert.doesNotMatch(vite,/process\.env\.GEMINI_API_KEY/);
  assert.doesNotMatch(vite,/define\s*:\s*\{[^}]*GEMINI_API_KEY/);
  assert.doesNotMatch(vite,/loadEnv\(mode\s*,\s*['"]\.['"]\s*,\s*['"]['"]/);
  assert.match(server,/process\.env\.GEMINI_API_KEY/,"Server-only AI feature still receives its private key at runtime");
});
test("PWA builds as a separate worker and pickup remains explicitly gated",()=>{
  const vite=read("vite.config.ts");
  const sw=read("src/sw.ts");
  const pickup=read("src/services/customerPickup.ts");
  assert.match(vite,/VitePWA\(\{/);
  assert.match(vite,/strategies:\s*'injectManifest'/);
  assert.match(sw,/network-only|no cached authority|no cached response/i);
  assert.match(pickup,/VITE_PICKUP_ORDERING_ENABLED\s*===\s*"true"/);
});
