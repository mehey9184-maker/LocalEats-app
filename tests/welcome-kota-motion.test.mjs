import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src=(path)=>readFileSync(path,"utf8");
const welcome=src("src/screens/SplashScreen.tsx");
const photo=src("src/components/LocalKotaHeroPhoto.tsx");
const header=src("src/components/SignupFlowHeader.tsx");
const signup=src("src/screens/auth/SignUpScreen.tsx");
const password=src("src/screens/auth/SetupPasswordScreen.tsx");
const success=src("src/screens/auth/SuccessScreen.tsx");
const nav=src("src/components/BottomNavigation.tsx");
const app=src("src/App.tsx");

test("Welcome uses an actual South African kota photo, with alt, licensed attribution and fallback",()=>{
 assert.match(welcome,/LocalKotaHeroPhoto/);
 assert.doesNotMatch(welcome,/<LocalKotaIllustration/);
 assert.match(photo,/Kota%2C_Bunnychow_sa\.jpg/);
 assert.match(photo,/A real South African kota sandwich/);
 assert.match(photo,/Palesalepheana \/ Wikimedia Commons/);
 assert.match(photo,/creativecommons\.org\/licenses\/by-sa\/4\.0/);
 assert.match(photo,/onError=\{\(\)=>setImageFailed\(true\)\}/);
 assert.match(photo,/Local food image temporarily unavailable/);
 assert.match(photo,/loading="eager"/);
 assert.match(photo,/referrerPolicy="no-referrer"/);
});

test("responsive Welcome brings all actions above and below fold without fixed overlay",()=>{
 assert.match(welcome,/min-h-\[100dvh\]/);
 assert.match(welcome,/md:grid-cols-\[/);
 assert.match(welcome,/md:row-span-2/);
 assert.match(welcome,/Explore local food/);
 assert.match(welcome,/Create an account/);
 assert.match(welcome,/Sign in/);
 assert.match(welcome,/onGuestBrowse/);
 assert.match(welcome,/onNext/);
 assert.match(welcome,/onLogin/);
 assert.doesNotMatch(welcome,/onClick=\{\(\) => window\.location\.reload/);
});

test("all five signup-to-Home stages respect reduced-motion and keep actual Firebase form behavior",()=>{
 for(const [name,s] of [["Welcome",welcome],["Hero",photo],["Progress",header],["SignUp",signup],["Password",password],["Success",success],["Navigation",nav],["Screen",app]]){
  assert.match(s,/useReducedMotion/,name+" must honour reduced motion");
 }
 assert.match(header,/Step \{step\} of 2/);
 assert.match(password,/handleSignUp\(\)/);
 assert.match(signup,/handleContinue\(\)/);
 assert.match(app,/useReducedMotion/);
 assert.match(app,/reduceScreenMotion \? false/);
 assert.match(app,/reduceHomeMotion \? false/);
});

test("five original Home tab names and routes retained with accessible active state",()=>{
 for(const id of ["home","discover","explore","orders","profile"]){
  assert.match(nav,new RegExp('id="nav-tab-'+id+'"'));
 }
 for(const name of ["Home","Discover","Map","Profile"]){
  assert.match(nav,new RegExp('aria-label="'+name+'"'));
 }
 assert.match(nav,/aria-label=\{activeOrdersCount>0 \? `Orders,/);
 assert.match(nav,/active pickup/);
 assert.match(nav,/aria-label="Main navigation"/);
 assert.match(nav,/aria-current=/);
 assert.match(nav,/activeOrdersCount/);
 assert.match(nav,/ShoppingBag/);
 assert.match(nav,/UserRound/);
});

test("icon animation cannot change cart, checkout, GPS, or ordering gates",()=>{
 assert.match(app,/requestCheckout = \(\) =>/);
 assert.match(app,/checkoutReturn\.current\.request\(\)/);
 assert.match(app,/readPublicBrowseCatalog/);
 assert.match(app,/onRequestLocation/);
 assert.match(app,/Location needed to order/);
 assert.match(app,/pickupOrderingEnabled/);
 assert.doesNotMatch(photo,/createPickup|submitPickup|signUp|fetch\(/);
});
