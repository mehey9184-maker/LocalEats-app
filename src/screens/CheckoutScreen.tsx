import React, { useState, useEffect, useMemo, useRef, Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, MapPin, Clock, CreditCard, ChevronRight, X, Phone, User, Home, Building2, Wallet, Navigation, ShoppingBag, Plus, Minus, ArrowRight, Truck, Info, ShieldCheck, Banknote, ShoppingBasket, ExternalLink, Lock, UserPlus, Sparkles, Bike, Loader2, Target, CheckCircle, QrCode, Trash2, ArrowLeft, AlertTriangle, Gift, Shield, Utensils, Percent, Heart, Coins, WifiOff
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Shop, CartItem, Screen } from "../types";
import { UserProfile } from "../App";
import { calculateDistance, formatSAPhone, validateSAPhone, safeLocalStorageSet, safeLocalStorageGet, getShopStatus, DEFAULT_MENU_IMAGE } from "../utils";
import { Session } from "@supabase/supabase-js";
import { LocalEatsLogo } from "../components/LocalEatsLogo";
import { useTranslation } from "../contexts/LanguageContext";
import { AnimatedPrice } from "../components/AnimatedPrice";
import { AddressSearch, LocationPickerMap } from "../components/MapComponents";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { BlurUpImage } from "../components/BlurUpImage";
import { audioHelper } from "../lib/audioHelper";
import { detectTownship } from "../lib/townshipHelper";
import { Tag } from "lucide-react";

const LOCAL_PROMO_DB: Record<
  string,
  {
    code: string;
    type: "percent" | "fixed" | "delivery_free";
    value: number;
    expiry_date: string;
    is_active: boolean;
  }
> = {
  LOCALEATS10: {
    code: "LOCALEATS10",
    type: "percent",
    value: 10,
    expiry_date: "2027-12-31T23:59:59Z",
    is_active: true,
  },
  FIRSTTREAT: {
    code: "FIRSTTREAT",
    type: "fixed",
    value: 20,
    expiry_date: "2027-12-31T23:59:59Z",
    is_active: true,
  },
  FREEDELIVERY: {
    code: "FREEDELIVERY",
    type: "delivery_free",
    value: 0,
    expiry_date: "2027-12-31T23:59:59Z",
    is_active: true,
  }
};


