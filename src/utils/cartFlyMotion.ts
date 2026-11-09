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
    const flight = flyingItem.animate([
      { transform: "translate3d(0,0,0) scale(1)", opacity: 1, offset: 0 },
      { transform: `translate3d(${dx * .45}px,${dy * .42 - 52}px,0) scale(.83)`, opacity: 1, offset: .48 },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(.20)`, opacity: 0, offset: 1 },
    ], { duration: 480, easing: "cubic-bezier(.2,.75,.2,1)", fill: "forwards" });
    void flight.finished.catch(() => undefined).finally(() => flyingItem.remove());
  }), 45);
}
