import { useEffect, useRef, useState } from "react";

/** Rubber-band resistance: 100px finger motion becomes 35px of list travel. */
export function customerPullDistance(delta: number): number {
  return Math.min(56, Math.max(0, delta) * 0.35);
}

/** Touch-only, top-of-page read refresh. Never changes order or payment data. */
export function useCustomerPullToRefresh(enabled: boolean, onRefresh: () => void) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const callback = useRef(onRefresh);
  const [pulling, setPulling] = useState(false);
  const [armed, setArmed] = useState(false);
  useEffect(() => { callback.current = onRefresh; }, [onRefresh]);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !enabled) return;
    let startX = 0, startY = 0, eligible = false, dragging = false, ready = false;
    const reset = () => {
      if (dragging) {
        surface.style.transition = "";
        surface.style.transform = "";
      }
      eligible = false; dragging = false; ready = false;
      setPulling(false); setArmed(false);
    };
    const start = (event: TouchEvent) => {
      reset();
      if (event.touches.length !== 1 || window.scrollY > 1 || (document.scrollingElement?.scrollTop ?? 0) > 1) return;
      const target = event.target;
      if (!(target instanceof Element) || target.closest('button, a, input, select, textarea, [role="button"], [role="dialog"], .overflow-x-auto, .overflow-y-auto')) return;
      startY = event.touches[0].clientY;
      startX = event.touches[0].clientX;
      eligible = true;
    };
    const move = (event: TouchEvent) => {
      if (!eligible || event.touches.length !== 1) return;
      const dy = event.touches[0].clientY - startY;
      const dx = event.touches[0].clientX - startX;
      if (!dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { eligible = false; return; }
      if (dy <= 8 || (window.scrollY > 1 && !dragging)) return;
      dragging = true;
      setPulling(true);
      surface.style.transition = "none";
      if (event.cancelable) event.preventDefault();
      const position = customerPullDistance(dy);
      surface.style.transform = `translate3d(0, ${position}px, 0)`;
      const next = position >= 48;
      if (ready !== next) { ready = next; setArmed(next); }
    };
    const end = () => { const fire = dragging && ready; reset(); if (fire) callback.current(); };
    surface.addEventListener("touchstart", start, { passive: true });
    surface.addEventListener("touchmove", move, { passive: false });
    surface.addEventListener("touchend", end);
    surface.addEventListener("touchcancel", reset);
    return () => {
      surface.removeEventListener("touchstart", start);
      surface.removeEventListener("touchmove", move);
      surface.removeEventListener("touchend", end);
      surface.removeEventListener("touchcancel", reset);
      surface.style.transform = "";
      surface.style.transition = "";
    };
  }, [enabled]);
  return { surfaceRef, pulling, armed };
}
