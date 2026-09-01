import React, { useState } from "react";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
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
    if (password.length < 6) {
      setNotification({
        message: "Password must be at least 6 characters",
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

  return (
    <div className="font-sans bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <header className="flex items-center p-4 bg-white dark:bg-slate-950 border-b border-primary/10">
          <button
            onClick={onBack}
            className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 ml-2 text-center mr-10">
            Set Password
          </h1>
        </header>
        <main className="flex-1 flex flex-col px-6 py-12 space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Create a password
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base">
              This will be your main login credential along with your email.
            </p>
          </div>

          <div className="space-y-6">
            <label className="flex flex-col w-full">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">
                Password
              </p>
              <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-12 text-base font-normal leading-normal transition-all"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </label>

            <label className="flex flex-col w-full">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">
                Confirm Password
              </p>
              <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-12 text-base font-normal leading-normal transition-all"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                />
              </div>
            </label>
          </div>

          <button
            onClick={handleSignUp}
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold h-14 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-8"
          >
            <span>{loading ? "Creating Account..." : "Create Account"}</span>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </button>
        </main>
      </div>
    </div>
  );
}
