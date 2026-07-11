import React from "react";
import { Utensils, Mail, Lock, Eye, Check, LogIn, Apple } from "lucide-react";
import { LocalEatsLogo } from "./LocalEatsLogo";

export function AuthSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-screen-xl mx-auto overflow-x-hidden p-6 md:p-12">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center gap-6">
          
          {/* Brand & Glowing Header Section */}
          <div className="flex flex-col items-center justify-center gap-5 mt-4 text-center animate-pulse">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl transform scale-150 animate-pulse"></div>
              <div className="relative bg-orange-500/10 dark:bg-orange-500/15 p-5 rounded-full border-4 border-orange-500/20 shadow-lg shrink-0">
                <Utensils className="w-10 h-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            
            <div className="space-y-3 flex flex-col items-center w-full">
              {/* Actual Logo to keep it grounded, but slightly lower opacity */}
              <div className="opacity-80">
                <LocalEatsLogo width={180} height={46} />
              </div>
              <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2 mt-1"></div>
              <div className="h-4 bg-slate-150 dark:bg-slate-850 rounded-md w-3/4 mt-2"></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="w-full">
            <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between mb-6">
              <div className="flex flex-col items-center justify-center border-b-[3px] border-primary pb-[13px] pt-4 flex-1">
                <div className="h-4 bg-primary/30 rounded-md w-1/3 animate-pulse"></div>
              </div>
              <div className="flex flex-col items-center justify-center border-b-[3px] border-transparent pb-[13px] pt-4 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3 animate-pulse"></div>
              </div>
            </div>

            {/* Form Fields Skeletons */}
            <div className="flex flex-col gap-5">
              {/* Email Label & Input Skeleton */}
              <div className="flex flex-col w-full gap-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16 animate-pulse"></div>
                <div className="relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 h-14 flex items-center pl-12 pr-4">
                  <Mail className="w-5 h-5 absolute left-4 text-slate-300 dark:text-slate-700" />
                  <div className="h-4 bg-slate-200/60 dark:bg-slate-800/60 rounded-md w-32 animate-pulse"></div>
                </div>
              </div>

              {/* Password Label & Input Skeleton */}
              <div className="flex flex-col w-full gap-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-24 animate-pulse"></div>
                <div className="relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 h-14 flex items-center pl-12 pr-12">
                  <Lock className="w-5 h-5 absolute left-4 text-slate-300 dark:text-slate-700" />
                  <div className="h-4 bg-slate-200/60 dark:bg-slate-800/60 rounded-md w-20 animate-pulse"></div>
                  <Eye className="w-5 h-5 absolute right-4 text-slate-300 dark:text-slate-700 animate-pulse" />
                </div>
              </div>

              {/* Remember Me & Forgot Password Skeleton */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 animate-pulse">
                  <div className="w-5 h-5 rounded border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900"></div>
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-20"></div>
                </div>
                <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-24 animate-pulse"></div>
              </div>
            </div>

            {/* Login Button Skeleton */}
            <div className="px-6 py-6">
              <div className="w-full bg-primary/20 dark:bg-primary/10 border border-primary/20 h-14 rounded-xl flex items-center justify-center gap-2 animate-pulse">
                <div className="h-4 bg-primary/40 rounded-md w-16"></div>
                <LogIn className="w-5 h-5 text-primary/40" />
              </div>
            </div>

            {/* Social Login Separator Skeleton */}
            <div className="px-6 pb-6">
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <div className="mx-4 h-3 bg-slate-150 dark:bg-slate-850 rounded-md w-28 animate-pulse"></div>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Google Button Skeleton */}
                <div className="flex items-center justify-center gap-3 h-14 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/40 animate-pulse">
                  <img
                    alt="Google Logo"
                    className="h-5 w-5 opacity-40"
                    src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                  />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-12"></div>
                </div>
                {/* Apple Button Skeleton */}
                <div className="flex items-center justify-center gap-3 h-14 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/40 animate-pulse">
                  <Apple className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-10"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Redirect Skeleton */}
          <div className="mt-auto pb-10 px-6 text-center flex flex-col items-center gap-2 animate-pulse">
            <div className="h-3.5 bg-slate-150 dark:bg-slate-850 rounded-md w-40"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
