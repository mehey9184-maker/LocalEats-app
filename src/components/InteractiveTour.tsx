import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
}

const INTERACTIVE_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-search-bar',
    title: 'Instant Search Portal 🔍',
    description: 'Tap here to instantly look up your favorite local Kotas, artisan chips, or traditional spaza kitchen recipes.',
  },
  {
    targetId: 'tour-delivery-address',
    title: 'GPS Delivery Pinpoint 📍',
    description: 'Displays your delivery location. Tap Set to pin your exact entrance door on live maps for seamless rider handovers.',
  },
  {
    targetId: 'tour-categories',
    title: 'Cuisine Category Chips 🌶️',
    description: 'Swiftly swipe and tap to filter local merchants by culinary style, ratings, or distance with one simple click.',
  },
  {
    targetId: 'tour-nav-discover',
    title: 'Exotic Map Explorer 🗺️',
    description: 'Eager to browse? Tap Discover to view all merchant kitchens plotted dynamically right over your local neighborhood map coordinates.',
  },
  {
    targetId: 'tour-help-trigger',
    title: 'Help & Compliance Hub 🛡️',
    description: 'Confused about delivery surcharges or privacy? Tap here at any time to query our help system or read POPIA terms!',
  }
];

export function InteractiveTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const measureTarget = useCallback(() => {
    const step = INTERACTIVE_TOUR_STEPS[currentStep];
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 250);
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  useEffect(() => {
    const handleStartInteractiveTour = () => {
      setCurrentStep(0);
      setIsActive(true);
      window.dispatchEvent(new CustomEvent('localeats_tour_started'));
    };

    const handleSkipAll = () => {
      setIsActive(false);
    };

    window.addEventListener('localeats_start_interactive_tour', handleStartInteractiveTour);
    window.addEventListener('localeats_skip_all_tours', handleSkipAll);

    // Auto-start interactive tour on first visit after initial screen settle
    const hasSeenInteractiveTour = localStorage.getItem('localeats_interactive_tour_seen');
    if (!hasSeenInteractiveTour) {
      const timer = setTimeout(() => {
        setIsActive(true);
        window.dispatchEvent(new CustomEvent('localeats_tour_started'));
      }, 3500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('localeats_start_interactive_tour', handleStartInteractiveTour);
        window.removeEventListener('localeats_skip_all_tours', handleSkipAll);
      };
    }

    return () => {
      window.removeEventListener('localeats_start_interactive_tour', handleStartInteractiveTour);
      window.removeEventListener('localeats_skip_all_tours', handleSkipAll);
    };
  }, []);

  // Re-measure target when step changes or window events trigger
  useEffect(() => {
    if (!isActive) return;

    measureTarget();

    const handleResizeOrScroll = () => {
      measureTarget();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isActive, measureTarget]);

  const handleNext = () => {
    if (currentStep < INTERACTIVE_TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('localeats_interactive_tour_seen', 'true');
    setIsActive(false);
    window.dispatchEvent(new CustomEvent('localeats_tour_ended'));
  };

  if (!isActive) return null;

  const currentStepData = INTERACTIVE_TOUR_STEPS[currentStep];
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
  const winHeight = typeof window !== 'undefined' ? window.innerHeight : 667;
  const isMobile = winWidth < 640;

  // Spotlight ring calculation with strict bounding box safety
  const spotlightStyle: React.CSSProperties = targetRect ? {
    position: 'fixed',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    zIndex: 9990,
    boxShadow: `0 0 0 9999px rgba(15, 23, 42, 0.78)`,
    borderRadius: '16px',
    transform: `translate3d(${Math.max(4, targetRect.left - 6)}px, ${Math.max(4, targetRect.top - 6)}px, 0px)`,
    width: `${Math.min(winWidth - 8, targetRect.width + 12)}px`,
    height: `${targetRect.height + 12}px`,
    transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
    border: '2px solid rgb(249, 115, 22)',
  } : {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    zIndex: 9990,
    transition: 'all 0.3s ease',
  };

  // Position the guide slide card:
  // On mobile: Always dock cleanly either at the top or bottom of the viewport so it never cuts off or goes off-screen!
  // If the target is in the bottom half (e.g. bottom nav or help fab), place guide at top.
  // If the target is in the top half (e.g. search bar or address bar), place guide at bottom.
  const targetIsLowerHalf = targetRect ? targetRect.top > (winHeight * 0.48) : false;

  let desktopStyle: React.CSSProperties | undefined;
  if (!isMobile && targetRect) {
    const cardWidth = 350;
    const cardHeight = 220;
    const margin = 16;
    
    let left = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
    left = Math.max(16, Math.min(winWidth - cardWidth - 16, left));

    let top: number;
    if (targetIsLowerHalf) {
      top = Math.max(16, targetRect.top - cardHeight - margin);
    } else {
      top = Math.min(winHeight - cardHeight - 16, targetRect.bottom + margin);
    }

    desktopStyle = {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${cardWidth}px`,
    };
  }

  return (
    <AnimatePresence>
      <div 
        id="interactive-tour-overlay"
        className="fixed inset-0 z-[9980] w-full max-w-[100vw] overflow-hidden flex-shrink-0 pointer-events-none"
      >
        {/* Invisible Clickable Backdrop */}
        <div 
          className="fixed inset-0 bg-transparent pointer-events-auto" 
          onClick={handleComplete}
          aria-label="Dismiss guide"
        />

        {/* 1. Dynamic Spotlight Highlight on Target Element */}
        <div style={spotlightStyle}>
          <div className="absolute inset-0 bg-orange-500/15 rounded-[14px] animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
          
          <div className="absolute -top-3 -right-3 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-6 w-6 bg-orange-500 text-[10px] items-center justify-center font-black text-white shadow shadow-orange-500/50">
              {currentStep + 1}
            </span>
          </div>
        </div>

        {/* 2. Responsive Floating Guide Slide Card */}
        <div 
          className={`fixed left-0 right-0 z-[9995] w-full max-w-[100vw] overflow-hidden flex-shrink-0 pointer-events-none flex justify-center px-3.5 sm:px-4 ${
            isMobile
              ? targetIsLowerHalf
                ? 'top-3.5 pt-[env(safe-area-inset-top)]'
                : 'bottom-3.5 pb-[env(safe-area-inset-bottom)]'
              : ''
          }`}
          style={!isMobile ? desktopStyle : undefined}
        >
          <motion.div
            id="interactive-guide-slide-card"
            key={`guide-step-${currentStep}`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: "spring", damping: 26, stiffness: 350 }}
            className="guide-slide w-full max-w-[calc(100vw-1.5rem)] sm:max-w-[360px] bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[28px] shadow-2xl border border-slate-100 dark:border-slate-800 outline outline-1 outline-orange-500/20 dark:outline-orange-400/20 outline-offset-0 p-4 sm:p-5 flex flex-col gap-3 text-left pointer-events-auto max-h-[min(85dvh,420px)] overflow-y-auto flex-shrink-0 shrink-0 box-border"
          >
            {/* Header Row */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 p-1.5 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </span>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Active Screen Guide</p>
              </div>
              
              <button 
                type="button"
                id="btn-close-interactive-guide"
                onClick={handleComplete}
                aria-label="Close guide"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slide Title & Description */}
            <div className="flex-1">
              <h4 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
                {currentStepData.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">
                {currentStepData.description}
              </p>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60 shrink-0">
              <div className="flex items-center gap-1.5">
                {INTERACTIVE_TOUR_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    aria-label={`Go to step ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentStep 
                        ? 'w-5 bg-orange-500' 
                        : 'w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-black text-slate-400 font-mono tracking-wider">
                {currentStep + 1} / {INTERACTIVE_TOUR_STEPS.length}
              </span>
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-between gap-2 shrink-0 pt-0.5">
              <button
                type="button"
                id="btn-skip-interactive-guide"
                onClick={handleComplete}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest px-2 py-2 cursor-pointer transition-colors min-h-[44px] flex items-center"
              >
                Skip
              </button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    type="button"
                    id="btn-back-interactive-guide"
                    onClick={handleBack}
                    aria-label="Previous step"
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all border border-slate-100 dark:border-slate-700 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  type="button"
                  id="btn-next-interactive-guide"
                  onClick={handleNext}
                  className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/15 min-h-[44px]"
                >
                  {currentStep === INTERACTIVE_TOUR_STEPS.length - 1 ? 'Finish' : 'Got it'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
