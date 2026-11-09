import type { CartItem, Shop } from "../types";
import { MAX_PICKUP_ITEM_QUANTITY } from "../services/pickupMapping";

/** Read-only display checks, NOT a quote or an authorization to submit. */
export function reviewPickupCart(cart: CartItem[], shop?: Shop) {
  let totalMinor = 0;
  let count = 0;
  let allValid = Boolean(shop && cart.length);
  const issues: string[] = [];

  if (!shop) issues.push("This shop is unavailable. Return to the menu and reload shops.");
  if (cart.some(item => item.shopId !== shop?.id)) {
    allValid = false;
    issues.push("Your cart contains items from more than one shop.");
  }

  const items = cart.map((item) => {
    const quantity = item.quantity;
    const menuItem = shop?.menu?.find(menu => menu.id === item.id);
    const options = item.selectedCustomizations || [];
    const priceMatches = Boolean(menuItem && Number.isFinite(menuItem.price) &&
      Math.round(menuItem.price * 100) === Math.round(item.price * 100));
    const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1 &&
      quantity <= MAX_PICKUP_ITEM_QUANTITY;
    const validPrice = Number.isFinite(item.price) && item.price >= 0;
    const valid = Boolean(priceMatches && validQuantity && validPrice && !options.length);
    if (!valid) allValid = false;
    const unitMinor = validPrice ? Math.round(item.price * 100) : 0;
    const lineMinor = validQuantity ? unitMinor * quantity : 0;
    totalMinor += lineMinor;
    count += validQuantity ? quantity : 0;
    return { item, quantity, unitMinor, lineMinor, valid };
  });
  if (cart.length && !allValid) {
    issues.push("Some quantities, extras, or prices need checking against the current shop menu.");
  }
  if (shop?.isOpen === false) {
    allValid = false;
    issues.push("This shop is closed. You can browse, but cannot order right now.");
  }
  return { items, count, totalMinor, valid: allValid && count > 0, issues };
}

/** Formatting only. Never use these client values as order consent. */
export function formatReviewRands(minor: number): string {
  return `R${(minor / 100).toFixed(2)}`;
}
