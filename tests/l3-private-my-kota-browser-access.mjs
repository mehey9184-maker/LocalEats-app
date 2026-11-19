import {createServer} from "vite";
import {chromium} from "playwright";
import {join} from "node:path";
import {mkdir} from "node:fs/promises";
import assert from "node:assert/strict";
const root=process.cwd();
const origin="https://localeats-customer-staging-r52d-browser.vercel.app";
const api="https://localeats-api-staging-r52d-git-54267e-mehey9184-makers-projects.vercel.app";
Object.assign(process.env,{VITE_FIREBASE_CONFIG_SOURCE:"environment",VITE_FIREBASE_API_KEY:"test-public-key",
 VITE_FIREBASE_PROJECT_ID:"localeats-staging",VITE_FIREBASE_AUTH_DOMAIN:"localeats-staging.firebaseapp.com",
 VITE_FIREBASE_STORAGE_BUCKET:"localeats-staging.firebasestorage.app",VITE_FIREBASE_MESSAGING_SENDER_ID:"9999999",
 VITE_FIREBASE_APP_ID:"1:9999999:web:fixture",VITE_LOCALEATS_API_URL:api,VITE_PICKUP_ORDERING_ENABLED:"false",
 VITE_PROFILE_WRITES_ENABLED:"false"});
const server=await createServer({root,configFile:join(root,"vite.config.ts"),server:{host:"127.0.0.1",port:4191,strictPort:true,hmr:false},
 plugins:[{name:"isolated-firebase-auth",enforce:"pre",transform(source,id){
  if(!/[\\/]src[\\/]lib[\\/]firebase\.ts$/.test(id))return;
  const needle="authInstance = getAuth(app);";
  assert.ok(source.includes(needle));
  return 'import {connectAuthEmulator} from "firebase/auth";\n'+source.replace(needle,needle+`
    connectAuthEmulator(authInstance,"http://127.0.0.1:4191",{disableWarnings:true});
    window.__fixtureAuth={
      login:email=>signInWithEmailAndPassword(authInstance,email,"local-fixture-password"),
      logout:()=>signOut(authInstance),
    };`);
 }}]});
