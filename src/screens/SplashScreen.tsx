import React, {useEffect, useMemo} from "react";
import {motion, useReducedMotion} from "motion/react";
import {ArrowRight, Compass, Hand, LogIn, MapPin, UserRoundPlus} from "lucide-react";
import {LocalKotaHeroPhoto} from "../components/LocalKotaHeroPhoto";
import {LocalEatsLogo} from "../components/LocalEatsLogo";

const easing=[0.22,1,0.36,1] as const;

export function SplashScreen({
 onNext,onLogin,onGuestBrowse,session,userProfile,
}:{
 onNext:()=>void;
 onLogin:()=>void;
 onGuestBrowse:()=>void;
 session:any;
 userProfile:any;
}){
 const reduceMotion=useReducedMotion();
 useEffect(()=>{
  const timeout=setTimeout(()=>{
   if(session)onGuestBrowse();
  },2000);
  return ()=>clearTimeout(timeout);
 },[session,onGuestBrowse]);
 const greeting=useMemo(()=>{
  const hour=new Date().getHours();
  return hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
 },[]);
 const userName=userProfile?.fullName?.split(" ")[0]||"Hungry";

 if(session){
  return (
   <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#fff8ed] px-6 text-[#111d34] dark:bg-slate-950 dark:text-white">
    <motion.div initial={reduceMotion?false:{opacity:0,y:12}}
     animate={{opacity:1,y:0}} transition={{duration:0.55,ease:easing}}
     className="flex flex-col items-center justify-center text-center">
     <LocalEatsLogo width={160} height={50} showBackground={false}/>
     <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-400">{greeting},</p>
     <h1 className="mt-2 flex flex-wrap items-center justify-center gap-3 font-display text-4xl font-black tracking-tight sm:text-5xl">
      {userName}!
      <motion.span aria-hidden="true" initial={reduceMotion?false:{rotate:-14,opacity:0}}
       animate={{rotate:0,opacity:1}} transition={{type:"spring",stiffness:270,damping:21}}>
       <Hand className="h-8 w-8 text-orange-600" strokeWidth={1.9}/>
      </motion.span>
     </h1>
    </motion.div>
   </main>
  );
 }
 return (
  <main className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#fff8ed] font-sans text-[#111d34] dark:bg-slate-950 dark:text-white">
   <div className="pointer-events-none absolute -left-32 top-36 h-56 w-56 rounded-full border border-orange-200/60 shadow-[0_0_0_35px_rgba(251,146,60,0.035),0_0_0_70px_rgba(251,146,60,0.025)] dark:border-orange-950/30" aria-hidden="true"/>
   <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pb-2 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-7 md:pt-8">
    <LocalEatsLogo width={155} height={43}/>
    <span className="flex items-center gap-1.5 rounded-full border border-orange-100 bg-white/80 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
     <MapPin className="h-3.5 w-3.5 text-orange-700 dark:text-orange-400" strokeWidth={2} aria-hidden="true"/>
     South Africa
    </span>
   </header>
   <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 content-center gap-4 px-5 pb-6 pt-3 sm:px-7 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] md:grid-rows-[auto_auto] md:items-center md:gap-x-14 md:gap-y-6 md:py-10">
    <motion.section
     initial={reduceMotion?false:{opacity:0,y:18}}
     animate={{opacity:1,y:0}}
     transition={{duration:0.6,ease:easing}}
     className="min-w-0 md:col-start-1 md:row-start-1 md:self-end">
     <p className="text-[11px] font-black uppercase tracking-[0.14em] text-orange-800 dark:text-orange-400">
      Made for local cravings
     </p>
     <h1 className="mt-2 max-w-xl font-display text-[clamp(2rem,8.8vw,3.65rem)] font-black leading-[1.065] tracking-tight">
      Find your next <span className="text-[#c2410c] dark:text-orange-400">legendary kota.</span>
     </h1>
     <p className="mt-3 max-w-lg text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
      Discover your neighbourhood's food gems. Browse menus, then collect and pay at the shop.
     </p>
    </motion.section>
    <div className="relative min-w-0 py-2 md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
     <LocalKotaHeroPhoto/>
    </div>
    <motion.section
     initial={reduceMotion?false:{opacity:0,y:22}}
     animate={{opacity:1,y:0}}
     transition={{duration:0.65,delay:reduceMotion?0:0.12,ease:easing}}
     className="min-w-0 rounded-[28px] bg-[#111d34] px-5 py-5 text-white shadow-[0_18px_38px_rgba(15,23,42,0.16)] sm:px-7 sm:py-7 md:col-start-1 md:row-start-2 md:self-start">
     <h2 className="font-display text-[20px] font-extrabold leading-tight tracking-tight sm:text-[24px]">
      Good food. Right around you.
     </h2>
     <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-300 sm:text-sm">
      Explore menus first. Create your account when you're ready.
     </p>
     <div className="mt-4 flex flex-col gap-2.5">
      <motion.button type="button" onClick={onGuestBrowse}
       whileHover={reduceMotion?undefined:{y:-2}}
       whileTap={reduceMotion?undefined:{scale:0.985}}
       transition={{type:"spring",stiffness:410,damping:27}}
       className="group flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#c2410c] px-5 text-sm font-extrabold text-white shadow-lg shadow-orange-950/20 transition-colors hover:bg-[#ac350a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200">
       <Compass className="h-4.5 w-4.5 shrink-0" strokeWidth={2.2} aria-hidden="true"/>
       Explore local food
       <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.3} aria-hidden="true"/>
      </motion.button>
      <motion.button type="button" onClick={onNext}
       whileHover={reduceMotion?undefined:{y:-1}}
       whileTap={reduceMotion?undefined:{scale:0.985}}
       transition={{type:"spring",stiffness:410,damping:27}}
       className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-500/45 bg-[#27374f] px-5 text-sm font-extrabold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200">
       <UserRoundPlus className="h-[17px] w-[17px]" strokeWidth={2.15} aria-hidden="true"/>
       Create an account
      </motion.button>
     </div>
     <p className="mt-2.5 text-center text-xs text-slate-300">
      Already joined?{" "}
      <button type="button" onClick={onLogin}
       className="inline-flex min-h-11 items-center gap-1.5 font-extrabold text-orange-200 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
       <LogIn className="h-3.5 w-3.5" aria-hidden="true"/>
       Sign in
      </button>
     </p>
    </motion.section>
   </div>
  </main>
 );
}
