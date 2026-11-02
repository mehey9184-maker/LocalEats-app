import { LocalEatsLogo } from "./LocalEatsLogo";

// This is the same Home-shaped shell used during Firebase session hydration
// and first catalog loading. Keep it neutral: never infer the signed-in user,
// a delivery location, shop availability or an active order from placeholders.
interface AppSkeletonLoaderProps {
  userProfile?: { fullName?: string; city?: string; address?: string };
}

export function AppSkeletonLoader({ userProfile: _userProfile }: AppSkeletonLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading LocalEats Home"
      aria-busy="true"
      className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans"
    >
      <header className="fixed inset-x-0 top-0 z-40 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <LocalEatsLogo width={105} height={26} className="shrink-0" />
            <span aria-hidden="true" className="h-8 w-24 xs:w-32 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60" />
          </div>
          <div aria-hidden="true" className="flex gap-2 rounded-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/60 dark:border-slate-700/60">
            <span className="size-9 rounded-full bg-slate-200/70 dark:bg-slate-700/70" />
            <span className="size-9 rounded-full bg-slate-200/70 dark:bg-slate-700/70" />
            <span className="size-9 rounded-full bg-slate-200/70 dark:bg-slate-700/70" />
          </div>
        </div>
        <div aria-hidden="true" className="border-t border-slate-100 dark:border-slate-800/80 px-3 sm:px-4">
          <div className="max-w-screen-xl mx-auto flex items-center gap-1.5 py-2 overflow-hidden">
            {[52, 87, 66, 70, 60, 80].map((width, index) => (
              <span key={index} className="h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60" style={{ width }} />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto w-full p-4 pt-[calc(136px+env(safe-area-inset-top,0px))] pb-28">
        <div className="mb-6 px-1 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3" aria-hidden="true">
          <div className="space-y-2">
            <div className="h-8 w-52 sm:w-72 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            <div className="h-4 w-40 sm:w-64 bg-slate-100 dark:bg-slate-800/70 rounded-lg" />
          </div>
          <div className="h-8 w-36 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-full" />
        </div>

        <section className="mb-20" aria-hidden="true">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 px-1">
            <div className="flex flex-col gap-2">
              <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-1 w-8 bg-orange-600 rounded-full" />
            </div>
            <div className="h-10 w-44 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex flex-col bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="aspect-[16/10] sm:aspect-video bg-slate-200 dark:bg-slate-800 relative">
                  <span className="absolute top-3 left-3 w-20 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="absolute top-3 right-3 w-14 h-5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="absolute bottom-2.5 left-3 w-24 h-5 rounded-lg bg-slate-300 dark:bg-slate-700" />
                </div>
                <div className="p-4 sm:p-5 space-y-3 min-h-[110px]">
                  <div className="h-5 w-3/5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                  <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-800/70 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <div aria-hidden="true" className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 flex justify-center">
        <div className="w-full max-w-md md:max-w-lg h-[62px] flex items-center justify-around bg-white/95 dark:bg-slate-900/95 rounded-[24px] sm:rounded-[28px] border border-slate-200/70 dark:border-slate-800/80 shadow-sm px-2">
          {[0,1,2,3,4].map((index)=><span key={index} className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full" />)}
        </div>
      </div>
      <span className="sr-only">Checking your session and nearby shops</span>
    </div>
  );
}
