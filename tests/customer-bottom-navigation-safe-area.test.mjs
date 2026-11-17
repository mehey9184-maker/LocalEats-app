import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const app = read("src/App.tsx");
const css = read("src/index.css");
const nav = read("src/components/BottomNavigation.tsx");

test("all Customer tabs use one measured, safe-area-aware bottom clearance", () => {
  for (const screen of ["home","discover","explore","order-tracking","order-history",
    "profile","notifications","settings","store-info","contact"]) {
    assert.match(nav, new RegExp('"' + screen + '"'));
  }
  assert.match(nav, /export const customerNavScreens: ReadonlyArray<Screen>/);
  assert.match(nav, /customerNavScreens\.includes\(currentScreen\)/);
  assert.match(nav, /data-customer-bottom-nav="true"/);
  assert.match(nav, /const measured = element\.getBoundingClientRect\(\)\.height/);
  assert.match(nav, /new ResizeObserver\(updateClearance\)/);
  assert.match(nav, /window\.addEventListener\("resize", updateClearance/);
  assert.match(nav, /removeProperty\("--customer-bottom-nav-clearance"\)/);
  assert.match(nav, /env\(safe-area-inset-bottom\)/);
  assert.match(app, /import \{ BottomNavigation, customerNavScreens \}/);
  assert.match(app, /customerNavScreens\.includes\(currentScreen\) \? "customer-nav-page" : ""/);
  assert.match(css, /--customer-bottom-nav-clearance:\s*calc\(7\.5rem \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.match(css, /\.customer-nav-page > :first-child\s*\{\s*padding-bottom: var\(--customer-bottom-nav-clearance\)/);
  assert.match(css, /\.customer-nav-page \.customer-nav-inner-scroll\s*\{\s*padding-bottom: var\(--customer-bottom-nav-clearance\)/);
  assert.match(css, /scroll-padding-bottom: var\(--customer-bottom-nav-clearance\)/);
});

test("Home, Discover, Map, Profile and every subpage can scroll last controls above the nav", () => {
  assert.match(app, /className="customer-nav-inner-scroll flex-1 overflow-y-auto p-6 space-y-8"/);
  assert.match(app, /className="customer-nav-inner-scroll flex-grow overflow-y-auto max-w-screen-xl mx-auto w-full"/);
  assert.match(app, /className="customer-nav-inner-scroll flex-grow overflow-y-auto px-4 pt-28 space-y-4"/);
  for(const name of ["HomeScreen","DiscoverScreen","ExploreScreen","StoreInfoScreen","ProfileScreen"]) {
    assert.match(app, new RegExp("function " + name + "\\("));
  }
  for(const path of [
    "src/screens/SettingsScreen.tsx",
    "src/screens/NotificationsScreen.tsx",
    "src/screens/OrderHistoryScreen.tsx",
    "src/screens/ContactScreen.tsx",
    "src/screens/PickupTrackingScreen.tsx"
  ]) {
    const page = read(path);
    assert.match(page, /min-h-screen/);
    assert.match(page, /<button/, "interactive actions should remain visible on " + path);
  }
  // The nav remains fixed and its 5 existing routes stay unchanged.
  for(const route of ["home","discover","explore","profile","orders"]) {
    assert.match(nav, new RegExp('id="nav-tab-' + route + '"'));
  }
  assert.match(nav, /fixed bottom-0 left-0 right-0 z-50/);
});

test("floating cart, active pickup tracker and help never sit underneath the nav", () => {
  const cart = read("src/components/FloatingCartButton.tsx");
  const tracker = read("src/components/ActiveOrderMiniTracker.tsx");
  const help = read("src/components/AppHelp.tsx");
  assert.match(cart, /bottom-\[var\(--customer-bottom-nav-clearance\)\]/);
  assert.match(tracker, /bottom-\[var\(--customer-bottom-nav-clearance\)\]/);
  assert.match(tracker, /bottom-\[calc\(var\(--customer-bottom-nav-clearance\)\+5\.5rem\)\]/);
  assert.equal((help.match(/bottom-\[var\(--customer-bottom-nav-clearance\)\]/g)||[]).length,2);
  assert.doesNotMatch(cart,/fixed bottom-20/);
  assert.doesNotMatch(tracker,/bottom-\[74px\]/);
  assert.match(app, /<BottomNavigation/);
});

test("checkout and authentication screens do not inherit persistent-nav screen spacing", () => {
  const navScreens = nav.slice(nav.indexOf("export const customerNavScreens:"),nav.indexOf("export const BottomNavigation:"));
  for(const screen of ["checkout","login","signup","order-success","reset-password","splash","complete-profile"]) {
    assert.doesNotMatch(navScreens,new RegExp('"' + screen + '"'));
  }
  const checkout = read("src/screens/CheckoutScreen.tsx");
  assert.match(checkout, /pickupOrderingEnabled\(\)/);
  assert.match(app, /currentScreen === "checkout"/);
  assert.match(app, /currentScreen === "order-history"/);
});
