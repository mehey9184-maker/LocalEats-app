import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("R5.2H Discover does not render a stray developer comment", () => {
  const app = read("src/App.tsx");
  assert.doesNotMatch(app, /\}\s*\/\/\s*close ternary/);
  assert.match(app, /No Shops Found/);
  assert.match(app, /View Menu & Order/);
});

test("R5.2H Customer title and keywords describe the pickup-only pilot", () => {
  const html = read("index.html");
  assert.match(html, /<title>LocalEats \| Local Kota & Braai Pickup<\/title>/);
  assert.match(html, /Food Pickup/);
  assert.doesNotMatch(html, /Kota & Braai Delivery|Food Delivery/);
  assert.match(html, /\/logo\.png/);
});

test("R5.2H cookie copy describes stored location preferences, not delivery promises", () => {
  const banner = read("src/components/CookieConsentBanner.tsx");
  assert.match(banner, /remember location preferences/);
  assert.match(banner, /recent selected locations locally on your device/);
  assert.doesNotMatch(banner, /delivery addresses|delivery pins/i);
});

test("R5.2H preserves the pickup write gate", () => {
  const pickup = read("src/services/customerPickup.ts");
  assert.match(pickup, /VITE_PICKUP_ORDERING_ENABLED === "true"/);
});
