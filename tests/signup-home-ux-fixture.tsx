/**
 * UI-only test harness: actual Welcome, Signup, Password and Success screens.
 * Authentication submission is never called. Simulated email-success transition
 * exists ONLY here; it does not get bundled into the Customer app.
 */
import React, {useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {Search, MapPin, Bell} from "lucide-react";
import {SplashScreen} from "../src/screens/SplashScreen";
import {SignUpScreen, SetupPasswordScreen, SuccessScreen} from "../src/screens/auth";
import {LocalEatsLogo} from "../src/components/LocalEatsLogo";
import {ShopCard} from "../src/components/ShopCard";
import {BottomNavigation} from "../src/components/BottomNavigation";
import {mapPickupShop} from "../src/services/pickupMapping";
import type {Screen} from "../src/types";
import "../src/index.css";

type Stage="welcome"|"signup"|"password"|"verify"|"home"|"login";
type Details={fullName:string;email:string;phone:string};
const fixtureShop=mapPickupShop({
 id:"shop-my-kota-ivory-park",name:"My-Kota",category:"Street Food",
 lat:-25.983,lng:28.2075,is_active:false,location:"Katlego Street, Ivory Park",
 rating:0,distance_km:undefined
},[{id:"synthetic-r25",name:"CHEEZE, PALONE AND MEAT",price:25,is_available:true}]);

declare global {
 interface Window {
  __localeatsSimulateSubmission?:()=>void;
  __localeatsSimulatedDetails?:Details;
 }
}
function AppFixture(){
 const [stage,setStage]=useState<Stage>("welcome");
 const [details,setDetails]=useState<Details>({fullName:"",email:"",phone:""});
 const [message,setMessage]=useState("");
 useEffect(()=>{
  window.__localeatsSimulateSubmission=()=>{if(stage==="password")setStage("verify");};
  window.__localeatsSimulatedDetails=details;
  return ()=>{delete window.__localeatsSimulateSubmission;delete window.__localeatsSimulatedDetails;};
 },[stage,details]);
 const notification=(event:{message?:string})=>setMessage(event?.message||"");
 return <>
  {stage==="welcome"&&<SplashScreen session={null} userProfile={null}
    onNext={()=>setStage("signup")} onLogin={()=>setStage("login")} onGuestBrowse={()=>setStage("home")}/>}
  {stage==="signup"&&<SignUpScreen onNext={value=>{setDetails(value);setStage("password");}}
    onLogin={()=>setStage("login")} onBack={()=>setStage("welcome")} setNotification={notification}/>}
  {stage==="password"&&<SetupPasswordScreen
    signupData={details} onNext={()=>setStage("verify")} onBack={()=>setStage("signup")}
    setNotification={notification} runWithProcessing={async()=>{throw Error("No auth operations allowed in fixture");}}/>}
  {stage==="verify"&&<SuccessScreen email={details.email} onExplore={()=>setStage("home")} onCompleteProfile={()=>setStage("home")}/>}
  {stage==="login"&&<main className="p-6"><p>Login is outside this signup simulation.</p>
    <button type="button" onClick={()=>setStage("welcome")}>Back to welcome</button></main>}
  {stage==="home"&&<main className="min-h-[100dvh] bg-white pb-32 text-slate-900">
    <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <LocalEatsLogo width={110} height={29}/>
      <div className="flex gap-3" aria-hidden="true"><Search className="h-5 w-5"/><Bell className="h-5 w-5"/></div>
    </header>
    <div className="mx-auto max-w-md space-y-5 px-4 pt-6">
      <div><p className="text-xs font-black uppercase tracking-widest text-orange-700">Welcome to LocalEats</p>
        <h1 className="mt-1 font-display text-2xl font-black">Explore local kitchens.</h1>
        <p className="mt-1 text-xs text-slate-600">Discover local menus near you. Pickup and pay at the shop.</p></div>
      <div className="flex gap-2 rounded-2xl border border-orange-200 bg-orange-50 p-4" role="status">
        <MapPin className="h-4 w-4 shrink-0 text-orange-700"/>
        <div><p className="text-xs font-extrabold">Location needed to order</p>
        <p className="mt-1 text-xs text-slate-600">Browse freely. Check your real device location to see pickup eligibility.</p></div>
      </div>
      <section aria-label="Browse-only example shop"><h2 className="mb-3 font-display text-lg font-black">Featured menu</h2>
        <ShopCard shop={fixtureShop} isFollowed={false} onStoreInfo={()=>{}}
          triggerHaptic={()=>{}} dataSaverEnabled/></section>
    </div>
    <BottomNavigation currentScreen={"home" as Screen} onNavigate={()=>{}} activeOrdersCount={0}/>
   </main>}
  {message&&<p role="alert" className="fixed bottom-0 bg-white p-2 text-red-700">{message}</p>}
 </>;
}
createRoot(document.getElementById("root")!).render(<AppFixture/>);
