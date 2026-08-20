import React, { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { LocalEatsLogo } from "../components/LocalEatsLogo";

export function SplashScreen({
  onNext,
  onLogin,
  onGuestBrowse,
  session,
  userProfile,
}: {
  onNext: () => void;
  onLogin: () => void;
  onGuestBrowse: () => void;
  session: any;
  userProfile: any;
}) {
  useEffect(() => {
    // Auto-transition logic for persistent sessions
    const timeout = setTimeout(() => {
      if (session) {
        // If we have a session AND profile data is mostly filled, skip to home
        // Otherwise wait for login
        onGuestBrowse(); // Skip to home for session
      }
    }, 2000); // 2 second brand immersion then skip if auth'd
    return () => clearTimeout(timeout);
  }, [session, onGuestBrowse]);

  const playClick = () => {
    // Professional crisp click sound
    const click = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
    );
    click.volume = 0.4;
    click.play().catch((e) => console.log("Click sound failed:", e));
  };

  const handleGetStarted = () => {
    playClick();
    onNext();
  };

  const handleSignIn = () => {
    playClick();
    onLogin();
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const userName = userProfile?.fullName ? userProfile.fullName.split(" ")[0] : "Hungry";

  if (session) {
    return (
      <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden font-sans antialiased bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center justify-center text-center px-6"
        >
          <LocalEatsLogo width={160} height={50} showBackground={false} />
          
          <div className="mt-8 flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-500 opacity-90">
              {greeting},
            </p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter flex items-center justify-center gap-2 flex-wrap">
              <span>{userName}!</span>
              <span className="inline-block select-none animate-bounce origin-bottom">
                👋
              </span>
            </h1>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full flex flex-col overflow-hidden font-sans antialiased text-brand-dark bg-white dark:bg-slate-950 dark:text-white">
      {/* Background Image Section */}
      <section className="absolute inset-0 z-0">
        <img
          alt="Delicious South African Kota with chips and toppings"
          className="w-full h-full object-cover grayscale-[10%]"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuALAhJY_048XGlh8sNMGuww7VeuS2h3Og31s-hbNNwHFmTDaxjk8N-NQXrl-aJtTh6qzRJ1a08acjgvkI46WVBuMtsPK4Wb4uvAPENlBULnMLPADN_q4yUJxmWbpJBTvuNUsyCwdim2YO8lT-LWsvOU599-LeSw4NBONUWlIIlCdqU8rAq86Kz8L_9gOUyop73K2Uu4yq_46NeYWOUTqYJ6nS7GFVWqREEiIeSXyxXGJdwVOZwg2y7-MUGLlVI4HTtsM3_a6kMNbA"
          referrerPolicy="no-referrer"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 hero-gradient"></div>
      </section>

      <div className="relative z-10 flex-1 flex flex-col max-w-screen-xl mx-auto w-full">
        {/* Header Content */}
        <header className="w-full px-6 pt-12 flex flex-col items-center sm:items-start">
          <div className="status-bar-spacer"></div>
          <LocalEatsLogo width={220} height={60} showBackground={true} />
        </header>

        {/* Bottom Action Section */}
        <section className="mt-auto w-full px-6 pb-12 bottom-inset max-w-2xl">
          {/* Value Proposition */}
          <div className="mb-8">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Find the legendary <br />
              <span className="text-brand-orange underline decoration-4 underline-offset-8">
                Kota joints
              </span>{" "}
              near you.
            </h2>
            <p className="text-gray-100 mt-4 text-base md:text-lg font-medium opacity-90">
              Fresh ingredients, street-style, delivered fast by our bicycle
              fleet.
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <motion.button
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGetStarted}
              className="flex-1 bg-brand-orange text-white py-4 px-8 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-xl shadow-orange-950/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playClick();
                onGuestBrowse();
              }}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl font-bold transition-all cursor-pointer"
            >
              Explore as Guest
            </motion.button>
          </div>

          {/* Small Footer */}
          <div className="mt-8 flex items-center gap-2">
            <p className="text-white/60 text-sm">Have account already?</p>
            <button
              className="text-white font-bold text-sm hover:text-brand-orange underline underline-offset-4 transition-colors cursor-pointer"
              onClick={handleSignIn}
            >
              Log In
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
