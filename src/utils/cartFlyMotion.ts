/**
 * Decorative add-to-cart flight. It never changes cart state or pricing.
 * Queries the floating cart after React commits, so the very first added item
 * can travel to the cart button that appears at the same time.
 */
export type CartFlightRect = Pick<DOMRect, "left" | "top" | "width" | "height">;

export function cartFlightDisplacement(source: CartFlightRect, destination: CartFlightRect) {
  const center = (rect: CartFlightRect) => ({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
  const start = center(source);
  const end = center(destination);
  return { start, dx: end.x - start.x, dy: end.y - start.y };
}

export const CART_FLIGHT_DURATION_MS = 1050;

/** Starts with momentum and smoothly approaches zero velocity at arrival. */
export function cartFlightEaseOut(elapsedFraction: number): number {
  const t = Math.max(0, Math.min(1, elapsedFraction));
  return 1 - (1 - t) * (1 - t);
}

export function cartFlightKeyframes(dx: number, dy: number): Keyframe[] {
  const bend = Math.min(80, Math.max(22, Math.abs(dy) * 0.11));
  // Sampling lets the browser animate transforms on the compositor while
  // keeping the full path continuous, including the curved vertical lift.
  return Array.from({ length: 41 }, (_, index) => {
    const elapsed = index / 40;
    const progress = cartFlightEaseOut(elapsed);
    const x = dx * progress;
    const y = dy * progress - 2 * bend * progress * (1 - progress);
    const scale = 1 - 0.78 * progress;
    const opacity = elapsed < 0.82 ? 1 : Math.max(0, (1 - elapsed) / 0.18);
    return {
      transform: `translate3d(${x}px,${y}px,0) scale(${scale})`,
      opacity,
      offset: elapsed,
    };
  });
}

export function scheduleCartFlight(source: CartFlightRect | undefined, image?: string): void {
  if (!source || typeof window === "undefined" || typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if (![source.left, source.top, source.width, source.height].every(Number.isFinite)) return;
  const startRect = { left: source.left, top: source.top, width: source.width, height: source.height };

  // Cart button may mount only once the first cart item has been committed.
  window.setTimeout(() => window.requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>('[data-localeats-cart-target="true"]');
    if (!target || !target.isConnected) return;
    const destination = target.getBoundingClientRect();
    if (!destination.width || !destination.height) return;

    const { start, dx, dy } = cartFlightDisplacement(startRect, destination);
    const flyingItem = document.createElement("div");
    Object.assign(flyingItem.style, {
      position: "fixed",
      top: `${start.y - 23}px`,
      left: `${start.x - 23}px`,
      width: "46px",
      height: "46px",
      zIndex: "150",
      pointerEvents: "none",
      borderRadius: "15px",
      overflow: "hidden",
      display: "grid",
      placeItems: "center",
      background: "#fff7ed",
      border: "2px solid #ea580c",
      boxShadow: "0 12px 32px rgba(15, 23, 42, .25)",
      willChange: "transform, opacity",
    });
    const fallback = document.createElement("span");
    fallback.textContent = "🛍️";
    fallback.setAttribute("aria-hidden", "true");
    flyingItem.appendChild(fallback);
    if (image) {
      const thumbnail = document.createElement("img");
      thumbnail.alt = "";
      thumbnail.src = image;
      Object.assign(thumbnail.style, {
        position: "absolute", inset: "0", width: "100%",
        height: "100%", objectFit: "cover",
      });
      thumbnail.addEventListener("error", () => thumbnail.remove(), { once: true });
      flyingItem.appendChild(thumbnail);
    }

    document.body.appendChild(flyingItem);
    if (typeof flyingItem.animate !== "function") {
      flyingItem.remove();
      return;
    }
    // Pre-sample a continuous ease-out curve and small arc for compositor-driven
    // movement. No sudden speed change at a mid-flight waypoint.
    const flight = flyingItem.animate(cartFlightKeyframes(dx, dy), {
      duration: CART_FLIGHT_DURATION_MS,
      easing: "linear",
      fill: "forwards",
    });
    void flight.finished.catch(() => undefined).finally(() => flyingItem.remove());
  }), 45);
}
