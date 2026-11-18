import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const vite=readFileSync(new URL("../vite.config.ts",import.meta.url),"utf8");
const stage=readFileSync(new URL("../src/services/customerPushStaging.ts",import.meta.url),"utf8");
const branchApi="https://localeats-api-staging-r52d-git-112955-mehey9184-makers-projects.vercel.app";

test("only the dedicated Customer notification branch can override the API origin",()=>{
  assert.match(vite,/LOCALEATS_STAGING_ONLY === "true"/);
  assert.match(vite,/VERCEL_ENV === "preview"/);
  assert.match(vite,/VERCEL_GIT_COMMIT_REF === "review\/l3-n3-customer-api-pairing"/);
  assert.match(vite,/VITE_FIREBASE_PROJECT_ID === "localeats-staging"/);
  assert.match(vite,/VITE_PICKUP_ORDERING_ENABLED === "false"/);
  assert.ok(vite.includes(branchApi));
  assert.match(vite,/l3n3IsolatedPreview\s*\?/);
  assert.match(vite,/import\.meta\.env\.VITE_LOCALEATS_API_URL/);
  assert.ok(stage.includes(branchApi));
});
test("existing Customer pickup ready and nearby alerts still present",()=>{
  const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
  assert.match(app,/usePickupReadyReminder/);
  assert.match(app,/compareNearbyCatalog/);
  assert.match(app,/onReadyReminder=\{updatePickupReminder\}/);
});
