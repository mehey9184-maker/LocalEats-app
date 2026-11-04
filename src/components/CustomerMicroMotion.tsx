import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ShoppingBag, Bell } from "lucide-react";

type Flight = { id: number; image: string; startX: number; startY: number; endX: number; endY: number };

/** Visual-only event: dispatched only after an item was accepted into the local cart. */
export function notifyLocalCartAdded(image: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("localeats:local-cart-added", { detail: { image } }));
  }
}

export function CartFlightFeedback() {
  const reduced = useReducedMotion();
  const [flights, setFlights] = useState<Flight[]>([]);
  const pointer = useRef<{ x: number; y: number; at: number } | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    const track = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY, at: Date.now() };
    };
    const added = (e: Event) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const detail = (e as CustomEvent<{ image?: string }>).detail;
      const target = document.querySelector("[data-customer-cart-target]");
      const rect = target?.getBoundingClientRect();
      const active = document.activeElement?.getBoundingClientRect();
      const fresh = pointer.current && Date.now() - pointer.current.at < 1200 ? pointer.current : null;
      const startX = fresh?.x ?? (active ? active.left + active.width / 2 : innerWidth / 2);
      const startY = fresh?.y ?? (active ? active.top + active.height / 2 : innerHeight * 0.5);
      const endX = rect ? rect.left + Math.min(36, rect.width / 2) : innerWidth / 2;
      const endY = rect ? rect.top + Math.min(32, rect.height / 2) : innerHeight - 120;
      const flight = { id: ++sequence.current, image: String(detail?.image ?? ""), startX, startY, endX, endY };
      setFlights(old => [...old.slice(-3), flight]);
      window.setTimeout(() => setFlights(old => old.filter(f => f.id !== flight.id)), 800);
    };
    document.addEventListener("pointerdown", track, true);
    window.addEventListener("localeats:local-cart-added", added);
    return () => {
      document.removeEventListener("pointerdown", track, true);
      window.removeEventListener("localeats:local-cart-added", added);
    };
  }, []);

  if (reduced) return null;
  return (
    <div className="fixed inset-0 z-[90] pointer-events-none" aria-hidden="true">
      <AnimatePresence>
        {flights.map(f => (
          <motion.div key={f.id}
            className="fixed w-10 h-10 rounded-full bg-orange-500 text-white overflow-hidden shadow-xl ring-2 ring-white"
            style={{ left: f.startX - 20, top: f.startY - 20 }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 0.95 }}
            animate={{
              x: [0, (f.endX - f.startX) * 0.45, f.endX - f.startX],
              y: [0, Math.min(-55, (f.endY - f.startY) * 0.3 - 50), f.endY - f.startY],
              scale: [1, 1.12, 0.35],
              opacity: [0.95, 1, 0],
            }}
            transition={{ duration: 0.68, ease: [0.22, 0.7, 0.25, 1] }}
          >
            {f.image ? <img src={f.image} alt="" className="w-full h-full object-cover" /> :
              <ShoppingBag size={20} className="m-2.5" />}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Swing only when actual unread count increases; never loop or nag on mount. */
export function CustomerNotificationBell({ unreadCount }: { unreadCount: number }) {
  const reduced = useReducedMotion();
  const previous = useRef(unreadCount);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (unreadCount > previous.current) setPulse(count => count + 1);
    previous.current = unreadCount;
  }, [unreadCount]);

  return (
    <>
      <motion.span key={pulse} className="inline-flex"
        initial={false}
        animate={pulse > 0 && !reduced ? { rotate: [0, 16, -12, 8, -4, 0] } : { rotate: 0 }}
        transition={{ duration: 0.72, ease: "easeOut" }}>
        <Bell className="w-4.5 h-4.5" />
      </motion.span>
      {unreadCount > 0 && (
        <motion.span key={unreadCount}
          initial={reduced ? false : { scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 440, damping: 23 }}
          className="absolute top-1 right-1 w-3.5 h-3.5 bg-orange-500 text-white text-[10px] whitespace-nowrap font-black rounded-full flex items-center justify-center border border-white dark:border-slate-900">
          {unreadCount > 9 ? "9+" : unreadCount}
        </motion.span>
      )}
    </>
  );
}
