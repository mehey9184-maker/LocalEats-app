import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (triggerHaptic) triggerHaptic(4);
              onClose();
            }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Sheet Container */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%", opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            className={`relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-slate-200/80 dark:border-slate-800 ${maxHeight} flex flex-col z-10 overflow-hidden`}
          >
            {/* Top Drag Handle */}
            {showHandle && (
              <div
                className="w-full pt-3 pb-1 flex justify-center cursor-grab active:cursor-grabbing shrink-0"
                onClick={onClose}
              >
                <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || subtitle) && (
              <div className="px-5 sm:px-6 pt-2 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 shrink-0">
                <div>
                  {title && (
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
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
                  onClick={() => {
                    if (triggerHaptic) triggerHaptic(4);
                    onClose();
                  }}
                  className="p-2 -mr-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
