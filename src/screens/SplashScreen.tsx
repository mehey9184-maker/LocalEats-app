import React, { useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { LocalKotaIllustration } from "../components/LocalKotaIllustration";
import { LocalEatsLogo } from "../components/LocalEatsLogo";

export function SplashScreen({
  onNext,
  onLogin,
  onGuestBrowse,
  session,
  userProfile,
}: {
  onNext: () => void;
  onLogin: () => void;
  onGuestBrowse: () => void;
  session: any;
  userProfile: any;
}) {
  useEffect(() => {
    // Auto-transition logic for persistent sessions
    const timeout = setTimeout(() => {
      if (session) {
        // If we have a session AND profile data is mostly filled, skip to home
        // Otherwise wait for login
        onGuestBrowse(); // Skip to home for session
      }
    }, 2000); // 2 second brand immersion then skip if auth'd
    return () => clearTimeout(timeout);
  }, [session, onGuestBrowse]);

  const reduceMotion = useReducedMotion();
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const userName = userProfile?.fullName ? userProfile.fullName.split(" ")[0] : "Hungry";

  if (session) {
    return (
      <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden font-sans antialiased bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center justify-center text-center px-6"
        >
          <LocalEatsLogo width={160} height={50} showBackground={false} />
          
          <div className="mt-8 flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-500 opacity-90">
              {greeting},
            </p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter flex items-center justify-center gap-2 flex-wrap">
              <span>{userName}!</span>
              <span className="inline-block select-none animate-bounce origin-bottom">
                👋
              </span>
            </h1>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#fff8ed] font-sans text-[#111d34] dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-none absolute -left-28 top-44 h-64 w-64 rounded-full border border-orange-200/60 shadow-[0_0_0_36px_rgba(251,146,60,0.035),0_0_0_72px_rgba(251,146,60,0.025)]" aria-hidden="true" />
      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-5 pb-3 pt-[max(2.2rem,env(safe-area-inset-top))] sm:px-7">
        <LocalEatsLogo width={155} height={43} />
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">South Africa</span>
      </header>
      <section className="relative z-10 mx-auto w-full max-w-lg px-6 pt-3 sm:pt-8">
        <p className="text-[11px] font-black uppercase tracking-[0.15em] text-orange-800 dark:text-orange-400">Made for local cravings</p>
        <h1 className="mt-2 max-w-sm font-display text-[clamp(2rem,9.5vw,3.15rem)] font-black leading-[1.06] tracking-tight">
          Find your next <span className="text-[#c2410c] dark:text-orange-400">legendary kota.</span>
        </h1>
        <p className="mt-4 max-w-sm text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
          Discover your neighbourhood's food gems. Browse menus, then collect and pay at the shop.
        </p>
      </section>
      <div className="relative z-10 mx-auto flex min-h-32 w-full max-w-lg flex-1 items-center justify-center px-3 py-1">
        <LocalKotaIllustration className="h-auto w-full max-w-[370px] drop-shadow-sm" />
      </div>
      <section className="relative z-10 mt-auto w-full rounded-t-[30px] bg-[#111d34] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 text-white sm:mx-auto sm:max-w-lg sm:rounded-[30px]">
        <h2 className="font-display text-[21px] font-extrabold tracking-tight">Good food. Right around you.</h2>
        <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-300">
          Explore menus first. Create your account when you're ready.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          <motion.button type="button" onClick={onGuestBrowse}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#c2410c] px-5 text-sm font-extrabold text-white shadow-lg shadow-orange-950/20 transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
            Explore local food <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </motion.button>
          <motion.button type="button" onClick={onNext}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            className="min-h-12 w-full rounded-2xl border border-slate-500/40 bg-[#27374f] px-5 text-sm font-extrabold text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
            Create an account
          </motion.button>
        </div>
        <p className="mt-3 text-center text-xs text-slate-300">
          Already joined?{" "}
          <button type="button" onClick={onLogin}
            className="min-h-11 font-extrabold text-orange-200 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300">
            Sign in
          </button>
        </p>
      </section>
    </main>
  );
}
