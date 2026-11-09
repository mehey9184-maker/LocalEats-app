import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CheckCircle2, Clock3, FastForward, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { CartItem, Shop } from "../types";
import { MAX_PICKUP_ITEM_QUANTITY } from "../services/pickupMapping";
import { formatReviewRands, reviewPickupCart } from "../utils/pickupReview";

type ReviewStage = "review" | "confirm" | "simulated";
type Props = {
  isOpen: boolean;
  cart: CartItem[];
  shop?: Shop;
  onClose: () => void;
  onReturnToCart: () => void;
  onChangeQuantity: (itemId: string, shopId: string, delta: number, instructions?: string) => void;
  onRemoveItem: (itemId: string, shopId: string, instructions?: string) => void;
};

const REVIEW_SECONDS = 10;

/**
 * STAGING-ONLY visual workflow: deliberately contains NO create-order or payment
 * callback, no network request, and no way to unlock live checkout.
 */
export function PickupReviewModal({
  isOpen, cart, shop, onClose, onReturnToCart, onChangeQuantity, onRemoveItem,
}: Props) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const [stage, setStage] = useState<ReviewStage>("review");
  const [secondsLeft, setSecondsLeft] = useState(REVIEW_SECONDS);
  const reducedMotion = useReducedMotion();
  const summary = useMemo(() => reviewPickupCart(cart, shop), [cart, shop]);
  const cartFingerprint = cart.map(row =>
    [row.id, row.shopId, row.quantity, row.price, row.specialInstructions,
      JSON.stringify(row.selectedCustomizations || [])].join(":")
  ).join("|");

  // Every change invalidates the previous confirmation and gives another chance
  // to review the new quantity. Skip always remains available.
  useEffect(() => {
    if (!isOpen) return;
    setStage("review");
    setSecondsLeft(REVIEW_SECONDS);
  }, [isOpen, cartFingerprint]);

  useEffect(() => {
    if (!isOpen || stage !== "review") return;
    let remaining = REVIEW_SECONDS * 1000;
    let last = performance.now();
    setSecondsLeft(REVIEW_SECONDS);
    const tick = () => {
      const now = performance.now();
      // Do not consume someone's review window while the tab is hidden.
      if (document.visibilityState !== "hidden") {
        remaining = Math.max(0, remaining - (now - last));
      }
      last = now;
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) setStage("confirm"); // never submits
    };
    const resetAnchor = () => { last = performance.now(); };
    const timer = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", resetAnchor);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resetAnchor);
    };
  }, [isOpen, stage, cartFingerprint]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    skipRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab" && dialogRef.current) {
        const interactive = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!interactive.length) return;
        const first = interactive[0];
        const last = interactive[interactive.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;
  const estimated = formatReviewRands(summary.totalMinor);
  const hasMultiple = summary.items.some(row => row.quantity > 1);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full max-w-lg max-h-[94dvh] flex-col overflow-hidden rounded-t-[30px] bg-white shadow-2xl dark:bg-slate-900 sm:rounded-[30px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-orange-600">
              Staging simulation · No order will be sent
            </p>
            <h2 id={headingId} className="text-xl font-black text-slate-900 dark:text-white">
              {stage === "simulated" ? "Review simulation complete" : "Review your pickup order"}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {shop?.name || "Pickup shop"} · Pay at the shop
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close order review"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-white">
            <X className="size-5" />
          </button>
        </div>

        {stage === "simulated" ? (
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-7 text-center">
            <CheckCircle2 className="mx-auto size-14 text-emerald-600" aria-hidden="true"/>
            <p className="text-lg font-black text-slate-900 dark:text-white">Your selection was reviewed</p>
            <p role="status" className="rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
              No order was created. Nothing was sent to a merchant, and no payment was taken.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {summary.count} {summary.count === 1 ? "item" : "items"} · Estimated total {estimated}. Your cart is still saved.
            </p>
            <button type="button" onClick={onReturnToCart}
              className="min-h-14 w-full rounded-2xl bg-slate-900 px-5 text-sm font-black text-white dark:bg-orange-600">
              Back to my cart
            </button>
            <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300">
              Continue browsing
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Check every quantity before confirming.
              </p>
              {summary.items.length === 0 && <p role="alert" className="text-sm text-rose-600">Your cart is empty. Return to the menu to add food.</p>}
              {summary.items.map(({ item, quantity, unitMinor, lineMinor, valid }, index) => (
                <div key={`${item.id}-${item.shopId}-${index}`} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500">{formatReviewRands(unitMinor)} each</p>
                    </div>
                    <p className="shrink-0 text-lg font-black tabular-nums text-slate-900 dark:text-white">{formatReviewRands(lineMinor)}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button type="button"
                        aria-label={quantity === 1 ? `Remove ${item.name}` : `Decrease quantity of ${item.name}`}
                        onClick={() => onChangeQuantity(item.id, item.shopId, -1, item.specialInstructions)}
                        className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                        <Minus className="size-5" />
                      </button>
                      <span aria-label={`${quantity} ${item.name}`} className="min-w-10 text-center text-2xl font-black tabular-nums text-slate-900 dark:text-white">{quantity}</span>
                      <button type="button" aria-label={`Increase quantity of ${item.name}`}
                        disabled={quantity >= MAX_PICKUP_ITEM_QUANTITY}
                        onClick={() => onChangeQuantity(item.id, item.shopId, 1, item.specialInstructions)}
                        className="flex size-11 items-center justify-center rounded-xl bg-orange-600 text-white disabled:opacity-40">
                        <Plus className="size-5" />
                      </button>
                    </div>
                    <button type="button" onClick={() => onRemoveItem(item.id, item.shopId, item.specialInstructions)}
                      className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-rose-600">
                      <Trash2 className="size-4"/> Remove
                    </button>
                  </div>
                  {quantity > 1 && (
                    <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      You selected {quantity} × {item.name}, not 1. This line is {formatReviewRands(lineMinor)}.
                    </p>
                  )}
                  {!valid && <p className="mt-2 text-xs font-semibold text-rose-600">Please review this item's current availability, extras, quantity and price.</p>}
                </div>
              ))}
              {summary.issues.length > 0 &&
                <div role="alert" className="space-y-1 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                  {summary.issues.map(issue => <p key={issue}>{issue}</p>)}
                </div>
              }
              {hasMultiple && <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Important: {summary.count} total items are in your basket. Check the individual quantities above.
              </p>}
            </div>
            <div className="space-y-3 border-t border-slate-100 bg-white px-5 pb-5 pt-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500">Estimated total payable at shop</p>
                  <p className="text-[11px] text-slate-500">Final live price must be verified by the server.</p>
                </div>
                <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">{estimated}</p>
              </div>
              {stage === "review" ? (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1"><Clock3 className="size-4"/> Time to review (not an order deadline)</span>
                    <span aria-live="off" className="font-black tabular-nums">{secondsLeft}s</span>
                  </div>
                  <div role="progressbar" aria-label="Optional review countdown" aria-valuemin={0} aria-valuemax={10} aria-valuenow={10 - secondsLeft}
                    className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-orange-500 motion-safe:transition-[width] motion-safe:duration-100"
                      style={{ width: `${(10 - secondsLeft) * 10}%` }}/>
                  </div>
                  <button ref={skipRef} type="button" onClick={() => setStage("confirm")}
                    className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-base font-black text-white shadow-lg shadow-orange-600/20">
                    <FastForward className="size-6"/> Skip Countdown
                  </button>
                  <p className="text-center text-xs text-slate-500">Skipping only opens the final confirmation. It never places an order.</p>
                </>
              ) : (
                <>
                  <p role="status" className="text-center text-sm font-bold text-slate-800 dark:text-white">
                    Confirm {summary.count} {summary.count === 1 ? "item" : "items"} for {estimated}?
                  </p>
                  <button type="button" disabled={!summary.valid} onClick={() => setStage("simulated")}
                    className="min-h-16 w-full rounded-2xl bg-orange-600 px-4 text-base font-black text-white shadow-lg shadow-orange-600/20 disabled:cursor-not-allowed disabled:opacity-40">
                    Confirm {summary.count} {summary.count === 1 ? "item" : "items"} · {estimated} (Demo)
                  </button>
                  <p className="text-center text-xs text-slate-500">Demo only. No payment, merchant alert, or order will be submitted.</p>
                </>
              )}
              <button type="button" onClick={onReturnToCart}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300">
                <ArrowLeft className="size-4" /> Back to cart
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
