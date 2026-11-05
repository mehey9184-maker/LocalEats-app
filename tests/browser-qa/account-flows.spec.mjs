import {test,expect} from "@playwright/test";
import {randomUUID} from "node:crypto";

const BASE="http://127.0.0.1:4174";
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem("localeats_tour_seen","true");
    localStorage.setItem("localeats_interactive_tour_seen","true");
  });
  // Hard deny all internet services and any local API write. This test may
  // reach only Vite and the localhost demo Firebase Auth/Firestore emulators.
  await page.route("**/*",async route=>{
    const url=new URL(route.request().url());
    const allowed=["127.0.0.1","localhost"].includes(url.hostname)&&
      ["4174","9099","8080"].includes(url.port);
    if(!allowed)return route.abort("blockedbyclient");
    if(url.port==="4174"&&url.pathname.startsWith("/api/")){
      return route.fulfill({status:503,contentType:"application/json",
        body:JSON.stringify({success:false,error:"Backend disabled in browser QA"})});
    }
    return route.continue();
  });
});
async function createAccount(request,label){
  const email="qa-"+label+"-"+randomUUID()+"@example.test";
  const password="LocalDemoOnly-NoRealAccounts-7788";
  const response=await request.post("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo",{
    data:{email,password,returnSecureToken:true},
    timeout:15000
  });
  expect(response.status()).toBe(200);
  const data=await response.json();
  expect(data.localId).toBeTruthy();
  return{email,password,uid:data.localId};
}
async function acknowledgePopiaIfShown(page){
  const accept=page.locator("#popia-legal-bar").getByRole("button",{name:"Accept",exact:true});
  if(await accept.isVisible()) await accept.click();
}
async function seedFakeProfile(request,account){
  const fields={
    id:{stringValue:account.uid},
    user_id:{stringValue:account.uid},
    email:{stringValue:account.email},
    fullName:{stringValue:"QA Original"},
    phone:{stringValue:"0712345678"},
    address:{stringValue:"Demo 1 Local Test Street"},
    city:{stringValue:"Johannesburg"},
    country:{stringValue:"South Africa"},
  };
  const url="http://127.0.0.1:8080/v1/projects/demo-localeats-browser-qa/databases/(default)/documents/profiles/"+account.uid;
  const response=await request.patch(url,{data:{fields},timeout:15000});
  expect(response.ok()).toBeTruthy();
}
async function chooseEssentialCookiesIfNeeded(page){
  const alreadyChosen=await page.evaluate(()=>Boolean(localStorage.getItem("localeats_cookie_preferences")));
  if(alreadyChosen)return;
  // The real cookie banner appears 1200 ms after mount and overlaps the bottom nav.
  const banner=page.locator("#cookie-consent-banner");
  await expect(banner).toBeVisible({timeout:7000});
  await banner.getByRole("button",{name:"Essential Only",exact:true}).click();
  await expect(banner).toHaveCount(0);
}
async function browseAsGuest(page){
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Explore as Guest")).toBeVisible({timeout:30000});
  await acknowledgePopiaIfShown(page);
  await page.getByText("Explore as Guest").click();
  await expect(page.locator("#nav-tab-profile")).toBeVisible({timeout:25000});
  await chooseEssentialCookiesIfNeeded(page);
}
async function login(page,account){
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Explore as Guest")).toBeVisible({timeout:30000});
  await acknowledgePopiaIfShown(page);
  const start=page.getByRole("button",{name:"Log In",exact:true});
  await expect(start).toBeVisible({timeout:20000});
  await start.click();
  await expect(page.locator("#login-email-input")).toBeVisible({timeout:25000});
  await page.locator("#login-email-input").fill(account.email);
  await page.locator("#login-password-input").fill(account.password);
  await page.locator("#login-submit-btn").click();
  const home=page.getByRole("button",{name:"Go to Home"});
  if(await home.isVisible({timeout:12000}).catch(()=>false))await home.click();
  await expect(page.locator("#nav-tab-profile")).toBeVisible({timeout:25000});
  await chooseEssentialCookiesIfNeeded(page);
}
test("guest browser Profile tab goes straight to Login; no editable personal form",async({page})=>{
  const posted=[];
  page.on("request",req=>{
    if(req.method()!=="GET"&&/\/api\/(profiles|orders|pickup)/.test(req.url()))posted.push(req.url());
  });
  await browseAsGuest(page);
  await page.locator("#nav-tab-profile").click();
  await expect(page.locator("#login-email-input")).toBeVisible({timeout:15000});
  await expect(page.getByRole("button",{name:"Save Profile Changes"})).toHaveCount(0);
  expect(posted).toEqual([]);
});
test("demo-account login displays registered Profile; logout revokes access",async({page,request})=>{
  const account=await createAccount(request,"logout");
  await login(page,account);
  await page.locator("#nav-tab-profile").click();
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  await page.getByRole("button",{name:"Sign Out",exact:true}).click();
  await expect(page.getByText("Explore as Guest")).toBeVisible({timeout:20000});
  await page.getByText("Explore as Guest").click();
  await page.locator("#nav-tab-profile").click();
  await expect(page.locator("#login-email-input")).toBeVisible();
});
test("switching from account A to B does not show A email or cache",async({page,request})=>{
  const accountA=await createAccount(request,"A");
  const accountB=await createAccount(request,"B");
  await login(page,accountA);
  await page.locator("#nav-tab-profile").click();
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  await page.getByRole("button",{name:"Sign Out",exact:true}).click();
  await expect(page.getByText("Explore as Guest")).toBeVisible();
  await login(page,accountB);
  await page.locator("#nav-tab-profile").click();
  const emailInput=page.locator('input[type="email"][readonly]').first();
  await expect(emailInput).toBeVisible();
  await expect(emailInput).toHaveValue(accountB.email);
  await expect(emailInput).not.toHaveValue(accountA.email);
});
test("offline profile-save attempt never reports synchronized success",async({page,request,context})=>{
  const account=await createAccount(request,"offline");
  await login(page,account);
  await page.locator("#nav-tab-profile").click();
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  await page.getByPlaceholder("Your full name").fill("Offline QA edit");
  await expect(page.getByRole("button",{name:"Save Profile Changes"})).toBeVisible();
  await context.setOffline(true);
  // Exercise the actual click handler while bypassing a known moving-button animation.
  // Pointer-level stability remains an independent UI acceptance gate.
  await page.getByRole("button",{name:"Save Profile Changes"}).click({force:true});
  await expect(page.getByText("No internet connection. Cannot save profile changes.")).toBeVisible();
  await expect(page.getByText("Profile Saved & Synchronized")).toHaveCount(0);
});
test("failed profile API never produces a saved-success toast",async({page,request})=>{
  const account=await createAccount(request,"unconfirmed");
  await seedFakeProfile(request,account);
  await login(page,account);
  await page.locator("#nav-tab-profile").click();
  await expect(page.getByPlaceholder("Your full name")).toHaveValue("QA Original",{timeout:15000});
  await page.getByPlaceholder("Your full name").fill("Browser QA Pending");
  await page.getByPlaceholder(/e.g. 071 234/).fill("0712345678");
  // The address must not be invented. Incomplete form or unavailable backend
  // must not produce a fabricated "profile saved to cloud" receipt.
  // Exercise the actual click handler while bypassing a known moving-button animation.
  // Pointer-level stability remains an independent UI acceptance gate.
  await page.getByRole("button",{name:"Save Profile Changes"}).click({force:true});
  await expect(page.getByText("Backend disabled in browser QA")).toBeVisible({timeout:15000});
  await expect(page.getByText("Profile saved & updated!")).toHaveCount(0);
  await expect(page.getByText("Profile Saved & Synchronized")).toHaveCount(0);
});