export function CheckoutScreen({
  userProfile,
  session,
  shops,
  onBack,
  onConfirm,
  onIncompleteProfile,
  cart,
  setCart,
  setNotification,
  showAlert,
  showConfirm,
  userLocation,
  runWithProcessing,
  setPreviousScreen,
  setCurrentScreen,
  isOnline,
  triggerHaptic,
}: {
  userProfile: UserProfile;
  session: Session | null;
  shops: Shop[];
  onBack: () => void;
  onConfirm: () => void;
  onIncompleteProfile: () => void;
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  setNotification: Dispatch<SetStateAction<any>>;
  showAlert: (title: string, message: string) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    cancelText?: string,
  ) => void;
  userLocation: { lat: number; lng: number } | null;
  runWithProcessing: (
    action: () => Promise<any>,
    successCallback?: () => void,
    loadingLabel?: string,
    idempotencyKey?: string,
  ) => Promise<any>;
  setPreviousScreen: (screen: Screen | null) => void;
  setCurrentScreen: (screen: Screen) => void;
  isOnline: boolean;
  triggerHaptic: (pattern?: number | number[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card_machine">(
    "cash",
  );
  const [deliveryType, setDeliveryType] = useState<"collection" | "delivery">(
    "collection",
  );
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState(() => {
    try {
      return localStorage.getItem("localeats_last_instructions") || "";
    } catch {
      return "";
    }
  });
  const [orderNotes, setOrderNotes] = useState(() => {
    try {
      return localStorage.getItem("localeats_last_order_notes") || "";
    } catch {
      return "";
    }
  });

  const isCardMachineIntegrationEnabled = useMemo(() => {
    const primaryShopId = cart.length > 0 ? cart[0].shopId : shops[0]?.id || "";
    const pShop = shops.find((s) => s.id === primaryShopId) || shops[0];
    if (!pShop) return false;
    return (
      localStorage.getItem("localeats_card_machine_enabled_" + pShop.id) === "true" ||
      (pShop as any).card_machine_enabled === true ||
      (pShop as any).card_machine_enabled === "true"
    );
  }, [shops, cart]);

  const [cardHolder, setCardHolder] = useState(userProfile?.fullName || "");
  const [isCartSummaryExpanded, setIsCartSummaryExpanded] = useState(true);
  const [tipPercentage, setTipPercentage] = useState<number | "custom">(0);
  const [customTipInput, setCustomTipInput] = useState<string>("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [userOrderCount, setUserOrderCount] = useState<number>(() => {
    try {
      const cached = localStorage.getItem("cached_orders");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed.length;
      }
    } catch (_) {}
    return 0;
  });

  useEffect(() => {
    const fetchUserOrderCount = async () => {
      if (!session?.user?.id) return;
      try {
        const { data, error, count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id);
        if (!error && typeof count === "number") {
          setUserOrderCount(count);
        }
      } catch (e) {
        console.warn("Failed to fetch exact order count", e);
      }
    };
    fetchUserOrderCount();
  }, [session]);

  // Recipient details editable inline to prevent block/exit funnel
  const [customerName, setCustomerName] = useState(userProfile.fullName || "");
  const [customerPhone, setCustomerPhone] = useState(userProfile.phone || "");
  const [saveToProfile, setSaveToProfile] = useState(true);

  // Cash change options
  const [cashChangeOption, setCashChangeOption] = useState<
    "no_change" | "R50" | "R100" | "R200" | "custom"
  >("no_change");
  const [customChangeAmount, setCustomChangeAmount] = useState("");

  // Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    type: "percent" | "fixed" | "delivery_free";
    value: number;
  } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoStatus, setPromoStatus] = useState<
    "idle" | "checking" | "valid" | "already_used" | "expired" | "invalid"
  >("idle");

  // Refactored state objects for precision and spatial data
  const [deliveryAddressText, setDeliveryAddressText] = useState<string>(() => {
    try {
      const cached = localStorage.getItem("delivery_location");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.address) return parsed.address;
      }
    } catch (e) {
      console.warn("Error parsing cached delivery address:", e);
    }
    return userProfile.address || "";
  });

  const [deliveryCoordinates, setDeliveryCoordinates] = useState<{
    type: "Point";
    coordinates: [number, number];
  } | null>(() => {
    try {
      const cached = localStorage.getItem("delivery_location");
      if (cached) {
        const data = JSON.parse(cached);
        if (
          data &&
          typeof data.lng === "number" &&
          typeof data.lat === "number"
        ) {
          return {
            type: "Point",
            coordinates: [
              Number(data.lng.toFixed(6)),
              Number(data.lat.toFixed(6)),
            ],
          };
        }
      }
    } catch (e) {
      console.warn("Error parsing cached delivery coordinates:", e);
    }
    if (userLocation) {
      return {
        type: "Point",
        coordinates: [
          Number(userLocation.lng.toFixed(6)),
          Number(userLocation.lat.toFixed(6)),
        ],
      };
    }
    if (userProfile.latitude && userProfile.longitude) {
      return {
        type: "Point",
        coordinates: [
          Number(userProfile.longitude.toFixed(6)),
          Number(userProfile.latitude.toFixed(6)),
        ],
      };
    }
    return null;
  });

  const deliveryTownship = useMemo(() => {
    if (deliveryCoordinates && deliveryCoordinates.coordinates) {
      const [lng, lat] = deliveryCoordinates.coordinates;
      return detectTownship(lat, lng, deliveryAddressText);
    }
    return detectTownship(userLocation?.lat, userLocation?.lng, userProfile?.address);
  }, [deliveryCoordinates, userLocation, deliveryAddressText, userProfile?.address]);

  // Enforce spatial authority and precision validation via visual map pin confirmation
  const [isLocationConfirmed, setIsLocationConfirmed] =
    useState<boolean>(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(5.0);

  const ZONE_A_LIMIT = 3.0;
  const ZONE_B_LIMIT = 6.0;
  const ZONE_A_FEE = 5.0;
  const ZONE_B_FEE = 10.0;

  useEffect(() => {
    if (!deliveryCoordinates && userLocation && deliveryType === "delivery") {
      setDeliveryCoordinates({
        type: "Point",
        coordinates: [
          Number(userLocation.lng.toFixed(6)),
          Number(userLocation.lat.toFixed(6)),
        ],
      });
      setDeliveryAddressText("Current Location (GPS)");
      setIsLocationConfirmed(false);
    }
  }, [userLocation, deliveryType, deliveryCoordinates]);

  const primaryShopId = cart.length > 0 ? cart[0].shopId : shops[0]?.id || "";
  const primaryShop = shops.find((s) => s.id === primaryShopId) || shops[0];

  const [hasInHouseRiderOnline, setHasInHouseRiderOnline] = useState(false);

  useEffect(() => {
    const checkInHouseRiders = async () => {
      if (!primaryShop?.id) return;
      try {
        const { data, error } = await (supabase as any)
          .from("rider_profiles")
          .select("id")
          .eq("is_online", true)
          .eq("shop_id", primaryShop.id);

        if (!error && data && data.length > 0) {
          setHasInHouseRiderOnline(true);
        } else {
          setHasInHouseRiderOnline(false);
        }
      } catch (err) {
        console.warn("Failed to query shop specific riders", err);
        setHasInHouseRiderOnline(false);
      }
    };
    checkInHouseRiders();
  }, [primaryShop?.id]);

  useEffect(() => {
    if (deliveryCoordinates && primaryShop.latitude && primaryShop.longitude) {
      const [lng, lat] = deliveryCoordinates.coordinates;
      const dist = calculateDistance(
        lat,
        lng,
        primaryShop.latitude,
        primaryShop.longitude,
      );
      setDistance(dist);

      // Distance Warnings & Dynamic Pricing
      if (dist > ZONE_B_LIMIT) {
        toast.error("Outside Delivery Range", {
          description: `Store is ${dist.toFixed(1)}km away. We only deliver within ${ZONE_B_LIMIT}km.`,
          duration: 5000,
          position: "top-center",
        });
        setDeliveryFee(0); // Effectively disabled
      } else if (dist > ZONE_A_LIMIT) {
        toast.warning("Entering +R5 Delivery Zone", {
          description: "A small distance surcharge applies to this delivery.",
          duration: 3000,
          position: "top-center",
        });
        setDeliveryFee(ZONE_B_FEE);
      } else {
        setDeliveryFee(ZONE_A_FEE);
      }
    }
  }, [deliveryCoordinates, primaryShop]);

  // Cart edit support inline
  const updateCartQty = (idx: number, change: number) => {
    const item = cart[idx];
    if (!item) return;
    const newQty = item.quantity + change;

    if ("vibrate" in navigator) navigator.vibrate(10);

    if (newQty <= 0) {
      showConfirm(
        "Remove Item?",
        `Do you want to remove ${item.name} from your order?`,
        () => {
          const newCart = cart.filter((_, i) => i !== idx);
          setCart(newCart);
          safeLocalStorageSet("cart", JSON.stringify(newCart));
          toast.success("Item removed from cart");
          if (newCart.length === 0) {
            onBack();
          }
        },
      );
    } else {
      const newCart = cart.map((c, i) =>
        i === idx ? { ...c, quantity: newQty } : c,
      );
      setCart(newCart);
      safeLocalStorageSet("cart", JSON.stringify(newCart));
    }
  };

  const removeCartItem = (idx: number) => {
    const item = cart[idx];
    if (!item) return;
    showConfirm(
      "Remove Item",
      `Are you sure you want to remove ${item.name}?`,
      () => {
        const newCart = cart.filter((_, i) => i !== idx);
        setCart(newCart);
        safeLocalStorageSet("cart", JSON.stringify(newCart));
        toast.success("Item removed");
        if (newCart.length === 0) {
          onBack();
        }
      },
    );
  };

  const updateCartNote = (idx: number, note: string) => {
    const newCart = cart.map((c, i) =>
      i === idx ? { ...c, specialInstructions: note } : c,
    );
    setCart(newCart);
    safeLocalStorageSet("cart", JSON.stringify(newCart));
  };

  // Promo Code Validation
  const handleApplyPromo = async (overrideCode?: string) => {
    setPromoError("");
    setPromoStatus("checking");
    const rawCode = overrideCode || promoCodeInput;
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setPromoStatus("idle");
      return;
    }

    if (overrideCode) {
      setPromoCodeInput(code);
    }

    // 1. Check local storage first
    const usedLocalKey = session?.user?.id
      ? `used_promo_codes_${session.user.id}`
      : `used_promo_codes_guest`;
    const usedLocal = safeLocalStorageGet(usedLocalKey, []);
    if (usedLocal.includes(code)) {
      setPromoError(
        `You have already redeemed the promo code "${code}" previously!`,
      );
      setPromoStatus("already_used");
      setAppliedPromo(null);
      return;
    }

    // 2. Query DB / Local fallback configurations
    let dbCodeInfo = null;
    let fallbackToLocal = false;

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from("promo_codes")
          .select("*")
          .eq("code", code)
          .single();

        if (error) {
          fallbackToLocal = true;
        } else if (data) {
          dbCodeInfo = data;
        } else {
          fallbackToLocal = true;
        }
      } catch (err) {
        console.warn(
          "Exception checking promo_codes table, falling back to local:",
          err,
        );
        fallbackToLocal = true;
      }
    } else {
      fallbackToLocal = true;
    }

    if (fallbackToLocal) {
      dbCodeInfo = LOCAL_PROMO_DB[code] || null;
    }

    if (!dbCodeInfo) {
      setPromoError("Invalid coupon code. Try LOCALEATS10 or FIRSTTREAT!");
      setPromoStatus("invalid");
      setAppliedPromo(null);
      return;
    }

    // Checking 'expired'
    const expiry = dbCodeInfo.expiry_date
      ? new Date(dbCodeInfo.expiry_date)
      : null;
    const now = new Date();
    if (expiry && now > expiry) {
      setPromoError(
        `The promo code "${code}" expired on ${expiry.toLocaleDateString()}!`,
      );
      setPromoStatus("expired");
      setAppliedPromo(null);
      return;
    }

    // 3. Server-side check: Check if the promo code has already been used by the current user ID in 'orders' table
    if (session?.user?.id && isOnline) {
      try {
        const { data: existingOrders, error } = await supabase
          .from("orders")
          .select("delivery_instructions")
          .eq("user_id", session.user.id);

        if (existingOrders && !error) {
          const hasUsed = existingOrders.some(
            (o) =>
              o.delivery_instructions &&
              o.delivery_instructions.includes(`[PROMO:${code}]`),
          );
          if (hasUsed) {
            // Sync back to local storage
            const updatedLocal = Array.from(new Set([...usedLocal, code]));
            safeLocalStorageSet(usedLocalKey, JSON.stringify(updatedLocal));
            setPromoError(
              `Our database shows you have already redeemed "${code}" on a previous order!`,
            );
            setPromoStatus("already_used");
            setAppliedPromo(null);
            return;
          }
        }
      } catch (err) {
        console.warn("Error checking order history coupon logs:", err);
      }
    }

    // Valid check
    if (code === "BICYCLE5" && deliveryType !== "delivery") {
      setPromoError("This voucher code is only valid for Delivery orders!");
      setPromoStatus("invalid");
      setAppliedPromo(null);
      return;
    }

    // Calculate dynamic discount to preview success in toast
    let tempDiscount = 0;
    if (dbCodeInfo.type === "percent") {
      tempDiscount = (subtotal * dbCodeInfo.value) / 100;
    } else if (dbCodeInfo.type === "fixed") {
      tempDiscount = Math.min(subtotal, dbCodeInfo.value);
    } else if (dbCodeInfo.type === "delivery_free") {
      tempDiscount = Math.min(deliveryFee, dbCodeInfo.value);
    }

    setAppliedPromo({ code, type: dbCodeInfo.type, value: dbCodeInfo.value });
    setPromoStatus("valid");
    toast.success(
      `Coupon Applied successfully! Saved R${tempDiscount.toFixed(2)}`,
    );
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoStatus("idle");
    setPromoCodeInput("");
    toast.info("Promo code removed");
  };

  // Pricing calculations
  const subtotal = cart.reduce((sum, item) => {
    const customizationsTotal = (item.selectedCustomizations || []).reduce(
      (acc, c) => acc + Number(c.price),
      0,
    );
    const itemTotal = (item.price + customizationsTotal) * item.quantity;
    const finalItemTotal = item.quantity > 5 ? itemTotal * 0.85 : itemTotal;
    return sum + finalItemTotal;
  }, 0);

  // Dynamic promo discounts
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === "percent") {
      discountAmount = (subtotal * appliedPromo.value) / 100;
    } else if (appliedPromo.type === "fixed") {
      discountAmount = Math.min(subtotal, appliedPromo.value);
    } else if (appliedPromo.type === "delivery_free") {
      discountAmount = Math.min(deliveryFee, appliedPromo.value);
    }
  }

  const activeDeliveryFee = deliveryType === "delivery" ? deliveryFee : 0;

  const tipAmount = useMemo(() => {
    if (tipPercentage === "custom") {
      return parseFloat(customTipInput) || 0;
    }
    return (subtotal * tipPercentage) / 100;
  }, [tipPercentage, customTipInput, subtotal]);

  const totalAmount = Math.max(
    0,
    subtotal - discountAmount + activeDeliveryFee + tipAmount,
  );

  const isCashTrustActive = primaryShop
    ? localStorage.getItem("localeats_cash_trust_" + primaryShop.id) ===
        "true" ||
      (primaryShop as any).cash_trust_enabled === true ||
      (primaryShop as any).cash_trust_enabled === "true" ||
      (primaryShop as any).localeats_cash_trust === true ||
      (primaryShop as any).localeats_cash_trust === "true"
    : false;
  const isCoaEligible =
    isCashTrustActive && (userOrderCount === 0 || totalAmount < 350);
  const isCoaDisabled =
    isCashTrustActive && userOrderCount > 0 && totalAmount >= 350;

  useEffect(() => {
    if (isCashTrustActive && userOrderCount === 0 && !isCoaDisabled) {
      setPaymentMethod("cash");
    }
  }, [userOrderCount, isCashTrustActive, isCoaDisabled]);

  useEffect(() => {
    if (deliveryType === "delivery") {
      setPaymentMethod("cash");
    }
  }, [deliveryType]);

  useEffect(() => {
    if (isCoaDisabled && paymentMethod === "cash" && deliveryType !== "delivery") {
      setPaymentMethod("card_machine");
    }
  }, [isCoaDisabled, paymentMethod, deliveryType]);

  const handleConfirm = async () => {
    if (!session) {
      showConfirm(
        "Welcome to LocalEats!",
        "Please sign in or create an account to finish your order and track it live.",
        () => {
          setPreviousScreen("checkout");
          setCurrentScreen("login");
        },
        "Sign In / Up",
        "Maybe Later",
      );
      return;
    }

    // Interactive validations in checkout directly
    if (!customerName.trim()) {
      toast.error("Recipient Name Required", {
        description:
          "Please enter a name for the delivery / collection record.",
      });
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 9) {
      toast.error("Valid Mobile Number Required", {
        description:
          "Please input a proper mobile number so our riders can call you!",
      });
      return;
    }

    if (deliveryType === "delivery") {
      if (!deliveryAddressText || deliveryAddressText.trim().length < 5) {
        toast.error("Valid Delivery Address Required", {
          description: "Please set a complete delivery address for your order.",
        });
        setShowAddressModal(true);
        return;
      }
      
      if (isOnline && (!isLocationConfirmed || !deliveryCoordinates)) {
        showAlert(
          "Location Confirmation Required",
          'Please drag the pin to your exact door and tap "Confirm Location" on the map.',
        );
        return;
      }
      if (distance !== null && distance > ZONE_B_LIMIT) {
        showAlert(
          "Outside Range",
          `Sorry, this store is ${distance.toFixed(1)}km away. Our delivery range is capped at ${ZONE_B_LIMIT}km.`,
        );
        return;
      }
    }

    const status = getShopStatus(primaryShop);
    const isClosed = !status.isOpen;

    if (isClosed) {
      showConfirm(
        "Shop Closed",
        `${primaryShop.name} is currently closed. Your order will be attended to when they open at ${status.nextOpeningTime || "their next opening hour"}. Do you want to proceed?`,
        () => {
          processCheckout(isClosed);
        },
      );
      return;
    }
    processCheckout(false);
  };

  const processCheckout = async (isClosed: boolean) => {
    setLoading(true);
    triggerHaptic?.([200, 100, 200]);

    // Double check promo code eligibility before submitting order
    if (appliedPromo) {
      const code = appliedPromo.code;
      const usedLocalKey = session?.user?.id
        ? `used_promo_codes_${session.user.id}`
        : `used_promo_codes_guest`;
      const usedLocal = safeLocalStorageGet(usedLocalKey, []);
      if (usedLocal.includes(code)) {
        setLoading(false);
        showAlert(
          "Coupon Already Redeemed",
          `You have already redeemed the promo code "${code}". It is restricted to one use per customer.`,
        );
        setAppliedPromo(null);
        return;
      }

      if (session?.user?.id && isOnline) {
        try {
          const { data: existingOrders, error } = await supabase
            .from("orders")
            .select("delivery_instructions")
            .eq("user_id", session.user.id);

          if (existingOrders && !error) {
            const hasUsed = existingOrders.some(
              (o) =>
                o.delivery_instructions &&
                o.delivery_instructions.includes(`[PROMO:${code}]`),
            );
            if (hasUsed) {
              const updatedLocal = Array.from(new Set([...usedLocal, code]));
              safeLocalStorageSet(usedLocalKey, JSON.stringify(updatedLocal));
              setLoading(false);
              showAlert(
                "Coupon Already Redeemed",
                `Our records show you have already redeemed "${code}". Each promo code is restricted to one use per customer.`,
              );
              setAppliedPromo(null);
              return;
            }
          }
        } catch (err) {
          console.warn("DB double check coupon error:", err);
        }
      }
    }

    // Save profile background sync if requested
    if (saveToProfile && session?.user?.id) {
      try {
        await supabase
          .from("profiles")
          .update({
            full_name: customerName,
            phone: customerPhone,
            ...(deliveryType === "delivery"
              ? {
                  address: deliveryAddressText,
                  latitude: deliveryCoordinates?.coordinates[1],
                  longitude: deliveryCoordinates?.coordinates[0],
                }
              : {}),
          })
          .eq("id", session.user.id);
      } catch (err) {
        console.warn(
          "Could not save recipient details back to userProfile database schema:",
          err,
        );
      }
    }

    let currentLat =
      deliveryType === "delivery" ? deliveryCoordinates?.coordinates[1] : null;
    let currentLng =
      deliveryType === "delivery" ? deliveryCoordinates?.coordinates[0] : null;

    // Validation Gate: Ensure precise geolocation captured/confirmed
    if (
      isOnline &&
      deliveryType === "delivery" &&
      (!currentLat || !currentLng || !isLocationConfirmed)
    ) {
      setLoading(false);
      setNotification({
        message:
          "Visual Pin Confirmation Required. Please confirm your exact spot on the map.",
        type: "error",
      });
      return;
    }

    // Validation Gate: Enforce Card Details for Credit/Debit Card payments
    if (paymentMethod === "card_machine") {
      if (!cardHolder.trim() || cardNumber.replace(/\s/g, "").length < 16 || cardExpiry.length < 5 || cardCvv.length < 3) {
        setLoading(false);
        setNotification({
          message: "Please enter complete, valid credit card credentials to securely authenticate card payment.",
          type: "error",
        });
        return;
      }
    }

    // Append cash change details into instructions beautifully for rider dispatcher
    let finalDeliveryInstructions = deliveryInstructions;
    if (paymentMethod === "cash") {
      const changeStr =
        cashChangeOption === "no_change"
          ? "No change needed"
          : cashChangeOption === "custom"
            ? `Needs change for R${customChangeAmount}`
            : `Needs change for ${cashChangeOption}`;
      finalDeliveryInstructions = `${deliveryInstructions ? deliveryInstructions + " • " : ""}[CASH CHANGE REQUEST: ${changeStr}]`;
    } else if (paymentMethod === "card_machine") {
      const cleanNum = cardNumber.replace(/\s/g, "");
      const maskedCard = `${cleanNum.slice(0, 4)} ${cleanNum.slice(4, 6)}•• •••• ${cleanNum.slice(-4)}`;
      const terminalIdVal = localStorage.getItem("localeats_card_machine_terminal_id_" + primaryShop.id) || "POS-TERM-101";
      const brandVal = localStorage.getItem("localeats_card_machine_brand_" + primaryShop.id) || "Yoco Go";
      
      finalDeliveryInstructions = `${deliveryInstructions ? deliveryInstructions + " • " : ""}[CARD_MACHINE_PAYMENT: Holder: ${cardHolder.trim()}, Card: ${maskedCard}, Exp: ${cardExpiry}, CVV: ${cardCvv}, Terminal: ${terminalIdVal}, Brand: ${brandVal}]`;
    }

    // Append promo code tagging into delivery instructions for backend once-per-client tracking
    if (appliedPromo) {
      finalDeliveryInstructions = `${finalDeliveryInstructions ? finalDeliveryInstructions + " • " : ""}[PROMO:${appliedPromo.code}]`;
    }

    // Append tipping tag to finalDeliveryInstructions
    if (tipAmount > 0) {
      finalDeliveryInstructions = `${finalDeliveryInstructions ? finalDeliveryInstructions + " • " : ""}[TIP: R${tipAmount.toFixed(2)}]`;
    }

    if (!isOnline) {
      // Calculate proportional discount per item to persist exact client payments into database
      const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

      const orderData = cart.map((item) => {
        const customizationsString =
          item.selectedCustomizations
            ?.map((c) => `${c.name} (+R${Number(c.price).toFixed(2)})`)
            .join(", ") || "";
        const customizationsTotal = (
          item.selectedCustomizations || []
        ).reduce((acc, c) => acc + Number(c.price), 0);
        const rawOriginalPrice =
          (item.price + customizationsTotal) * item.quantity;
        const originalPrice = item.quantity > 5 ? rawOriginalPrice * 0.85 : rawOriginalPrice;
        const finalItemPrice = Number(
          Math.max(0, originalPrice - originalPrice * discountRatio).toFixed(
            2,
          ),
        );

        const isCOAOrder = isCashTrustActive && paymentMethod === "cash";

        return {
          user_id: session?.user?.id,
          shop_id: item.shopId,
          customer_name: customerName,
          phone: customerPhone,
          email: userProfile.email,
          city: userProfile.city,
          address:
            deliveryType === "delivery"
              ? deliveryAddressText
              : userProfile.address,
          country: userProfile.country,
          product_name: item.name,
          product_variant: customizationsString,
          quantity: item.quantity,
          price: finalItemPrice,
          notes: [item.specialInstructions, orderNotes].filter(Boolean).join(" • ") || "",
          delivery_instructions: finalDeliveryInstructions,
          status: "queued_for_sync",
          payment_method: isCOAOrder ? "cash_on_arrival" : paymentMethod,
          is_delivery: deliveryType === "delivery",
          delivery_fee: deliveryType === "delivery" ? deliveryFee : 0,
          delivery_status: isCOAOrder ? "finding_rider" : "none",
          latitude: currentLat,
          longitude: currentLng,
        };
      });

      const newOfflineOrders = orderData.map((d: any) => ({
        ...d,
        id: "offline_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_offline_queued: true,
      }));

      // Cache locally
      const cached = safeLocalStorageGet("cached_orders", []);
      safeLocalStorageSet(
        "cached_orders",
        JSON.stringify([...newOfflineOrders, ...cached]),
      );

      // Add to sync queue
      const queue = safeLocalStorageGet("offline_orders_queue", []);
      safeLocalStorageSet(
        "offline_orders_queue",
        JSON.stringify([...queue, ...newOfflineOrders]),
      );

      // Mark promo code as used offline
      if (appliedPromo) {
        const usedLocalKey = session?.user?.id
          ? `used_promo_codes_${session.user.id}`
          : `used_promo_codes_guest`;
        const usedLocal = safeLocalStorageGet(usedLocalKey, []);
        if (!usedLocal.includes(appliedPromo.code)) {
          usedLocal.push(appliedPromo.code);
          safeLocalStorageSet(usedLocalKey, JSON.stringify(usedLocal));
        }
      }

      setLoading(false);
      audioHelper.play("placed");
      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      showAlert(
        "Order Queued for Sync",
        "Your order was placed offline and has been queued for sync! It will automatically submit to the kitchen once your connectivity is restored. 🍔",
      );

      // Save the last delivery instructions for future use so the user doesn't have to keep typing it
      if (deliveryInstructions.trim()) {
        localStorage.setItem("localeats_last_instructions", deliveryInstructions.trim());
      }
      if (orderNotes.trim()) {
        localStorage.setItem("localeats_last_order_notes", orderNotes.trim());
      }
      
      setCart([]);
      safeLocalStorageSet("cart", JSON.stringify([]));
      onConfirm();
      return;
    }

    const checkoutIdempotencyKey = `checkout_${session?.user?.id || "guest"}_shop_${primaryShop?.id || "none"}_total_${totalAmount.toFixed(2)}`;
    try {
      await runWithProcessing(async () => {
        // Save the last delivery instructions and order notes for future use
        if (deliveryInstructions.trim()) {
          localStorage.setItem("localeats_last_instructions", deliveryInstructions.trim());
        }
        if (orderNotes.trim()) {
          localStorage.setItem("localeats_last_order_notes", orderNotes.trim());
        }

        // Calculate proportional discount per item to persist exact client payments into database
        const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

        const orderData = cart.map((item) => {
          const customizationsString =
            item.selectedCustomizations
              ?.map((c) => `${c.name} (+R${Number(c.price).toFixed(2)})`)
              .join(", ") || "";
          const customizationsTotal = (
            item.selectedCustomizations || []
          ).reduce((acc, c) => acc + Number(c.price), 0);
          const rawOriginalPrice =
            (item.price + customizationsTotal) * item.quantity;
          const originalPrice = item.quantity > 5 ? rawOriginalPrice * 0.85 : rawOriginalPrice;
          const finalItemPrice = Number(
            Math.max(0, originalPrice - originalPrice * discountRatio).toFixed(
              2,
            ),
          );

          const isCOAOrder = isCashTrustActive && paymentMethod === "cash";
          const orderId = self.crypto.randomUUID ? self.crypto.randomUUID() : ("ord_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now());

          return {
            id: orderId,
            user_id: session?.user?.id,
            shop_id: item.shopId,
            customer_name: customerName,
            phone: customerPhone,
            email: userProfile.email,
            city: userProfile.city,
            address:
              deliveryType === "delivery"
                ? deliveryAddressText
                : userProfile.address,
            country: userProfile.country,
            product_name: item.name,
            product_variant: customizationsString,
            quantity: item.quantity,
            price: finalItemPrice,
            notes: [item.specialInstructions, orderNotes].filter(Boolean).join(" • ") || "",
            delivery_instructions: finalDeliveryInstructions,
            status: "pending",
            payment_method: isCOAOrder ? "cash_on_arrival" : paymentMethod,
            is_delivery: deliveryType === "delivery",
            delivery_fee: deliveryType === "delivery" ? deliveryFee : 0,
            delivery_status: (paymentMethod === "cash" || isCOAOrder) ? "finding_rider" : "none",
            latitude: currentLat,
            longitude: currentLng,
          };
        });

        // Explicit frontend validation step checking mandatory fields
        for (const order of orderData) {
          if (!order.id) {
            throw new Error("Frontend Validation Error: Unique order 'id' is required.");
          }
          if (!order.shop_id) {
            throw new Error("Frontend Validation Error: 'shop_id' is mandatory.");
          }
          if (!order.status) {
            throw new Error("Frontend Validation Error: Order 'status' is mandatory.");
          }
        }

        console.log("Submitting order with upgraded details:", orderData);
        const { error } = await supabase
          .from("orders")
          .insert(orderData)
          .select();

        if (error) {
          const isMissingColumnError = error.code === "PGRST204" || error.message?.includes("column");
          
          if (isMissingColumnError) {
            console.log(
              "[Order Placement] Orders table has missing optional spatial columns, retrying insert omitting latitude/longitude...",
            );
            const safeOrderData = orderData.map((d: any) => {
              const { latitude, longitude, ...rest } = d;
              return rest;
            });
            const { error: retryError } = await supabase
              .from("orders")
              .insert(safeOrderData)
              .select();
            if (retryError) {
              console.error("Supabase order insert retry error:", retryError);
              throw retryError;
            }

            // Pop COA confirmation on retry success
            if (isCashTrustActive && paymentMethod === "cash") {
              showAlert(
                "Order Broadcasted!",
                "Your order is broadcasted! An on-demand rider is being dispatched to retrieve and deliver your fresh order.",
              );
            }

            // Mark promo as used on retry success
            if (appliedPromo) {
              const usedLocalKey = session?.user?.id
                ? `used_promo_codes_${session.user.id}`
                : `used_promo_codes_guest`;
              const usedLocal = safeLocalStorageGet(usedLocalKey, []);
              if (!usedLocal.includes(appliedPromo.code)) {
                usedLocal.push(appliedPromo.code);
                safeLocalStorageSet(usedLocalKey, JSON.stringify(usedLocal));
              }
            }
            return;
          } else {
            console.error("Supabase insert error on first attempt:", error);
            throw error;
          }
        }

        // Pop COA confirmation on initial success
        if (isCashTrustActive && paymentMethod === "cash") {
          showAlert(
            "Order Broadcasted!",
            "Your order is broadcasted! An on-demand rider is being dispatched to retrieve and deliver your fresh order.",
          );
        }

        // Mark promo as used on initial success
        if (appliedPromo) {
          const usedLocalKey = session?.user?.id
            ? `used_promo_codes_${session.user.id}`
            : `used_promo_codes_guest`;
          const usedLocal = safeLocalStorageGet(usedLocalKey, []);
          if (!usedLocal.includes(appliedPromo.code)) {
            usedLocal.push(appliedPromo.code);
            safeLocalStorageSet(usedLocalKey, JSON.stringify(usedLocal));
          }
        }

        // Psychsound - play ascending major triad for immediate relief and confidence booster
        audioHelper.play("placed");
      }, onConfirm, undefined, checkoutIdempotencyKey);
    } catch (err: any) {
      console.error("Checkout failed:", err);
      setLoading(false);
      showAlert(
        "Checkout Failed",
        err.message || "An unexpected error occurred while placing your order.",
      );
    }
  };

  return (
    <main className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen font-sans">
      <div className="relative flex h-auto w-full max-w-6xl mx-auto flex-col lg:flex-row bg-transparent overflow-x-hidden pb-16 min-h-screen lg:gap-8 lg:px-6">
        {/* Left Column (Forms & Details) */}
        <div className="flex-1 bg-white dark:bg-slate-900 shadow-2xl lg:shadow-xl lg:rounded-3xl overflow-hidden flex flex-col lg:my-8">
        {/* Header Block */}
        <div className="flex items-center bg-white dark:bg-slate-900 px-4 py-4 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 backdrop-blur-md">
          <button
            onClick={onBack}
            className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-start cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
          >
            <ArrowLeft className="w-6 h-6 mx-auto" />
          </button>
          <div className="flex-1 text-center justify-center">
            <h2 className="text-slate-950 dark:text-white text-base font-black leading-tight tracking-tight uppercase">
              Secured Checkout
            </h2>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
              Fill details & place food order
            </p>
          </div>
          <button
            onClick={() => {
              showConfirm(
                "Clear Cart",
                "Do you want to clear all items and start fresh?",
                () => {
                  setCart([]);
                  safeLocalStorageSet("cart", JSON.stringify([]));
                  onBack();
                },
              );
            }}
            className="text-red-500 font-black flex items-center gap-1 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer text-xs uppercase"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>

        {!isOnline && (
          <div className="bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-500/20 px-5 py-3.5 flex items-start gap-3.5 animate-in slide-in-from-top duration-300">
            <div className="p-2 bg-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 shrink-0">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                You are currently offline
              </h4>
              <p className="text-[10px] text-amber-700/95 dark:text-amber-300/90 font-medium leading-relaxed">
                No active internet connection was detected. Don't worry—your order will be queued locally and automatically synced once connection is restored!
              </p>
            </div>
          </div>
        )}

                <div className="flex flex-col gap-6 p-4">
          {/* CART SUMMARY PREVIEW PANE: Interactive, allows direct quantity edit, note edit, and item removal */}
          <section className="bg-orange-50/45 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-3xl overflow-hidden transition-all duration-300">
            <button
              id="cart-summary-toggle-btn"
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setIsCartSummaryExpanded(!isCartSummaryExpanded);
              }}
              className="w-full flex items-center justify-between p-4 bg-orange-50/80 dark:bg-orange-950/20 border-b border-orange-100/50 dark:border-orange-900/20 text-left cursor-pointer transition-all hover:bg-orange-100/30 dark:hover:bg-orange-950/30"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-orange-500/10 dark:bg-orange-500/20 rounded-2xl text-orange-600 dark:text-orange-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                    Cart Summary Preview
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    {cart.reduce((s, c) => s + c.quantity, 0)} Items • Tap to {isCartSummaryExpanded ? "Hide" : "Expand"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-orange-600 text-white px-3 py-1 rounded-full font-black tracking-tight">
                  <AnimatedPrice value={subtotal} />
                </span>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${
                    isCartSummaryExpanded ? "rotate-90" : "rotate-0"
                  }`}
                />
              </div>
            </button>

            {isCartSummaryExpanded && (
              <div className="p-4 space-y-4 animate-in fade-in duration-300">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/40 max-h-[350px] overflow-y-auto pr-1 space-y-3">
                  {cart.map((item, idx) => {
                    const customizationsTotal = (item.selectedCustomizations || []).reduce(
                      (acc, c) => acc + Number(c.price),
                      0,
                    );
                    const itemUnitPrice = item.price + customizationsTotal;
                    const itemTotal = itemUnitPrice * item.quantity;
                    const finalItemTotal = item.quantity > 5 ? itemTotal * 0.85 : itemTotal;

                    return (
                      <div
                        key={idx}
                        className="flex flex-col gap-3.5 pt-3.5 first:pt-0 border-slate-100 dark:border-slate-800/40"
                      >
                        <div className="flex items-start justify-between gap-3.5">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="size-14 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white shrink-0 shadow-sm relative">
                              <BlurUpImage
                                src={item.image || DEFAULT_MENU_IMAGE}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                blurHash={`https://picsum.photos/seed/${item.id}/10/10?blur=10`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-900 dark:text-white truncate leading-snug">
                                {item.name}
                              </p>
                              {item.selectedCustomizations &&
                              item.selectedCustomizations.length > 0 ? (
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-tight italic truncate mt-0.5">
                                  +{" "}
                                  {item.selectedCustomizations
                                    .map((c) => c.name)
                                    .join(", ")}
                                </p>
                              ) : null}
                              <div className="flex flex-col gap-0.5 mt-1">
                                {item.quantity > 5 ? (
                                  <>
                                    <p className="text-primary font-black text-xs leading-none">
                                      R {finalItemTotal.toFixed(2)}
                                    </p>
                                    <p className="text-[8px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider leading-none">
                                      15% Bulk Discount Applied! (Was R {itemTotal.toFixed(2)})
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-primary font-black text-xs leading-none">
                                    R {finalItemTotal.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Quantity modifier */}
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-xl shadow-sm">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic(10);
                                  updateCartQty(idx, -1);
                                }}
                                className="text-slate-500 hover:text-rose-600 p-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black min-w-[14px] text-center text-slate-900 dark:text-white leading-none">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic(10);
                                  updateCartQty(idx, 1);
                                }}
                                className="text-slate-500 hover:text-orange-600 p-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Direct Remove */}
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic(20);
                                removeCartItem(idx);
                              }}
                              className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded-xl transition-all border border-rose-100/30 active:scale-95 shadow-sm"
                              title="Remove from order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Cook Note input row inside preview summary */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/20 w-full flex items-center gap-2">
                          <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">
                            Cook Request:
                          </span>
                          <input
                            type="text"
                            id={`cook-note-preview-${idx}`}
                            placeholder="Add specific request (e.g., extra spicy, no onion...)"
                            value={item.specialInstructions || ""}
                            onChange={(e) => updateCartNote(idx, e.target.value)}
                            className="flex-1 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500 placeholder-slate-400 dark:placeholder-slate-650 transition-colors"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 1: Fulfillment Type (Moved to the Top for Perfect User Flow Context) */}
          <section className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3.5 px-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-orange-500" />
                Fulfill Order via
              </h3>
              {distance !== null && deliveryType === "delivery" && (
                <div
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                    distance > ZONE_B_LIMIT
                      ? "bg-red-100 text-red-700 border-red-200 animate-pulse"
                      : distance > ZONE_A_LIMIT
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-green-100 text-green-700 border-green-200"
                  }`}
                >
                  {distance.toFixed(1)}km away{" "}
                  {distance > ZONE_B_LIMIT && "• Out of Range"}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryType("collection")}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  deliveryType === "collection"
                    ? "border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-black shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}
              >
                <ShoppingBasket className="w-6 h-6 shrink-0" />
                <div className="text-center">
                  <p className="text-xs font-bold leading-none mb-0.5">
                    Counter Pickup
                  </p>
                  <p className="text-[9px] font-medium opacity-80">
                    R0.00 Delivery Fee
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeliveryType("delivery");
                  if (!deliveryAddressText || !isLocationConfirmed) {
                    setShowAddressModal(true);
                  }
                  triggerHaptic(5);
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  deliveryType === "delivery"
                    ? "border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-black shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="relative">
                  <Navigation className="w-5 h-5 shrink-0 rotate-45" />
                  {distance !== null && distance > ZONE_B_LIMIT && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-black px-1 rounded-full animate-bounce">
                      !
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold leading-none mb-0.5">
                    Bicycle Delivery
                  </p>
                  <p className="text-[9px] font-medium opacity-80">
                    {distance !== null && distance > ZONE_A_LIMIT
                      ? `Zone B: +R10.00`
                      : `Zone A: +R5.00`}
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* SECTION 2: Shipment/Delivery Inputs or Merchant Pickup Info */}
          {deliveryType === "delivery" ? (
            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
                  Choose Delivery Spot
                </span>
                {isLocationConfirmed ? (
                  <div className="flex items-center gap-1 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-500/20">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-black text-green-600 uppercase tracking-wider">
                      Location Confirmed
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-500/20">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-black text-amber-600 uppercase tracking-wider">
                      Requires Setup
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                    {deliveryAddressText || "No delivery address set yet"}
                  </p>
                  {deliveryInstructions ? (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      Instructions: "{deliveryInstructions}"
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      No rider instructions added
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddressModal(true);
                    triggerHaptic(5);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  {deliveryAddressText ? "Change" : "Set Spot"}
                </button>
              </div>

              {/* Dual Delivery Notes & Kitchen Notes Text Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5 text-orange-500" />
                    Delivery Notes / Landmarks
                  </label>
                  <textarea
                    placeholder="e.g., ring the bell, or leave at the gate"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-400 dark:text-white resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-orange-500" />
                    Kitchen Notes / Order Notes
                  </label>
                  <textarea
                    placeholder="e.g., no onions, extra spicy, or allergy details"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-400 dark:text-white resize-none"
                  />
                </div>
              </div>
              
              {/* Visual distance range helper badge */}
              <div className="flex flex-col gap-2">
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/10 p-3 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-orange-900 dark:text-orange-400">
                    <Bike className="w-4 h-4 text-orange-500" />
                    <span>
                      Distance:{" "}
                      {distance !== null
                        ? `${distance.toFixed(2)}km`
                        : "Calculating distance..."}
                    </span>
                  </div>
                  {distance !== null && (
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        distance > ZONE_B_LIMIT
                          ? "bg-red-100 text-red-700"
                          : distance > ZONE_A_LIMIT
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {distance > ZONE_B_LIMIT
                        ? "Limit Exceeded"
                        : distance > ZONE_A_LIMIT
                          ? "Zone B"
                          : "Zone A"}
                    </span>
                  )}
                </div>

                {distance !== null && distance > ZONE_B_LIMIT && (
                  <div className="bg-rose-50 dark:bg-red-950/20 border border-rose-150 p-3.5 rounded-2xl flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-black text-rose-700 uppercase tracking-wide">
                        Out of service area
                      </p>
                      <p className="text-[10px] text-rose-500 mt-0.5 leading-relaxed font-semibold">
                        Max range limit is {ZONE_B_LIMIT}km. Adjust your
                        delivery pin closer or switch to Counter Pickup!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-wider text-[10px]">
                <Clock className="w-4 h-4" />
                <span>Pickup From Location</span>
              </div>
              <div className="flex items-stretch gap-3">
                <div className="flex-1 space-y-1">
                  <h4 className="font-black text-slate-900 dark:text-white text-base">
                    {primaryShop.name}
                  </h4>
                  <p className="text-xs text-slate-500 tracking-tight leading-relaxed">
                    {primaryShop.address}
                  </p>
                  <div className="pt-2 flex items-center gap-1.5">
                    <span className="text-[9px] uppercase tracking-widest bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-black">
                      ⚡ Ready ~20m
                    </span>
                    <span className="text-[9px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded font-black font-mono">
                      Shop Pickup
                    </span>
                  </div>
                </div>
                {primaryShop.logo && (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-inner shrink-0 leading-none">
                    <BlurUpImage
                      src={primaryShop.logo}
                      alt={primaryShop.name}
                      className="w-full h-full object-cover"
                      blurHash={`https://picsum.photos/seed/${primaryShop.id}/10/10?blur=10`}
                    />
                  </div>
                )}
              </div>

              {/* Dynamic easy to understand swipe/pay advice card for normal clients */}
              <div className="p-3.5 bg-orange-500/5 dark:bg-orange-500/10 border-2 border-dashed border-orange-505 dark:border-orange-500/20 rounded-2xl flex items-start gap-3">
                <span className="text-xl shrink-0 animate-bounce">🛒</span>
                <div className="text-left">
                  <h5 className="font-black text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                    Pay & Swipe Card on Arrival
                  </h5>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-bold mt-1">
                    You have selected <span className="text-orange-600 dark:text-orange-400 font-extrabold uppercase">Counter Pickup</span>. 
                    This means you will collect the food yourself, and you will simply <span className="font-black underline decoration-orange-500 underline-offset-2">swipe your bank card</span> or pay cash at the store counter when you arrive.
                  </p>
                </div>
              </div>

              {/* Simple illustrative pickup Map to help find the shop */}
              {primaryShop.latitude && primaryShop.longitude && (
                <div className="h-40 rounded-2xl overflow-hidden border border-slate-150 mt-3 relative z-0">
                  <MapContainer
                    center={[primaryShop.latitude, primaryShop.longitude]}
                    zoom={15}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker
                      position={[primaryShop.latitude, primaryShop.longitude]}
                    >
                      <Popup>
                        <p className="font-bold text-xs">{primaryShop.name}</p>
                      </Popup>
                    </Marker>
                  </MapContainer>
                  <div className="absolute bottom-2 left-2 bg-slate-950/75 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded">
                    📍 {primaryShop.name} Position
                  </div>
                </div>
              )}

              {/* Kitchen Notes / Order Notes for Pickup */}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-orange-500" />
                  Kitchen Notes / Order Notes
                </label>
                <textarea
                  placeholder="e.g., no onions, extra spicy, or allergy details"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-400 dark:text-white resize-none"
                />
              </div>
            </section>
          )}

          {/* SECTION 3: Editable Recipient Details Inline Override */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <User className="w-4 h-4 text-orange-500" />
              Recipient Details
            </h3>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Receive Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Thabo Mokoena"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-1 focus:ring-orange-500 outline-none transition-all dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 072 123 4567"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-1 focus:ring-orange-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none pl-1 pt-1">
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={(e) => setSaveToProfile(e.target.checked)}
                className="rounded text-orange-600 focus:ring-orange-500 accent-orange-500 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                Save change details to user profile for future checkouts
              </span>
            </label>
          </section>
        </div>
        </div>

        {/* Right Column (Cart Summary) */}
        <div className="w-full lg:w-[450px] shrink-0 bg-slate-50 dark:bg-slate-950 lg:bg-slate-100 lg:dark:bg-slate-900 shadow-2xl lg:shadow-none lg:rounded-3xl lg:border lg:border-slate-200 lg:dark:border-slate-800 flex flex-col overflow-hidden h-fit sticky top-6 lg:my-8">
          <div className="flex flex-col gap-6 p-4">

          {/* SECTION 4: Interactive Order Summary / Cart Editor */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-orange-500" />
                Items to Order
              </h3>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    id="cart-clear-all-btn"
                    type="button"
                    onClick={() => {
                      showConfirm(
                        "Clear Cart?",
                        "Are you sure you want to remove all items from your cart?",
                        () => {
                          setCart([]);
                        }
                      );
                    }}
                    className="text-[10px] bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 border border-rose-100/30"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    Clear All
                  </button>
                )}
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                  {cart.reduce((s, c) => s + c.quantity, 0)} Items Added
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 relative group"
                >
                  <div className="flex items-center gap-3.5 w-full">
                    <div className="size-14 rounded-xl overflow-hidden shrink-0 shadow-sm border bg-white relative">
                      <BlurUpImage
                        src={item.image || DEFAULT_MENU_IMAGE}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        blurHash={`https://picsum.photos/seed/${item.id}/10/10?blur=10`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 dark:text-white text-xs font-black truncate leading-none mb-1">
                        {item.name}
                      </p>

                      {item.selectedCustomizations &&
                      item.selectedCustomizations.length > 0 ? (
                        <p className="text-[9px] text-slate-400 leading-tight italic truncate mb-1">
                          +{" "}
                          {item.selectedCustomizations
                            .map((c) => c.name)
                            .join(", ")}
                        </p>
                      ) : null}

                      {item.quantity > 5 ? (
                        <div className="flex flex-col gap-1">
                          <p className="text-primary font-black text-xs leading-none">
                            R{" "}
                            {(
                              (item.price +
                                (item.selectedCustomizations || []).reduce(
                                  (acc, c) => acc + Number(c.price),
                                  0,
                                )) *
                              item.quantity *
                              0.85
                            ).toFixed(2)}
                          </p>
                          <p className="text-[8px] text-emerald-650 dark:text-emerald-400 font-black uppercase tracking-wider leading-none">
                            15% Bulk Discount Applied! (Was R{" "}
                            {(
                              (item.price +
                                (item.selectedCustomizations || []).reduce(
                                  (acc, c) => acc + Number(c.price),
                                  0,
                                )) *
                              item.quantity
                            ).toFixed(2)})
                          </p>
                        </div>
                      ) : (
                        <p className="text-primary font-black text-xs leading-none">
                          R{" "}
                          {(
                            (item.price +
                              (item.selectedCustomizations || []).reduce(
                                (acc, c) => acc + Number(c.price),
                                0,
                              )) *
                            item.quantity
                          ).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Quantity Modifier Chips */}
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-2 py-1 rounded-xl shadow-sm shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, -1)}
                        className="text-slate-500 hover:text-red-500 p-0.5 hover:bg-slate-50 rounded transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black min-w-[14px] text-center text-slate-900 dark:text-white leading-none">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, 1)}
                        className="text-slate-500 hover:text-orange-600 p-0.5 hover:bg-slate-50 rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Add Note Input Row */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/40 w-full flex items-center gap-2">
                    <span className="text-[9px] uppercase font-black tracking-wider text-slate-400 dark:text-slate-500">
                      Cook Request:
                    </span>
                    <input
                      type="text"
                      id={`cook-note-${idx}`}
                      placeholder="Add specific request (e.g., extra spicy, dressing on side...)"
                      value={item.specialInstructions || ""}
                      onChange={(e) => updateCartNote(idx, e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-orange-500 placeholder-slate-400 dark:placeholder-slate-650 transition-colors"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCartItem(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 size-6 rounded-full border border-rose-100 dark:border-rose-900/30 flex items-center justify-center opacity-100 transition-all active:scale-90 shadow-sm"
                    title="Remove item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 5: Vouchers & Coupon codes */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-orange-500" />
              Promo Vouchers
            </h3>

            {!appliedPromo ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => {
                      setPromoCodeInput(e.target.value);
                      if (promoStatus !== "idle") setPromoStatus("idle");
                    }}
                    placeholder="Enter Coupon Code (e.g. FIRSTTREAT)"
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2.5 text-xs font-mono font-bold focus:ring-1 focus:ring-orange-500 outline-none transition-all dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyPromo()}
                    className="bg-slate-900 hover:bg-slate-850 dark:bg-orange-600 text-white font-black text-xs px-4 rounded-2xl active:scale-95 transition-all uppercase tracking-wider cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {/* DB status indicators */}
                {promoStatus === "checking" && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold bg-blue-50 dark:bg-blue-950/25 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/30 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>
                      Validating "{promoCodeInput.toUpperCase()}" with
                      Database...
                    </span>
                  </div>
                )}

                {promoStatus === "already_used" && (
                  <div className="flex flex-col gap-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 p-3 rounded-2xl text-amber-800 dark:text-amber-400">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">
                        🔒 Database Verified - Already Redeemed
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold ml-6">
                      {promoError} Limit of 1 use per customer.
                    </p>
                  </div>
                )}

                {promoStatus === "expired" && (
                  <div className="flex flex-col gap-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 p-3 rounded-2xl text-rose-800 dark:text-rose-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">
                        ⌛ Database Verified - Campaign Expired
                      </span>
                    </div>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold ml-6">
                      {promoError} This campaign has closed.
                    </p>
                  </div>
                )}

                {promoStatus === "invalid" && (
                  <div className="flex flex-col gap-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 p-3 rounded-2xl text-rose-800 dark:text-rose-400">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">
                        ✕ Database Checked - Code Invalid
                      </span>
                    </div>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold ml-6">
                      {promoError} Please check spelling and retry.
                    </p>
                  </div>
                )}

                {/* Popular Promo suggestions as clickable chips */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">
                    Voucher campaigns in DB:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPromo("LOCALEATS10")}
                      className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Gift className="w-3 h-3" />
                      LOCALEATS10 (Active)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPromo("FIRSTTREAT")}
                      className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Gift className="w-3 h-3" />
                      FIRSTTREAT (Active)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPromo("EXPIRED20")}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-900/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Clock className="w-3 h-3 text-slate-400" />
                      EXPIRED20 (Expired)
                    </button>
                    {deliveryType === "delivery" && (
                      <button
                        type="button"
                        onClick={() => handleApplyPromo("BICYCLE5")}
                        className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Bike className="w-3 h-3" />
                        BICYCLE5 (Delivery)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-[10px] text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">
                      ✔ VOUCHER APPLIED
                    </h5>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-tight">
                      Code "{appliedPromo.code}" saved R
                      {discountAmount.toFixed(2)}!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removePromo}
                  className="text-slate-400 hover:text-red-500 font-black text-[10px] uppercase tracking-wider underline decoration-2 underline-offset-4 decoration-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>

          {/* SECTION 6: Payment Method & Cash change Chip Request */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-orange-500" />
              Settlement Method
            </h3>

            {isCashTrustActive && (
              <div
                id="checkout-coa-trust-banner"
                className="bg-green-500/10 dark:bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/20 p-3.5 rounded-2xl flex items-center gap-3 shadow-inner"
              >
                <span className="text-lg shrink-0">💵</span>
                <p className="text-xs font-black tracking-tight leading-snug">
                  Local COD Supported! Pay cash right at your door with complete
                  peace of mind.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <label
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  isCoaDisabled
                    ? "opacity-50 cursor-not-allowed border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20"
                    : paymentMethod === "cash"
                      ? "border-orange-500 bg-orange-500/5 dark:bg-orange-500/10"
                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50"
                }`}
                onClick={(e) => {
                  if (isCoaDisabled) {
                    e.preventDefault();
                    toast.info(
                      "COA is restricted to first-time shoppers or orders under R350.",
                    );
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                      isCoaDisabled
                        ? "bg-slate-200 dark:bg-slate-800 text-slate-400"
                        : paymentMethod === "cash"
                          ? "bg-orange-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {isCoaDisabled ? (
                      <Shield className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Banknote className="w-4 h-4" />
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-slate-950 dark:text-white text-sm font-black uppercase tracking-tight">
                        {isCashTrustActive
                          ? "Cash on Arrival (COA)"
                          : deliveryType === "collection"
                            ? "Pay Cash at Counter"
                            : "Cash on Delivery (COD)"}
                      </p>
                      {isCashTrustActive && userOrderCount === 0 && (
                        <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse shrink-0">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[10px] font-bold tracking-tight">
                      {isCoaDisabled
                        ? "COA limit of R350 exceeded for returning users."
                        : deliveryType === "collection"
                          ? "Pay cash directly to the shop assistant at the counter when you retrieve your order."
                          : isCashTrustActive
                            ? "Pay safely with cash or mobile wallet when rider arrives at your door."
                            : "Pay cash directly to the delivery rider at your door."}
                    </p>
                  </div>
                </div>
                <div
                  className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCoaDisabled ? "border-slate-200 bg-slate-100 dark:border-slate-800" : paymentMethod === "cash" ? "border-orange-500" : "border-slate-300"}`}
                >
                  {isCoaDisabled ? (
                    <span className="text-[10px]">🔒</span>
                  ) : (
                    paymentMethod === "cash" && (
                      <div className="size-2.5 bg-orange-500 rounded-full animate-scale-in" />
                    )
                  )}
                </div>
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  disabled={isCoaDisabled}
                  checked={paymentMethod === "cash"}
                  onChange={() => {
                    if (!isCoaDisabled) {
                      setPaymentMethod("cash");
                    }
                  }}
                  className="hidden"
                />
              </label>

              {deliveryType === "collection" && (
                <label
                  className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === "card_machine" ? "border-orange-500 bg-orange-500/5 dark:bg-orange-500/10" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-9 rounded-full flex items-center justify-center ${paymentMethod === "card_machine" ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
                    >
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-slate-950 dark:text-white text-sm font-black uppercase tracking-tight">
                        {isCardMachineIntegrationEnabled 
                          ? "Direct Card Terminal Sync" 
                          : "Pay by Card on Arrival (Swipe at Counter)"}
                      </p>
                      <p className="text-slate-400 text-[10px] font-bold tracking-tight">
                        {isCardMachineIntegrationEnabled 
                          ? "Sync payment with shop's connected card terminal machine" 
                          : "Simply swipe or tap your credit/debit card on the shop's terminal machine when you arrive to fetch your food."}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`size-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "card_machine" ? "border-orange-500" : "border-slate-300"}`}
                  >
                    {paymentMethod === "card_machine" && (
                      <div className="size-2.5 bg-orange-500 rounded-full animate-scale-in" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    value="card_machine"
                    checked={paymentMethod === "card_machine"}
                    onChange={() => setPaymentMethod("card_machine")}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {paymentMethod === "card_machine" && deliveryType === "collection" && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  {isCardMachineIntegrationEnabled ? "Enter Direct Terminal Payment Card Details" : "Enter Credit / Debit Card Payment Details"}
                </p>

                {/* VISUAL CREDIT CARD COMPONENT */}
                <div className="relative h-44 w-full bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] rounded-2xl p-5 text-white shadow-xl overflow-hidden flex flex-col justify-between border border-white/10">
                  {/* Card Background Patterns */}
                  <div className="absolute right-0 top-0 size-32 bg-primary/10 rounded-full blur-2xl font-sans" />
                  <div className="absolute left-10 bottom-0 size-24 bg-blue-500/10 rounded-full blur-xl font-sans" />

                  {/* Top Bar: Chip & Brand */}
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                      {/* Gold Chip Card Logo */}
                      <div className="w-10 h-7 bg-gradient-to-tr from-yellow-300 to-yellow-500 rounded-md border border-yellow-200/50 flex flex-col justify-around p-1 shadow-inner relative overflow-hidden">
                        <div className="h-full w-full opacity-40 flex flex-col justify-between">
                          <div className="flex justify-between"><div className="border border-black flex-1"></div><div className="border border-black flex-1"></div></div>
                          <div className="flex justify-between"><div className="border border-black flex-1"></div><div className="border border-black flex-1"></div></div>
                        </div>
                      </div>
                      <p className="text-[8px] text-slate-300 uppercase tracking-widest font-black leading-none mt-1">Smart Chip</p>
                    </div>
                    {/* Visual Brand Name */}
                    <div className="text-right">
                      <p className="font-extrabold text-xs uppercase tracking-widest bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent mb-0.5">LOCAL CARDSECURE</p>
                      <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Direct Terminal Sync</p>
                    </div>
                  </div>

                  {/* Card Number display */}
                  <div className="my-1">
                    <p className="font-mono text-base md:text-lg tracking-widest text-[#f8fafc] font-semibold text-center drop-shadow-md">
                      {cardNumber || "••••  ••••  ••••  ••••"}
                    </p>
                  </div>

                  {/* Bottom details: Holder & Expiry */}
                  <div className="flex justify-between items-end">
                    <div className="text-left">
                      <p className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wider leading-none mb-0.5">Cardholder Name</p>
                      <p className="font-sans text-xs font-black uppercase tracking-wider text-slate-100 cut-text max-w-[180px]">
                        {cardHolder || "NAME SURNAME"}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wider leading-none mb-0.5">Expires</p>
                        <p className="font-mono text-xs font-bold text-slate-100">
                          {cardExpiry || "MM/YY"}
                        </p>
                      </div>
                      <div className="text-center font-sans">
                        <p className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wider leading-none mb-0.5">CVV</p>
                        <p className="font-mono text-xs font-bold text-slate-100">
                          {cardCvv ? "•••" : "000"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FORM FIELDS WITH RESPONSIVE BEHAVIOR */}
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 mt-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                      placeholder="e.g. John Doe"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        maxLength={19}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 mt-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                        placeholder="e.g. 5231 4452 8890 1204"
                        value={cardNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const formatted = val
                            .replace(/(\d{4})+(?=\d)/g, "$1 ")
                            .slice(0, 19);
                          setCardNumber(formatted);
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          maxLength={5}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 mt-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 text-center"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            if (val.length > 2) {
                              val = val.slice(0, 2) + "/" + val.slice(2, 4);
                            }
                            setCardExpiry(val);
                          }}
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ml-1">
                          CVV Code
                        </label>
                        <input
                          type="text"
                          maxLength={3}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 mt-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 text-center"
                          placeholder="***"
                          value={cardCvv}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 3);
                            setCardCvv(val);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30 flex items-start gap-2">
                  <span className="text-[11px] leading-none">🔒</span>
                  <p className="text-[9px] text-indigo-700 dark:text-indigo-400 font-semibold font-sans leading-snug">
                    Terminal Charge Authorized: By submitting, your payment details are secured on the local point-of-sale queue. The merchant will capture R {totalAmount.toFixed(2)} directly on the connected card machine ({localStorage.getItem("localeats_card_machine_brand_" + primaryShop.id) || "Yoco Terminal"}).
                  </p>
                </div>
              </div>
            )}

            {/* CASH CHANGE QUICK SELECT CHIPS (Solves the Rider "No Change Available" complaint!) */}
            {paymentMethod === "cash" && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-2.5 animate-in slide-in-from-top-1.5 duration-300">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                  Do you need change for cash?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { val: "no_change", label: "No Change" },
                    { val: "R50", label: "R50 Notes" },
                    { val: "R100", label: "R100 Notes" },
                    { val: "R200", label: "R200 Notes" },
                    { val: "custom", label: "Custom Note..." },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.val}
                      onClick={() => setCashChangeOption(item.val as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 border ${
                        cashChangeOption === item.val
                          ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {cashChangeOption === "custom" && (
                  <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200 pt-1">
                    <span className="text-xs font-black text-slate-500 font-mono">
                      R
                    </span>
                    <input
                      type="number"
                      value={customChangeAmount}
                      onChange={(e) => setCustomChangeAmount(e.target.value)}
                      placeholder="e.g. 150 (amount or bill you hold)"
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold outline-none ring-1 ring-orange-150 focus:ring-orange-500"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SECTION 6.5: Support Rider with Optional Tip */}
          {deliveryType === "delivery" && (
            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-3.5">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-orange-500" />
                Rider Tip
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Optional tip to show appreciation for the rider's efforts. 100% of tips go directly to the rider.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "No Tip", val: 0 },
                  { label: "5%", val: 5 },
                  { label: "10%", val: 10 },
                  { label: "15%", val: 15 },
                  { label: "Custom", val: "custom" },
                ].map((item) => (
                  <button
                  type="button"
                  key={item.label}
                  onClick={() => {
                    if (typeof item.val === "number") {
                      setTipPercentage(item.val);
                    } else {
                      setTipPercentage("custom");
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 border ${
                    (item.val === "custom" && tipPercentage === "custom") || (typeof item.val === "number" && tipPercentage === item.val)
                      ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tipPercentage === "custom" && (
              <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                <span className="text-xs font-black text-slate-400 font-mono pl-1">
                  Custom Tip:
                </span>
                <div className="flex-1 relative flex items-center">
                  <span className="absolute left-3 text-xs font-black text-slate-500 font-mono">
                    R
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={customTipInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (parseFloat(val) >= 0 || val === "") {
                        setCustomTipInput(val);
                      }
                    }}
                    placeholder="Enter custom amount (e.g., 20)"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-xs font-bold outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {tipAmount > 0 && (
              <div className="p-3 bg-orange-50/55 dark:bg-orange-950/20 border border-orange-100/40 dark:border-orange-900/20 rounded-2xl flex justify-between items-center text-xs animate-in slide-in-from-top-2 duration-200">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                  <span>Appreciated Tip:</span>
                </span>
                <span className="font-black text-orange-600 dark:text-orange-400 font-mono text-sm">
                  + R {tipAmount.toFixed(2)}
                </span>
              </div>
            )}
          </section>
          )}

          {/* SECTION 7: Unified Visually Clean Receipt Details */}
          <section className="bg-slate-950 text-slate-100 p-5 rounded-3xl space-y-3 shadow-xl relative overflow-hidden border border-slate-850">
            {/* Real receipt style details */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500"></div>

            <div className="flex items-center justify-between border-b border-dashed border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Order Tax Invoice
                </h4>
                <p className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">
                  LOCAL FOODS CORP • REG SECURED
                </p>
              </div>
              <QrCode className="w-8 h-8 text-slate-500" />
            </div>

            <div className="space-y-2.5 pt-1.5 text-xs font-bold">
              {/* Items Breakdown */}
              <div className="flex flex-col gap-2 pb-2 border-b border-dashed border-slate-800">
                {cart.map((item, idx) => {
                  const itemTotal = (item.price + (item.selectedCustomizations?.reduce((s, c) => s + c.price, 0) || 0)) * item.quantity;
                  return (
                    <div key={idx} className="flex justify-between items-start text-slate-300">
                      <div className="flex flex-col gap-0.5">
                        <span className="uppercase tracking-wider text-[11px] leading-tight flex items-start gap-1">
                          <span className="text-orange-500 font-black">{item.quantity}x</span> {item.name}
                        </span>
                        {item.selectedCustomizations && item.selectedCustomizations.length > 0 && (
                          <span className="text-[9px] text-slate-500 font-normal pl-4">
                            + {item.selectedCustomizations.map(c => c.name).join(", ")}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-400">R {itemTotal.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center text-slate-400 pt-1">
                <span className="uppercase tracking-wider">Subtotal</span>
                <span className="font-mono">R {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-400/80 text-[11px]">
                <span className="uppercase tracking-wider flex items-center gap-1">
                  <Percent className="w-3 h-3 text-orange-500/80" />
                  Tax / VAT (15% Included)
                </span>
                <span className="font-mono">R {((subtotal - discountAmount) * 15 / 115).toFixed(2)}</span>
              </div>

              {appliedPromo && (
                <div className="flex justify-between items-center text-emerald-400 bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/30 animate-pulse">
                  <span className="uppercase tracking-wider flex items-center gap-1.5 font-extrabold text-[10px]">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Promo Applied: "{appliedPromo.code}"</span>
                  </span>
                  <span className="font-mono text-xs flex items-center gap-1.5 font-black">
                    <span className="text-[8px] bg-emerald-500 text-slate-950 font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full select-none">
                      Coupon Saved
                    </span>
                    <span>- R {discountAmount.toFixed(2)}</span>
                  </span>
                </div>
              )}

              {deliveryType === "delivery" && (
                <div className="flex justify-between items-center text-orange-400">
                  <span className="uppercase tracking-wider flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5" />
                    Delivery Fee (
                    {distance !== null && distance > ZONE_A_LIMIT
                      ? "Zone B"
                      : "Zone A"}
                    )
                  </span>
                  <span className="font-mono">R {deliveryFee.toFixed(2)}</span>
                </div>
              )}

              {tipAmount > 0 && (
                <div className="flex justify-between items-center text-amber-400">
                  <span className="uppercase tracking-wider flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    Support Merchant Tip
                  </span>
                  <span className="font-mono">R {tipAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-800 pt-3 flex justify-between items-center text-slate-100">
                <span className="text-sm font-black uppercase tracking-widest">
                  Grand Total Amount
                </span>
                <span className="text-2xl font-black font-mono text-orange-500">
                  <AnimatedPrice value={totalAmount} />
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-800 pt-2.5 text-[9px] text-center text-slate-500 font-black uppercase tracking-widest">
              💼 Thank you for supporting local cooks!
            </div>
          </section>

          {/* PLACE ORDER FINAL SUBMIT SECTION */}
          <div className="mt-4 mb-20">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                loading ||
                cart.length === 0 ||
                (deliveryType === "delivery" &&
                  distance !== null &&
                  distance > ZONE_B_LIMIT)
              }
              className={`w-full py-4.5 rounded-2xl font-black shadow-xl uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:scale-100 cursor-pointer ${
                loading ||
                (deliveryType === "delivery" &&
                  distance !== null &&
                  distance > ZONE_B_LIMIT)
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-none shadow-none"
                  : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30 font-extrabold text-sm"
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5 shrink-0" />
                  {deliveryType === "delivery" &&
                  distance !== null &&
                  distance > ZONE_B_LIMIT
                    ? "Out of Delivery Range"
                    : `Confirm & Pay R ${totalAmount.toFixed(2)}`}
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-4.5 font-bold uppercase tracking-widest leading-relaxed px-4">
              {deliveryType === "delivery"
                ? "📍 Precise bicycle navigation is automatically active"
                : "⚡ Your fresh food is prepared on demand for pickup"}
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* Address Selection & Pin Precision Control Popup Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="size-10 bg-orange-100 dark:bg-orange-500/10 text-orange-600 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-black text-slate-900 dark:text-white text-base leading-none">
                    Configure Delivery Spot
                  </h3>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-1.5">
                    Ensure precise handshakes with runners
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  triggerHaptic(5);
                }}
                className="size-9 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Live position detector */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
                  Select Delivery Spot
                </span>
                {userLocation && (
                  <div className="flex items-center gap-1 bg-green-50 dark:bg-green-500/10 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-500/20">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[8.5px] font-black text-green-600 uppercase tracking-wider">
                      Live Position Lock
                    </span>
                  </div>
                )}
              </div>

              {/* Address Search */}
              <AddressSearch
                initialAddress={deliveryAddressText}
                initialCoords={
                  deliveryCoordinates
                    ? {
                        lat: deliveryCoordinates.coordinates[1],
                        lng: deliveryCoordinates.coordinates[0],
                      }
                    : undefined
                }
                shopCoords={
                  primaryShop.latitude && primaryShop.longitude
                    ? { lat: primaryShop.latitude, lng: primaryShop.longitude }
                    : undefined
                }
                onSelect={(data) => {
                  setDeliveryAddressText(data.address);
                  setDeliveryCoordinates({
                    type: "Point",
                    coordinates: [
                      Number(data.lng.toFixed(6)),
                      Number(data.lat.toFixed(6)),
                    ],
                  });
                  setIsLocationConfirmed(false);
                  safeLocalStorageSet(
                    "delivery_location",
                    JSON.stringify(data),
                  );
                  toast.info(
                    "Address loaded! Pin your exact location on the map below.",
                  );
                }}
              />
              {/* Detected Township Target */}
              {deliveryTownship && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-805 rounded-2xl text-left">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">
                      Detected Township Target
                    </span>
                    <span className="text-[8.5px] bg-orange-500/10 dark:bg-orange-500/25 text-orange-600 dark:text-orange-450 font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {deliveryTownship.name} Zone
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-450 font-bold leading-relaxed">
                    Local runners will route your Kota using native corridors
                    around{" "}
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                      {deliveryTownship.landmarks.slice(0, 3).join(", ")}
                    </span>{" "}
                    for quick handshake handovers!
                  </p>
                </div>
              )}

              {/* Map Section */}
              {deliveryCoordinates && (
                <div className="space-y-3 pt-1 text-left">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      Pin Precision Control Map
                    </p>
                    {isLocationConfirmed && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-md">
                        <Target className="w-3 h-3 text-green-600" />
                        <span className="text-[9px] font-mono font-bold text-green-600 tracking-tighter">
                          {deliveryCoordinates.coordinates[1].toFixed(6)},{" "}
                          {deliveryCoordinates.coordinates[0].toFixed(6)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <LocationPickerMap
                      coords={{
                        lat: deliveryCoordinates.coordinates[1],
                        lng: deliveryCoordinates.coordinates[0],
                      }}
                      onCoordsChange={(c) => {
                        setDeliveryCoordinates({
                          type: "Point",
                          coordinates: [
                            Number(c.lng.toFixed(6)),
                            Number(c.lat.toFixed(6)),
                          ],
                        });
                        setIsLocationConfirmed(false);
                      }}
                      shopCoords={
                        primaryShop.latitude && primaryShop.longitude
                          ? {
                              lat: primaryShop.latitude,
                              lng: primaryShop.longitude,
                            }
                          : undefined
                      }
                    />

                    {!isLocationConfirmed && (
                      <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/20 backdrop-blur-[1px] pointer-events-none flex items-center justify-center border-2 border-dashed border-orange-500 rounded-2xl animate-pulse z-[1000]">
                        <p className="bg-orange-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg transform -rotate-2">
                          PIN UNLOCKED: PLEASE CONFIRM SPOT
                        </p>
                      </div>
                    )}
                  </div>

                  {!isLocationConfirmed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLocationConfirmed(true);
                        triggerHaptic(5);
                        toast.success("Exact spot locked in!");
                      }}
                      className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      <span>Confirm Exact Delivery Spot</span>
                    </button>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 p-3 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-[10px] font-black text-green-800 dark:text-green-400 uppercase tracking-wider">
                          Location Secured
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLocationConfirmed(false)}
                        className="text-[10px] font-black text-slate-400 hover:text-orange-600 dark:text-slate-500 dark:hover:text-orange-400 uppercase underline cursor-pointer"
                      >
                        Change Pin
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950/20 flex gap-3 shrink-0 rounded-b-[32px]">
              <button
                type="button"
                onClick={() => {
                  setShowAddressModal(false);
                  triggerHaptic(5);
                }}
                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black uppercase tracking-wider text-xs cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!deliveryAddressText) {
                    toast.error("Please enter/search for a delivery address.");
                    return;
                  }
                  if (!isLocationConfirmed) {
                    toast.error("Please confirm your location pin on the map.");
                    return;
                  }
                  setShowAddressModal(false);
                  triggerHaptic(10);
                  toast.success("Delivery coordinates fully applied!");
                }}
                className={`flex-1 py-3.5 text-white rounded-2xl font-black uppercase tracking-wider text-xs text-center cursor-pointer ${
                  deliveryAddressText && isLocationConfirmed
                    ? "bg-orange-500 hover:bg-orange-600 shadow-md"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                }`}
              >
                Save Coordinates
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}

