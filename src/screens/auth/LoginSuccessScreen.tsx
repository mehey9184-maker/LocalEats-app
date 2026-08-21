import React, { useEffect } from "react";
import { ArrowLeft, CheckCircle } from "lucide-react";

export interface LoginSuccessScreenProps {
  onHome: () => void;
  onViewProfile: () => void;
  onBack: () => void;
}

export function LoginSuccessScreen({
  onHome,
  onViewProfile,
  onBack,
}: LoginSuccessScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onHome();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onHome]);

  return (
    <div className="bg-white dark:bg-slate-950 font-sans antialiased min-h-screen">
      <div className="relative flex h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden">
        <div className="flex items-center p-4 justify-between">
          <button
            onClick={onBack}
            className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
            Login Success
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center grow p-6 space-y-8">
          <div className="relative w-full max-w-[100vw] overflow-x-hidden">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl transform scale-150"></div>
            <div className="relative bg-white dark:bg-slate-800 p-8 rounded-full shadow-xl border-4 border-primary/10">
              <CheckCircle className="w-[120px] h-[120px] text-primary" />
            </div>
          </div>
          <div className="text-center space-y-4 max-w-sm">
            <h1 className="text-slate-900 dark:text-slate-100 text-4xl font-extrabold tracking-tight">
              Welcome Back!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              You have successfully logged into your account. Ready to explore
              local eats?
            </p>
          </div>
          <div className="w-full max-w-sm pt-4 space-y-4">
            <button
              onClick={onHome}
              className="flex items-center justify-center w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] cursor-pointer"
            >
              Go to Home
            </button>
            <button
              onClick={onViewProfile}
              className="flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold py-4 px-6 rounded-xl transition-all cursor-pointer"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
