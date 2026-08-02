import React, { useMemo } from "react";
import { motion } from "motion/react";
import { MapPin, Search, Bell, Compass, Clock, User, ShoppingBag } from "lucide-react";
import { LocalEatsLogo } from "./LocalEatsLogo";

interface AppSkeletonLoaderProps {
  userProfile: {
    fullName?: string;
    city?: string;
    address?: string;
  };
}

export function AppSkeletonLoader({ userProfile }: AppSkeletonLoaderProps) {
  const firstName = useMemo(() => {
    if (!userProfile?.fullName) return "Hungry";
    return userProfile.fullName.trim().split(" ")[0];
  }, [userProfile?.fullName]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const township = useMemo(() => {
    if (userProfile?.address) {
      const lower = userProfile.address.toLowerCase();
      if (lower.includes("soweto")) return "Soweto";
      if (lower.includes("tembisa")) return "Tembisa";
      if (lower.includes("alexandra")) return "Alexandra";
      if (lower.includes("khayelitsha")) return "Khayelitsha";
      if (lower.includes("mitchells plain")) return "Mitchells Plain";
      if (lower.includes("mamelodi")) return "Mamelodi";
      if (lower.includes("uplands")) return "Uplands";
    }
    return userProfile?.city || "Johannesburg";
  }, [userProfile?.address, userProfile?.city]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased overflow-y-auto pb-24">
      {/* Top Header Section */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-6 pt-12 pb-4 border-b border-slate-100 dark:border-slate-900/50">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          {/* User info & greeting */}
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Shimmering avatar with user initials placeholder */}
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-400 to-amber-500 flex items-center justify-center font-black text-white text-base shadow-md animate-pulse">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-950 rounded-full"></span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {greeting},
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
                <span>{firstName}!</span>
                <span className="inline-block animate-bounce origin-bottom select-none">👋</span>
              </h2>
            </div>
          </div>

          {/* Location details */}
          <div className="flex flex-col items-end text-right shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Delivering to
            </span>
            <div className="flex items-center gap-1 mt-0.5 text-orange-600 dark:text-orange-500 font-bold text-sm">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{township}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Skeleton Area */}
      <main className="max-w-md mx-auto px-6 mt-6 space-y-6">
        
        {/* Shimmering search bar */}
        <div className="relative w-full h-14 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center px-4 gap-3 shadow-sm">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-600" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/5 animate-pulse"></div>
          <div className="ml-auto w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
        </div>

        {/* Shimmering Promo Banner */}
        <div className="relative overflow-hidden rounded-[24px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 flex flex-col gap-3 shadow-md">
          {/* Animated gradient shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/10 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
          
          <div className="h-3 bg-orange-500/20 dark:bg-orange-500/10 rounded-full w-1/4 animate-pulse"></div>
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4 animate-pulse"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2 animate-pulse"></div>
          
          <div className="flex gap-2 mt-2">
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-28 animate-pulse"></div>
            <div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-20 animate-pulse"></div>
          </div>
        </div>

        {/* Shimmering Categories Pills */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3 animate-pulse"></div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-12 animate-pulse"></div>
          </div>
          <div className="flex gap-2.5 overflow-x-hidden pt-1">
            {["All", "Favorites", "Kotas", "Burgers", "Wings", "Desserts"].map((cat, idx) => (
              <div 
                key={idx} 
                className={`px-4 py-2.5 rounded-full border flex items-center justify-center text-xs font-bold whitespace-nowrap animate-pulse ${
                  idx === 0 
                    ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400" 
                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"
                }`}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {cat}
              </div>
            ))}
          </div>
        </div>

        {/* Shimmering Shop Feed Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-2/5 animate-pulse"></div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-16 animate-pulse"></div>
          </div>

          {/* Shop Card skeletons */}
          {[1, 2].map((card, idx) => (
            <div 
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-100 dark:border-slate-800/50 shadow-sm flex flex-col gap-4 p-3 animate-pulse"
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              {/* Card Image Area */}
              <div className="h-44 w-full rounded-[24px] bg-slate-200 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                <div style={{ opacity: 0.15 }}>
                  <LocalEatsLogo width={80} height={25} />
                </div>
              </div>
              {/* Card details */}
              <div className="px-2 pb-2 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-3/5"></div>
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-md w-12"></div>
                </div>
                <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-md w-4/5"></div>
                <div className="flex gap-2 pt-1">
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-16"></div>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-20"></div>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Shimmering Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-t border-slate-100 dark:border-slate-900 py-3 px-6 shadow-xl shadow-slate-900/10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex flex-col items-center justify-center gap-1 cursor-pointer text-orange-600 dark:text-orange-500 animate-pulse">
            <Compass className="w-5.5 h-5.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">Discover</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 dark:text-slate-600">
            <ShoppingBag className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Cart</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 dark:text-slate-600">
            <Clock className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 dark:text-slate-600">
            <User className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
          </div>
        </div>
      </nav>
    </div>
  );
}
