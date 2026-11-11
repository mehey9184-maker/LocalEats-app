import React, { useEffect, useRef } from "react";
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (closeRef.current ?? sheetRef.current)?.focus();
    return () => {
      // Restore the state that existed before this sheet, including nested overlays.
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen]);

  const handleSheetKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    } else if (event.key === "Tab") {
      const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) {
        event.preventDefault();
        sheetRef.current?.focus();
        return;
      }
      if (event.shiftKey && (document.activeElement === focusable[0] || document.activeElement === sheetRef.current)) {
        event.preventDefault(); focusable[focusable.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
        event.preventDefault(); focusable[0].focus();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
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
            aria-labelledby={title ? titleId : undefined}
            aria-label={!title ? "LocalEats panel" : undefined}
            tabIndex={-1}
            onKeyDown={handleSheetKeyDown}
            initial={reduceMotion ? false : { y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 32 }}
            className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-slate-200/80 dark:border-slate-800 ${maxHeight} flex flex-col z-10 overflow-hidden`}
          >
            {/* Top Drag Handle */}
            {showHandle && (
              <button
                type="button"
                aria-label="Close panel"
                className="le-customer-press w-full min-h-11 pt-3 pb-1 flex justify-center cursor-pointer shrink-0"
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
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  ref={closeRef}
                  aria-label="Close panel"
                  onClick={() => {
                    if (triggerHaptic) triggerHaptic(4);
                    onClose();
                  }}
                  className="le-customer-press min-h-11 min-w-11 flex items-center justify-center p-2 -mr-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
