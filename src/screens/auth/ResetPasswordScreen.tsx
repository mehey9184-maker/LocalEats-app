import React, { useState } from "react";
import { Lock, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { LocalEatsLogo } from "../../components/LocalEatsLogo";
import { supabase } from "../../lib/supabase";
import { NotificationState } from "../../types";

export interface ResetPasswordScreenProps {
  onNext: () => void;
  setNotification: (n: NotificationState) => void;
}

export function ResetPasswordScreen({
  onNext,
  setNotification,
}: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setNotification({
        message: "Please fill in all fields",
        type: "error",
      });
      return;
    }
    if (password !== confirmPassword) {
      setNotification({
        message: "Passwords do not match",
        type: "error",
      });
      return;
    }
    if (password.length < 6) {
      setNotification({
        message: "Password must be at least 6 characters long",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setNotification({
        message: "Your password has been successfully reset! Please login.",
        type: "success",
      });
      await supabase.auth.signOut().catch(() => {});
      onNext();
    } catch (error: any) {
      setNotification({
        message:
          error.message || "Failed to update password. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-screen-xl mx-auto overflow-x-hidden p-6 md:p-12">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center gap-6">
          <div className="flex flex-col items-center justify-center gap-5 mt-4 text-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl transform scale-150 animate-pulse"></div>
              <div className="relative bg-orange-500/10 dark:bg-orange-500/15 p-5 rounded-full border-4 border-orange-500/20 shadow-lg shrink-0">
                <Lock className="w-10 h-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>

            <div className="space-y-1">
              <LocalEatsLogo width={180} height={46} />
              <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-extrabold leading-tight">
                Reset Password
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold max-w-xs">
                Set your new secure password below to gain access to your account.
              </p>
            </div>
          </div>

          <div className="w-full flex flex-col gap-5">
            <label className="flex flex-col w-full">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">
                New Password
              </p>
              <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-12 text-base font-normal leading-normal transition-all"
                  placeholder="At least 6 characters"
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
                Confirm New Password
              </p>
              <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-12 text-base font-normal leading-normal transition-all"
                  placeholder="Repeat new password"
                  type={showPassword ? "text" : "password"}
                />
              </div>
            </label>

            <div className="py-4">
              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold h-14 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{loading ? "Resetting Password..." : "Reset Password"}</span>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
