import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, ChevronRight, Map, Bell, Star, Store, ShoppingBag, Bike, Clock } from 'lucide-react';

export function AppHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[90] w-14 h-14 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:shadow-xl hover:border-orange-500 hover:text-orange-500 dark:hover:border-orange-500 transition-all flex items-center justify-center active:scale-95 group"
        title="App Guide"
      >
        <HelpCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[95]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 bottom-24 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:max-w-md md:left-1/2 md:-translate-x-1/2 z-[100] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-500/20 p-2 rounded-xl">
                    <HelpCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">How it Works</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-500 transition-colors active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Welcome to LocalEats</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Your neighborhood's best food, delivered fast. We connect you directly with top local kitchens, ensuring hot, fresh meals with transparent tracking.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">Your Journey</h3>
                  <div className="space-y-3">
                    <FeatureRow icon={Store} title="1. Find a Store" desc="Browse curated local restaurants and check their verified ratings." />
                    <FeatureRow icon={ShoppingBag} title="2. Customize Order" desc="Pick your favorites and add special instructions for the chef." />
                    <FeatureRow icon={Map} title="3. Pin Delivery" desc="Set your exact door location on our map so drivers never get lost." />
                    <FeatureRow icon={Bike} title="4. Live Tracking" desc="Watch your order status update in real-time until it arrives." />
                  </div>
                </div>

                <div className="bg-orange-50 dark:bg-orange-500/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-500/20">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Standard Delivery Zones</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Deliveries within 3km enjoy our flat R5 rate. Addresses between 3km and 6km have a small +R5 distance surcharge. We cap deliveries at 6km to guarantee your food arrives hot!
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Give a tiny frame delay so help closes beautifully before tour runs
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('localeats_restart_tour'));
                    }, 200);
                  }}
                  className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-95 text-center mt-2 flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-4 h-4 animate-pulse" />
                  Restart Welcome Walkthrough
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function FeatureRow({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex gap-4 items-start group">
      <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 shrink-0 shadow-sm">
        <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
