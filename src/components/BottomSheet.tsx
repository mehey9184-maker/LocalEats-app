import React, { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string;
  showHandle?: boolean;
  triggerHaptic?: (intensity?: number) => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = "max-h-[90vh]",
  showHandle = true,
  triggerHaptic,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const subtitleId = useId();
  const reduceMotion = useReducedMotion();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = () => Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(selector) ?? [])
      .filter(element => element.getClientRects().length > 0);
    // A dialog should not leave keyboard focus behind the overlay.
    focusables()[0]?.focus({preventScroll:true});
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      } else if (event.key === "Tab") {
        const items = focusables();
        if (!items.length) {event.preventDefault();sheetRef.current?.focus();return;}
        const first = items[0],last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !sheetRef.current?.contains(document.activeElement))) {
          event.preventDefault();last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !sheetRef.current?.contains(document.activeElement))) {
          event.preventDefault();first.focus();
        }
      }
    };
    window.addEventListener("keydown",handleKeyDown);
    return () => {
      window.removeEventListener("keydown",handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus({preventScroll:true});
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => {
              if (triggerHaptic) triggerHaptic(4);
              onClose();
            }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Sheet Container */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ? undefined : "LocalEats options"}
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={subtitle ? subtitleId : undefined}
            tabIndex={-1}
            initial={reduceMotion ? {opacity:1,y:0} : { y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? {opacity:1,y:0} : { y: "100%", opacity: 0, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            transition={reduceMotion ? {duration:0} : { type: "tween", duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
            className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-slate-200/80 dark:border-slate-800 ${maxHeight} flex flex-col z-10 overflow-hidden`}
          >
            {/* Top Drag Handle */}
            {showHandle && (
              <button
                type="button"
                aria-label="Close sheet"
                className="w-full min-h-[44px] flex items-center justify-center cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-[-2px]"
                onClick={onClose}
              >
                <span aria-hidden="true" className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </button>
            )}

            {/* Header */}
            {(title || subtitle) && (
              <div className="px-5 sm:px-6 pt-2 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                <div>
                  {title && (
                    <h3 id={titleId} className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                      {title}
                    </h3>
                  )}
                  {subtitle && (
                    <p id={subtitleId} className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Close sheet"
                  onClick={() => {
                    if (triggerHaptic) triggerHaptic(4);
                    onClose();
                  }}
                  className="min-h-[44px] min-w-[44px] inline-flex shrink-0 items-center justify-center -mr-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
