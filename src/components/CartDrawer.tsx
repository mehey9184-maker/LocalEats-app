import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Store, 
  Sparkles, 
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { CartItem, Shop } from "../types";
import { BlurUpImage } from "./BlurUpImage";
import { DEFAULT_MENU_IMAGE } from "../utils";
import { pickupQuoteAmounts } from "../services/pickupSummary";
import { hasPendingPickupSubmission, pickupOrderingEnabled, quotePickupCart, readPickupCatalog, submitPickupQuote } from "../services/customerPickup";
import type { PickupOrder } from "../pickup/client";

interface CartDrawerProps {
  isOpen: boolean;
  fulfillment?: "collection" | "delivery";
  onClose: () => void;
  cart: CartItem[];
  shops: Shop[];
  onUpdateQuantity: (
    itemId: string,
    shopId: string,
    delta: number,
    specialInstructions?: string,
    customizations?: { name: string; price: number }[]
  ) => void;
  onRemoveItem: (
    itemId: string,
    shopId: string,
    specialInstructions?: string,
    customizations?: { name: string; price: number }[]
  ) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  triggerHaptic?: (pattern?: number | number[]) => void;
  pickupLocation?: { lat: number; lng: number } | null;
  pickupName?: string;
  pickupPhone?: string;
  isSignedIn?: boolean;
  onPickupOrderPlaced?: (order: PickupOrder) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  fulfillment = "delivery",
  onClose,
  cart,
  shops,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  triggerHaptic,
  pickupLocation = null,
  pickupName = "",
  pickupPhone = "",
  isSignedIn = false,
  onPickupOrderPlaced,
}) => {
  const activeShopId = cart.length > 0 ? cart[0].shopId : null;
  const activeShop = shops.find((s) => s.id === activeShopId);

  const subtotal = cart.reduce((sum, item) => {
    const customSum = (item.selectedCustomizations || []).reduce((c, val) => c + val.price, 0);
    return sum + (item.price + customSum) * item.quantity;
  }, 0);

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const estDeliveryFee = fulfillment === "collection" ? 0 : 15.0;
  const serviceFee = fulfillment === "collection" ? 0 : 2.5;
  const estimatedTotal = subtotal > 0 ? subtotal + estDeliveryFee + serviceFee : 0;
  const [customerName, setCustomerName] = useState(pickupName);
  const [customerPhone, setCustomerPhone] = useState(pickupPhone);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card_machine">("cash");
  const [pickupQuote, setPickupQuote] = useState<Awaited<ReturnType<typeof quotePickupCart>> | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteConsent, setQuoteConsent] = useState(false);
  const [placingPickupOrder, setPlacingPickupOrder] = useState(false);
  const [hasPendingSubmission, setHasPendingSubmission] = useState(false);
  const [refreshedPaymentMethods, setRefreshedPaymentMethods] = useState<("cash"|"card_machine")[]|null>(null);
  const supportedPaymentMethods = refreshedPaymentMethods ?? activeShop?.pickup_payment_methods ?? [];
  const validPickupPhone = /^\+?[0-9 ()-]{9,20}$/.test(customerPhone.trim());
  const cartKey = JSON.stringify(cart.map((item) => [item.id, item.shopId, item.quantity]));

  useEffect(() => {
    if (isOpen) {
      setCustomerName(pickupName);
      setCustomerPhone(pickupPhone);
    }
  }, [isOpen, pickupName, pickupPhone]);

  useEffect(() => {
    setRefreshedPaymentMethods(null);
  }, [activeShopId]);

  useEffect(() => {
    if (!supportedPaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(supportedPaymentMethods[0] || "cash");
    }
  }, [supportedPaymentMethods, paymentMethod]);

  const refreshPaymentMethods = async () => {
    if (!pickupLocation) return;
    try {
      const currentShops=await readPickupCatalog(pickupLocation);
      const currentShop=currentShops.find((shop)=>shop.id===activeShopId);
      const methods=currentShop?.pickup_payment_methods ?? [];
      setRefreshedPaymentMethods(methods);
      setQuoteError(currentShop ? "The shop's accepted payment methods changed. Choose an available method and review the new quote." : "This shop is no longer available for pickup. Refresh shops before placing an order.");
      if (methods.length && !methods.includes(paymentMethod)) setPaymentMethod(methods[0]);
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : "Could not refresh shop availability or payment methods.");
    }
  };

  useEffect(() => {
    setPickupQuote(null);
    setQuoteConsent(false);
    setQuoteError("");
    if (fulfillment !== "collection" || !isOpen || !cart.length || !customerName.trim() || !validPickupPhone || !pickupLocation || !supportedPaymentMethods.includes(paymentMethod)) {
      setQuoteLoading(false);
      return;
    }
    let active = true;
    setQuoteLoading(true);
    const timer = window.setTimeout(() => {
      void quotePickupCart(cart, pickupLocation, customerName, customerPhone, paymentMethod)
        .then((result) => { if (active) setPickupQuote(result); })
        .catch((error: unknown) => {
          if (!active) return;
          setQuoteError(error instanceof Error ? error.message : "Server quote unavailable.");
          if (error && typeof error === "object" && "code" in error && error.code === "UNSUPPORTED_PAYMENT_METHOD") void refreshPaymentMethods();
        })
        .finally(() => { if (active) setQuoteLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [fulfillment, isOpen, cartKey, customerName, customerPhone, paymentMethod, pickupLocation?.lat, pickupLocation?.lng, supportedPaymentMethods.join(",")]);

  useEffect(() => {
    setHasPendingSubmission(isOpen && hasPendingPickupSubmission());
  }, [isOpen]);

  const placePickupOrder = async () => {
    if (!pickupQuote || !quoteConsent || !isSignedIn || !pickupOrderingEnabled() || placingPickupOrder || !onPickupOrderPlaced) return;
    setPlacingPickupOrder(true);
    setQuoteError("");
    try {
      const order = await submitPickupQuote(pickupQuote);
      setHasPendingSubmission(false);
      onPickupOrderPlaced(order);
    } catch (error) {
      setHasPendingSubmission(hasPendingPickupSubmission());
      setQuoteError(error instanceof Error ? error.message : "Order was not confirmed. Retry safely.");
      if (error && typeof error === "object" && "code" in error && error.code === "UNSUPPORTED_PAYMENT_METHOD") await refreshPaymentMethods();
    } finally {
      setPlacingPickupOrder(false);
    }
  };

  const retryPickupOrder = async () => {
    if (!isSignedIn || !pickupOrderingEnabled() || placingPickupOrder || !onPickupOrderPlaced) return;
    setPlacingPickupOrder(true);
    setQuoteError("");
    try {
      const order = await submitPickupQuote(null);
      setHasPendingSubmission(false);
      onPickupOrderPlaced(order);
    } catch (error) {
      setHasPendingSubmission(hasPendingPickupSubmission());
      setQuoteError(error instanceof Error ? error.message : "The previous outcome is still unconfirmed. Retry safely.");
    } finally {
      setPlacingPickupOrder(false);
    }
  };

  const handleCheckoutClick = () => {
    if (triggerHaptic) triggerHaptic(15);
    onClose();
    onProceedToCheckout();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Your Food Cart"
      subtitle={activeShop ? `Ordering from ${activeShop.name}` : undefined}
      maxHeight="max-h-[88vh]"
      triggerHaptic={triggerHaptic}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-orange-50 dark:bg-slate-800 flex items-center justify-center text-orange-500 mb-4 border border-orange-100 dark:border-slate-700">
              <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white">Your Cart is Empty</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs font-medium">
              Explore local legend Kota joints and add delicious meals to start your order.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-600/25 active:scale-95 transition-all cursor-pointer"
            >
              Browse Menus
            </button>
          </div>
        ) : (
          <>
            {/* Active Shop Banner */}
            {activeShop && (
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-200/80 dark:border-slate-700">
                    <img
                      src={activeShop.logo || DEFAULT_MENU_IMAGE}
                      alt={activeShop.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {activeShop.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                      <Store className="w-3 h-3 text-orange-500 shrink-0" />
                      <span>{activeShop.address || "Local Kitchen"}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (triggerHaptic) triggerHaptic(10);
                    onClearCart();
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Clear Cart"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            )}

            {/* Scrollable Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              <AnimatePresence initial={false}>
                {cart.map((item, idx) => {
                  const customSum = (item.selectedCustomizations || []).reduce((c, val) => c + val.price, 0);
                  const itemUnitPrice = item.price + customSum;
                  const itemTotalPrice = itemUnitPrice * item.quantity;

                  return (
                    <motion.div
                      key={`${item.id}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white dark:bg-slate-800/80 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-start gap-3 relative"
                    >
                      {/* Item Thumbnail */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 relative">
                        <img
                          src={item.image || DEFAULT_MENU_IMAGE}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h5>
                          <span className="text-xs sm:text-sm font-black text-orange-600 dark:text-orange-400 shrink-0">
                            R {itemTotalPrice.toFixed(2)}
                          </span>
                        </div>

                        {/* Customizations tags */}
                        {item.selectedCustomizations && item.selectedCustomizations.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.selectedCustomizations.map((c, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/50 dark:border-orange-900/40"
                              >
                                + {c.name} (R{c.price})
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Special instructions */}
                        {item.specialInstructions && (
                          <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 italic flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                            <span className="truncate">"{item.specialInstructions}"</span>
                          </p>
                        )}

                        {/* Quantity and Controls Row */}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-400 font-semibold">
                            R {itemUnitPrice.toFixed(2)} each
                          </span>

                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-600/60">
                            <button
                              type="button"
                              onClick={() => {
                                if (triggerHaptic) triggerHaptic(8);
                                onUpdateQuantity(
                                  item.id,
                                  item.shopId,
                                  -1,
                                  item.specialInstructions,
                                  item.selectedCustomizations
                                );
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="w-3 h-3 text-rose-500" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                            </button>

                            <span className="w-7 text-center text-xs font-black text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                if (triggerHaptic) triggerHaptic(8);
                                onUpdateQuantity(
                                  item.id,
                                  item.shopId,
                                  1,
                                  item.specialInstructions,
                                  item.selectedCustomizations
                                );
                              }}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer"
                              aria-label="Increase quantity"
                                                          disabled={fulfillment === "collection" && item.quantity >= 20}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {fulfillment === "collection" && (
                <section className="rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-4 space-y-3" aria-label="Pickup order details">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Name for collection
                      <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white" />
                    </label>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Contact number
                      <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} autoComplete="tel" inputMode="tel" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white" />
                    </label>
                  </div>
                  {!customerName.trim() && <p className="text-xs text-rose-600">Enter the name for collection.</p>}
                  {!!customerPhone.trim() && !validPickupPhone && <p className="text-xs text-rose-600">Enter a valid contact number.</p>}
                  <fieldset>
                    <legend className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">Payment at shop</legend>
                    {supportedPaymentMethods.length === 1 && supportedPaymentMethods[0] === "cash" && (
                      <p className="text-xs text-slate-500 mb-2">This shop currently accepts cash only.</p>
                    )}
                      {!supportedPaymentMethods.length && <p role="alert" className="text-xs text-rose-600 mb-2">Pickup payment methods are not configured. This shop cannot accept pickup orders yet.</p>}
                    <div className="flex flex-wrap gap-2">
                      {(["cash", "card_machine"] as const).map((method) => {
                        const supported = supportedPaymentMethods.includes(method);
                        return (
                          <label key={method} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${supported ? "cursor-pointer" : "opacity-50"}`}>
                            <input type="radio" name="pickup-payment-method" value={method} checked={paymentMethod === method} disabled={!supported} onChange={() => setPaymentMethod(method)} />
                            {method === "cash" ? "Cash at shop" : "Card at shop (physical card machine)"}
                          </label>
                        );
                      })}
                    </div>
                    {quoteError.includes("payment methods changed") && <button type="button" onClick={() => void refreshPaymentMethods()} className="mt-2 text-xs font-bold text-orange-700 underline">Refresh payment methods</button>}
                  </fieldset>
                  {pickupQuote && (() => {
                    const amounts = pickupQuoteAmounts(pickupQuote.quote);
                    return <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-1 text-xs">
                      <p className="flex justify-between"><span>Server-confirmed items</span><strong>R {amounts.subtotal.toFixed(2)}</strong></p>
                      <p className="flex justify-between"><span>Pickup fee</span><strong>R 0.00</strong></p>
                      <p className="flex justify-between"><span>Service fee</span><strong>R 0.00</strong></p>
                      <p className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 text-sm font-black"><span>Total to pay at shop</span><strong>R {amounts.total.toFixed(2)}</strong></p>
                    </div>;
                  })()}
                  {quoteLoading && <p role="status" className="text-xs text-slate-500">Confirming item prices with the shop...</p>}
                  {quoteError && <p role="alert" className="text-xs text-rose-600">{quoteError}</p>}
                  {hasPendingSubmission && pickupOrderingEnabled() && (
                    <button type="button" disabled={placingPickupOrder || !isSignedIn} onClick={() => void retryPickupOrder()} className="text-xs font-bold text-orange-700 underline disabled:opacity-50">
                      Retry previous order submission
                    </button>
                  )}
                  <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={quoteConsent} disabled={!pickupQuote} onChange={(event) => setQuoteConsent(event.target.checked)} className="mt-0.5" />
                    I agree to the server-confirmed total and will pay at the shop.
                  </label>
                </section>
              )}

              {/* Bill Breakdown Summary Card */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-2 mt-4">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span>Subtotal ({totalItemsCount} {totalItemsCount === 1 ? "item" : "items"})</span>
                  <span className="font-bold text-slate-900 dark:text-white">R {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span>{fulfillment === "collection" ? "Pickup fee" : "Estimated Delivery"}</span>
                  <span className="font-bold text-slate-900 dark:text-white">R {estDeliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span>Service Fee</span>
                  <span className="font-bold text-slate-900 dark:text-white">R {serviceFee.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-black text-slate-900 dark:text-white">
                  <span>{fulfillment === "collection" ? "Server-confirmed total" : "Est. Total"}</span>
                  <span className="text-orange-600 dark:text-orange-400 font-mono">
                    {fulfillment === "collection" && pickupQuote
                      ? `R ${pickupQuoteAmounts(pickupQuote.quote).total.toFixed(2)}`
                      : fulfillment === "collection" ? "Awaiting quote" : `R ${estimatedTotal.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Checkout CTA Bar */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button type="button" onClick={fulfillment === "collection" ? () => void placePickupOrder() : handleCheckoutClick}
                disabled={fulfillment === "collection" && (!pickupQuote || !quoteConsent || !customerName.trim() || !validPickupPhone || !isSignedIn || !pickupOrderingEnabled() || placingPickupOrder || !onPickupOrderPlaced)}
                className="w-full py-4 px-5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-600/30 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 px-2 py-0.5 rounded-md text-[11px]">
                    {totalItemsCount}
                  </span>
                  <span>{fulfillment === "collection" ? placingPickupOrder ? "Placing order..." : `Place Pickup Order · ${pickupQuote ? `R${pickupQuoteAmounts(pickupQuote.quote).total.toFixed(2)}` : "Quote required"}` : "Proceed to Checkout"}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-sm">
                  {fulfillment !== "collection" && <span>R {estimatedTotal.toFixed(2)}</span>}
                  {fulfillment !== "collection" && <ArrowRight className="w-4 h-4" />}
                </div>
              </button>
              {fulfillment === "collection" && !isSignedIn && <button type="button" onClick={onProceedToCheckout} className="mt-2 w-full py-2 text-xs font-bold text-orange-700 underline">Sign in to place pickup order</button>}
              {fulfillment === "collection" && !pickupOrderingEnabled() && <p className="text-center text-[10px] text-slate-500 mt-2">Production ordering stays unavailable until separately enabled.</p>}
              <button type="button" onClick={handleCheckoutClick} className="mt-2 w-full py-2 text-xs font-bold text-slate-600 dark:text-slate-300 underline">Use delivery checkout</button>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
};
