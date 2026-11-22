import React from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { LocalEatsLogo } from "../../components/LocalEatsLogo";

export interface SuccessScreenProps {
 onCompleteProfile: () => void;
 onExplore: () => void;
 email?: string;
}

/** Account submission completed; does not imply email verification or order eligibility. */
export function SuccessScreen({onCompleteProfile,onExplore,email}:SuccessScreenProps){
 return (
  <div className="min-h-[100dvh] bg-white font-sans text-[#111d34] dark:bg-slate-950 dark:text-white">
   <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center sm:px-7">
    <header className="flex w-full justify-center pt-9">
     <LocalEatsLogo width={160} height={45} />
    </header>
    <div className="mt-auto flex w-full flex-col items-center">
     <div className="relative flex h-44 w-44 items-center justify-center rounded-full bg-[#fff4ea] dark:bg-orange-950/30" aria-hidden="true">
      <div className="absolute inset-4 rounded-full border-2 border-dashed border-orange-200 dark:border-orange-900" />
      <Mail className="h-20 w-20 text-[#c2410c] dark:text-orange-400" strokeWidth={1.5}/>
      <CheckCircle2 className="absolute right-5 top-6 h-10 w-10 rounded-full bg-white p-1 text-emerald-600 dark:bg-slate-950" fill="white" />
     </div>
     <h1 className="mt-8 font-display text-[31px] font-black leading-tight tracking-tight">Check your inbox.</h1>
     <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-300">
      Your account has been submitted. If email confirmation is required, open the verification link before signing in.
     </p>
     {email&&<p className="mt-2 max-w-full break-all text-sm font-extrabold text-slate-800 dark:text-white">{email}</p>}
    </div>
    <div className="mt-8 w-full rounded-2xl border border-orange-200 bg-[#fff8f0] p-4 text-left text-xs leading-relaxed text-amber-950 dark:border-orange-900 dark:bg-orange-950/25 dark:text-orange-200">
     You can browse local menus while you verify. Ordering requires a signed-in account, real location within 4 km and an open shop.
    </div>
    <div className="mt-auto w-full pt-8">
     <button type="button" onClick={onExplore}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#c2410c] px-4 text-sm font-extrabold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
      Browse menus for now <ArrowRight className="h-4 w-4" aria-hidden="true" />
     </button>
     <button type="button" onClick={onCompleteProfile}
      className="mt-3 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
      Complete profile
     </button>
    </div>
   </main>
  </div>
 );
}
