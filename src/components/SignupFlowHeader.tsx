import React from "react";
import { ArrowLeft } from "lucide-react";
import { LocalEatsLogo } from "./LocalEatsLogo";

/** Shared visual hierarchy for the two existing account-creation screens. */
export function SignupFlowHeader({step,onBack}: {step: 1 | 2;onBack:()=>void}) {
 return (
  <>
   <header className="flex items-center justify-between gap-3 pt-5">
    <button type="button" onClick={onBack}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
      aria-label="Go back"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></button>
    <LocalEatsLogo width={151} height={41} />
    <span className="w-11 shrink-0" aria-hidden="true" />
   </header>
   <div className="mt-6 flex items-center justify-between gap-3" aria-label={`Step ${step} of 2`}>
    <div className="flex items-center gap-2">
     <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Step {step} of 2</span>
     <div className="h-1 w-7 rounded-full bg-orange-600" aria-hidden="true" />
     <div className={`h-1 w-7 rounded-full ${step===2?"bg-orange-600":"bg-slate-200 dark:bg-slate-700"}`} aria-hidden="true" />
    </div>
    <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-orange-700 dark:text-orange-400">
     {step===1?"Your details":"Secure your account"}
    </span>
   </div>
  </>
 );
}
