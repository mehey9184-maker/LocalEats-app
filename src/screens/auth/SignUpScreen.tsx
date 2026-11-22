import React, { useRef, useState } from "react";
import { ArrowRight, Check, Info, Mail, Smartphone, User } from "lucide-react";
import { SignupFlowHeader } from "../../components/SignupFlowHeader";
import { supabase, APP_URL } from "../../lib/supabase";
import { formatSAPhone, validateSAPhone } from "../../utils";

export interface SignUpScreenProps {
 onNext: (data: { fullName: string; email: string; phone: string }) => void;
 onLogin: () => void;
 setNotification: (notification: any) => void;
}

type SignupErrors = { fullName?: string; email?: string; phone?: string };
const validEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const fieldClass=(bad:boolean)=>`mt-2 flex h-14 w-full items-center gap-3 rounded-2xl border px-4 transition-colors focus-within:ring-2 focus-within:ring-orange-500/30 ${
 bad ? "border-red-500 bg-red-50/30" : "border-slate-200 bg-slate-50 focus-within:border-orange-600 dark:border-slate-700 dark:bg-slate-900"
}`;

export function SignUpScreen({ onNext, onLogin, setNotification }: SignUpScreenProps) {
 const [fullName,setFullName]=useState("");
 const [email,setEmail]=useState("");
 const [phone,setPhone]=useState(formatSAPhone(""));
 const [errors,setErrors]=useState<SignupErrors>({});
 const [googleBusy,setGoogleBusy]=useState(false);
 const nameRef=useRef<HTMLInputElement>(null);
 const emailRef=useRef<HTMLInputElement>(null);
 const phoneRef=useRef<HTMLInputElement>(null);

 const handleContinue=()=>{
  const next:SignupErrors={};
  if(fullName.trim().length<2)next.fullName="Enter your full name";
  if(!validEmail(email))next.email="Enter a valid email address";
  if(!validateSAPhone(phone))next.phone="Enter a valid South African phone number";
  setErrors(next);
  if(Object.keys(next).length){
   (next.fullName?nameRef:next.email?emailRef:phoneRef).current?.focus();
   return;
  }
  onNext({fullName:fullName.trim(),email:email.trim().toLowerCase(),phone});
 };
 const handleGoogle=async()=>{
  if(googleBusy)return;
  setGoogleBusy(true);
  try {
   const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:APP_URL}});
   if(error)throw error;
  } catch {
   setNotification({message:"We couldn't connect with Google. Please try again or use email.",type:"error"});
  } finally {setGoogleBusy(false);}
 };

 return (
  <div className="min-h-[100dvh] bg-white font-sans text-[#111d34] dark:bg-slate-950 dark:text-slate-100">
   <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-7">
    <SignupFlowHeader step={1} onBack={onLogin} />
    <div className="mt-8">
     <h1 className="font-display text-[30px] font-black leading-tight tracking-tight">Let's get you set up.</h1>
     <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
      A few details so your pickup orders have the right contact information.
     </p>
    </div>
    <form className="mt-5 space-y-4" noValidate onSubmit={e=>{e.preventDefault();handleContinue();}}>
     <div>
      <label htmlFor="signup-full-name" className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Full name</label>
      <div className={fieldClass(Boolean(errors.fullName))}>
       <User className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
       <input id="signup-full-name" ref={nameRef} value={fullName} onChange={e=>{setFullName(e.target.value);setErrors(v=>({...v,fullName:undefined}));}}
        onBlur={()=>{if(fullName && fullName.trim().length<2)setErrors(v=>({...v,fullName:"Enter your full name"}));}}
        placeholder="Your full name" autoComplete="name" type="text"
        aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName?"signup-name-error":undefined}
        className="h-full min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" />
       {fullName.trim().length>=2&&!errors.fullName&&<Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
      </div>
      {errors.fullName&&<p id="signup-name-error" role="alert" className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
     </div>
     <div>
      <label htmlFor="signup-email" className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Email address</label>
      <div className={fieldClass(Boolean(errors.email))}>
       <Mail className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
       <input id="signup-email" ref={emailRef} value={email} onChange={e=>{setEmail(e.target.value);setErrors(v=>({...v,email:undefined}));}}
        onBlur={()=>{if(email&&!validEmail(email))setErrors(v=>({...v,email:"Enter a valid email address"}));}}
        placeholder="you@example.com" autoComplete="email" inputMode="email" type="email"
        aria-invalid={Boolean(errors.email)} aria-describedby={errors.email?"signup-email-error":undefined}
        className="h-full min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" />
       {validEmail(email)&&!errors.email&&<Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
      </div>
      {errors.email&&<p id="signup-email-error" role="alert" className="mt-1 text-xs text-red-600">{errors.email}</p>}
     </div>
     <div>
      <label htmlFor="signup-phone" className="text-xs font-extrabold text-slate-800 dark:text-slate-100">Phone number</label>
      <div className={fieldClass(Boolean(errors.phone))}>
       <Smartphone className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
       <input id="signup-phone" ref={phoneRef} value={phone} onChange={e=>{setPhone(formatSAPhone(e.target.value));setErrors(v=>({...v,phone:undefined}));}}
        onBlur={()=>{if(phone&&!validateSAPhone(phone))setErrors(v=>({...v,phone:"Enter a valid South African phone number"}));}}
        placeholder="+27 71 234 5678" autoComplete="tel" inputMode="tel" type="tel"
        aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone?"signup-phone-error":"signup-phone-help"}
        className="h-full min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" />
       {validateSAPhone(phone)&&!errors.phone&&<Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
      </div>
      {errors.phone?<p id="signup-phone-error" role="alert" className="mt-1 text-xs text-red-600">{errors.phone}</p>:
       <p id="signup-phone-help" className="mt-1.5 flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
        <Check className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true"/>Used for pickup contact when you place an order
       </p>}
     </div>
     <p className="flex items-start gap-2 pt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/>
      Use an email you can access. You may need it to confirm your account.
     </p>
     <div className="pt-4">
      <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#c2410c] px-5 text-sm font-extrabold text-white shadow-lg shadow-orange-700/15 transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
       Continue to password <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
     </div>
    </form>
    <div className="mt-auto pt-4 text-center">
     <p className="text-xs text-slate-500 dark:text-slate-400">Already have an account?{" "}
      <button type="button" onClick={onLogin} className="min-h-11 font-extrabold text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-orange-400">Sign in</button>
     </p>
     <button type="button" onClick={handleGoogle} disabled={googleBusy}
      className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      aria-label="Continue with Google">
      {googleBusy?"Connecting to Google…":"Continue with Google"}
     </button>
    </div>
   </div>
  </div>
 );
}
