import {ArrowLeft,LockKeyhole,LogIn,UserPlus} from "lucide-react";

type Props={
  onBack:()=>void;
  onSignIn:()=>void;
  onCreateAccount:()=>void;
};
/** Guests can browse, but cannot open the registered customer profile edit form. */
export function GuestProfileGate({onBack,onSignIn,onCreateAccount}:Props){
  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto">
      <header className="flex items-center p-4 border-b border-primary/5 sticky top-0 bg-white dark:bg-slate-950 z-10 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button type="button" onClick={onBack} aria-label="Back to browsing" className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold flex-1 text-center pr-10">My Profile</h2>
      </header>
      <main className="flex-1 flex flex-col justify-center gap-5 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center mx-auto">
          <LockKeyhole className="w-8 h-8" aria-hidden="true" />
        </div>
        <h3 className="text-xl font-bold">Sign in to manage your profile</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          You're browsing as a guest. You can explore local shops and menus, but saving personal details requires an account.
        </p>
        <button type="button" onClick={onSignIn} className="w-full py-4 bg-primary text-white font-bold rounded-2xl flex items-center justify-center gap-2">
          <LogIn className="w-5 h-5" aria-hidden="true" /> Sign In
        </button>
        <button type="button" onClick={onCreateAccount} className="w-full py-4 bg-slate-100 dark:bg-slate-800 font-bold rounded-2xl flex items-center justify-center gap-2">
          <UserPlus className="w-5 h-5" aria-hidden="true" /> Create Account
        </button>
        <button type="button" onClick={onBack} className="text-sm text-slate-600 dark:text-slate-300 font-semibold py-2">
          Continue browsing as guest
        </button>
      </main>
    </div>
  );
}
