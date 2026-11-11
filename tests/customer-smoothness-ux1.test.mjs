import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const app = read("src/App.tsx");
const nav = read("src/components/BottomNavigation.tsx");
const sheet = read("src/components/BottomSheet.tsx");
const css = read("src/index.css");
const shopCard = read("src/components/ShopCard.tsx");
const cart = read("src/components/CartDrawer.tsx");

test("customer UX1 keeps the original 5-tab navigation and shop card intact", () => {
  for(const id of ["home","discover","explore","orders","profile"]) {
    assert.ok(nav.includes('id="nav-tab-' + id + '"'), "Missing original navigation tab " + id);
  }
  assert.match(nav,/onNavigate\(screen\)/);
  assert.match(nav,/activeOrdersCount > 0/);
  assert.match(nav,/handleNavClick\("order-tracking"\)/);
  assert.match(nav,/handleNavClick\("order-history"\)/);
  assert.match(nav,/min-h-\[48px\]/);
  assert.match(nav,/pb-\[calc\(0\.75rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(shopCard,/layoutId=\{\x60shop-card-\$\{shop\.id\}\x60\}/);
  assert.match(shopCard,/onStoreInfo\(shop\.id\)/);
  assert.match(shopCard,/!status\.isOpen \? "opacity-80" : ""/);
  assert.match(cart,/onProceedToCheckout\(\)/);
  assert.match(cart,/MAX_PICKUP_ITEM_QUANTITY/);
});

test("customer UX1 does not compete with Motion by scaling every link and button", () => {
  assert.doesNotMatch(css,/button:active,\s*a:active\s*\{[\s\S]*?transform: scale/);
  assert.match(css,/touch-action: manipulation/);
  assert.match(css,/button:focus-visible, a:focus-visible/);
  assert.match(css,/\.le-customer-press:active:not\(:disabled\)/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(nav,/useReducedMotion\(\)/);
  assert.equal((nav.match(/aria-current=\{/g)||[]).length,5);
  assert.equal((nav.match(/le-customer-press flex flex-col/g)||[]).length,5);
  assert.match(nav,/motion-safe:animate-ping/);
  assert.match(nav,/aria-label="Main customer navigation"/);
});

test("customer UX1 bottom sheet handles scrolling, focus, Escape and reduced motion", () => {
  assert.match(sheet,/role="dialog"/);
  assert.match(sheet,/aria-modal="true"/);
  assert.match(sheet,/aria-labelledby=\{title \? titleId : undefined\}/);
  assert.match(sheet,/aria-label=\{!title \? "LocalEats panel" : undefined\}/);
  assert.match(sheet,/document\.body\.style\.overflow = previousOverflow/);
  assert.match(sheet,/previousFocus\?\.focus\(\)/);
  assert.match(sheet,/onKeyDown=\{handleSheetKeyDown\}/);
  assert.match(sheet,/event\.key === "Escape"/);
  assert.match(sheet,/event\.key === "Tab"/);
  assert.match(sheet,/closeRef\.current \?\? sheetRef\.current/);
  assert.match(sheet,/aria-label="Close panel"/);
  assert.match(sheet,/min-h-11 min-w-11/);
  assert.match(sheet,/useReducedMotion\(\)/);
  assert.match(sheet,/reduceMotion \? \{ duration: 0 \}/);
  assert.doesNotMatch(sheet,/document\.body\.style\.overflow = ""/);
});

test("customer UX1 excludes pickup activation and remains source-compatible with original UI", () => {
  assert.doesNotMatch(app,/VITE_PICKUP_ORDERING_ENABLED\s*=\s*true/);
  assert.match(app,/fetchShopsData/);
  assert.match(app,/ShopCard/);
  assert.match(app,/BottomNavigation/);
  assert.match(cart,/import \{ BottomSheet \} from "\.\/BottomSheet"/);
  assert.match(shopCard,/getShopStatus\(shop\)/);
  assert.match(cart,/onProceedToCheckout/);
  assert.doesNotMatch(nav,/onNavigate\("checkout"\)/);
});
