import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
}

const INTERACTIVE_TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-search-bar',
    title: 'Instant Search Portal 🔍',
    description: 'Tap here to instantly look up your favorite local Kotas, artisan chips, or traditional spaza kitchen recipes.',
    position: 'bottom'
  },
  {
    targetId: 'tour-delivery-address',
    title: 'GPS Delivery Pinpoint 📍',
    description: 'Displays your default delivery location. Tap Set to pin your exact entrance door on the live maps for seamless rider handovers.',
    position: 'bottom'
  },
  {
    targetId: 'tour-categories',
    title: 'Cuisine Category Chips 🌶️',
    description: 'Swiftly swipe and tap to filter local merchants by culinary style, ratings, or distance with one simple click.',
    position: 'bottom'
  },
  {
    targetId: 'tour-nav-discover',
    title: 'Exotic Map Explorer 🗺️',
    description: 'Eager to browse? Tap Discover to view all merchant kitchens plotted dynamically right over your local neighborhood map coordinates.',
    position: 'top'
  },
  {
    targetId: 'tour-help-trigger',
    title: 'Help & Compliance Hub 🛡️',
    description: 'Confused about delivery surcharges or privacy? Tap here at any time to query our help system or read POPIA terms!',
    position: 'top-right'
  }
];

export function InteractiveTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [, setWindowResizeKey] = useState(0);

  useEffect(() => {
    const handleStartInteractiveTour = () => {
      setCurrentStep(0);
      setIsActive(true);
    };

    window.addEventListener('localeats_start_interactive_tour', handleStartInteractiveTour);

    // Also auto-start interactive tour if they have never seen it
    const hasSeenInteractiveTour = localStorage.getItem('localeats_interactive_tour_seen');
    if (!hasSeenInteractiveTour) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 3500); // Trigger a bit after main loading settles
      return () => {
        clearTimeout(timer);
        window.removeEventListener('localeats_start_interactive_tour', handleStartInteractiveTour);
      };
    }

    return () => {
      window.removeEventListener('localeats_start_interactive_tour', handleStartInteractiveTour);
    };
  }, []);

  // Recalculate target rectangle when step changes or window resizes
  useEffect(() => {
    if (!isActive) return;

    const measureTarget = () => {
      const step = INTERACTIVE_TOUR_STEPS[currentStep];
      const el = document.getElementById(step.targetId);
      if (el) {
        // Force scroll target into view if necessary so it can be highlighted
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Allow smooth scroll to settle before measuring
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
        }, 300);
      } else {
        // Fallback to center of screen if target is missing
        setTargetRect(null);
      }
    };

    measureTarget();

    // Re-measure on window updates
    const handleUpdate = () => {
      setWindowResizeKey(prev => prev + 1);
      measureTarget();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isActive, currentStep]);

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
  };

  if (!isActive) return null;

  const currentStepData = INTERACTIVE_TOUR_STEPS[currentStep];

  // Calculations for Spotlight clipPath
  // Uses transparent mask to knock out the spotlight shape
  const spotlightStyle: React.CSSProperties = targetRect ? {
    position: 'fixed',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    zIndex: 9990,
    boxShadow: `0 0 0 9999px rgba(15, 23, 42, 0.75)`,
    borderRadius: '16px',
    transform: `translate3d(${targetRect.left - 6}px, ${targetRect.top - 6}px, 0px)`,
    width: `${targetRect.width + 12}px`,
    height: `${targetRect.height + 12}px`,
    transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
    border: '2px solid rgb(249, 115, 22)',
  } : {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    zIndex: 9990,
    transition: 'all 0.35s ease',
  };

  // Tooltip positioning variables
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9995,
    pointerEvents: 'auto',
  };

  if (targetRect) {
    const margin = 14;
    const tooltipWidth = 320;
    
    // Default fallback values
    let top = targetRect.bottom + margin;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    // Apply safe bounds so it doesn't clip off horizontal edges of screen
    left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

    if (currentStepData.position === 'top' || currentStepData.position === 'top-left' || currentStepData.position === 'top-right') {
      top = targetRect.top - margin - 220; // estimate tooltip height
      if (top < 16) {
        // Flip to bottom if clipping top
        top = targetRect.bottom + margin;
      }
    } else {
      if (top + 220 > window.innerHeight) {
        // Flip to top if clipping bottom
        top = targetRect.top - margin - 220;
      }
    }

    tooltipStyle = {
      ...tooltipStyle,
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
    };
  } else {
    // Screen center fallback if element is missing
    tooltipStyle = {
      ...tooltipStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '320px',
    };
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9980] pointer-events-none">
        {/* Semi-transparent Backdrop clickcatcher */}
        <div 
          className="fixed inset-0 bg-transparent pointer-events-auto" 
          onClick={handleComplete}
        />

        {/* 1. Dynamic Spotlight Ring */}
        <div style={spotlightStyle}>
          {/* Pulsing Beacon Circle representing "Tap Here" overlay indicator */}
          <div className="absolute inset-0 bg-orange-500/20 rounded-[14px] animate-[ping_1.6s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          
          <div className="absolute -top-3 -right-3 flex h-6 w-6">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-6 w-6 bg-orange-500 text-[10px] items-center justify-center font-black text-white shadow shadow-orange-500/50">
              {currentStep + 1}
            </span>
          </div>
        </div>

        {/* 2. Interactive Explanatory Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          style={tooltipStyle}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-5 flex flex-col gap-4 text-left pointer-events-auto"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 p-1.5 rounded-xl">
                <Sparkles className="w-4 h-4" />
              </span>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold">Active Screen Guide</p>
            </div>
            
            <button 
              onClick={handleComplete}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description Title */}
          <div>
            <h4 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              {currentStepData.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1.5">
              {currentStepData.description}
            </p>
          </div>

          {/* Stepper Progress bar dots */}
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800/60 shrink-0">
            <div className="flex items-center gap-1.5">
              {INTERACTIVE_TOUR_STEPS.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-4 bg-orange-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-black text-slate-400 font-mono tracking-wider">
              {currentStep + 1} / {INTERACTIVE_TOUR_STEPS.length}
            </span>
          </div>

          {/* Navigation Control Action row */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <button
              onClick={handleComplete}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest px-3 py-2 cursor-pointer transition-colors"
            >
              Skip
            </button>

            <div className="flex items-center gap-1.5">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all border border-slate-100 dark:border-slate-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 cursor-pointer shadow-lg shadow-orange-600/15"
              >
                {currentStep === INTERACTIVE_TOUR_STEPS.length - 1 ? 'Finish' : 'Got it'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
