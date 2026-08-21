import React, { useState, useRef } from "react";
import { User, Mail, Smartphone, Loader2, ArrowRight } from "lucide-react";
import { LocalEatsLogo } from "../../components/LocalEatsLogo";
import { supabase, APP_URL } from "../../lib/supabase";
import { formatSAPhone, validateSAPhone } from "../../utils";

export interface SignUpScreenProps {
  onNext: (data: { fullName: string; email: string; phone: string }) => void;
  onLogin: () => void;
  setNotification: (notification: any) => void;
}

export function SignUpScreen({
  onNext,
  onLogin,
  setNotification,
}: SignUpScreenProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(formatSAPhone(""));
  const [loading, setLoading] = useState(false);

  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
  }>({});

  const handleSignUp = async () => {
    const errors: { fullName?: string; email?: string; phone?: string } = {};

    if (!fullName) {
      errors.fullName = "Please enter your full name";
    }
    if (!email) {
      errors.email = "Please enter your email";
    }
    if (!phone) {
      errors.phone = "Please enter your phone number";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setNotification({ message: "Please fill in all fields", type: "error" });
      if (errors.fullName && fullNameRef.current) {
        fullNameRef.current.focus();
      } else if (errors.email && emailRef.current) {
        emailRef.current.focus();
      }
      return;
    }

    if (!validateSAPhone(phone)) {
      setFormErrors({ phone: "Invalid South African phone format. Use +27 XX XXX XXXX" });
      setNotification({
        message: "Invalid South African phone format. Use +27 XX XXX XXXX",
        type: "error",
      });
      return;
    }

    onNext({ fullName, email, phone });
  };

  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-screen-xl mx-auto overflow-x-hidden p-6 md:p-12">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center gap-6">
          <div className="flex items-center justify-center">
            <LocalEatsLogo width={160} height={42} />
          </div>
          <div className="text-center">
            <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-bold leading-tight pb-2">
              Welcome
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Discover the best local flavors near you.
            </p>
          </div>
          <div className="w-full">
            <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between mb-6">
              <button
                onClick={onLogin}
                className="flex flex-col items-center justify-center border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 pb-[13px] pt-4 flex-1 cursor-pointer"
              >
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">
                  Login
                </p>
              </button>
              <button className="flex flex-col items-center justify-center border-b-[3px] border-primary text-primary pb-[13px] pt-4 flex-1 cursor-pointer">
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">
                  Sign Up
                </p>
              </button>
            </div>
            <div className="flex flex-col gap-5">
              <label className="flex flex-col w-full">
                <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">
                  Full Name
                </p>
                <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                  <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={fullNameRef}
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setFormErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    className={`form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 border ${
                      formErrors.fullName
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-200 dark:border-slate-800 focus:ring-primary/20"
                    } bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all`}
                    placeholder="Enter your full name"
                    type="text"
                  />
                </div>
                {formErrors.fullName && (
                  <p className="text-red-500 text-[10px] mt-1">{formErrors.fullName}</p>
                )}
              </label>
              <label className="flex flex-col w-full">
                <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">
                  Email
                </p>
                <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={emailRef}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={`form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 border ${
                      formErrors.email
                        ? "border-red-500 focus:ring-red-500"
                        : "border-slate-200 dark:border-slate-800 focus:ring-primary/20"
                    } bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all`}
                    placeholder="Enter your email"
                    type="email"
                  />
                </div>
                {formErrors.email && (
                  <p className="text-red-500 text-[10px] mt-1">{formErrors.email}</p>
                )}
              </label>
              <label className="flex flex-col w-full">
                <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">
                  Phone Number
                </p>
                <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                  <Smartphone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={phone}
                    onChange={(e) => {
                      setPhone(formatSAPhone(e.target.value));
                      setFormErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all"
                    placeholder="e.g. +27 71 234 5678"
                    type="tel"
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-red-500 text-[10px] mt-1">{formErrors.phone}</p>
                )}
              </label>
            </div>
            <div className="px-6 py-6">
              <button
                onClick={handleSignUp}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold h-14 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? "Processing..." : "Continue"}</span>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowRight className="w-5 h-5" />
                )}
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-xs font-medium uppercase tracking-widest">
                  Or continue with
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={async () => {
                    try {
                      const { error } = await supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: {
                          redirectTo: APP_URL,
                        },
                      });
                      if (error) throw error;
                    } catch (error: any) {
                      setNotification({
                        message:
                          "We couldn't connect you via Google. Please try again or use email.",
                        type: "error",
                      });
                    }
                  }}
                  className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <img
                    alt="Google Logo"
                    className="h-5 w-5"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5uYjQizkp0NzZOJp6gAxVIoom_EY70LzkakkWsAQaYO29sik9xD6rSvJFnoztFAIzTeXZX17vg94A_hZuYmV2_Va3hBYvZoEXVuzb6Uypat-btNCXq2M3UdT8jllg-feqnW8CKzK5T5EB9l6GU-uqjg_oOpWia8T2AYqmOudM6LiS5I7wofQv0QG0MZc_KJNHHx60c_02idR-68zHoEMZwxAGOW33qn0nylojD9egOorA99Q5_UD2H8L0LMgVA9aAoGK-TF--TQ"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm font-semibold">Google</span>
                </button>
                <button
                  onClick={() =>
                    setNotification({
                      message: "Apple login coming soon!",
                      type: "info",
                    })
                  }
                  className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-sm font-semibold">Apple</span>
                </button>
              </div>
            </div>
            <div className="mt-auto pb-10 px-6 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Already have an account?
                <button
                  onClick={onLogin}
                  className="text-primary font-bold hover:underline ml-1 cursor-pointer"
                >
                  Log in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