await server.listen();
let browser;
const tokenFor=uid=>{
 const header=Buffer.from(JSON.stringify({alg:"none",typ:"JWT"})).toString("base64url");
 const payload=Buffer.from(JSON.stringify({sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,
  auth_time:Math.floor(Date.now()/1000),aud:"localeats-staging",iss:"https://securetoken.google.com/localeats-staging",
  firebase:{sign_in_provider:"password"}})).toString("base64url");
 return header+"."+payload+".fixture";
};
const output=join(root,".tmp/mykota-browser");
await mkdir(output,{recursive:true});
try{
 browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-proxy-server"]});
 for(const width of [320,390,1280]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:"block"});
 const page=await context.newPage();
 await page.addInitScript(()=>{
  const nativeFetch=window.fetch.bind(window);
  window.__privateResponsesParsed=0;
  window.fetch=async(input,init)=>{
   const privateStatus=String(input).includes("/private-test/my-kota/status");
   const options=privateStatus && window.__ignorePrivateAbort ? {...init,signal:undefined} : init;
   const response=await nativeFetch(input,options);
   if(privateStatus){
    const json=response.json.bind(response);
    response.json=async()=>{
     const body=await json();
     window.__privateResponsesParsed++;
     return body;
    };
   }
   return response;
  };
 });
 const errors=[],status=[];
 let delayApproved=false,releaseApproved=null;
 let cloudWrites=0;
 page.on("pageerror",err=>errors.push(err.message));
 await context.route("**/*",async route=>{
  const request=route.request(),url=new URL(request.url());
  const json=(value,code=200)=>route.fulfill({status:code,contentType:"application/json",
    headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"*"},body:JSON.stringify(value)});
  if(url.pathname.includes("identitytoolkit.googleapis.com/v1")){
   const body=request.postDataJSON()??{};
   if(url.pathname.endsWith("accounts:signInWithPassword")){
    const uid=body.email==="allowed@example.test"?"fixture-approved":"fixture-denied";
    return json({localId:uid,email:body.email,idToken:tokenFor(uid),refreshToken:"fixture-"+uid,expiresIn:"3600",registered:true});
   }
   if(url.pathname.endsWith("accounts:lookup")){
    const uid=JSON.parse(Buffer.from(body.idToken.split(".")[1],"base64url")).sub;
    return json({users:[{localId:uid,email:uid==="fixture-approved"?"allowed@example.test":"denied@example.test",
      emailVerified:true,providerUserInfo:[{providerId:"password"}],createdAt:"1",lastLoginAt:"1"}]});
   }
   return json({});
  }
  if(url.origin===api){
   if(url.pathname==="/health")return json({service:"localeats-api",status:"ok"});
   if(url.pathname.endsWith("/private-test/my-kota/status")){
    const bearer=request.headers()["authorization"]??"";
    let uid;try{uid=JSON.parse(Buffer.from(bearer.slice(10).split(".")[1],"base64url")).sub;}catch{}
    status.push(uid==="fixture-approved"?"allowed":"denied");
    if(uid==="fixture-approved" && delayApproved){delayApproved=false;return new Promise(resolve=>{releaseApproved=()=>{void json({success:true,eligible:true,mode:"PRIVATE_TEST_ONLY",maximum_distance_km:4}).then(resolve);};});}
    return json(uid==="fixture-approved"?{success:true,eligible:true,mode:"PRIVATE_TEST_ONLY",maximum_distance_km:4}:{success:false},uid==="fixture-approved"?200:404);
   }
   if(url.pathname.endsWith("/private-test/my-kota/shop"))return json({
     success:true,preview_only:true,simulated_location:true,can_submit:false,
     shop:{id:"private-test-my-kota-preview",name:"My-Kota PRIVATE TEST",test_only:true,distance_km:1.5,
       lat:-26,lng:28,is_active:true,location:"Simulated pickup",category:"Kota"},
     menu_items:[{id:"private-menu-item",name:"Sample Kota",price:25,is_available:true}]});
   if(request.method()!=="GET"){cloudWrites++;return json({success:false},403);}
   if(url.pathname.endsWith("/catalog/pickup-shops"))return json({success:true,shops:[]});
   if(url.pathname.endsWith("/orders"))return json({success:true,orders:[]});
   if(url.pathname.endsWith("/notifications"))return json({success:true,notifications:[]});
   return json({success:false},404);
  }
  if(url.origin===origin){
   const response=await route.fetch({url:"http://127.0.0.1:4191"+url.pathname+url.search});
   return route.fulfill({response});
  }
  if(url.origin==="http://127.0.0.1:4191")return route.continue();
  return route.abort();
 });
 await page.goto(origin,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.__fixtureAuth);
 const banner=page.getByRole("status",{name:"Private My-Kota staging test",exact:true});
 assert.equal(await banner.count(),0);
 await page.evaluate(()=>window.__fixtureAuth.login("denied@example.test"));
 await page.getByRole("button",{name:"Settings and account menu",exact:true}).waitFor({timeout:30000});
 assert.equal(await banner.count(),0);
 await page.evaluate(()=>window.__fixtureAuth.login("allowed@example.test"));
 await banner.waitFor();
 const button=page.getByRole("button",{name:"Open sample My-Kota",exact:true});
 await page.waitForFunction(()=>{
  const button=[...document.querySelectorAll("button")].find(e=>e.textContent==="Open sample My-Kota");
  if(!button)return false;
  const r=button.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return at===button || button.contains(at);
 });
 await page.waitForFunction(()=>{
  const button=[...document.querySelectorAll("button")].find(e=>e.textContent==="Open sample My-Kota");
  return button && button.getBoundingClientRect().height>=43.5;
 });
 await page.screenshot({path:join(output,"approved-"+width+".png")});
 await button.click();
 await page.getByRole("button",{name:"Exit private test",exact:true}).waitFor();
 await page.getByText("Sample Kota",{exact:true}).first().waitFor();
 assert.ok((await page.locator("body").innerText()).includes("SAMPLE ONLY"));
 assert.equal(await page.evaluate(()=>localStorage.getItem("cart")?.includes("private-test-my-kota-preview")??false),false);
 await page.getByRole("button",{name:"Exit private test",exact:true}).click();
 await page.reload({waitUntil:"domcontentloaded"});
 await button.waitFor({timeout:30000});
 assert.equal(status.at(-1),"allowed");
 await page.evaluate(()=>window.__fixtureAuth.logout());
 await banner.waitFor({state:"hidden"});
 await page.evaluate(()=>window.__fixtureAuth.login("denied@example.test"));
 assert.equal(await banner.count(),0);
 delayApproved=true;
 await page.evaluate(()=>{window.__ignorePrivateAbort=true;});
 await page.evaluate(()=>window.__fixtureAuth.login("allowed@example.test"));
 for(let attempt=0;attempt<100 && !releaseApproved;attempt++)await new Promise(resolve=>setTimeout(resolve,10));
 assert.ok(releaseApproved);
 await page.evaluate(()=>window.__fixtureAuth.login("denied@example.test"));
 const parsedBefore=await page.evaluate(()=>window.__privateResponsesParsed);
 releaseApproved();
 await page.waitForFunction(before=>window.__privateResponsesParsed>before,parsedBefore);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await banner.waitFor({state:"hidden"});
 await page.evaluate(()=>window.__fixtureAuth.logout());
 assert.equal(errors.length,0,JSON.stringify(errors));
 assert.equal(cloudWrites,0,"Private sample must not write to the API");
 console.log("MYKOTA_BROWSER_PASS",width,"approved native-Firebase session, clickable banner, original sample storefront, denied/guest, restored session and stale-account response");
 await context.close();
 }
}finally{
 await browser?.close();
 await server.close();
}
