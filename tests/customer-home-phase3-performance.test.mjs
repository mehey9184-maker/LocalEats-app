import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");
const app=source("../src/App.tsx");
const home=app.slice(app.indexOf("function HomeScreen("),app.indexOf("const parseCardDetailsFromInstructions"));
const shell=source("../src/components/AppSkeletonLoader.tsx");
const card=source("../src/components/ShopCard.tsx");
const image=source("../src/components/BlurUpImage.tsx");

test("startup and first discovery share one neutral, Home-shaped shell",()=>{
 assert.match(app,/if \(isRestoringSession\) \{/);
 assert.match(app,/AppSkeletonLoader userProfile=\{\{fullName:"",city:"",address:""\}\}/);
 assert.match(home,/return <AppSkeletonLoader userProfile=\{userProfile\} \/>/);
 assert.match(shell,/LocalEatsLogo width=\{105\} height=\{26\}/);
 assert.match(shell,/grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4/);
 assert.match(shell,/rounded-\[28px\]/);
 assert.match(shell,/aria-busy="true"/);
 assert.doesNotMatch(shell,/Delivering to|Hungry|Johannesburg|Soweto|fake|Math\.random|animate-pulse|animate-\[shimmer/);
});

test("a fetched closed catalog is not hidden by an outstanding open catalog refresh",()=>{
 assert.match(home,/loadingShops && shops\.length === 0 && closedPickupShops\.length === 0 && !fetchError/);
 assert.match(home,/matchingClosedShops\.map\(/);
 assert.match(home,/readOnlyClosed/);
 assert.match(home,/\{renderedShopList\}/);
 assert.doesNotMatch(home,/ShopFeedSkeleton count=\{6\}/);
});

test("original ShopCard grid shows immediately, without cascading delayed entrance",()=>{
 const grid=home.slice(home.indexOf("const renderedShopList = useMemo"),home.indexOf("if (loadingShops && shops.length === 0"));
 assert.match(grid,/className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3/);
 assert.doesNotMatch(grid,/staggerChildren|initial="hidden"|animate="show"|<motion\.div/);
 assert.match(card,/layoutId=\{`shop-card-\$\{shop\.id\}`\}/);
 assert.doesNotMatch(card,/^        layout$/m);
 assert.match(card,/onStoreInfo\(shop\.id\)/);
});

test("only first visible approved open or closed Home shop requests priority image",()=>{
 assert.match(home,/priorityImage=\{index === 0\}/);
 assert.match(home,/priorityImage=\{sortedShops\.length === 0 && index === 0\}/);
 assert.match(card,/priorityImage = false/);
 assert.match(card,/priority=\{priorityImage\}/);
 assert.match(image,/priority = false/);
 assert.match(image,/loading=\{priority \? "eager" : "lazy"\}/);
 assert.match(image,/fetchPriority=\{priority \? "high" : "auto"\}/);
 assert.match(image,/initialSrc = priority/);
});

test("images preserve direct URL fallback and Home's original card identity",()=>{
 assert.match(image,/setDisplaySrc\(targetSrc\)/);
 assert.match(image,/setDisplaySrc\(fallbackSrc\)/);
 assert.match(image,/referrerPolicy="no-referrer"/);
 assert.match(card,/onKeyDown=\{\(event\) => \{/);
 assert.match(card,/aria-label=\{readOnlyClosed/);
 assert.match(card,/getShopStatus\(shop\)/);
});

test("existing first-session and order authority remain untouched",()=>{
 assert.match(app,/getResilientSession\(3000\)\.then/);
 assert.match(app,/readPickupCatalog\(userLocation\)/);
 assert.match(app,/homeReorderMenuItem\(currentShop,menuItem\.name,menuItem\.id\)/);
 assert.match(app,/currentScreen === "home" &&/);
 assert.doesNotMatch(home,/setShops\(DEFAULT_FALLBACK_SHOPS\)/);
});
