import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, MapPin, Bike, CheckCircle, ChevronRight } from 'lucide-react';

const TOUR_STEPS = [
  {
    icon: ShoppingBag,
    title: "Discover Local Food",
    description: "Browse verified local kitchens, artisanal shops, and hidden gems right in your neighborhood."
  },
  {
    icon: MapPin,
    title: "Pinpoint Delivery",
    description: "Use our interactive map to drop a pin exactly at your door for perfect, delay-free deliveries."
  },
  {
    icon: Bike,
    title: "Fast & Tracked",
    description: "Follow your order in real-time—from the moment the chef starts cooking until it's in your hands."
  }
];

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const handleRestart = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    window.addEventListener('localeats_restart_tour', handleRestart);

    const hasSeenTour = localStorage.getItem('localeats_tour_seen');
    if (!hasSeenTour) {
      // Small delay so it feels natural and doesn't instantly block the UI
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('localeats_restart_tour', handleRestart);
      };
    }

    return () => {
      window.removeEventListener('localeats_restart_tour', handleRestart);
    };
  }, []);

  const completeTour = () => {
    localStorage.setItem('localeats_tour_seen', 'true');
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 bottom-12 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-full md:max-w-sm md:left-1/2 md:-translate-x-1/2 z-[10000] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="relative h-48 bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/food.png')] opacity-10 mix-blend-overlay"></div>
              <motion.div 
                key={currentStep}
                initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0, rotate: 10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-white/20 p-6 rounded-full backdrop-blur-md shadow-inner border border-white/30"
              >
                {(() => {
                  const Icon = TOUR_STEPS[currentStep].icon;
                  return <Icon className="w-16 h-16 text-white" strokeWidth={1.5} />;
                })()}
              </motion.div>
            </div>

            <div className="p-8 text-center bg-white dark:bg-slate-900">
              <motion.div
                key={`text-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="min-h-[100px]"
              >
                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                  {TOUR_STEPS[currentStep].title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {TOUR_STEPS[currentStep].description}
                </p>
              </motion.div>

              <div className="flex items-center justify-center gap-2 mt-8 mb-8">
                {TOUR_STEPS.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-orange-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={nextStep}
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {currentStep === TOUR_STEPS.length - 1 ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Get Started
                    </>
                  ) : (
                    <>
                      Next Step
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                {currentStep < TOUR_STEPS.length - 1 && (
                  <button
                    onClick={completeTour}
                    className="py-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-widest transition-colors"
                  >
                    Skip Tour
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
