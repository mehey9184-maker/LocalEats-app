import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const start = app.indexOf("function HomeScreen(");
const end = app.indexOf("const parseCardDetailsFromInstructions", start);
assert.ok(start >= 0 && end > start, "the original HomeScreen exists");
const home = app.slice(start, end);
const headerStart = home.indexOf('<header');
const headerEnd = home.indexOf('</header>', headerStart);
assert.ok(headerStart >= 0 && headerEnd > headerStart, "the original Home header exists");
const header = home.slice(headerStart, headerEnd);

test("Home header and chips remain mounted instead of repeatedly animating on scroll", () => {
  assert.match(header, /id="home-sticky-header"/);
  assert.match(header, /id="home-filter-chips-bar"/);
  assert.match(header, /\{currentScreen === "home" && \(/);
  assert.match(header, /filterChipsList\.map\(/);
  assert.match(header, /aria-pressed=\{isSelected\}/);
  assert.match(header, /whileTap=\{\{ scale: 0\.94 \}\}/);
  assert.doesNotMatch(home, /setShowFilters\(|\bshowFilters\b|lastScrollYRef/);
  assert.doesNotMatch(header, /key="home-filter-chips-bar"|initial=\{\{ height: 0, opacity: 0, y: -6 \}\}/);
  assert.doesNotMatch(home, /window\.addEventListener\("scroll", handleScroll|window\.addEventListener\("touchmove", handleTouchMove/);
});

test("Header height is measured before first paint and updated only on real size changes", () => {
  assert.match(home, /useLayoutEffect\(\(\) => \{/);
  assert.match(home, /const measured = header\.offsetHeight/);
  assert.match(home, /setHeaderHeight\(previous => previous === measured \? previous : measured\)/);
  assert.match(home, /new ResizeObserver\(measure\)/);
  assert.match(home, /return \(\) => observer\?\.disconnect\(\)/);
  assert.match(home, /paddingTop: headerHeight \? `calc\(\$\{headerHeight\}px \+ 1rem\)` : "120px"/);
});

test("Promotion and fixed header are visually quiet until user interaction", () => {
  assert.match(header, /bg-white\/95 dark:bg-slate-900\/95/);
  assert.match(header, /Winter Special/);
  assert.match(header, /<Tag className="w-4 h-4 shrink-0 text-orange-100" \/>/);
  assert.doesNotMatch(header, /<Tag[^\n]*animate-pulse/);
  assert.match(header, /<CustomerNotificationBell unreadCount=\{unreadCount\} \/>/);
});

test("Retain P7 original Home shop cards and cart motion independently of stable header", () => {
  assert.match(home, /<ShopCard[\s\S]*?shop=\{shop\}/);
  assert.match(home, /<ShopCard[\s\S]*?readOnlyClosed/);
  assert.match(app, /previewDisplayShop\(visibleShops,p7TestShop\)/);
  assert.match(app, /<CartFlightFeedback \/>/);
  assert.match(app, /if\(!pickupOrderingEnabled\(\)\)/);
});
