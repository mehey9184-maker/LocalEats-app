import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X, ChevronRight, Map, Bell, Star, Store, ShoppingBag, Bike, Clock, Sparkles, Volume2, VolumeX, Music, MessageCircle } from 'lucide-react';
import { audioHelper, SoundType } from '../lib/audioHelper';
import { DeliveryChatWidget } from './ChatWidget';

export function AppHelp({
  currentScreen = "splash",
  cartCount = 0,
  activeOrder = null,
  userProfile = null,
}: {
  currentScreen?: string;
  cartCount?: number;
  activeOrder?: any;
  userProfile?: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [, setMuteTrigger] = useState(false);

  // Define screens where the floating help button is contextually helpful.
  const activeHelpScreens = ["home", "discover", "explore", "store-info", "order-history", "notifications", "contact"];
  
  // Dynamic conflict avoidance: Only show help when browsing non-critical screens AND when floating checkout is NOT active.
  const shouldShowButton = activeHelpScreens.includes(currentScreen) && cartCount === 0;
  
  const hasActiveDelivery = activeOrder && (activeOrder.status === 'out_for_delivery' || activeOrder.status === 'ready' || activeOrder.status === 'preparing' || activeOrder.status === 'confirmed' || activeOrder.status === 'pending');

  return (
    <>
      {hasActiveDelivery ? (
        <AnimatePresence>
          {shouldShowButton && (
            <div className="fixed bottom-[92px] right-4 md:right-6 md:bottom-6 z-[90]">
              <DeliveryChatWidget 
                orderId={activeOrder.id} 
                userId={userProfile?.id || ""} 
                riderName={activeOrder.rider_name || "Rider"} 
                isActive={true} 
              />
            </div>
          )}
        </AnimatePresence>
      ) : (
        <>
          <AnimatePresence>
            {shouldShowButton && (
              <motion.button
                id="tour-help-trigger"
                initial={{ scale: 0, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 15 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-[92px] right-4 md:right-6 md:bottom-6 z-[90] w-11 h-11 md:w-14 md:h-14 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-2 border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:shadow-xl hover:border-orange-500 hover:text-orange-500 dark:hover:border-orange-500 flex items-center justify-center active:scale-95 group cursor-pointer"
                title="App Guide"
              >
                <HelpCircle className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {isOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-0"
                />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[88dvh] my-auto"
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

                {/* Cognitive Audio Psychology Center */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="w-5 h-5 text-orange-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Acoustic Sound Therapy</h3>
                    </div>
                    
                    <button 
                      onClick={() => {
                        audioHelper.toggleMute();
                        // Force state update by toggling local dummy trigger
                        setMuteTrigger(prev => !prev);
                        // Play demo sound if unmuted
                        if (!audioHelper.getMuteStatus()) {
                          audioHelper.play('alert');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                        audioHelper.getMuteStatus() 
                          ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' 
                          : 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                      }`}
                    >
                      {audioHelper.getMuteStatus() ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          Muted
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          Active
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Designed using target-wave acoustic synthesis to satisfy, trigger cognitive relief, and deliver dopamine directly inside the client flow:
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      { id: 'placed' as SoundType, label: 'Success Placement', emoji: '🛒', desc: 'Warm triad ascent (Joy & Relief)' },
                      { id: 'confirmed' as SoundType, label: 'Order Confirmed', emoji: '🏍️', desc: 'High dual-chime (Motion & Safety)' },
                      { id: 'ready' as SoundType, label: 'Runner Arrived', emoji: '🏡', desc: 'Rhythmic triple-ping (Attention)' },
                      { id: 'delivered' as SoundType, label: 'Finished Order', emoji: '🎉', desc: 'Harmony chord (Dopamine hit)' }
                    ].map((sound) => (
                      <button
                        key={sound.id}
                        type="button"
                        onClick={() => audioHelper.play(sound.id)}
                        className="p-2.5 bg-white dark:bg-slate-900 hover:border-orange-500/50 dark:hover:border-orange-500/40 border border-slate-100 dark:border-slate-800 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95 group cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{sound.label}</span>
                          <span className="text-xs group-hover:animate-bounce">{sound.emoji}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 line-clamp-1">{sound.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3.5 pt-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('localeats_start_interactive_tour'));
                      }, 250);
                    }}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/15 transition-all active:scale-95 text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 animate-bounce" />
                    Interactive Live Screen Guide
                  </button>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      // Give a tiny frame delay so help closes beautifully before tour runs
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('localeats_restart_tour'));
                      }, 250);
                    }}
                    className="w-full py-3.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 text-center flex items-center justify-center gap-2 border border-slate-100 dark:border-slate-700 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Classic Onboarding Slideshow
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
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
