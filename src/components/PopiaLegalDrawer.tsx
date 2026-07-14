import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  Scale, 
  ShieldCheck, 
  UserCheck, 
  Flame, 
  UtensilsCrossed, 
  Sparkles,
  Lock
} from "lucide-react";

interface PopiaLegalDrawerProps {
  onConsentChange?: (consented: boolean) => void;
}

export function PopiaLegalDrawer({ onConsentChange }: PopiaLegalDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [activeSection, setActiveSection] = useState<"privacy" | "culture" | "rider" | "merchant" | "safeguards">("privacy");

  useEffect(() => {
    try {
      const consent = localStorage.getItem("localeats_popia_consent");
      const isConsented = consent === "acknowledged";
      setHasAcknowledged(isConsented);
      if (onConsentChange) {
        onConsentChange(isConsented);
      }
    } catch (e) {
      console.warn("Storage access not available:", e);
    }
  }, [onConsentChange]);

  const handleAcknowledge = () => {
    try {
      localStorage.setItem("localeats_popia_consent", "acknowledged");
      setHasAcknowledged(true);
      setIsOpen(false);
      if (onConsentChange) {
        onConsentChange(true);
      }
    } catch (e) {
      console.warn("Could not save consent status:", e);
    }
  };

  return (
    <>
      {/* Persistent Bottom Legal Compliance Bar - Glass-morphic Deep Teal */}
      {!hasAcknowledged && (
        <div 
          id="popia-legal-bar"
          className="fixed bottom-0 left-0 right-0 z-[999] bg-slate-950/95 backdrop-blur-md text-slate-100 py-3.5 px-6 text-xs flex flex-wrap items-center justify-between gap-3 border-t border-orange-500/20 tracking-wide select-none shadow-xl"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="inline-flex items-center justify-center bg-orange-500/20 text-orange-400 p-1.5 rounded-full shrink-0 animate-pulse">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <p className="font-semibold text-slate-200 text-[11px] leading-relaxed">
              By continuing to browse local joints, you agree to our ephemeral location processing under POPIA. We do not store your data.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              id="popia-review-btn"
              onClick={() => setIsOpen(true)}
              className="text-orange-400 hover:text-orange-300 font-extrabold uppercase tracking-wider underline cursor-pointer active:scale-95 transition-all text-[10px]"
            >
              Review Details
            </button>
            <button
              onClick={handleAcknowledge}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Elegant POPIA Glass-morphic Modal Drawer */}
      {isOpen && (
        <div 
          id="popia-modal-overlay"
          className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-teal-950/60 backdrop-blur-sm animate-in fade-in duration-300"
        >
          <div 
            id="popia-modal-container"
            className="w-full max-w-xl bg-teal-950/90 backdrop-blur-xl rounded-t-[32px] sm:rounded-[24px] max-h-[85vh] sm:max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-teal-500/25 animate-in translate-y-full sm:translate-y-0 sm:scale-95 duration-300 text-white"
          >
            
            {/* Header with South African Culinary Pride Banner */}
            <header className="px-6 py-5 bg-gradient-to-r from-teal-900 to-teal-800 border-b border-teal-500/20 flex items-center justify-between shrink-0 relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
                <Flame className="w-40 h-40 text-emerald-400" />
              </div>
              
              <div className="flex items-center gap-3 z-10">
                <div className="size-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-lg font-extrabold tracking-tight text-white leading-tight">
                      ZA Legal & POPIA Framework
                    </h2>
                    <span className="bg-emerald-500 text-teal-950 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                      Act 4 of 2013
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-400/80 font-black uppercase tracking-widest mt-0.5 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Celebrating South African Township Flavours Securely
                  </p>
                </div>
              </div>
              <button 
                id="popia-close-btn"
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-teal-300 hover:text-white hover:bg-teal-800/60 transition-colors cursor-pointer border border-teal-500/10"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Quick Section Tab Switcher */}
            <div className="flex border-b border-teal-500/15 p-2 overflow-x-auto shrink-0 bg-teal-950/40 scrollbar-none gap-1.5">
              {[
                { id: "privacy", label: "POPIA Privacy" },
                { id: "culture", label: "Kota & Braai Oath" },
                { id: "rider", label: "Bicycle Fleet" },
                { id: "merchant", label: "Local Joints" },
                { id: "safeguards", label: "Safeguards" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  id={`popia-tab-${tab.id}`}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border shrink-0 ${
                    activeSection === tab.id 
                      ? "bg-emerald-500 text-teal-950 border-transparent shadow shadow-emerald-500/20" 
                      : "text-teal-300 hover:text-white hover:bg-teal-900/40 border-teal-500/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-teal-100/90 leading-relaxed text-left">
              {activeSection === "privacy" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3 p-4 bg-emerald-500/10 text-emerald-300 rounded-2xl border border-emerald-500/25 text-xs font-semibold leading-normal">
                    <Lock className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block mb-0.5">Strict Compliance Mandatory</span>
                      Your privacy is protected under South African Law. Processing your telemetry is subject to strict consent.
                    </div>
                  </div>
                  
                  <h3 className="font-black text-emerald-400 uppercase tracking-widest text-xs flex items-center gap-1">
                    <span>1. Why We Require Location & Personal Data</span>
                  </h3>
                  <p className="text-slate-200">
                    To deliver hot, freshly made Kotas and flame-grilled Braai platters to your exact location, LocalEats collects and processes:
                  </p>
                  <ul className="list-disc list-inside space-y-2 pl-2 text-slate-300">
                    <li><strong className="text-white">Live Delivery Coordinates:</strong> Strictly processed to compute optimal bicycle routing, matches with local riders, and real-time ETAs.</li>
                    <li><strong className="text-white">Contact details:</strong> Shared securely with the assigned rider purely to facilitate delivery communication.</li>
                  </ul>

                  <h3 className="font-black text-emerald-400 uppercase tracking-widest text-xs pt-2">
                    2. Strict POPIA Sharing Restriction
                  </h3>
                  <p className="text-slate-300">
                    We strictly enforce Data Minimization. Ephemeral guest session data is stored in memory and is <strong className="text-white underline">never</strong> committed to permanent logs or third-party advertising registries.
                  </p>
                </div>
              )}

              {activeSection === "culture" && (
                <div className="space-y-4 animate-in fade-in duration-200 text-slate-200">
                  <div className="flex items-center gap-2 p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/25 text-xs font-black uppercase tracking-wider">
                    <UtensilsCrossed className="w-5 h-5 shrink-0 text-emerald-400" />
                    <span>The Heart of the Township Flavor</span>
                  </div>

                  <p>
                    From the bustling street corners of <strong className="text-white">Tembisa</strong> to the smoky yards of <strong className="text-white">Soweto</strong>, the legendary Kota and premium Braai culture represent South African community, resilience, and culinary masterclass.
                  </p>
                  <p>
                    LocalEats bridges the gap by delivering these local culinary masterpieces through elite technology. Under the POPIA Act, we promise:
                  </p>
                  <ul className="list-disc list-inside space-y-2.5 pl-2 text-slate-300">
                    <li><strong className="text-white">Preserving Culinary Roots:</strong> Connecting you to local vendors while honoring community heritage.</li>
                    <li><strong className="text-white">Protecting local identities:</strong> No corporate data brokers. Your favorite Kota joint preferences and location details stay secure and private.</li>
                  </ul>
                </div>
              )}

              {activeSection === "rider" && (
                <div className="space-y-4 animate-in fade-in duration-200 text-slate-200">
                  <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/25 text-xs font-semibold">
                    <UserCheck className="w-5 h-5 shrink-0 text-emerald-400" />
                    <span>Bicycle Fleet & Independent Carrier Protection</span>
                  </div>

                  <h3 className="font-black text-emerald-400 uppercase tracking-widest text-xs">
                    1. Rider Contractor Telemetry
                  </h3>
                  <p>
                    Our ecological bicycle couriers utilize live GPS trackers to sync with our optimized Mapbox cycling engine. This ensures safety, exact timing, and battery conservation during local deliveries.
                  </p>
                  <h3 className="font-black text-emerald-400 uppercase tracking-widest text-xs pt-2">
                    2. Client Privacy Oath
                  </h3>
                  <p>
                    Riders on the LocalEats network are bound by a strict confidentiality protocol. Copying, screenshotting, or distributing client phone numbers or physical addresses outside the application parameters will trigger immediate platform bans and potential legal prosecution under Act 4 of 2013.
                  </p>
                </div>
              )}

              {activeSection === "merchant" && (
                <div className="space-y-4 animate-in fade-in duration-200 text-slate-200">
                  <h3 className="font-black text-emerald-400 uppercase tracking-widest text-xs">
                    1. Food Standard & Preparation Oath
                  </h3>
                  <p>
                    Our partnered local joints prepare authentic, premium Kotas and Braai menus adhering to strict local health and safety regulations. Merchants accept instructions and allergens via the digital terminal to ensure high quality.
                  </p>
                  <h3 className="font-black text-emerald-400 uppercase tracking-widest text-xs pt-2">
                    2. Order Dispatch Rules
                  </h3>
                  <p>
                    All hot food orders are handed to the verified delivery couriers only upon validation of the cryptographic Order Security Token. This guarantees that your Kota arrives hot and exactly as prepared.
                  </p>
                </div>
              )}

              {activeSection === "safeguards" && (
                <div className="space-y-4 animate-in fade-in duration-200 text-slate-200">
                  <h3 className="font-black text-emerald-400 uppercase tracking-widest text-xs">
                    Active Intermediary Safeguards (Act 4 of 2013)
                  </h3>
                  <p>
                    Under Section 11 of the Protection of Personal Information Act, we have established:
                  </p>
                  <ul className="list-disc list-inside space-y-2.5 pl-2 text-slate-300">
                    <li><strong className="text-white">Active Cryptographic Protection:</strong> All database transport streams use TLS 1.3 encryption and Row Level Security (RLS) policies.</li>
                    <li><strong className="text-white">Data Minimization Engine:</strong> Automatic cleaning of inactive profiles and complete separation of temporary guest coordinates.</li>
                    <li><strong className="text-white">Client Consent Revocation:</strong> You can wipe all local storage preferences, session coordinates, and order histories instantly at any time.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Footer with High-Trust Actions */}
            <footer className="px-6 py-5 bg-teal-900 border-t border-teal-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className={`w-5 h-5 ${hasAcknowledged ? "text-emerald-400" : "text-teal-600"}`} />
                <span className="text-xs text-teal-200 font-bold uppercase tracking-wider">
                  {hasAcknowledged ? "POPIA Consented & Safe" : "Action Required for Order Access"}
                </span>
              </div>
              
              <div className="flex gap-2.5 w-full sm:w-auto">
                <button
                  id="popia-dismiss-btn"
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-3 bg-teal-950/60 hover:bg-teal-900 text-teal-200 border border-teal-500/20 text-[11px] font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center"
                >
                  Dismiss
                </button>
                <button
                  id="popia-accept-btn"
                  type="button"
                  onClick={handleAcknowledge}
                  className="flex-1 sm:flex-none px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-teal-950 text-[11px] font-black uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-95 cursor-pointer text-center"
                >
                  Acknowledge & Accept
                </button>
              </div>
            </footer>

          </div>
        </div>
      )}
    </>
  );
}
