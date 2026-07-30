import React, { useState, useEffect } from "react";
import { Cookie, ShieldCheck, Settings, Check, X, Info, Lock } from "lucide-react";

export interface CookiePreferences {
  essential: boolean; // Always true
  analytics: boolean; // Usage & performance metrics
  persistence: boolean; // Saved addresses, cart recovery & session state
  personalization: boolean; // Recommended local food & shops
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: true,
  persistence: true,
  personalization: true,
};

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("localeats_cookie_preferences");
      if (!saved) {
        // Show banner after short delay for non-intrusive entry
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      } else {
        setPreferences(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not read cookie preferences:", e);
    }
  }, []);

  const savePreferences = (prefs: CookiePreferences) => {
    try {
      localStorage.setItem("localeats_cookie_preferences", JSON.stringify(prefs));
      setPreferences(prefs);
      setIsVisible(false);
      setShowSettingsModal(false);
    } catch (e) {
      console.warn("Could not save cookie preferences:", e);
    }
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      persistence: true,
      personalization: true,
    });
  };

  const handleEssentialOnly = () => {
    savePreferences({
      essential: true,
      analytics: false,
      persistence: false,
      personalization: false,
    });
  };

  if (!isVisible && !showSettingsModal) return null;

  return (
    <>
      {/* Floating Bottom Cookie Banner */}
      {isVisible && !showSettingsModal && (
        <div 
          id="cookie-consent-banner"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[998] bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-xl text-white p-4 sm:p-5 rounded-3xl shadow-2xl border border-slate-800 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-orange-500/15 text-orange-400 rounded-2xl shrink-0">
              <Cookie className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  Cookies & Data Choice
                </h4>
                <button
                  type="button"
                  onClick={() => setIsVisible(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full transition-colors cursor-pointer"
                  title="Close banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                We use cookies and local storage to save your cart, remember delivery addresses, and personalize local restaurant picks.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs py-2.5 px-3.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer text-center"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 px-3.5 rounded-xl transition-all cursor-pointer"
            >
              Essential Only
            </button>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer flex items-center justify-center"
              title="Customize Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Granular Preferences Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl">
                  <Cookie className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    Cookie & Data Preferences
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    POPIA & GDPR Compliant Privacy Controls
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1 no-scrollbar">
              {/* Category 1: Essential Cookies */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">Essential Cookies</span>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">Required</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Necessary for app security, user authentication session tokens, and core order routing.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 h-4 h-4 rounded text-orange-600 accent-orange-600 cursor-not-allowed"
                />
              </div>

              {/* Category 2: Cart & Address Persistence */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">Cart & Location Persistence</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Saves your active food basket and recent delivery pins locally on your device so you don't lose progress.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.persistence}
                  onChange={(e) => setPreferences(p => ({ ...p, persistence: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded text-orange-600 accent-orange-600 cursor-pointer"
                />
              </div>

              {/* Category 3: Personalization & Local Picks */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">Personalized Recommendations</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Displays nearby trending local township kitchens, custom deal discounts, and quick reorder shortcuts.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.personalization}
                  onChange={(e) => setPreferences(p => ({ ...p, personalization: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded text-orange-600 accent-orange-600 cursor-pointer"
                />
              </div>

              {/* Category 4: Analytics */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">Performance Analytics</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Helps us monitor app speed, fix broken restaurant links, and optimize rider dispatch maps.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                  className="mt-1 h-4 w-4 rounded text-orange-600 accent-orange-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Reject Non-Essential
              </button>
              <button
                type="button"
                onClick={() => savePreferences(preferences)}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Preferences</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
