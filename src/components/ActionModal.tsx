import React, { useState } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  WifiOff,
  Server,
  Lock,
  CheckCircle2,
  Info,
} from "lucide-react";

export type ModalAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  icon?: string;
};

export type ModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  type: "alert" | "confirm" | "prompt" | "password-prompt" | "action-dialog";
  onConfirm?: (value?: string) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  actions?: ModalAction[];
  errorCause?: string;
  iconType?: "alert" | "wifi-off" | "server-off" | "lock" | "info" | "success";
};

export const ModalContent = ({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) => {
  const [value, setValue] = useState(modal.defaultValue || "");

  const renderIcon = () => {
    if (modal.iconType === "success") {
      return (
        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
          <CheckCircle2 className="w-7 h-7" />
        </div>
      );
    }
    if (modal.iconType === "wifi-off") {
      return (
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200/80 dark:border-amber-800/60 shadow-xs">
          <WifiOff className="w-7 h-7" />
        </div>
      );
    }
    if (modal.iconType === "server-off") {
      return (
        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200/80 dark:border-rose-800/60 shadow-xs">
          <Server className="w-7 h-7" />
        </div>
      );
    }
    if (modal.iconType === "lock") {
      return (
        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700 shadow-xs">
          <Lock className="w-7 h-7" />
        </div>
      );
    }
    if (modal.iconType === "info") {
      return (
        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200/80 dark:border-blue-800/60 shadow-xs">
          <Info className="w-7 h-7" />
        </div>
      );
    }
    if (modal.iconType === "alert" || (!modal.iconType && modal.errorCause)) {
      return (
        <div className="w-14 h-14 bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-200/80 dark:border-orange-800/60 shadow-xs">
          <AlertCircle className="w-7 h-7" />
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{
          scale: 1,
          opacity: 1,
          y: 0,
          transition: { type: "spring", damping: 24, stiffness: 320 },
        }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden"
      >
        {renderIcon()}

        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
          {modal.title}
        </h2>

        {modal.errorCause && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-full text-xs font-semibold mb-3 border border-amber-200/60 dark:border-amber-800/40">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="truncate">Cause: {modal.errorCause}</span>
          </div>
        )}

        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 leading-relaxed">
          {modal.message}
        </p>

        {(modal.type === "prompt" || modal.type === "password-prompt") && (
          <div className="mb-6">
            <input
              type={modal.type === "password-prompt" ? "password" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>
        )}

        {modal.actions && modal.actions.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {modal.actions.map((act, index) => {
              const isPrimary = !act.variant || act.variant === "primary";
              const isOutline = act.variant === "outline";
              const isDanger = act.variant === "danger";
              return (
                <button
                  key={index}
                  onClick={() => {
                    onClose();
                    if (act.onClick) act.onClick();
                  }}
                  className={`w-full py-3.5 px-4 font-bold rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-sm ${
                    isPrimary
                      ? "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/20"
                      : isOutline
                      ? "bg-transparent border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      : isDanger
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {act.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => {
                if (modal.onConfirm) {
                  modal.onConfirm(
                    modal.type === "prompt" || modal.type === "password-prompt"
                      ? value
                      : undefined
                  );
                }
                onClose();
              }}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-600/20 transition-all active:scale-95 cursor-pointer"
            >
              {modal.confirmLabel || (modal.type === "alert" ? "OK" : "Confirm")}
            </button>

            {(modal.type === "confirm" ||
              modal.type === "prompt" ||
              modal.type === "password-prompt") && (
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-2xl transition-all active:scale-95 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                {modal.cancelLabel || "Cancel"}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
