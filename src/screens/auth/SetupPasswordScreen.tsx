import React, { useState } from "react";
import { ArrowRight, Lock, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { SignupFlowHeader } from "../../components/SignupFlowHeader";
import { supabase, APP_URL } from "../../lib/supabase";
import { upsertProfileWithRPC } from "../../lib/profileService";
import { NotificationState, SignUpData } from "../../types";

export interface SetupPasswordScreenProps {
  onNext: () => void;
  onBack: () => void;
  signupData: SignUpData;
  setNotification: (n: NotificationState) => void;
  runWithProcessing: (
    action: () => Promise<void>,
    successCallback?: () => void
  ) => Promise<void>;
}

export function SetupPasswordScreen({
  onNext,
  onBack,
  signupData,
  setNotification,
  runWithProcessing,
}: SetupPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!password || !confirmPassword) {
      setNotification({
        message: "Please fill in both password fields",
        type: "error",
      });
      return;
    }
    if (password !== confirmPassword) {
      setNotification({ message: "Passwords do not match", type: "error" });
      return;
    }
    if (password.length < 8) {
      setNotification({
        message: "Use at least 8 characters for your password",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password,
        options: {
          emailRedirectTo: APP_URL,
          data: {
            full_name: signupData.fullName,
            phone: signupData.phone,
          },
        },
      });
      if (error) {
        if (error.message?.includes("email-already-in-use") || error.message?.includes("already registered")) {
          setNotification({
            message: "Account already exists! Please click Back and choose Sign In instead.",
            type: "error",
          });
          return;
        }
        throw error;
      }

      // Manually sync to profiles table in case trigger isn't set up
      if (data.user) {
        const { error: profileError } = await upsertProfileWithRPC({
          user_id: data.user.id,
          fullName: signupData.fullName,
          email: signupData.email,
          phone: signupData.phone,
          role: "user",
          city: "",
          address: "",
          country: "South Africa",
          language: "en",
          photo_url: "",
          favorites: [],
        });
        if (profileError) {
          console.error("Profile creation error on signup:", profileError);
        }
      }
      
      onNext();
    } catch (e: any) {
      setNotification({
        message: e.message || "An error occurred during signup",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const longEnough=password.length>=8;
  const mixed=/[A-Za-z]/.test(password) && /[0-9]/.test(password);
  const matching=Boolean(confirmPassword) && password===confirmPassword;
  const inputStyle="h-14 w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-14 text-base text-slate-900 outline-none transition-colors focus:border-orange-600 focus:ring-2 focus:ring-orange-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  return (
   <div className="min-h-[100dvh] bg-white font-sans text-[#111d34] dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7">
     <SignupFlowHeader step={2} onBack={onBack} />
     <div className="mt-9">
      <h1 className="font-display text-[30px] font-black leading-[1.08] tracking-tight">Make it yours,<br/>keep it secure.</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Choose a password for your LocalEats account.</p>
     </div>
     <form className="mt-7 space-y-5" onSubmit={e=>{e.preventDefault();void handleSignUp();}}>
      <div>
       <label htmlFor="signup-password" className="text-xs font-extrabold text-slate-800 dark:text-white">Password</label>
       <div className="relative mt-2">
        <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true"/>
        <input id="signup-password" value={password} onChange={e=>setPassword(e.target.value)}
         autoComplete="new-password" type={showPassword?"text":"password"} placeholder="At least 8 characters" minLength={8}
         aria-describedby="password-guidance"
         className={inputStyle}/>
        <button type="button" onClick={()=>setShowPassword(v=>!v)}
         aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword}
         className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
         {showPassword?<EyeOff className="h-5 w-5"/>:<Eye className="h-5 w-5"/>}
        </button>
       </div>
      </div>
      <div>
       <label htmlFor="signup-confirm-password" className="text-xs font-extrabold text-slate-800 dark:text-white">Confirm password</label>
       <div className="relative mt-2">
        <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true"/>
        <input id="signup-confirm-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}
         autoComplete="new-password" type={showPassword?"text":"password"} placeholder="Repeat your password"
         aria-invalid={Boolean(confirmPassword)&&!matching} aria-describedby="password-guidance"
         className={inputStyle}/>
        {matching&&<Check className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-600" aria-hidden="true"/>}
       </div>
       {Boolean(confirmPassword)&&!matching&&<p role="alert" className="mt-1 text-xs text-red-600">Passwords don't match yet</p>}
      </div>
      <div id="password-guidance" className="rounded-2xl border border-emerald-100 bg-[#f7fcf8] p-4 dark:border-slate-700 dark:bg-slate-900">
       <h2 className="text-xs font-extrabold text-slate-800 dark:text-white">Make a strong password</h2>
       <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
        <li className="flex items-center gap-2"><Check className={`h-4 w-4 shrink-0 ${longEnough?"text-emerald-600":"text-slate-400"}`} aria-hidden="true" />At least 8 characters</li>
        <li className="flex items-center gap-2"><Check className={`h-4 w-4 shrink-0 ${mixed?"text-emerald-600":"text-slate-400"}`} aria-hidden="true" />Try mixing letters and numbers</li>
        <li className="flex items-center gap-2"><Check className={`h-4 w-4 shrink-0 ${matching?"text-emerald-600":"text-slate-400"}`} aria-hidden="true" />Both passwords match</li>
       </ul>
      </div>
      <div className="pt-4">
       <button type="submit" disabled={loading||!password||!confirmPassword}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#c2410c] px-5 text-sm font-extrabold text-white shadow-lg shadow-orange-700/15 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
        {loading?<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>Creating account…</>:<>Create account<ArrowRight className="h-4 w-4" aria-hidden="true"/></>}
       </button>
      </div>
     </form>
     <p className="mt-auto pt-5 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
      We may email you a verification link before you can sign in.
     </p>
    </div>
   </div>
  );
}
