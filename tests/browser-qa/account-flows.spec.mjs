import {test,expect} from "@playwright/test";
import {randomUUID} from "node:crypto";

const BASE="http://127.0.0.1:4174";
const syntheticWrites = new WeakSet();
test.beforeEach(async({page,request})=>{
  await page.addInitScript(()=>{
    localStorage.setItem("localeats_tour_seen","true");
    localStorage.setItem("localeats_interactive_tour_seen","true");
  });
  // Hard deny all internet services. Writes require an explicit per-test synthetic fixture. Tests may
  // reach only Vite and the localhost demo Firebase Auth/Firestore emulators.
  await page.route("**/*",async route=>{
    const url=new URL(route.request().url());
    const allowed=["127.0.0.1","localhost"].includes(url.hostname)&&
      ["4174","9099","8080"].includes(url.port);
    if(!allowed)return route.abort("blockedbyclient");
    if(url.port==="4174"&&url.pathname.startsWith("/api/")){
      // Synthetic central profile reads use the local Auth emulator's verified
      // account and existing seeded Firestore fixture. Only opted-in tests may
      // mutate this localhost fixture. This is not hosted Supabase acceptance.
      if(url.pathname==="/api/v1/profiles/me" && (route.request().method()==="GET" || route.request().method()==="PATCH" && syntheticWrites.has(page))){
        const header=route.request().headers().authorization||"";
        const token=header.startsWith("Bearer fb-")?header.slice(10):"";
        const lookup=token?await request.post("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:lookup?key=demo",{data:{idToken:token}}):null;
        const account=lookup?.ok()?(await lookup.json()).users?.[0]:null;
        if(!account?.localId||!account.email)return route.fulfill({status:401,contentType:"application/json",body:JSON.stringify({success:false})});
        const stored=await request.get("http://127.0.0.1:8080/v1/projects/demo-localeats-browser-qa/databases/(default)/documents/profiles/"+encodeURIComponent(account.localId));
        if(route.request().method()==="PATCH") {
          const body=route.request().postDataJSON();
          const existing=stored.ok()?await stored.json():null;
          if((existing?.updateTime??null)!==body.expectedRevision)return route.fulfill({status:409,contentType:"application/json",body:JSON.stringify({success:false,code:"PROFILE_CONFLICT"})});
          const fields={...(existing?.fields||{}),user_id:{stringValue:account.localId},email:{stringValue:account.email}};
          for(const [key,value] of Object.entries(body.profile||{}))fields[key]=value===null?{nullValue:null}:typeof value==='number'?{doubleValue:value}:{stringValue:String(value)};
          const name="projects/demo-localeats-browser-qa/databases/(default)/documents/profiles/"+account.localId;
          const saved=await request.post("http://127.0.0.1:8080/v1/projects/demo-localeats-browser-qa/databases/(default)/documents:commit",{data:{writes:[{update:{name,fields},currentDocument:existing?{updateTime:existing.updateTime}:{exists:false}}]}});
          if(!saved.ok())throw new Error("Local fixture persistence failed: "+saved.status()+" "+await saved.text());
          const doc=await (await request.get("http://127.0.0.1:8080/v1/"+name)).json();
          const profile=Object.fromEntries(Object.entries(doc.fields||{}).map(([key,value])=>[key,value.arrayValue?(value.arrayValue.values||[]).map(item=>item.stringValue):value.doubleValue??value.stringValue??null]));
          profile.updated_at=doc.updateTime;
          return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true,profile,revision:doc.updateTime})});
        }
        if(stored.status()===404)return route.fulfill({status:404,contentType:"application/json",body:JSON.stringify({success:false,code:"PROFILE_NOT_FOUND"})});
        if(!stored.ok())return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({success:false})});
        const doc=await stored.json();
        const profile=Object.fromEntries(Object.entries(doc.fields||{}).map(([key,value])=>[key,value.arrayValue?(value.arrayValue.values||[]).map(item=>item.stringValue):value.stringValue??null]));
        profile.user_id=account.localId;profile.updated_at=doc.updateTime;
        return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true,profile,revision:doc.updateTime})});
      }
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
  return{email:data.email,password,uid:data.localId};
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
    favorites:{arrayValue:{values:[{stringValue:"qa-fixture-favorite"}]}},
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
  await chooseEssentialCookiesIfNeeded(page);
  await page.getByText("Explore as Guest").click();
  await expect(page.locator("#nav-tab-profile")).toBeVisible({timeout:25000});
  await chooseEssentialCookiesIfNeeded(page);
}
async function login(page,account){
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Explore as Guest")).toBeVisible({timeout:30000});
  await acknowledgePopiaIfShown(page);
  await chooseEssentialCookiesIfNeeded(page);
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
  await seedFakeProfile(request,account);
  const profileMutations=[];
  page.on("request",req=>{
    const url=new URL(req.url());
    if(url.port==="4174"&&["/api/profiles","/api/v1/profiles/me"].includes(url.pathname)&&["POST","PATCH","PUT","DELETE"].includes(req.method()))profileMutations.push(req.method());
  });
  await login(page,account);
  await page.locator("#nav-tab-profile").click();
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  // Deliberately span the legacy delayed login + success redirect timers.
  // A user who opens Profile immediately after login must keep that screen.
  await page.waitForTimeout(4000);
  await expect(page.getByPlaceholder("Your full name")).toBeVisible({timeout:2000});
  await expect(page.getByPlaceholder("Your full name")).toHaveValue("QA Original");
  expect(profileMutations).toEqual([]);
  await page.getByRole("button",{name:"Sign Out",exact:true}).click();
  await expect(page.getByText("Explore as Guest")).toBeVisible({timeout:20000});
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Explore as Guest")).toBeVisible();
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
  // Keyboard activation tests the same UI handler without assuming stable
  // scrolling/pointer hit targets; pointer usability is a separate BLOCKED gate.
  const signOut = page.getByRole("button",{name:"Sign Out",exact:true});
  await signOut.focus();
  await signOut.press("Enter");
  await expect(page.getByText("Explore as Guest")).toBeVisible({timeout:25000});
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Explore as Guest")).toBeVisible({timeout:25000});
  await login(page,accountB);
  await page.locator("#nav-tab-profile").click();
  const emailInput=page.locator('input[type="email"][readonly]').first();
  await expect(emailInput).toBeVisible();
  await expect(emailInput).toHaveValue(accountB.email.toLowerCase());
  await expect(emailInput).not.toHaveValue(accountA.email.toLowerCase());
});
test("offline profile-save attempt never reports synchronized success",async({page,request,context})=>{
  const account=await createAccount(request,"offline");
  await login(page,account);
  await page.locator("#nav-tab-profile").click();
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  await page.getByPlaceholder("Your full name").fill("Offline QA edit");
  await expect(page.getByRole("button",{name:"Save Profile Changes"})).toBeVisible();
  await context.setOffline(true);
  await expect.poll(()=>page.evaluate(()=>navigator.onLine)).toBe(false);
  await page.getByRole("button",{name:"Save Profile Changes"}).click();
  await expect(page.getByText("No internet connection. Your changes are still in this form.")).toBeVisible();
  await expect(page.getByText("Profile Saved",{exact:true})).toHaveCount(0);
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
  // Record even short-lived success UI; a later error must not hide a false receipt.
  await page.evaluate(()=>{
    window.__qaProfileSuccessSeen=false;
    const observer=new MutationObserver(()=>{
      if(document.body.innerText.includes("Profile saved & updated!"))window.__qaProfileSuccessSeen=true;
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  });
  await page.getByRole("button",{name:"Save Profile Changes"}).click();
  await expect(page.getByText("Account details could not be confirmed. Please retry.",{exact:true}).first()).toBeVisible({timeout:15000});
  await expect.poll(()=>page.evaluate(()=>window.__qaProfileSuccessSeen)).toBe(false);
  await expect(page.getByText("Profile saved & updated!")).toHaveCount(0);
  await expect(page.getByText("Profile Saved",{exact:true})).toHaveCount(0);
});

test("pointer-acceptance: Profile Sign Out is stable and revokes authentication",async({page,request,isMobile})=>{
  const account=await createAccount(request,"pointer-logout");
  await login(page,account);
  await page.locator("#nav-tab-profile").click();
  await expect(page.getByPlaceholder("Your full name")).toBeVisible();
  // No force/dispatchEvent: this is a real mouse interaction acceptance gate.
  const signOut=page.getByRole("button",{name:"Sign Out",exact:true});
  if(isMobile)await signOut.tap({timeout:12000});else await signOut.click({timeout:12000});
  await page.goto(BASE,{waitUntil:"domcontentloaded"});
  await expect(page.getByText("Explore as Guest")).toBeVisible({timeout:20000});
});

test("pointer-acceptance: Profile Save can be clicked without layout fighting",async({page,request,isMobile})=>{
  const account=await createAccount(request,"pointer-save");
  await seedFakeProfile(request,account);
  await login(page,account);
  await page.locator("#nav-tab-profile").click();
  await expect(page.getByPlaceholder("Your full name")).toHaveValue("QA Original",{timeout:15000});
  await page.getByPlaceholder("Your full name").fill("Pointer QA Pending");
  const save=page.getByRole("button",{name:"Save Profile Changes"});
  if(isMobile)await save.tap({timeout:12000});else await save.click({timeout:12000});
  await expect(page.getByText("Account details could not be confirmed. Please retry.",{exact:true}).first()).toBeVisible({timeout:15000});
  await expect(page.getByText("Profile Saved",{exact:true})).toHaveCount(0);
});


test("synthetic central profile save survives reload and a fresh sign-in without requiring a home address",async({page,request})=>{
  syntheticWrites.add(page);
  const account=await createAccount(request,"central-save");await seedFakeProfile(request,account);await login(page,account);
  await page.locator("#nav-tab-profile").click();
  const name=page.getByPlaceholder("Your full name");await expect(name).toHaveValue("QA Original");
  await name.fill("Saved Pickup Customer");
  const patchRequest=page.waitForRequest(req=>new URL(req.url()).pathname==='/api/v1/profiles/me'&&req.method()==='PATCH');
  await page.getByRole("button",{name:"Save Profile Changes"}).click();
  const body=(await patchRequest).postDataJSON();expect(body.profile).toEqual({fullName:"Saved Pickup Customer"});expect(body.expectedRevision).toBeTruthy();
  await expect(page.getByText("Profile saved & updated!",{exact:true})).toBeVisible();
  await page.reload({waitUntil:"domcontentloaded"});await expect(page.locator("#nav-tab-profile")).toBeVisible();await page.locator("#nav-tab-profile").click();
  await expect(name).toHaveValue("Saved Pickup Customer");
  await page.getByRole("button",{name:"Sign Out",exact:true}).click();await expect(page.getByText("Explore as Guest")).toBeVisible();await login(page,account);
  await page.locator("#nav-tab-profile").click();await expect(name).toHaveValue("Saved Pickup Customer");
});

test("synthetic stale profile revision preserves the customer's draft instead of overwriting another session",async({page,request})=>{
  syntheticWrites.add(page);
  const account=await createAccount(request,"central-conflict");await seedFakeProfile(request,account);await login(page,account);
  await page.locator("#nav-tab-profile").click();const name=page.getByPlaceholder("Your full name");await expect(name).toHaveValue("QA Original");
  await name.fill("My Unsaved Draft");
  const url="http://127.0.0.1:8080/v1/projects/demo-localeats-browser-qa/databases/(default)/documents/profiles/"+account.uid;
  const prior=await (await request.get(url)).json();await request.patch(url,{data:{fields:{...prior.fields,fullName:{stringValue:"Other Session"}}}});
  await page.getByRole("button",{name:"Save Profile Changes"}).click();
  await expect(page.getByText("Your details changed in another session. Reload them before saving again.",{exact:true})).toBeVisible();
  await expect(name).toHaveValue("My Unsaved Draft");
  const stored=await (await request.get(url)).json();expect(stored.fields.fullName.stringValue).toBe("Other Session");
  await expect(page.getByText("Profile saved & updated!",{exact:true})).toHaveCount(0);
});


test("registration profile failure preserves the draft for confirmed recovery",async({page,request})=>{
  const email='qa-register-'+randomUUID()+'@example.test';
  const password='Synthetic-Registration-7788';let creations=0;
  page.on('request',req=>{if(req.url().includes('accounts:signUp'))creations++;});
  await page.goto(BASE,{waitUntil:'domcontentloaded'});await expect(page.getByText('Explore as Guest')).toBeVisible();
  await acknowledgePopiaIfShown(page);await chooseEssentialCookiesIfNeeded(page);
  await page.getByRole('button',{name:'Log In',exact:true}).click();
  await page.getByRole('button',{name:'Sign Up',exact:true}).click();
  await page.getByPlaceholder('Enter your full name').fill('Recovery Pickup Customer');
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('e.g. +27 71 234 5678').fill('0712345678');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.locator('input[type="password"]').nth(0).fill(password);
  await page.locator('input[type="password"]').nth(1).fill(password);
  const created=page.waitForResponse(response=>response.url().includes('accounts:signUp'));
  await page.getByRole('button',{name:'Create Account',exact:true}).click();
  const account=await (await created).json();expect(account.localId).toBeTruthy();
  await expect(page.getByRole('heading',{name:'Complete Your Profile',exact:true})).toBeVisible();
  await expect(page.getByPlaceholder('e.g. John Doe')).toHaveValue('Recovery Pickup Customer');
  await expect(page.getByPlaceholder('e.g. +27 71 234 5678')).toHaveValue(/71.*234.*5678/);
  const documentUrl='http://127.0.0.1:8080/v1/projects/demo-localeats-browser-qa/databases/(default)/documents/profiles/'+account.localId;
  expect((await request.get(documentUrl)).status()).toBe(404);
  syntheticWrites.add(page);
  await page.getByRole('button',{name:'Save Profile Info',exact:true}).click();
  await expect(page.getByText('Profile saved to your account.',{exact:true})).toBeVisible();
  const stored=await (await request.get(documentUrl)).json();expect(stored.fields.fullName.stringValue).toBe('Recovery Pickup Customer');
  expect(creations).toBe(1);
  await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('#nav-tab-profile')).toBeVisible();await page.locator('#nav-tab-profile').click();
  await expect(page.getByPlaceholder('Your full name')).toHaveValue('Recovery Pickup Customer');
});


test('address editor preserves failed drafts and isolates account changes',async({page,request})=>{
 const accountA=await createAccount(request,'address-A'),accountB=await createAccount(request,'address-B');await seedFakeProfile(request,accountA);await seedFakeProfile(request,accountB);
 await login(page,accountA);await page.locator('#nav-tab-profile').click();await expect(page.getByPlaceholder('Your full name')).toHaveValue('QA Original');await page.locator('#nav-tab-home').click();
 await page.getByTitle('Change saved home address',{exact:true}).click();
 const address=page.getByPlaceholder('e.g. 7115 Vilakazi Street, Orlando West');await address.fill('Private A unsaved street');await page.getByRole('button',{name:'Set',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Account details could not be confirmed');await expect(address).toHaveValue('Private A unsaved street');
 await page.keyboard.press('Escape');await expect(address).toHaveCount(0);
 await page.locator('#nav-tab-profile').click();await page.getByRole('button',{name:'Sign Out',exact:true}).click();await expect(page.getByText('Explore as Guest')).toBeVisible();
 await login(page,accountB);await page.locator('#nav-tab-profile').click();await expect(page.getByPlaceholder('Your full name')).toHaveValue('QA Original');await page.locator('#nav-tab-home').click();
 await page.getByTitle('Change saved home address',{exact:true}).click();await expect(address).toHaveValue('Demo 1 Local Test Street');await expect(address).not.toHaveValue('Private A unsaved street');
 syntheticWrites.add(page);await address.fill('Confirmed B home street');await page.getByRole('button',{name:'Set',exact:true}).click();await expect(address).toHaveCount(0);
 const root='http://127.0.0.1:8080/v1/projects/demo-localeats-browser-qa/databases/(default)/documents/profiles/';
 const savedB=await (await request.get(root+accountB.uid)).json();expect(savedB.fields.address.stringValue).toBe('Confirmed B home street');
 const savedA=await (await request.get(root+accountA.uid)).json();expect(savedA.fields.address.stringValue).toBe('Demo 1 Local Test Street');
});
