import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, MapPin, Bike, CheckCircle, ChevronRight, X, Sparkles } from 'lucide-react';

const TOUR_STEPS = [
  {
    icon: ShoppingBag,
    title: "Discover Local Food",
    description: "Browse verified local kitchens, artisanal shops, and hidden gems right in your neighborhood.",
    badge: "Step 1 of 3"
  },
  {
    icon: MapPin,
    title: "Pinpoint Delivery",
    description: "Use our interactive map to drop a pin exactly at your door for perfect, delay-free deliveries.",
    badge: "Step 2 of 3"
  },
  {
    icon: Bike,
    title: "Fast & Tracked",
    description: "Follow your order in real-time—from the moment the chef starts cooking until it's in your hands.",
    badge: "Step 3 of 3"
  }
];

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const handleRestart = () => {
      setCurrentStep(0);
      setIsOpen(true);
      window.dispatchEvent(new CustomEvent('localeats_tour_started'));
    };

    const handleSkipAll = () => {
      setIsOpen(false);
    };

    window.addEventListener('localeats_restart_tour', handleRestart);
    window.addEventListener('localeats_skip_all_tours', handleSkipAll);

    const hasSeenTour = localStorage.getItem('localeats_tour_seen');
    if (!hasSeenTour) {
      // Small delay so it feels natural and doesn't instantly block initial screen mount
      const timer = setTimeout(() => {
        setIsOpen(true);
        window.dispatchEvent(new CustomEvent('localeats_tour_started'));
      }, 1200);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('localeats_restart_tour', handleRestart);
        window.removeEventListener('localeats_skip_all_tours', handleSkipAll);
      };
    }

    return () => {
      window.removeEventListener('localeats_restart_tour', handleRestart);
      window.removeEventListener('localeats_skip_all_tours', handleSkipAll);
    };
  }, []);

  const completeTour = () => {
    localStorage.setItem('localeats_tour_seen', 'true');
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('localeats_tour_ended'));
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const currentData = TOUR_STEPS[currentStep];
  const IconComponent = currentData.icon;

  return (
    <AnimatePresence>
      <div 
        id="onboarding-guide-modal-container"
        className="fixed inset-0 z-[10000] w-full max-w-[100vw] overflow-hidden flex-shrink-0 overflow-y-auto overscroll-contain pointer-events-auto flex flex-col items-center justify-center p-3 sm:p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={completeTour}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-0"
        />

        {/* Responsive Centered Guide Slide Card - strictly constrained to mobile viewport bounds with dynamic width adaptation */}
        <motion.div
          id="onboarding-guide-slide-card"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="guide-slide relative z-10 w-full max-w-[calc(100vw-1.5rem)] sm:max-w-[360px] my-auto bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[30px] shadow-2xl border border-slate-100 dark:border-slate-800 outline outline-1 outline-orange-500/20 dark:outline-orange-400/20 outline-offset-0 overflow-hidden flex flex-col shrink-0 flex-shrink-0 max-h-[calc(100dvh-1.5rem)] box-border"
        >
          {/* Top Hero Visual Banner */}
          <div className="relative h-28 sm:h-36 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 flex items-center justify-center overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/food.png')] opacity-10 mix-blend-overlay" />
            
            {/* Step Counter Tag */}
            <div className="absolute top-3 left-3.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                {currentData.badge}
              </span>
            </div>

            {/* Close Button */}
            <button
              type="button"
              id="btn-close-onboarding-guide"
              onClick={completeTour}
              aria-label="Close guide"
              className="absolute top-3 right-3.5 z-10 w-8 h-8 rounded-full bg-black/30 hover:bg-black/45 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Animated Icon Circle */}
            <motion.div 
              key={`icon-${currentStep}`}
              initial={{ scale: 0.75, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.75, opacity: 0, rotate: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="bg-white/20 p-3.5 sm:p-4 rounded-full backdrop-blur-md shadow-inner border border-white/30"
            >
              <IconComponent className="w-9 h-9 sm:w-11 sm:h-11 text-white" strokeWidth={1.8} />
            </motion.div>
          </div>

          {/* Slide Text Content & Stepper */}
          <div className="p-4 sm:p-5 text-center bg-white dark:bg-slate-900 overflow-y-auto flex-1 flex flex-col justify-between">
            <motion.div
              key={`text-${currentStep}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="min-h-[64px] sm:min-h-[72px] flex flex-col justify-center my-1"
            >
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white mb-1">
                {currentData.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-[280px] mx-auto">
                {currentData.description}
              </p>
            </motion.div>

            {/* Stepper Progress Dots */}
            <div className="flex items-center justify-center gap-1.5 my-3">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentStep 
                      ? 'w-6 bg-orange-600' 
                      : 'w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                  }`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 shrink-0 pt-1">
              <button
                type="button"
                id="btn-onboarding-guide-next"
                onClick={nextStep}
                className="w-full min-h-[44px] py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {currentStep === TOUR_STEPS.length - 1 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Get Started
                  </>
                ) : (
                  <>
                    Next Step
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between px-1">
                {currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="min-h-[36px] py-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                ) : (
                  <span />
                )}

                {currentStep < TOUR_STEPS.length - 1 && (
                  <button
                    type="button"
                    id="btn-onboarding-guide-skip"
                    onClick={completeTour}
                    className="min-h-[36px] py-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Skip Tour
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
