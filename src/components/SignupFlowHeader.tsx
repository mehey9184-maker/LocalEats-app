import React from "react";
import {motion, useReducedMotion} from "motion/react";
import {ArrowLeft, LockKeyhole, UserRound} from "lucide-react";
import {LocalEatsLogo} from "./LocalEatsLogo";

/** Shared icon vocabulary and progress motion on real account-creation screens. */
export function SignupFlowHeader({step,onBack}:{step:1|2;onBack:()=>void}){
 const reduceMotion=useReducedMotion();
 const StepIcon=step===1?UserRound:LockKeyhole;
 return (
  <>
   <header className="flex items-center justify-between gap-3 pt-5">
    <motion.button type="button" onClick={onBack}
     whileTap={reduceMotion?undefined:{scale:0.94}}
     className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-orange-50 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
     aria-label="Go back">
     <ArrowLeft className="h-5 w-5" strokeWidth={2.1} aria-hidden="true"/>
    </motion.button>
    <LocalEatsLogo width={151} height={41}/>
    <span className="w-11 shrink-0" aria-hidden="true"/>
   </header>
   <div className="mt-5" aria-label={`Step ${step} of 2`}>
    <div className="flex min-w-0 items-center justify-between gap-2">
     <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff1e6] text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
       <StepIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true"/>
      </span>
      <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300">
       Step {step} of 2
      </span>
     </div>
     <span className="min-w-0 text-right text-[10px] font-extrabold uppercase tracking-[0.04em] text-orange-800 dark:text-orange-400">
      {step===1?"Your details":"Secure your account"}
     </span>
    </div>
    <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
     <motion.div className="h-full rounded-full bg-[#c2410c]"
      initial={reduceMotion?false:{width:"0%"}}
      animate={{width:step===1?"50%":"100%"}}
      transition={reduceMotion?{duration:0}:{duration:0.55,ease:[0.22,1,0.36,1]}}/>
    </div>
   </div>
  </>
 );
}
