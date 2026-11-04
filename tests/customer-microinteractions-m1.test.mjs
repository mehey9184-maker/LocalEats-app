import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { customerPullDistance } from "../src/hooks/useCustomerPullToRefresh.ts";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const app = read("src/App.tsx");
const cart = read("src/components/CartDrawer.tsx");
const bottomSheet = read("src/components/BottomSheet.tsx");
const floatCart = read("src/components/FloatingCartButton.tsx");
const micro = read("src/components/CustomerMicroMotion.tsx");
const rolling = read("src/components/CustomerRollingAmount.tsx");
const history = read("src/screens/OrderHistoryScreen.tsx");
const notices = read("src/screens/NotificationsScreen.tsx");
const checkout = read("src/screens/CheckoutScreen.tsx");
const css = read("src/index.css");

test("M1: original Home ShopCard remains instantly visible; cascade only low-stakes secondary lists", () => {
 assert.match(app, /import \{ ShopCard, MenuItemSkeleton, MenuItemCard \}/);
 assert.match(app, /<ShopCard[\s\S]*?shop=\{shop\}/);
 assert.match(app, /<ShopCard[\s\S]*?readOnlyClosed/);
 assert.doesNotMatch(app, /staggerChildren|reduceCustomerMotion|<motion\.div key=\{shop\.id\}/);
 assert.match(cart, /Math\.min\(idx \* 0\.07, 0\.42\)/);
 assert.match(history, /Math\.min\(index \* 0\.07, 0\.42\)/);
 assert.match(notices, /Math\.min\(index \* 0\.07, 0\.42\)/);
 assert.doesNotMatch(app, /shop\.latitude\s*=|shop\.longitude\s*=/);
});

test("M1: cart flight reflects accepted LOCAL cart changes, never order confirmation", () => {
 assert.match(app, /setCart\(\[buildCartItemNode\(quantity\)\]\);\s*notifyLocalCartAdded/);
 assert.match(app, /notifyLocalCartAdded\(item\.image \|\| ""\)/);
 assert.match(app, /<CartFlightFeedback\s*\/>/);
 assert.match(floatCart, /data-customer-cart-target/);
 assert.match(floatCart, /<motion\.span key=\{totalCount\}/);
 assert.match(micro, /localeats:local-cart-added/);
 assert.match(micro, /requestAnimationFrame|window\.setTimeout/);
 assert.match(micro, /pointer-events-none/);
 assert.match(micro, /useReducedMotion/);
 assert.match(micro, /x: \[0,/);
 assert.match(micro, /y: \[0,/);
});

test("M1: checkout progress cannot misrepresent P7 no-write test as real order", () => {
 assert.match(checkout, /setP7TestCompleted\(true\)/);
 assert.match(checkout, /Test flow completed\. Nothing was submitted/);
 assert.match(checkout, /Simulation complete · no order/);
 assert.match(checkout, /aria-busy=\{loading\}/);
 assert.match(checkout, /<Loader2 className="w-5 h-5 animate-spin/);
 assert.match(checkout, /motion\.circle/);
 assert.match(checkout, /motion\.path/);
 assert.match(checkout, /if\(!pickupOrderingEnabled\(\)\)blockPickupSubmission\(\)/);
 assert.match(cart, /!pickupOrderingEnabled\(\)/);
});

test("M1: totals roll only as locally estimated, not confirmed payments", () => {
 assert.match(rolling, /useReducedMotion/);
 assert.match(rolling, /Math\.min\(index \* 0\.045, 0\.24\)/);
 assert.match(floatCart, /<CustomerRollingAmount value=\{subtotal\}/);
 assert.match(cart, /<CustomerRollingAmount value=\{subtotal\}/);
 assert.match(cart, /Est\. Total/);
 assert.match(cart, /Server-confirmed total/);
});

test("M1: Food Cart expands with 350ms ease-out without changing other sheet defaults", () => {
 assert.match(cart, /<BottomSheet[\\s\\S]*?easeOutMotion/);
 assert.match(bottomSheet, /easeOutMotion = false/);
 assert.match(bottomSheet, /easeOutMotion \\? \\{ duration: 0\\.35, ease: \\[0\\.22, 1, 0\\.36, 1\\] \\}/);
 assert.match(bottomSheet, /reduceMotion \\? \\{ duration: 0 \\}/);
});

test("M1: only read notifications can swipe to dismiss; the bell only swings on increase", () => {
 assert.match(notices, /drag=\{n\.read && !reduceMotion \? "x" : false\}/);
 assert.match(notices, /n\.read && Math\.abs\(info\.offset\.x\) > 100\) onDelete\(n\.id\)/);
 assert.match(notices, /Math\.min\(index \* 0\.07, 0\.42\)/);
 assert.match(micro, /if \(unreadCount > previous\.current\)/);
 assert.match(micro, /rotate: \[0, 16, -12, 8, -4, 0\]/);
 assert.match(app, /<CustomerNotificationBell unreadCount=\{unreadCount\}/);
});

test("M1: confirmed history alone supports 35% resisted pull and cascade", () => {
 assert.equal(customerPullDistance(-15), 0);
 assert.equal(customerPullDistance(100), 35);
 assert.equal(customerPullDistance(600), 56);
 assert.match(history, /useCustomerPullToRefresh\(Boolean\(ownerUid\) && loadState !== "loading", onRefresh\)/);
 assert.match(history, /Release to refresh history/);
 assert.match(history, /confirmedCustomerPickupOrders\(pickupOrders,ownerUid\)/);
 assert.match(history, /Math\.min\(index \* 0\.07, 0\.42\)/);
 assert.match(css, /button\.client-tap-spring:not\(:disabled\):active/);
 assert.match(css, /transform: scale\(0\.95\)/);
 assert.match(css, /prefers-reduced-motion: reduce/);
});
