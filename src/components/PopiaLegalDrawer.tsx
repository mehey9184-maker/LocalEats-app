import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, ChevronRight, CheckCircle2, Scale, ShieldCheck, UserCheck, HelpCircle } from 'lucide-react';

export function PopiaLegalDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [activeSection, setActiveSection] = useState<'privacy' | 'rider' | 'merchant' | 'about'>('privacy');

  useEffect(() => {
    const consent = localStorage.getItem('localeats_popia_consent');
    if (consent === 'acknowledged') {
      setHasAcknowledged(true);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem('localeats_popia_consent', 'acknowledged');
    setHasAcknowledged(true);
    setIsOpen(false);
  };

  return (
    <>
      {/* Persistent Bottom Legal Compliance Bar */}
      <div className="w-full bg-slate-900 dark:bg-slate-950 text-slate-300 py-2 px-4 text-[10px] flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-800 tracking-wide select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center justify-center bg-orange-500/20 text-orange-400 size-4.5 rounded-full shrink-0">
            <ShieldCheck className="w-3 h-3" />
          </span>
          <p className="truncate font-semibold">
            POPIA Compliant • <span className="text-slate-400">ZA Act 4 of 2013 Intermediary Safeguards Active</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOpen(true)}
            className="text-orange-400 hover:text-orange-300 font-bold uppercase tracking-wider underline cursor-pointer active:scale-95 transition-all"
          >
            Review Legal Agreements & Rules
          </button>
          {!hasAcknowledged && (
            <span className="bg-red-500 text-white font-black px-1.5 py-0.5 rounded text-[8px] animate-pulse">
              REQUIRED CONSENT
            </span>
          )}
        </div>
      </div>

      {/* Elegant POPIA Modal Window */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 animate-in translate-y-full sm:translate-y-0 sm:scale-95 duration-300">
            
            {/* Top Bar / Header */}
            <header className="px-6 py-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                    ZA Legal & POPIA Framework
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                    LocalEats Regulatory Compliance
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Quick Policy Section switcher */}
            <div className="flex border-b border-slate-100 dark:border-slate-800/80 p-2 overflow-x-auto shrink-0 bg-slate-50/50 dark:bg-slate-900/30 scrollbar-none">
              {[
                { id: 'privacy', label: 'POPIA Privacy' },
                { id: 'rider', label: 'Rider Contractors' },
                { id: 'merchant', label: 'Merchants' },
                { id: 'about', label: 'Aggregator Rule' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border shrink-0 ${
                    activeSection === tab.id 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow shadow-slate-200 dark:shadow-none' 
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body / Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-left">
              {activeSection === 'privacy' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-500/20 text-xs font-semibold">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>Compliance with the Protection of Personal Information Act (Act 4 of 2013) is mandatory.</span>
                  </div>
                  
                  <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    1. Purpose of Processing Location & Personal Data
                  </h3>
                  <p>
                    By activating your active-order routes and completing registration, you consent to LocalEats collecting and storing:
                  </p>
                  <ul className="list-disc list-inside space-y-2 pl-2">
                    <li><strong className="text-slate-900 dark:text-slate-200">Live GPS Coordinates (Lat/Lng):</strong> Used strictly in real-time to match orders with riders, track active-mission routes, and calculate estimated travel distances.</li>
                    <li><strong className="text-slate-900 dark:text-slate-200">Client Contact Info:</strong> Shared strictly to execute deliveries (name, phone number, and visual delivery pin).</li>
                  </ul>

                  <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs pt-2">
                    2. Strict POPIA Sharing Restriction
                  </h3>
                  <p>
                    LocalEats does not under any circumstances share, sell, or rent user database profiles with third-party marketers or unregistered agents. Active databases are hosted in secure, cloud-hosted Supabase frameworks with full Row Level Security (RLS) enforcement.
                  </p>
                </div>
              )}

              {activeSection === 'rider' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20 text-xs font-semibold">
                    <UserCheck className="w-5 h-5 shrink-0" />
                    <span>Independent Rider Carrier Agreements & Privacy Safeguards.</span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    1. Independent Contracting Status
                  </h3>
                  <p>
                    Delivery riders operate on the LocalEats network as <strong className="text-slate-900 dark:text-slate-100">independent contractors</strong>. This app configuration does not constitute an employment contract. Riders are responsible for their own vehicles, visual navigation equipment, and personal tax structures.
                  </p>

                  <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs pt-2">
                    2. Telemetry and Client Privacy Oath
                  </h3>
                  <p>
                    While handling deliveries, independent carriers are strictly prohibited from storing, screenshotting, or copying client telephone numbers, customer addresses, or security visual PIN details. Any violation of client credentials immediately revokes application dashboard credentials and results in immediate platform ban.
                  </p>
                </div>
              )}

              {activeSection === 'merchant' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    1. Food Safety & Pricing Liability
                  </h3>
                  <p>
                    LocalEats operates as a local restaurant aggregator. The liability for food quality, hygienic preparation, allergens, and menu price updates lies strictly with the registered local merchant shop owner.
                  </p>

                  <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs pt-2">
                    2. Kitchen Orders Delivery Policy
                  </h3>
                  <p>
                    Merchant operators must ensure that if a client selects "Cash on Arrival", the merchant hands the hot meal to the paired rider only upon confirmation of the active Pairing Cipher or Rider verified assignment badge.
                  </p>
                </div>
              )}

              {activeSection === 'about' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                    Intermediary Aggregation Exemption
                  </h3>
                  <p>
                    According to South African digital aggregation framework mandates, LocalEats operates as an online matching service bridging independent restaurant partners, local neighborhood delivery logistics, and buyers. 
                  </p>
                  <p>
                    Through the security architecture implemented server-side, Supabase holds cryptographically protected authentication secrets, while local cache storage handles client layout settings smoothly.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Footer Action with Quick Agreement Indicator */}
            <footer className="px-6 py-5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-5 h-5 ${hasAcknowledged ? 'text-green-500 fill-green-500/10' : 'text-slate-300'}`} />
                <span className="text-xs text-slate-505 font-semibold">
                  {hasAcknowledged ? 'Compliance Consented & Validated' : 'Please read and acknowledge'}
                </span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-3 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="flex-1 sm:flex-none px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer text-center"
                >
                  Acknowledge Consent
                </button>
              </div>
            </footer>

          </div>
        </div>
      )}
    </>
  );
}
