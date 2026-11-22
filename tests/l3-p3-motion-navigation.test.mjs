import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const bottom=src("src/components/BottomSheet.tsx");
const navigation=src("src/components/BottomNavigation.tsx");
const floating=src("src/components/FloatingCartButton.tsx");
const toast=src("src/components/AppNotificationToast.tsx");
const shop=src("src/components/ShopCard.tsx");
const cart=src("src/components/CartDrawer.tsx");
const settings=src("src/screens/SettingsScreen.tsx");
const app=src("src/App.tsx");

test("five original navigation tabs remain with focus outlines and active-state semantics",()=>{
 for(const tab of ["home","discover","explore","orders","profile"]){
  assert.match(navigation,new RegExp('id="nav-tab-'+tab+'"'));
 }
 assert.match(navigation,/aria-current=/);
 assert.match(navigation,/focus-visible:outline-orange-500/);
 assert.match(navigation,/if \(screen === currentScreen\) return/);
 assert.match(navigation,/activeOrdersCount > 0/);
 assert.match(navigation,/onNavigate\(screen\)/);
});
test("navigation badge does not run an infinite attention-grabbing pulse",()=>{
 assert.doesNotMatch(navigation,/animate-ping/);
 assert.match(navigation,/active pickup/);
 assert.match(navigation,/motion-reduce:transition-none/);
 assert.match(navigation,/useReducedMotion\(\)/);
});
test("floating cart respects reduced motion, exits with AnimatePresence and labels estimated total",()=>{
 assert.match(floating,/useReducedMotion\(\)/);
 assert.match(floating,/<AnimatePresence initial=\{false\}>/);
 assert.match(floating,/isVisible && <motion\.div/);
 assert.match(floating,/Est\. R \{subtotal\.toFixed\(2\)\}/);
 assert.match(floating,/estimated subtotal R/);
 assert.match(floating,/safe-area-inset-bottom/);
 assert.doesNotMatch(floating,/checkout succeeded|order confirmed/i);
});
test("pickup bottom sheet is keyboard-operable and restores focus",()=>{
 assert.match(bottom,/role="dialog"/);
 assert.match(bottom,/aria-modal="true"/);
 assert.match(bottom,/aria-labelledby=/);
 assert.match(bottom,/aria-describedby=/);
 assert.match(bottom,/tabIndex=\{-1\}/);
 assert.match(bottom,/event\.key === "Escape"/);
 assert.match(bottom,/event\.key === "Tab"/);
 assert.match(bottom,/previouslyFocused\.focus/);
 assert.match(bottom,/closeRef\.current\(\)/);
 assert.match(bottom,/aria-label="Close sheet"/);
 assert.match(bottom,/transition=\{reduceMotion \?/);
});
test("notification toasts stay top anchored and respect reduced motion while persistent prompts are dialogs",()=>{
 assert.match(toast,/useReducedMotion\(\)/);
 assert.match(toast,/top-\[calc\(env\(safe-area-inset-top/);
 assert.match(toast,/role=\{notification\.persistent \? "alertdialog"/);
 assert.match(toast,/aria-modal=\{notification\.persistent/);
 assert.match(toast,/!notification\.persistent && !reduceMotion/);
 assert.match(toast,/aria-label="Dismiss notification"/);
 assert.match(toast,/onDismiss\(\)/);
});
test("customer original shop/menu cards disable scaling in reduced motion",()=>{
 assert.equal((shop.match(/useReducedMotion\(\)/g)||[]).length,2);
 assert.match(shop,/layoutId=\{reduceMotion \? undefined/);
 assert.match(shop,/whileTap=\{reduceMotion \? undefined/);
 assert.match(shop,/whileHover=\{reduceMotion \? undefined/);
 assert.match(shop,/Outside the 4 kilometer pickup area/);
});
test("cart quantity animations obey reduced motion; pickup quantity guard stays",()=>{
 assert.match(cart,/const reduceMotion=useReducedMotion\(\)/);
 assert.match(cart,/initial=\{reduceMotion \? false/);
 assert.match(cart,/transition=\{reduceMotion \? \{duration:0\}/);
 assert.match(cart,/MAX_PICKUP_ITEM_QUANTITY/);
 assert.match(cart,/fulfillment = "collection"/);
});
test("settings navigation and toggles are keyboard accessible, no delivery-first copy",()=>{
 assert.match(settings,/<button\s+type="button"\s+onClick=\{\(\) => handleAction\(onProfile\)\}/);
 assert.match(settings,/aria-label=\{\`Edit profile for/);
 assert.match(settings,/aria-label="Back to previous screen"/);
 assert.match(settings,/role="switch"/);
 assert.match(settings,/aria-checked=\{!!isDarkMode\}/);
 assert.match(settings,/aria-checked=\{!!dataSaverEnabled\}/);
 assert.doesNotMatch(settings,/Manage delivery profile/);
});
test("P3 does not enable pickup, change API/image caching, or mix draft P1/P2",()=>{
 assert.match(app,/pickupOrderingEnabled/);
 assert.match(app,/AppNotificationToast/);
 assert.match(app,/BottomNavigation/);
 assert.match(app,/FloatingCartButton/);
 assert.doesNotMatch(src("src/sw.ts"),/caches\.open\([^\n]*api/i);
 // L3-P1 and L3-P2 are still independent draft work.
 assert.match(app,/readPublicBrowseCatalogProgressive/); // Combined P1 catalog was intentionally included.
 assert.doesNotMatch(app,/saveOfflineShopDirectory/);
 assert.doesNotMatch(floating,/localStorage|cacheStorage|caches\.open\(/);
});
