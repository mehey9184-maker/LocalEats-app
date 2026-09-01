import React, { useState, useEffect, useMemo, useRef, Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, MapPin, Clock, CreditCard, ChevronRight, ChevronDown, ChevronUp, X, Phone, User, Home, Building2, Wallet, Navigation, ShoppingBag, Plus, Minus, ArrowRight, Truck, Info, ShieldCheck, Banknote, ShoppingBasket, ExternalLink, Lock, UserPlus, Sparkles, Bike, Loader2, Target, CheckCircle, QrCode, Trash2, ArrowLeft, AlertTriangle, Gift, Shield, Utensils, Percent, Heart, Coins, WifiOff, Check, Zap, Calendar
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { upsertProfileWithRPC } from "../lib/profileService";
import { Shop, CartItem, Screen, UserProfile } from "../types";
import { IdempotencyManager } from "../utils/idempotency";
import { calculateDistance, formatSAPhone, validateSAPhone, toDBPhone, safeLocalStorageSet, safeLocalStorageGet, getShopStatus, DEFAULT_MENU_IMAGE } from "../utils";
import { Session } from "@supabase/supabase-js";
import { LocalEatsLogo } from "../components/LocalEatsLogo";
import { useTranslation } from "../contexts/LanguageContext";
import { AnimatedPrice } from "../components/AnimatedPrice";
import { toast } from "sonner";
import { registerAndSyncPushToken, FirestoreService, ensureAnonymousAuth, CreateOrderRequestData, CreateOrderResponse } from "../lib/firebase";
import { LocationPickerMap } from "../components/MapComponents";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { BlurUpImage } from "../components/BlurUpImage";
import { audioHelper } from "../lib/audioHelper";
import { detectTownship } from "../lib/townshipHelper";
import { Tag } from "lucide-react";

const LOCAL_LANDMARKS = [
  { id: "LM01", name: "Community Hall", lat: -26.2, lng: 28.0 },
  { id: "LM02", name: "Main Taxi Rank", lat: -26.21, lng: 28.01 },
  { id: "LM03", name: "High School Gate", lat: -26.22, lng: 28.02 },
  { id: "LM04", name: "Primary Clinic", lat: -26.23, lng: 28.03 },
  { id: "LM05", name: "Shopping Complex", lat: -26.24, lng: 28.04 },
  { id: "LM06", name: "Sports Ground", lat: -26.25, lng: 28.05 },
];

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isCartSummaryExpanded, setIsCartSummaryExpanded] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const addressSectionRef = useRef<HTMLDivElement>(null);
  const paymentMethodSectionRef = useRef<HTMLDivElement>(null);
  const checkoutIdempotencyKeyRef = useRef<string | null>(null);

  const handleNextToStep2 = () => {
    setFormErrors({});
    if (!customerName.trim()) {
      setFormErrors({ name: "Please enter the recipient name" });
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameInputRef.current?.focus();
      return;
    }
    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 9) {
      setFormErrors({ phone: "Valid mobile number required" });
      phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      phoneInputRef.current?.focus();
      return;
    }
    if (deliveryType === "delivery" && (!deliveryAddressText.trim() || deliveryAddressText.trim().length < 5)) {
      setFormErrors({ address: "Please provide a complete delivery address" });
      setShowAddressModal(true);
      addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (deliveryType === "delivery" && isOnline && (!isLocationConfirmed || !deliveryCoordinates)) {
      setFormErrors({ location: 'Please confirm location on the map.' });
      return;
    }
    if (deliveryType === "delivery" && isOnline && isLocationConfirmed && !hasVisuallyConfirmedAddress) {
      setFormErrors({ visualConfirm: 'Please check the box confirming your address.' });
      return;
    }
    setCurrentStep(2);
    triggerHaptic(10);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextToStep3 = () => {
    setFormErrors({});
    if (!paymentMethod) {
      setFormErrors({ payment: "Please select a settlement payment method" });
      paymentMethodSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setCurrentStep(3);
    triggerHaptic(10);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const [tipPercentage, setTipPercentage] = useState<number | "custom">(0);
  const [customTipInput, setCustomTipInput] = useState<string>("");
  const [deliveryScheduleMode, setDeliveryScheduleMode] = useState<"asap" | "express" | "scheduled">("asap");
  const [scheduledTimeChoice, setScheduledTimeChoice] = useState<string>("12:30 PM");

  const [isCheckoutBannerCollapsed, setIsCheckoutBannerCollapsed] = useState(false);
  const [isCheckoutScrollCollapsed, setIsCheckoutScrollCollapsed] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > lastScrollY + 20 && currentScrollY > 100) {
            setIsCheckoutScrollCollapsed(true);
          } else if (currentScrollY < lastScrollY - 10 || currentScrollY < 30) {
            setIsCheckoutScrollCollapsed(false);
          }
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [savedCards, setSavedCards] = useState<Array<{ id: string; cardHolder: string; cardNumber: string; expiry: string; cardType: string }>>(() => {
    try {
      const cached = localStorage.getItem("localeats_saved_cards");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      { id: "c1", cardHolder: userProfile?.fullName || "LOCAL CUSTOMER", cardNumber: "•••• •••• •••• 4242", expiry: "08/28", cardType: "Visa" },
      { id: "c2", cardHolder: userProfile?.fullName || "LOCAL CUSTOMER", cardNumber: "•••• •••• •••• 8819", expiry: "12/29", cardType: "Mastercard" },
    ];
  });
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string>("c1");
  const [saveCardForFuture, setSaveCardForFuture] = useState<boolean>(true);

  useEffect(() => {
    if (selectedSavedCardId && selectedSavedCardId !== "new") {
      const found = savedCards.find((c) => c.id === selectedSavedCardId);
      if (found) {
        setCardHolder(found.cardHolder);
        setCardNumber(found.cardNumber);
        setCardExpiry(found.expiry);
        setCardCvv("•••");
      }
    } else if (selectedSavedCardId === "new") {
      setCardHolder(userProfile?.fullName || "");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
    }
  }, [selectedSavedCardId]);

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

  // Helper to safely get cached profile only if it belongs to the active user
  const getValidCachedProfile = () => {
    const cached = safeLocalStorageGet("userProfile", null);
    if (!cached) return null;
    const activeId = userProfile?.id || session?.user?.id;
    if (activeId && cached.id && cached.id !== activeId) {
      return null;
    }
    return cached;
  };

  // Recipient details editable inline to prevent block/exit funnel - auto-populates from account details
  const [customerName, setCustomerName] = useState(() => {
    const cachedProfile = getValidCachedProfile();
    return (
      userProfile?.fullName ||
      (userProfile as any)?.name ||
      cachedProfile?.fullName ||
      cachedProfile?.name ||
      (userProfile?.email ? userProfile.email.split("@")[0] : "") ||
      ""
    );
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    const cachedProfile = getValidCachedProfile();
    return userProfile?.phone || cachedProfile?.phone || "";
  });
  const [saveToProfile, setSaveToProfile] = useState(true);

  // Sync recipient details with userProfile updates
  useEffect(() => {
    const cachedProfile = getValidCachedProfile();
    const resolvedName =
      userProfile?.fullName ||
      (userProfile as any)?.name ||
      cachedProfile?.fullName ||
      cachedProfile?.name ||
      (userProfile?.email ? userProfile.email.split("@")[0] : "");
    if (!customerName.trim() && resolvedName) {
      setCustomerName(resolvedName);
    }
    const resolvedPhone = userProfile?.phone || cachedProfile?.phone;
    if (!customerPhone.trim() && resolvedPhone) {
      setCustomerPhone(resolvedPhone);
    }
    if (!cardHolder.trim() && resolvedName) {
      setCardHolder(resolvedName);
    }
  }, [userProfile]);

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

  // Landmark Selection States
  const [selectedLandmark, setSelectedLandmark] = useState("");
  const [landmarkDetails, setLandmarkDetails] = useState("");
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

  const [savedAddressesList, setSavedAddressesList] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem("localeats_saved_addresses");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error parsing saved addresses:", e);
    }
    return userProfile?.address ? [userProfile.address] : [];
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
  const [hasVisuallyConfirmedAddress, setHasVisuallyConfirmedAddress] =
    useState<boolean>(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(5.0);

  const primaryShopId = cart.length > 0 ? cart[0].shopId : shops[0]?.id || "";
  const primaryShop = shops.find((s) => s.id === primaryShopId) || shops[0];

  const shopRadiusLimit = useMemo(() => {
    if (primaryShop) {
      if (typeof primaryShop.delivery_radius_km === "number" && primaryShop.delivery_radius_km > 0) {
        return primaryShop.delivery_radius_km;
      }
      if (typeof (primaryShop as any).delivery_radius === "number" && (primaryShop as any).delivery_radius > 0) {
        return (primaryShop as any).delivery_radius;
      }
    }
    return 5.0; // Standard merchant radius limit 5.0 km
  }, [primaryShop]);

  const ZONE_A_LIMIT = 3.0;
  const ZONE_B_LIMIT = shopRadiusLimit;
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

  const [hasInHouseRiderOnline, setHasInHouseRiderOnline] = useState(false);

  useEffect(() => {
    const checkInHouseRiders = async () => {
      if (!primaryShop?.id) return;
      try {
        const { data, error } = await (supabase as any)
          .from("rider_profiles")
          .select("id")
          .eq("is_online", true);

        if (!error && data && data.length > 0) {
          setHasInHouseRiderOnline(true);
        } else {
          setHasInHouseRiderOnline(false);
        }
      } catch (err) {
        console.info("Notice querying rider status:", err);
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
        toast.error(`Delivery Unavailable at this Location — Distance (${dist.toFixed(1)} km) exceeds shop limit (${ZONE_B_LIMIT.toFixed(1)} km)`, {
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
          .select("id, code, discount_type, discount_value, min_order_amount, max_discount_amount, is_active")
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

  const expressFee = (deliveryType === "delivery" && deliveryScheduleMode === "express") ? 10.0 : 0;
  const baseDeliveryFee = deliveryType === "delivery" ? deliveryFee : 0;
  const activeDeliveryFee = baseDeliveryFee + expressFee;
  const serviceFee = subtotal > 0 ? 2.50 : 0;

  const tipAmount = useMemo(() => {
    if (tipPercentage === "custom") {
      return parseFloat(customTipInput) || 0;
    }
    return (subtotal * tipPercentage) / 100;
  }, [tipPercentage, customTipInput, subtotal]);

  const totalAmount = Math.max(
    0,
    subtotal - discountAmount + activeDeliveryFee + serviceFee + tipAmount,
  );
  const totalSavings = discountAmount;

  // Psychological Price Anchoring Calculations:
  // 1. Estimated standard franchise / third-party aggregator retail value (anchoring against ~22% higher market benchmark)
  const estimatedRetailSubtotal = subtotal > 0 ? subtotal * 1.22 : 0;
  const directKitchenSavings = Math.max(0, estimatedRetailSubtotal - subtotal);
  const totalCombinedSavings = directKitchenSavings + discountAmount;

  // 2. Relative percentage of add-ons against subtotal to make costs feel minor & justifiable
  const expressFeePercent = subtotal > 0 ? Math.max(1, Math.round((expressFee / subtotal) * 100)) : 5;
  const deliveryFeePercent = subtotal > 0 ? Math.max(1, Math.round((deliveryFee / subtotal) * 100)) : 3;
  const serviceFeePercent = subtotal > 0 ? ((serviceFee / subtotal) * 100).toFixed(1) : "1.5";
  const tipFeePercent = subtotal > 0 ? Math.max(1, Math.round((tipAmount / subtotal) * 100)) : 0;

  // 3. Goal Gradient Endowed Progress:
  // Never start at 0%! Step 1 (Selecting food items into cart) is pre-credited so user starts at 25% or higher
  const goalGradientPercent = useMemo(() => {
    let base = 25; // Pre-credited 25% endowed momentum for items in cart
    if (currentStep === 1) {
      if (customerName.trim() && customerPhone.trim()) base += 15;
      if (deliveryType === "collection" || (deliveryAddressText.trim() && isLocationConfirmed)) base += 15;
    } else if (currentStep === 2) {
      base = 70;
      if (paymentMethod) base += 10;
      if (tipPercentage !== 0) base += 5;
    } else if (currentStep === 3) {
      base = 100;
    }
    return Math.min(100, Math.max(25, base));
  }, [currentStep, customerName, customerPhone, deliveryType, deliveryAddressText, isLocationConfirmed, paymentMethod, tipPercentage]);

  const { tenderAmount, changeNeeded } = useMemo(() => {
    if (paymentMethod !== "cash") return { tenderAmount: totalAmount, changeNeeded: 0 };
    let tender = totalAmount;
    if (cashChangeOption === "R50") tender = Math.max(50, totalAmount);
    else if (cashChangeOption === "R100") tender = Math.max(100, totalAmount);
    else if (cashChangeOption === "R200") tender = Math.max(200, totalAmount);
    else if (cashChangeOption === "custom") {
      const parsed = parseFloat(customChangeAmount);
      if (!isNaN(parsed) && parsed > 0) tender = Math.max(parsed, totalAmount);
    }
    const change = Math.max(0, tender - totalAmount);
    return { tenderAmount: tender, changeNeeded: change };
  }, [paymentMethod, cashChangeOption, customChangeAmount, totalAmount]);

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
    if (loading) return;
    if (cart.length === 0) {
      toast.error("Empty Cart", {
        description: "Your cart is empty. Please add items before checking out.",
      });
      return;
    }

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
    const hasInvalidShopId = cart.some(item => !item.shopId || item.shopId === "null" || item.shopId === "undefined");
    if (hasInvalidShopId) {
      toast.error("Invalid Cart Data", {
        description: "Some items in your cart are missing shop information. Please clear your cart and try again."
      });
      return;
    }

    // Auto-populate recipient details from account details / profile if not filled in
    const cachedProfile = getValidCachedProfile();
    let activeCustomerName = customerName.trim();
    if (!activeCustomerName) {
      activeCustomerName =
        userProfile?.fullName ||
        (userProfile as any)?.name ||
        cachedProfile?.fullName ||
        cachedProfile?.name ||
        (userProfile?.email ? userProfile.email.split("@")[0] : "") ||
        "Valued Customer";
      setCustomerName(activeCustomerName);
    }

    let activeCustomerPhone = customerPhone.trim();
    if (!activeCustomerPhone || activeCustomerPhone.replace(/\D/g, "").length < 9) {
      const fallbackPhone = userProfile?.phone || cachedProfile?.phone;
      if (fallbackPhone && fallbackPhone.replace(/\D/g, "").length >= 9) {
        activeCustomerPhone = fallbackPhone;
        setCustomerPhone(activeCustomerPhone);
      }
    }

    if (!activeCustomerName) {
      toast.error("Please enter the recipient name");
      setCurrentStep(1);
      setTimeout(() => {
        nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInputRef.current?.focus();
      }, 100);
      return;
    }

    if (!activeCustomerPhone || activeCustomerPhone.replace(/\D/g, "").length < 9) {
      toast.error("Valid Mobile Number Required", {
        description:
          "Please input a proper mobile number so our riders can call you!",
      });
      setCurrentStep(1);
      setTimeout(() => {
        phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInputRef.current?.focus();
      }, 100);
      return;
    }

    if (deliveryType === "delivery") {
      if (!deliveryAddressText || deliveryAddressText.trim().length < 5) {
        toast.error("Valid Delivery Address Required", {
          description: "Please set a complete delivery address for your order.",
        });
        setCurrentStep(1);
        setShowAddressModal(true);
        setTimeout(() => {
          addressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
      
      if (isOnline && (!isLocationConfirmed || !deliveryCoordinates)) {
        showAlert(
          "Location Confirmation Required",
          'Please drag the pin to your exact door and tap "Confirm Location" on the map.',
        );
        setCurrentStep(1);
        return;
      }

      if (isOnline && isLocationConfirmed && !hasVisuallyConfirmedAddress) {
        showAlert(
          "Visual Confirmation Required",
          'Please check the box confirming that your pinned map location accurately matches your delivery address.',
        );
        setCurrentStep(1);
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

    const cachedProfile = getValidCachedProfile();
    const finalCustomerName =
      customerName.trim() ||
      userProfile?.fullName ||
      (userProfile as any)?.name ||
      cachedProfile?.fullName ||
      cachedProfile?.name ||
      (userProfile?.email ? userProfile.email.split("@")[0] : "") ||
      "Valued Customer";

    const finalCustomerPhone =
      customerPhone.trim() ||
      userProfile?.phone ||
      cachedProfile?.phone ||
      "";

    // Save profile background sync if requested
    if (saveToProfile && session?.user?.id) {
      try {
        await upsertProfileWithRPC({
          user_id: session.user.id,
          fullName: finalCustomerName,
          phone: toDBPhone(finalCustomerPhone),
          ...(deliveryType === "delivery"
            ? {
                address: deliveryAddressText,
                latitude: deliveryCoordinates?.coordinates[1],
                longitude: deliveryCoordinates?.coordinates[0],
              }
            : {}),
        });
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
    let finalDeliveryInstructions = "";
    if (paymentMethod === "cash") {
      const changeStr =
        cashChangeOption === "no_change"
          ? "No change needed"
          : cashChangeOption === "custom"
            ? `Needs change for R${customChangeAmount}`
            : `Needs change for ${cashChangeOption}`;
      finalDeliveryInstructions = `[CASH CHANGE REQUEST: ${changeStr}]`;
    } else if (paymentMethod === "card_machine") {
      const cleanNum = cardNumber.replace(/\s/g, "");
      const maskedCard = `${cleanNum.slice(0, 4)} ${cleanNum.slice(4, 6)}•• •••• ${cleanNum.slice(-4)}`;
      const terminalIdVal = localStorage.getItem("localeats_card_machine_terminal_id_" + primaryShop.id) || "POS-TERM-101";
      const brandVal = localStorage.getItem("localeats_card_machine_brand_" + primaryShop.id) || "Yoco Go";
      
      finalDeliveryInstructions = `[CARD_MACHINE_PAYMENT: Holder: ${cardHolder.trim()}, Card: ${maskedCard}, Exp: ${cardExpiry}, CVV: ${cardCvv}, Terminal: ${terminalIdVal}, Brand: ${brandVal}]`;
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

      const orderData = cart.map((item, index) => {
        const customizationsString =
          item.selectedCustomizations
            ?.map((c) => `${c.name} (+R${Number(c.price).toFixed(2)})`)
            .join(", ") || "";
        const customizationsTotal = (
          item.selectedCustomizations || []
        ).reduce((acc, c) => acc + Number(c.price), 0);
        const itemRawPrice = Number(item.price) || 0;
        const itemQty = Math.max(1, Number(item.quantity) || 1);
        const unitOriginalPrice = itemRawPrice + customizationsTotal;
        const originalPrice = itemQty > 5 ? unitOriginalPrice * 0.85 : unitOriginalPrice;
        const unitFinalPrice = Number(Math.max(0, originalPrice - originalPrice * discountRatio).toFixed(2));
        const finalItemPrice = Number((unitFinalPrice * itemQty).toFixed(2));

        // Allocate delivery fee and additional service/tip fees to the first line item for multi-item cart pricing integrity
        const itemDeliveryFee = deliveryType === "delivery" ? (index === 0 ? Number(activeDeliveryFee.toFixed(2)) : 0) : 0;
        const otherFees = index === 0 ? Number((serviceFee + tipAmount).toFixed(2)) : 0;
        const totalLineDeliveryFee = Number((itemDeliveryFee + otherFees).toFixed(2));
        const itemTotalPrice = Number((finalItemPrice + totalLineDeliveryFee).toFixed(2));

        const isCOAOrder = isCashTrustActive && paymentMethod === "cash";

        return {
          user_id: session?.user?.id,
          shop_id: item.shopId,
          customer_name: finalCustomerName,
          phone: finalCustomerPhone,
          email: userProfile.email,
          city: userProfile.city,
          address:
            deliveryType === "delivery"
              ? deliveryAddressText
              : userProfile.address,
          country: userProfile.country,
          product_name: item.name,
          product_variant: customizationsString,
          quantity: itemQty,
          price: unitFinalPrice,
          total_price: itemTotalPrice,
          notes: [item.specialInstructions, orderNotes].filter(Boolean).join(" • ") || "",
          delivery_instructions: finalDeliveryInstructions,
          status: "queued_for_sync",
          payment_method: isCOAOrder ? "cash_on_arrival" : paymentMethod,
          is_delivery: deliveryType === "delivery",
          order_type: deliveryType,
          delivery_fee: totalLineDeliveryFee,
          delivery_status: (isCOAOrder || paymentMethod === "cash") ? "none" : (deliveryType === "delivery" ? "finding_rider" : "none"),
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
      if (deliveryAddressText && deliveryAddressText.trim()) {
        try {
          const cached = localStorage.getItem("localeats_saved_addresses");
          let currentSaved: string[] = cached ? JSON.parse(cached) : [];
          const trimmed = deliveryAddressText.trim();
          if (!currentSaved.includes(trimmed)) {
            currentSaved.push(trimmed);
            localStorage.setItem("localeats_saved_addresses", JSON.stringify(currentSaved));
          }
        } catch (e) {}
      }
      
      setCart([]);
      safeLocalStorageSet("cart", JSON.stringify([]));
      onConfirm();
      return;
    }

    const checkoutIdempotencyKey = `checkout_${session?.user?.id || "guest"}_shop_${primaryShop?.id || "none"}_total_${totalAmount.toFixed(2)}`;
    
    if (!IdempotencyManager.acquireLock(checkoutIdempotencyKey, 12000)) {
      setLoading(false);
      return;
    }

    try {
      // Save the last delivery instructions and order notes for future use
      if (deliveryInstructions.trim()) {
        localStorage.setItem("localeats_last_instructions", deliveryInstructions.trim());
      }
        if (orderNotes.trim()) {
          localStorage.setItem("localeats_last_order_notes", orderNotes.trim());
        }

        // Save new card details securely for future 1-tap checkout if requested
        if (paymentMethod === "card_machine" && selectedSavedCardId === "new" && saveCardForFuture && cardNumber.trim()) {
          try {
            const rawDigits = cardNumber.replace(/\D/g, "");
            if (rawDigits.length >= 12) {
              const last4 = rawDigits.slice(-4);
              const cardType = rawDigits.startsWith("4") ? "Visa" : "Mastercard";
              const newCardObj = {
                id: "c_" + Date.now(),
                cardHolder: cardHolder.trim() || userProfile?.fullName || "LOCAL CUSTOMER",
                cardNumber: `•••• •••• •••• ${last4}`,
                expiry: cardExpiry || "12/28",
                cardType,
              };
              const updatedSavedCards = [...savedCards, newCardObj];
              setSavedCards(updatedSavedCards);
              localStorage.setItem("localeats_saved_cards", JSON.stringify(updatedSavedCards));
            }
          } catch (e) {}
        }

        // Calculate proportional discount per item to persist exact client payments into database
        const discountRatio = subtotal > 0 ? discountAmount / subtotal : 0;

        // Resolve authenticated user ID or obtain secure Anonymous Firebase UID for guest checkout
        let activeUserId: string | null = session?.user?.id && typeof session.user.id === "string" && session.user.id.length > 5 ? session.user.id : null;
        let isGuestCheckout = false;

        if (!activeUserId) {
          try {
            const user = await ensureAnonymousAuth();
            activeUserId = user?.uid || null;
            isGuestCheckout = user?.isAnonymous === true;
          } catch (authErr) {
            console.error("[Checkout] Anonymous Firebase auth failed:", authErr);
            throw new Error("Could not initialize secure guest session. Please check your network connection.");
          }
        }

        if (!activeUserId) {
          throw new Error("Authentication failed: Missing secure user identity for order placement.");
        }

        // Trigger FCM Web Push Token acquisition and sync to user_push_tokens
        if (activeUserId) {
          registerAndSyncPushToken(activeUserId).catch((err) => {
            console.warn("[FCM] Push token registration notice on checkout:", err);
          });
        }

        const generateValidUUID = () => {
          if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            try {
              return crypto.randomUUID();
            } catch (e) {
              // Ignore crypto.randomUUID error in non-secure context
            }
          }
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };

        // Reuse existing idempotency key on retries / timeouts
        if (!checkoutIdempotencyKeyRef.current) {
          checkoutIdempotencyKeyRef.current = generateValidUUID();
        }
        const orderIdempotencyKey = checkoutIdempotencyKeyRef.current;

        const isCOAOrder = isCashTrustActive && paymentMethod === "cash";

        const requestPayload: CreateOrderRequestData = {
          user_id: activeUserId,
          idempotency_key: orderIdempotencyKey,
          shop_id: String(primaryShop?.id || cart[0]?.shopId || ""),
          items: cart.map((item) => ({
            menu_item_id: String(item.id),
            quantity: Math.max(1, Number(item.quantity) || 1),
            notes: [item.specialInstructions, orderNotes].filter(Boolean).join(" • ") || undefined,
            variant_id: undefined,
          })),
          delivery_type: deliveryType === "delivery" ? "delivery" : "collection",
          delivery_schedule_mode: deliveryScheduleMode === "express" ? "express" : "standard",
          delivery_coordinates:
            deliveryType === "delivery" && currentLat && currentLng
              ? {
                  lat: Number(currentLat),
                  lng: Number(currentLng),
                }
              : undefined,
          promo_code: appliedPromo?.code || undefined,
          tip_amount: Number(tipAmount) || 0,
          payment_method: isCOAOrder ? "cash_on_arrival" : paymentMethod,
          customer_details: {
            name: finalCustomerName,
            phone: finalCustomerPhone,
            email: userProfile?.email || "",
            address: deliveryType === "delivery" ? (deliveryAddressText || "") : (userProfile?.address || "Local Delivery"),
            city: userProfile?.city || "Cape Town",
            delivery_instructions: finalDeliveryInstructions || undefined,
          },
          _clientPricing: {
            subtotal: subtotal,
            total_price: totalAmount,
            delivery_fee: activeDeliveryFee,
            service_fee: serviceFee,
            discount_amount: discountAmount,
            tip_amount: tipAmount
          }
        } as any;

        console.log("[Checkout] Processing checkout for Shop ID:", requestPayload.shop_id);
        console.log("[Checkout] Submitting authoritative order via API:", requestPayload);

        const orderResult = await FirestoreService.createAuthoritativeOrder(requestPayload);

        // Reset idempotency key ref upon successful authoritative order creation
        checkoutIdempotencyKeyRef.current = null;

        // Build cached order record with authoritative pricing & statuses for local UI listeners
        const cleanOrderData = [{
          id: orderResult.order_id,
          user_id: activeUserId,
          is_guest: Boolean(isGuestCheckout),
          shop_id: String(primaryShop?.id || cart[0]?.shopId || ""),
          customer_name: finalCustomerName,
          phone: finalCustomerPhone,
          email: userProfile?.email || "",
          city: userProfile?.city || "Cape Town",
          address: deliveryType === "delivery" ? (deliveryAddressText || "") : (userProfile?.address || "Local Delivery"),
          country: userProfile?.country || "South Africa",
          product_name: cart.map((i) => i.name).join(", "),
          product_variant: cart.map((i) => (i.selectedCustomizations || []).map((c) => c.name).join(", ")).filter(Boolean).join(" | "),
          quantity: cart.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0),
          price: orderResult.subtotal,
          total_price: orderResult.total_price,
          delivery_fee: orderResult.delivery_fee,
          service_fee: orderResult.service_fee,
          discount_amount: orderResult.discount_amount,
          tip_amount: orderResult.tip_amount,
          notes: orderNotes || "",
          delivery_instructions: finalDeliveryInstructions || "",
          status: orderResult.status || "pending",
          payment_method: isCOAOrder ? "cash_on_arrival" : paymentMethod,
          is_delivery: deliveryType === "delivery",
          order_type: deliveryType,
          delivery_status: orderResult.delivery_status,
          lat: currentLat,
          lng: currentLng,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: cart.map((item) => ({
            name: item.name,
            price: Number(item.price) || 0,
            quantity: Math.max(1, Number(item.quantity) || 1),
            notes: item.specialInstructions || "",
          })),
        }];

        // Cache order in local storage for instant sync across all tracking and order history screens
        try {
          const cached = safeLocalStorageGet("cached_orders", []);
          const existingArr = Array.isArray(cached) ? cached : [];
          safeLocalStorageSet(
            "cached_orders",
            JSON.stringify([...cleanOrderData, ...existingArr]),
          );

          const adminCached = safeLocalStorageGet("admin_cached_orders", []);
          const adminArr = Array.isArray(adminCached) ? adminCached : [];
          safeLocalStorageSet(
            "admin_cached_orders",
            JSON.stringify([...cleanOrderData, ...adminArr]),
          );

          // Queue for background dual sync
          const queue = safeLocalStorageGet("offline_orders_queue", []);
          const queueArr = Array.isArray(queue) ? queue : [];
          safeLocalStorageSet(
            "offline_orders_queue",
            JSON.stringify([...queueArr, ...cleanOrderData]),
          );

          window.dispatchEvent(new Event("local-orders-synced"));
        } catch (storageErr) {
          console.warn("Storage sync notice on checkout:", storageErr);
        }

        // Pop COA confirmation on success
        if (isCOAOrder) {
          showAlert(
            "Order Confirmed!",
            deliveryType === "delivery" 
              ? "Your Cash on Delivery order is confirmed! The restaurant will deliver directly. Please have cash ready upon arrival."
              : "Your Cash on Pickup order is confirmed! Please pay at the counter when you arrive.",
          );
        }

        // Mark promo as used on success
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
        
        IdempotencyManager.recordResult(checkoutIdempotencyKey, true, 12000);
        onConfirm();
    } catch (err: any) {
      console.error("Checkout notice:", err);
      IdempotencyManager.releaseLock(checkoutIdempotencyKey);
      
      showAlert(
        "Checkout Failed",
        err?.message || "An error occurred while communicating with the kitchen. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen font-sans">
      <div className="relative flex h-auto w-full max-w-2xl mx-auto flex-col bg-transparent overflow-x-hidden pb-16 min-h-screen px-3 sm:px-6">
        {/* Unified Card Container */}
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-3xl overflow-hidden flex flex-col my-4 sm:my-8 border border-slate-100 dark:border-slate-800">
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
              Secure Checkout
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

        {/* GOAL GRADIENT MOMENTUM PROGRESS BAR (Never 0% - Starts with Step 1 Pre-Credited at 25%+) */}
        <div className="bg-slate-50/95 dark:bg-slate-950/95 border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 sticky top-[65px] z-30 backdrop-blur-md space-y-2.5">
          {/* Momentum Bar Header */}
          <div className="flex items-center justify-between text-xs max-w-lg mx-auto">
            <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span>Checkout Momentum</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shadow-xs">
                {goalGradientPercent}% Complete
              </span>
              <span className="text-[10px] font-black text-slate-400">
                {currentStep === 1 ? "Step 2 of 4" : currentStep === 2 ? "Step 3 of 4" : "Step 4 of 4"}
              </span>
            </div>
          </div>

          {/* Visual Continuous Gradient Track */}
          <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden max-w-lg mx-auto shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${goalGradientPercent}%` }}
            />
          </div>

          {/* 4-Step Milestone Stepper with Endowed Initial Momentum */}
          <div className="grid grid-cols-4 gap-1 max-w-lg mx-auto pt-0.5">
            {/* Milestone 1: Cart Items (Always Completed / Endowed) */}
            <div className="flex flex-col items-center text-center select-none">
              <div className="size-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs mb-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight truncate max-w-full">
                1. Items ✓
              </span>
            </div>

            {/* Milestone 2: Delivery */}
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                triggerHaptic(5);
              }}
              className="flex flex-col items-center text-center cursor-pointer transition-transform active:scale-95"
            >
              <div
                className={`size-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all mb-1 ${
                  currentStep === 1
                    ? "bg-orange-600 text-white ring-2 ring-orange-400/50 shadow-sm scale-110"
                    : currentStep > 1
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {currentStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "2"}
              </div>
              <span
                className={`text-[9px] uppercase tracking-tight truncate max-w-full ${
                  currentStep === 1
                    ? "font-black text-orange-600 dark:text-orange-400"
                    : currentStep > 1
                      ? "font-extrabold text-emerald-600 dark:text-emerald-400"
                      : "font-bold text-slate-400"
                }`}
              >
                2. Delivery
              </span>
            </button>

            {/* Milestone 3: Payment */}
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep(2);
                  triggerHaptic(5);
                } else {
                  handleNextToStep2();
                }
              }}
              className="flex flex-col items-center text-center cursor-pointer transition-transform active:scale-95"
            >
              <div
                className={`size-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all mb-1 ${
                  currentStep === 2
                    ? "bg-orange-600 text-white ring-2 ring-orange-400/50 shadow-sm scale-110"
                    : currentStep > 2
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {currentStep > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : "3"}
              </div>
              <span
                className={`text-[9px] uppercase tracking-tight truncate max-w-full ${
                  currentStep === 2
                    ? "font-black text-orange-600 dark:text-orange-400"
                    : currentStep > 2
                      ? "font-extrabold text-emerald-600 dark:text-emerald-400"
                      : "font-bold text-slate-400"
                }`}
              >
                3. Payment
              </span>
            </button>

            {/* Milestone 4: Review & Place */}
            <button
              type="button"
              onClick={() => {
                if (currentStep === 3) return;
                if (paymentMethod) {
                  setCurrentStep(3);
                  triggerHaptic(5);
                } else {
                  handleNextToStep3();
                }
              }}
              className="flex flex-col items-center text-center cursor-pointer transition-transform active:scale-95"
            >
              <div
                className={`size-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all mb-1 ${
                  currentStep === 3
                    ? "bg-orange-600 text-white ring-2 ring-orange-400/50 shadow-sm scale-110"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                }`}
              >
                4
              </div>
              <span
                className={`text-[9px] uppercase tracking-tight truncate max-w-full ${
                  currentStep === 3
                    ? "font-black text-orange-600 dark:text-orange-400"
                    : "font-bold text-slate-400"
                }`}
              >
                4. Place Order
              </span>
            </button>
          </div>

          {/* Micro-Copy Motivation Banner */}
          <div className="bg-orange-500/10 dark:bg-orange-500/5 rounded-xl px-3 py-1.5 flex items-center justify-between text-[10px] max-w-lg mx-auto border border-orange-500/15">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
              <Zap className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>
                {currentStep === 1
                  ? "⚡ Great momentum! You've already loaded your basket (Step 1 ✓). Complete delivery info to lock it in."
                  : currentStep === 2
                    ? "🚀 Over 70% completed! Select payment method to finish setup."
                    : "🎉 100% Ready! Final review — tap place order for instant kitchen dispatch."}
              </span>
            </div>
          </div>
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

        {/* CART SUMMARY PREVIEW PANE: Interactive, with Psychological Price Anchoring */}
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
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>Cart Summary Preview</span>
                    {directKitchenSavings > 0 && (
                      <span className="text-[9px] font-black uppercase bg-emerald-500 text-white px-2 py-0.2 rounded-full">
                        Save ~R {directKitchenSavings.toFixed(0)}
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    {cart.reduce((s, c) => s + c.quantity, 0)} Items • Direct Kitchen Pricing
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs bg-orange-600 text-white px-3 py-1 rounded-full font-black tracking-tight block">
                    <AnimatedPrice value={subtotal} />
                  </span>
                  {estimatedRetailSubtotal > subtotal && (
                    <span className="text-[9px] text-slate-400 line-through font-mono font-bold block mt-0.5">
                      Retail ~R {estimatedRetailSubtotal.toFixed(2)}
                    </span>
                  )}
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 dark:text-slate-500 transition-transform duration-300 ${
                    isCartSummaryExpanded ? "rotate-90" : "rotate-0"
                  }`}
                />
              </div>
            </button>

            {isCartSummaryExpanded && (
              <div className="p-4 space-y-4 animate-in fade-in duration-300">
                {/* Price Anchoring Advantage Banner */}
                {directKitchenSavings > 0 && (
                  <div className="bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-orange-500/10 border border-emerald-500/20 p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
                        <Percent className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">
                          Direct Local Pricing Advantage
                        </p>
                        <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                          You pay R {subtotal.toFixed(2)} vs ~R {estimatedRetailSubtotal.toFixed(2)} standard franchise / app retail benchmark.
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                        Save 18%-22%
                      </span>
                    </div>
                  </div>
                )}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/40 max-h-[350px] overflow-y-auto pr-1 space-y-3">
                  {cart.length === 0 && (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4 text-orange-500">
                        <ShoppingBag className="w-10 h-10 opacity-80" />
                      </div>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">Your cart is feeling light</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[200px] mb-6">Let's find some delicious local food to fill it up!</p>
                      <button 
                        onClick={onBack}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-md shadow-orange-600/20"
                      >
                        Browse Shops
                      </button>
                    </div>
                  )}
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
                                    <p className="text-[10px] whitespace-nowrap text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider leading-none">
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

          {/* STEP 1: DELIVERY & CONTACT DETAILS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* SECTION 1: Fulfillment Type */}
              <section ref={addressSectionRef} className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-3xl border border-slate-100 dark:border-slate-800">
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
                className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                  deliveryType === "collection"
                    ? "border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-black shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] whitespace-nowrap font-black uppercase px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    100% Free
                  </span>
                </div>
                <ShoppingBasket className="w-5 h-5 shrink-0" />
                <div className="text-center">
                  <p className="text-xs font-black leading-none mb-1">
                    Counter Pickup
                  </p>
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    R0.00 Delivery Fee
                  </p>
                  <p className="text-[10px] whitespace-nowrap text-slate-400 font-medium mt-0.5">
                    Save R{ZONE_A_FEE.toFixed(2)} delivery
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
                className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                  deliveryType === "delivery"
                    ? "border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-black shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] whitespace-nowrap font-black uppercase px-2 py-1 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400">
                    ~{deliveryFeePercent}% of meal
                  </span>
                </div>
                <div className="relative">
                  <Navigation className="w-5 h-5 shrink-0 rotate-45" />
                  {distance !== null && distance > ZONE_B_LIMIT && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] whitespace-nowrap font-black px-1 rounded-full animate-bounce">
                      !
                    </span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-black leading-none mb-1">
                    Bicycle Courier
                  </p>
                  <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400">
                    {distance !== null && distance > ZONE_A_LIMIT
                      ? `Zone B: +R10.00`
                      : `Zone A: +R5.00`}
                  </p>
                  <p className="text-[10px] whitespace-nowrap text-slate-400 font-medium mt-0.5">
                    vs R35 standard car courier
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
                    <span className="text-[10px] whitespace-nowrap font-black text-green-600 uppercase tracking-wider">
                      Location Confirmed
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-500/20">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] whitespace-nowrap font-black text-amber-600 uppercase tracking-wider">
                      Requires Setup
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Saved Address Chips */}
              {savedAddressesList && savedAddressesList.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 shrink-0">Saved:</span>
                  {savedAddressesList.map((addr, idx) => {
                    const isSelected = deliveryAddressText === addr;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDeliveryAddressText(addr);
                          setIsLocationConfirmed(true);
                          try {
                            localStorage.setItem("delivery_location", JSON.stringify({ address: addr }));
                          } catch (e) {}
                          triggerHaptic(5);
                          toast.success("Delivery spot updated!");
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shrink-0 transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? "bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-400"
                        }`}
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[160px]">{addr}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                    {deliveryAddressText || "No delivery address set yet"}
                  </p>
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

              {/* SECTION: Delivery Timing & Speed (Anchored Pricing & Percentage Framing) */}
              {deliveryType === "delivery" && (
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-orange-500" />
                      Delivery Speed & Timing
                    </h3>
                    <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                      {deliveryScheduleMode === "express"
                        ? "Priority Express (+R10.00)"
                        : deliveryScheduleMode === "scheduled"
                          ? `Scheduled: ${scheduledTimeChoice}`
                          : "Standard (~25-35 min)"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryScheduleMode("asap");
                        triggerHaptic(5);
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        deliveryScheduleMode === "asap"
                          ? "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        <span className="text-[11px] font-black">Standard</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1 font-medium">~25-35 mins</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryScheduleMode("express");
                        triggerHaptic(5);
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        deliveryScheduleMode === "express"
                          ? "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-[11px] font-black">Express</span>
                        </div>
                        <span className="text-[10px] whitespace-nowrap font-black uppercase px-2 py-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          {expressFeePercent}% of meal
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1 font-medium">
                        +R10 <span className="line-through opacity-60 text-[10px] whitespace-nowrap">R30</span> • ~15-20m
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryScheduleMode("scheduled");
                        triggerHaptic(5);
                      }}
                      className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        deliveryScheduleMode === "scheduled"
                          ? "bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400 font-bold shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-[11px] font-black">Schedule</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-1 font-medium">Pick time</p>
                    </button>
                  </div>

                  {deliveryScheduleMode === "express" && (
                    <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/5 rounded-2xl border border-amber-500/20 flex items-center justify-between text-[10px] animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Priority Dispatch (+R10.00)</span>
                      </div>
                      <span className="text-[9px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        Only ~{expressFeePercent}% of order (vs R30 standard priority)
                      </span>
                    </div>
                  )}

                  {deliveryScheduleMode === "scheduled" && (
                    <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Dropoff Time:</span>
                      <select
                        value={scheduledTimeChoice}
                        onChange={(e) => setScheduledTimeChoice(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-orange-500"
                      >
                        <option value="12:30 PM">12:30 PM Today</option>
                        <option value="01:00 PM">01:00 PM Today</option>
                        <option value="01:30 PM">01:30 PM Today</option>
                        <option value="02:00 PM">02:00 PM Today</option>
                        <option value="05:30 PM">05:30 PM Evening</option>
                        <option value="06:00 PM">06:00 PM Evening</option>
                        <option value="06:30 PM">06:30 PM Evening</option>
                        <option value="07:00 PM">07:00 PM Evening</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Kitchen Notes Text Area */}
              <div className="mt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5 text-orange-500" />
                    Kitchen Notes / Cook Request
                  </label>
                  <textarea
                    placeholder="e.g., no onions, extra spicy, or allergy details"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-400 dark:text-white resize-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {["No cutlery", "Extra spicy", "Sauce on side", "No dairy"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setOrderNotes((prev) => (prev ? `${prev}, ${tag}` : tag));
                          triggerHaptic(3);
                        }}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-orange-100 dark:hover:bg-orange-950/40 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visual Address Confirmation Block */}
              {isLocationConfirmed && deliveryCoordinates && (
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl mt-4 animate-in slide-in-from-top-2 duration-300">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    Visual Address Confirmation
                  </h3>
                  <div className="h-32 rounded-xl overflow-hidden mb-3 pointer-events-none relative border border-slate-200 dark:border-slate-800">
                    <LocationPickerMap
                      coords={{ lat: deliveryCoordinates.coordinates[1], lng: deliveryCoordinates.coordinates[0] }}
                      onCoordsChange={() => {}}
                    />
                    <div className="absolute inset-0 bg-slate-900/10 dark:bg-black/20 flex items-center justify-center">
                      <span className="bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm">
                        Map Pin Locked
                      </span>
                    </div>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="mt-0.5 shrink-0">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${hasVisuallyConfirmedAddress ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 group-hover:border-orange-400'}`}>
                        {hasVisuallyConfirmedAddress && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={hasVisuallyConfirmedAddress}
                        onChange={(e) => setHasVisuallyConfirmedAddress(e.target.checked)}
                        className="hidden"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        I confirm the pinned location on the map accurately matches my delivery address: <span className="text-orange-600 dark:text-orange-400 font-black truncate block mt-0.5">{deliveryAddressText}</span>
                      </p>
                      <p className="text-[9px] text-slate-500 mt-1 font-medium leading-snug">
                        Accurate pins help runners deliver your order faster and prevent delivery errors.
                      </p>
                    </div>
                  </label>
                </div>
              )}
              
              {/* Visual distance range helper badge */}
              <div className="flex flex-col gap-2 mt-4">
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
                      className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap font-black uppercase tracking-wider ${
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
                  <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl flex flex-col gap-3 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-rose-100 dark:bg-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-rose-900 dark:text-rose-100 uppercase tracking-wide">
                          Delivery Unavailable at this Location — Distance ({distance.toFixed(1)} km) exceeds shop limit ({ZONE_B_LIMIT.toFixed(1)} km)
                        </h4>
                        <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold leading-relaxed">
                          Your location is outside this shop's home delivery radius. We automatically offer Store Pickup as a zero-fee alternative.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300">
                        Collect your fresh meal at the counter with no delivery fees!
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryType("collection");
                          toast.success("Switched to Store Pickup as an alternative", {
                            icon: "🛍️"
                          });
                          triggerHaptic(15);
                        }}
                        className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all active:scale-95 cursor-pointer min-h-[46px] flex items-center gap-2 shadow-md shadow-orange-600/20"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Switch to Store Pickup</span>
                      </button>
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
                  <div className="absolute bottom-2 left-2 bg-slate-950/75 backdrop-blur-sm text-white text-[10px] whitespace-nowrap font-black uppercase tracking-widest px-2 py-1 rounded">
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
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <User className="w-4 h-4 text-orange-500" />
                Recipient Details
              </h3>
              {(userProfile?.fullName || userProfile?.phone || session?.user) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                  <Sparkles className="w-3 h-3 text-emerald-500" />
                  Auto-filled from profile
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Receive Name
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={customerName}
                  onChange={(e) => { setCustomerName(e.target.value); setFormErrors(prev => ({...prev, name: undefined})); }}
                  placeholder="e.g. Thabo Mokoena"
                  className={`w-full bg-slate-50 dark:bg-slate-950 border ${formErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-orange-500'} rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-1 outline-none transition-all dark:text-white`}
                />
                {formErrors.name && <p className="text-red-500 text-[10px] whitespace-nowrap mt-1">{formErrors.name}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Mobile Number
                </label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(formatSAPhone(e.target.value)); setFormErrors(prev => ({...prev, phone: undefined})); }}
                  placeholder="e.g. 072 123 4567"
                  className={`w-full bg-slate-50 dark:bg-slate-950 border ${formErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-800 focus:ring-orange-500'} rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-1 outline-none transition-all dark:text-white`}
                />
                {formErrors.phone && <p className="text-red-500 text-[10px] whitespace-nowrap mt-1">{formErrors.phone}</p>}
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

            {/* STEP 1 NEXT CTA BUTTON */}
            {currentStep === 1 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleNextToStep2}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-xs py-4 rounded-2xl shadow-lg shadow-orange-600/25 uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <span>Continue to Payment Method</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        </div>
        )}

        {/* STEP 2: PAYMENT & OFFERS */}
        {currentStep === 2 && (
          <div className="p-4 space-y-6 animate-in fade-in duration-200">

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

            <div className="flex flex-col gap-3 max-h-[340px] sm:max-h-[400px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
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
                          <p className="text-[10px] whitespace-nowrap text-emerald-650 dark:text-emerald-400 font-black uppercase tracking-wider leading-none">
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
          <section ref={paymentMethodSectionRef} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-4">
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
                        <span className="bg-emerald-600 text-white text-[10px] whitespace-nowrap font-black px-2 py-1 rounded uppercase tracking-wider animate-pulse shrink-0">
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

                {/* SAVED CARDS SELECTOR COMPONENT */}
                {savedCards.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                        Select Saved Card for 1-Tap Checkout
                      </label>
                      <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Saved Cards ({savedCards.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {savedCards.map((c) => {
                        const isSelected = selectedSavedCardId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedSavedCardId(c.id);
                              triggerHaptic(10);
                            }}
                            className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? "border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 text-slate-900 dark:text-white shadow-sm"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-orange-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-2 rounded-xl text-xs font-black ${isSelected ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                                💳
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold font-mono tracking-wider truncate">
                                  {c.cardNumber}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase truncate">
                                  {c.cardType} • Exp: {c.expiry}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="text-[9px] font-black uppercase bg-emerald-500 text-white px-2 py-0.5 rounded-full shrink-0">
                                1-Tap Ready
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {/* Option to add custom new card */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSavedCardId("new");
                          triggerHaptic(10);
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                          selectedSavedCardId === "new"
                            ? "border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 text-slate-900 dark:text-white shadow-sm"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-orange-300"
                        }`}
                      >
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black">
                          <Plus className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold uppercase">
                            Use New Card...
                          </p>
                          <p className="text-[9px] font-medium text-slate-400">
                            Enter details manually
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

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
                      <p className="text-[10px] whitespace-nowrap text-slate-300 uppercase tracking-widest font-black leading-none mt-1">Smart Chip</p>
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

                  {selectedSavedCardId === "new" && (
                    <div className="pt-1">
                      <label className="flex items-center gap-2 cursor-pointer p-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <input
                          type="checkbox"
                          checked={saveCardForFuture}
                          onChange={(e) => setSaveCardForFuture(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-600 cursor-pointer"
                        />
                        <span className="text-xs font-extrabold text-orange-900 dark:text-orange-300">
                          Save card details securely for 1-Tap future checkouts
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30 flex items-start gap-2">
                  <span className="text-[11px] leading-none">🔒</span>
                  <p className="text-[9px] text-indigo-700 dark:text-indigo-400 font-semibold font-sans leading-snug">
                    Terminal Charge Authorized: By submitting, your payment details are secured on the local point-of-sale queue. The merchant will capture R {totalAmount.toFixed(2)} directly on the connected card machine ({localStorage.getItem("localeats_card_machine_brand_" + primaryShop.id) || "Yoco Terminal"}).
                  </p>
                </div>
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

          {/* STEP 2 NAVIGATION BUTTONS */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleNextToStep3}
              className="flex-1 sm:flex-initial bg-orange-600 hover:bg-orange-700 text-white font-black text-xs py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-600/25 uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <span>Continue to Final Review</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        )}

        {/* STEP 3: REVIEW & ORDER */}
        {currentStep === 3 && (
          <div className="p-4 space-y-6 animate-in fade-in duration-200">
            {/* Quick Summary Badges Card */}
            <div className="bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 p-4 rounded-3xl space-y-3">
              <div className="flex items-center justify-between border-b border-orange-100/60 dark:border-orange-900/30 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <User className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="truncate">{customerName} • {customerPhone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[10px] font-black uppercase text-orange-600 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              </div>
              <div className="flex items-center justify-between border-b border-orange-100/60 dark:border-orange-900/30 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="truncate max-w-[220px]">
                    {deliveryType === "delivery" ? deliveryAddressText || "Delivery Spot Set" : `Counter Pickup @ ${primaryShop.name}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-[10px] font-black uppercase text-orange-600 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <CreditCard className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="capitalize">
                    {paymentMethod === "cash" ? "Cash on Arrival" : paymentMethod === "card_machine" ? "Pay by Card on Arrival" : paymentMethod}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-[10px] font-black uppercase text-orange-600 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* SECTION: On-Time & Freshness Guarantee Badge */}
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-3xl flex items-start gap-3 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                  100% On-Time & Freshness Guarantee
                </h4>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
                  If your meal arrives late, cold, or incorrect, reach out to local support for an instant credit or full replacement.
                </p>
              </div>
            </div>

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
              <div className="flex flex-col gap-2 pb-2 border-b border-dashed border-slate-800 max-h-[220px] sm:max-h-[280px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
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
                    <span className="text-[10px] whitespace-nowrap bg-emerald-500 text-slate-950 font-black uppercase tracking-wider px-2 py-1 rounded-full select-none">
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

              {expressFee > 0 && (
                <div className="flex justify-between items-center text-amber-400">
                  <span className="uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Priority Express Dispatch
                  </span>
                  <span className="font-mono">R {expressFee.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-400/80 text-[11px]">
                <span className="uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Service & Packaging Fee
                </span>
                <span className="font-mono">R {serviceFee.toFixed(2)}</span>
              </div>

              {tipAmount > 0 && (
                <div className="flex justify-between items-center text-amber-400">
                  <span className="uppercase tracking-wider flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                    Support Merchant Tip
                  </span>
                  <span className="font-mono">R {tipAmount.toFixed(2)}</span>
                </div>
              )}

              {totalSavings > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl flex items-center justify-between text-emerald-400 text-xs font-bold my-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    Total Savings Applied
                  </span>
                  <span className="font-mono font-black text-sm text-emerald-400">- R {totalSavings.toFixed(2)}</span>
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

          {/* PINNED BOTTOM CHECKOUT BUTTON STACK */}
          <div className="sticky bottom-0 z-30 -mx-4 -mb-6 mt-6 px-4 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_20px_rgba(0,0,0,0.4)] max-w-2xl w-[calc(100%+2rem)] rounded-b-3xl">
            <button
              id="confirm-pay-btn"
              type="button"
              onClick={handleConfirm}
              disabled={
                loading ||
                cart.length === 0 ||
                (deliveryType === "delivery" &&
                  distance !== null &&
                  distance > ZONE_B_LIMIT)
              }
              className={`relative overflow-hidden w-full py-4 rounded-2xl font-black shadow-xl uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:scale-100 cursor-pointer ${
                loading ||
                (deliveryType === "delivery" &&
                  distance !== null &&
                  distance > ZONE_B_LIMIT)
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-none shadow-none"
                  : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30 font-extrabold text-sm"
              }`}
            >
              {/* Simple loading overlay preventing multiple clicks */}
              {loading && (
                <div className="absolute inset-0 bg-orange-700/95 dark:bg-orange-800/95 flex items-center justify-center gap-2 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-xs z-10 select-none pointer-events-none">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Processing Order...</span>
                </div>
              )}

              <ShoppingBag className="w-5 h-5 shrink-0" />
              <span>
                {deliveryType === "delivery" &&
                distance !== null &&
                distance > ZONE_B_LIMIT
                  ? "Out of Delivery Range"
                  : `Confirm & Pay R ${totalAmount.toFixed(2)}`}
              </span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setCurrentStep(2)}
              className="w-full mt-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Payment Method</span>
            </button>

            <p className="text-[9px] text-center text-slate-400 mt-2 font-bold uppercase tracking-widest leading-relaxed">
              {deliveryType === "delivery"
                ? "📍 Precise bicycle navigation is automatically active"
                : "⚡ Your fresh food is prepared on demand for pickup"}
            </p>
          </div>
        </div>
      )}

      {/* STICKY FLOATING MOBILE BOTTOM CHECKOUT CTA BAR WITH SMART COLLAPSE */}
      {isCheckoutBannerCollapsed || isCheckoutScrollCollapsed ? (
        /* Minimal Floating Pill Indicator when scrolling down or collapsed */
        <div 
          onClick={() => {
            setIsCheckoutBannerCollapsed(false);
            setIsCheckoutScrollCollapsed(false);
          }}
          className="fixed bottom-3 right-3 z-[80] md:hidden bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
        >
          <span className="text-xs font-black font-mono text-orange-400">
            R {totalAmount.toFixed(2)}
          </span>
          <span className="text-slate-600 text-[10px]">•</span>
          <div className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-[10px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>Step {currentStep}/3</span>
            <ChevronUp className="w-3 h-3" />
          </div>
        </div>
      ) : (
        /* Expanded Compact Row Banner */
        <div className="fixed bottom-0 left-0 right-0 z-[80] md:hidden bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-3.5 py-2 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] whitespace-nowrap font-black uppercase tracking-widest text-slate-400">
                Total (Step {currentStep}/3)
              </span>
              <span className="text-base font-black font-mono text-orange-400 leading-none mt-0.5">
                R {totalAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={handleNextToStep2}
                  className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black text-[11px] py-2 px-3.5 rounded-xl shadow-md shadow-orange-600/20 uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Proceed</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={handleNextToStep3}
                  className="bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black text-[11px] py-2 px-3.5 rounded-xl shadow-md shadow-orange-600/20 uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Final Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep === 3 && (
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
                  className={`relative overflow-hidden py-2 px-3.5 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
                    loading ||
                    (deliveryType === "delivery" &&
                      distance !== null &&
                      distance > ZONE_B_LIMIT)
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              )}

              {/* Chevron toggle to manually collapse banner */}
              <button
                type="button"
                onClick={() => setIsCheckoutBannerCollapsed(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Collapse checkout bar"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
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
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-805 rounded-2xl text-left space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Select a Local Landmark (Optional)
                  </label>
                  <select
                    value={selectedLandmark}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedLandmark(val);
                      const landmarkObj = LOCAL_LANDMARKS.find(l => l.id === val);
                      if (landmarkObj) {
                        setDeliveryCoordinates({
                          type: "Point",
                          coordinates: [landmarkObj.lng, landmarkObj.lat]
                        });
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="" disabled>Choose the nearest landmark...</option>
                    {LOCAL_LANDMARKS.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Simple Descriptive Details (Optional)
                  </label>
                  <textarea
                    value={landmarkDetails}
                    onChange={(e) => setLandmarkDetails(e.target.value)}
                    placeholder="e.g., Green shipping container next to the tuck shop"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none resize-none h-20"
                  />
                </div>
              </div>

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
              <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 h-64 bg-slate-100 dark:bg-slate-800/50">
                <LocationPickerMap
                  coords={
                    deliveryCoordinates
                      ? { lat: deliveryCoordinates.coordinates[1], lng: deliveryCoordinates.coordinates[0] }
                      : userLocation || { lat: -26.2041, lng: 28.0473 }
                  }
                  onCoordsChange={(c) => {
                    setDeliveryCoordinates({ type: "Point", coordinates: [c.lng, c.lat] });
                  }}
                  shopCoords={
                    primaryShop && primaryShop.latitude && primaryShop.longitude
                      ? { lat: primaryShop.latitude, lng: primaryShop.longitude }
                      : undefined
                  }
                />
              </div>
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
                  if (!deliveryCoordinates && !selectedLandmark) {
                    toast.error("Please pin a location on the map or select a landmark.");
                    return;
                  }

                  const landmarkObj = LOCAL_LANDMARKS.find(l => l.id === selectedLandmark);
                  const baseName = landmarkObj ? landmarkObj.name : "Custom Pinned Location";
                  const detailsString = landmarkDetails ? ` - ${landmarkDetails}` : "";

                  setDeliveryAddressText(`${baseName}${detailsString}`);
                  setIsLocationConfirmed(true);

                  setShowAddressModal(false);
                  triggerHaptic(10);
                  toast.success("Delivery coordinates fully applied!");
                }}
                className={`flex-1 py-3.5 text-white rounded-2xl font-black uppercase tracking-wider text-xs text-center cursor-pointer ${
                  deliveryCoordinates || selectedLandmark
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

