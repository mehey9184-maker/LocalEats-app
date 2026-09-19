import React, { useState, useEffect, useMemo, useRef, Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MapPin, Clock, CreditCard, ChevronRight, ChevronDown, ChevronUp, X, User, Navigation, ShoppingBag, Plus, Minus, ArrowRight, Info, ShieldCheck, Banknote, ShoppingBasket, Lock, Sparkles, Bike, Loader2, Target, QrCode, Trash2, ArrowLeft, Utensils, Percent, WifiOff, Check, Zap
} from "lucide-react";
import { upsertProfileWithRPC } from "../lib/profileService";
import { Shop, CartItem, Screen, UserProfile } from "../types";
import { IdempotencyManager } from "../utils/idempotency";
import { calculateDistance, formatSAPhone, validateSAPhone, toDBPhone, safeLocalStorageSet, safeLocalStorageGet, getShopStatus, DEFAULT_MENU_IMAGE } from "../utils";
import { Session } from "@supabase/supabase-js";
import { LocalEatsLogo } from "../components/LocalEatsLogo";
import { useTranslation } from "../contexts/LanguageContext";
import { AnimatedPrice } from "../components/AnimatedPrice";
import { toast } from "sonner";
import { registerAndSyncPushToken, FirestoreService, ensureAnonymousAuth, CreateOrderResponse } from "../lib/firebase";
import type { AuthoritativeOrderQuote, QuoteOrderRequestData } from "../lib/firebase";
import {
  OrderApiError,
  createOrderRequestFromQuote,
  fingerprintOrderIntent,
  freezeOrderIntent,
  retainQuoteConsentForIntent,
} from "../lib/orderQuoteConsent";
import {
  containsPotentialCardCredential,
  hasUnsupportedPaidCustomizations,
  normalizeCheckoutPaymentMethod,
  stripLegacyCardMachinePaymentSegment,
} from "../lib/legacyCheckoutDataScrubber";
import { LocationPickerMap } from "../components/MapComponents";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { BlurUpImage } from "../components/BlurUpImage";
import { audioHelper } from "../lib/audioHelper";
import { detectTownship } from "../lib/townshipHelper";

const LOCAL_LANDMARKS = [
  { id: "LM01", name: "Community Hall", lat: -26.2, lng: 28.0 },
  { id: "LM02", name: "Main Taxi Rank", lat: -26.21, lng: 28.01 },
  { id: "LM03", name: "High School Gate", lat: -26.22, lng: 28.02 },
  { id: "LM04", name: "Primary Clinic", lat: -26.23, lng: 28.03 },
  { id: "LM05", name: "Shopping Complex", lat: -26.24, lng: 28.04 },
  { id: "LM06", name: "Sports Ground", lat: -26.25, lng: 28.05 },
];

const generateCheckoutIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through for non-secure browser contexts.
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.random() * 16 | 0;
    const value = character === "x" ? random : (random & 0x3 | 0x8);
    return value.toString(16);
  });
};

interface QuotedCheckoutIntent {
  request: QuoteOrderRequestData;
  quote: AuthoritativeOrderQuote;
  fingerprint: string;
}

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
  const [checkoutAction, setCheckoutAction] = useState<"quote" | "create" | null>(null);
  const [quotedCheckout, setQuotedCheckout] = useState<QuotedCheckoutIntent | null>(null);
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
  }, [userProfile]);

  // Cash change options
  const [cashChangeOption, setCashChangeOption] = useState<
    "no_change" | "R50" | "R100" | "R200" | "custom"
  >("no_change");
  const [customChangeAmount, setCustomChangeAmount] = useState("");

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

      // Local map estimate only. The authoritative API decides serviceability and price.
      if (dist > ZONE_B_LIMIT) {
        toast.info(`Local distance estimate: ${dist.toFixed(1)} km. The secure order service will confirm whether delivery is available.`, {
          duration: 5000,
          position: "top-center",
        });
        setDeliveryFee(ZONE_B_FEE);
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

  // Display-only estimate shown before the authoritative server quote is requested.
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const baseDeliveryFee = deliveryType === "delivery" ? deliveryFee : 0;
  const serviceFee = subtotal > 0 ? 2.50 : 0;
  const totalAmount = Math.max(
    0,
    subtotal + baseDeliveryFee + serviceFee,
  );
  const deliveryFeePercent = subtotal > 0 ? Math.max(1, Math.round((deliveryFee / subtotal) * 100)) : 3;
  const serviceFeePercent = subtotal > 0 ? ((serviceFee / subtotal) * 100).toFixed(1) : "1.5";

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
    } else if (currentStep === 3) {
      base = 100;
    }
    return Math.min(100, Math.max(25, base));
  }, [currentStep, customerName, customerPhone, deliveryType, deliveryAddressText, isLocationConfirmed, paymentMethod]);

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

  const buildCurrentOrderIntent = (idempotencyKey: string): QuoteOrderRequestData => {
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
      customerPhone.trim() || userProfile?.phone || cachedProfile?.phone || "";
    const normalizedPaymentMethod = normalizeCheckoutPaymentMethod(
      deliveryType,
      paymentMethod,
    );
    const sanitizedOrderNotes = stripLegacyCardMachinePaymentSegment(orderNotes.trim());
    let finalDeliveryInstructions = stripLegacyCardMachinePaymentSegment(
      deliveryInstructions.trim(),
    );
    if (normalizedPaymentMethod === "cash" || normalizedPaymentMethod === "cash_on_arrival") {
      const changeRequest =
        cashChangeOption === "no_change"
          ? "No change needed"
          : cashChangeOption === "custom"
            ? `Needs change for R${customChangeAmount}`
            : `Needs change for ${cashChangeOption}`;
      finalDeliveryInstructions = `${finalDeliveryInstructions ? `${finalDeliveryInstructions} • ` : ""}[CASH CHANGE REQUEST: ${changeRequest}]`;
    }

    const lat = deliveryCoordinates?.coordinates[1];
    const lng = deliveryCoordinates?.coordinates[0];
    const hasFiniteDeliveryCoordinates =
      deliveryType === "delivery" &&
      typeof lat === "number" && Number.isFinite(lat) &&
      typeof lng === "number" && Number.isFinite(lng);

    return {
      idempotency_key: idempotencyKey,
      shop_id: String(primaryShop?.id ?? cart[0]?.shopId ?? ""),
      items: cart.map((item) => ({
        menu_item_id: String(item.id),
        quantity: Math.max(1, Number(item.quantity) || 1),
        notes: [
          stripLegacyCardMachinePaymentSegment(item.specialInstructions || ""),
          sanitizedOrderNotes,
        ].filter(Boolean).join(" • ") || undefined,
        variant_id: undefined,
      })),
      delivery_type: deliveryType,
      delivery_schedule_mode: "standard",
      delivery_coordinates: hasFiniteDeliveryCoordinates
        ? { lat, lng }
        : undefined,
      tip_amount: 0,
      payment_method: normalizedPaymentMethod,
      customer_details: {
        name: finalCustomerName,
        phone: finalCustomerPhone,
        email: userProfile?.email || "",
        address: deliveryType === "delivery"
          ? deliveryAddressText || ""
          : userProfile?.address || "Local Delivery",
        city: userProfile?.city || "Cape Town",
        delivery_instructions: finalDeliveryInstructions || undefined,
      },
    };
  };

  const currentIntentFingerprint = quotedCheckout
    ? fingerprintOrderIntent(buildCurrentOrderIntent(quotedCheckout.request.idempotency_key))
    : null;
  const currentQuotedCheckout = retainQuoteConsentForIntent(
    quotedCheckout,
    currentIntentFingerprint,
  );
  const isQuotedIntentCurrent = currentQuotedCheckout !== null;
  const currentAuthoritativeQuote = currentQuotedCheckout?.quote ?? null;

  useEffect(() => {
    if (quotedCheckout && !currentQuotedCheckout) {
      setQuotedCheckout(null);
    }
  }, [quotedCheckout, currentQuotedCheckout]);

  useEffect(() => {
    if (deliveryType === "delivery") {
      setPaymentMethod("cash");
    }
  }, [deliveryType]);

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

    if (hasUnsupportedPaidCustomizations(cart)) {
      showAlert(
        "Paid Add-ons Temporarily Unavailable",
        "Secure checkout cannot verify paid add-on prices yet. Please remove paid add-ons before placing this order. Free preparation choices can remain.",
      );
      return;
    }

    const checkoutFreeText = [
      deliveryInstructions,
      orderNotes,
      ...cart.map((item) => item.specialInstructions || ""),
    ];
    if (checkoutFreeText.some(containsPotentialCardCredential)) {
      showAlert(
        "Remove Card Details",
        "For your security, do not enter card numbers, CVV/CVC, card expiry dates, or a card PIN in checkout notes. LocalEats never needs those details.",
      );
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
      
    }

    const status = getShopStatus(primaryShop);
    const isClosed = !status.isOpen;

    if (isClosed) {
      showConfirm(
        "Shop Closed",
        `${primaryShop.name} is currently closed. Your order will be attended to when they open at ${status.nextOpeningTime || "their next opening hour"}. Do you want to proceed?`,
        () => {
          processCheckout(currentAuthoritativeQuote ? "create" : "quote");
        },
      );
      return;
    }
    processCheckout(currentAuthoritativeQuote ? "create" : "quote");
  };

  const processCheckout = async (action: "quote" | "create") => {
    setLoading(true);
    setCheckoutAction(action);
    triggerHaptic?.([200, 100, 200]);

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

    let currentLat =
      deliveryType === "delivery" ? deliveryCoordinates?.coordinates[1] : null;
    let currentLng =
      deliveryType === "delivery" ? deliveryCoordinates?.coordinates[0] : null;

    // Validation Gate: Ensure precise geolocation captured/confirmed
    if (
      isOnline &&
      deliveryType === "delivery" &&
      (typeof currentLat !== "number" ||
        !Number.isFinite(currentLat) ||
        typeof currentLng !== "number" ||
        !Number.isFinite(currentLng) ||
        !isLocationConfirmed)
    ) {
      setLoading(false);
      setNotification({
        message:
          "Visual Pin Confirmation Required. Please confirm your exact spot on the map.",
        type: "error",
      });
      return;
    }

    const normalizedPaymentMethod = normalizeCheckoutPaymentMethod(
      deliveryType,
      paymentMethod,
    );
    const sanitizedOrderNotes = stripLegacyCardMachinePaymentSegment(
      orderNotes.trim(),
    );

    // Preserve ordinary instructions while removing any legacy card-payment segment.
    let finalDeliveryInstructions = stripLegacyCardMachinePaymentSegment(
      deliveryInstructions.trim(),
    );
    if (
      normalizedPaymentMethod === "cash" ||
      normalizedPaymentMethod === "cash_on_arrival"
    ) {
      const changeStr =
        cashChangeOption === "no_change"
          ? "No change needed"
          : cashChangeOption === "custom"
            ? `Needs change for R${customChangeAmount}`
            : `Needs change for ${cashChangeOption}`;
      finalDeliveryInstructions = `${finalDeliveryInstructions ? `${finalDeliveryInstructions} • ` : ""}[CASH CHANGE REQUEST: ${changeStr}]`;
    }

    if (!isOnline) {
      setLoading(false);
      setNotification({
        message: "You need an internet connection to place this order. Your cart is still saved.",
        type: "error",
      });
      return;
    }

    const checkoutIdempotencyKey = `checkout_${session?.user?.id || "guest"}_shop_${primaryShop?.id || "none"}_total_${totalAmount.toFixed(2)}`;
    
    if (!IdempotencyManager.acquireLock(checkoutIdempotencyKey, 12000)) {
      setLoading(false);
      return;
    }

    try {
      if (!checkoutIdempotencyKeyRef.current) {
        checkoutIdempotencyKeyRef.current = generateCheckoutIdempotencyKey();
      }
      const orderIdempotencyKey = checkoutIdempotencyKeyRef.current;
      const currentRequest = buildCurrentOrderIntent(orderIdempotencyKey);

      if (action === "quote") {
        // A fresh quote request permanently discards any prior consent, even if this request fails.
        setQuotedCheckout(null);
        const quote = await FirestoreService.quoteAuthoritativeOrder(currentRequest);
        const frozenRequest = freezeOrderIntent(currentRequest);
        setQuotedCheckout({
          request: frozenRequest,
          quote,
          fingerprint: fingerprintOrderIntent(frozenRequest),
        });
        IdempotencyManager.releaseLock(checkoutIdempotencyKey);
        setNotification({
          message: `Final total confirmed: R${quote.total_price.toFixed(2)}. Review it, then place your order.`,
          type: "success",
        });
        return;
      }

      const reviewedCheckout = quotedCheckout;
      if (!reviewedCheckout ||
        fingerprintOrderIntent(currentRequest) !== reviewedCheckout.fingerprint) {
        setQuotedCheckout(null);
        IdempotencyManager.releaseLock(checkoutIdempotencyKey);
        showAlert(
          "Review Updated Total",
          "Your order details changed. Please review a fresh final total before placing the order.",
        );
        return;
      }

      // Profile and notification side effects remain part of actual placement, never quoting.
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

      // Save the last delivery instructions and order notes for future use
      if (deliveryInstructions.trim()) {
        localStorage.setItem(
          "localeats_last_instructions",
          stripLegacyCardMachinePaymentSegment(deliveryInstructions.trim()),
        );
      }
        if (sanitizedOrderNotes) {
          localStorage.setItem("localeats_last_order_notes", sanitizedOrderNotes);
        }

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

        const requestPayload = createOrderRequestFromQuote(
          reviewedCheckout.request,
          reviewedCheckout.quote,
        );

        console.log("[Checkout] Processing checkout for Shop ID:", requestPayload.shop_id);

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
          notes: sanitizedOrderNotes,
          delivery_instructions: finalDeliveryInstructions || "",
          status: orderResult.status || "pending",
          payment_method: normalizedPaymentMethod,
          is_delivery: deliveryType === "delivery",
          order_type: deliveryType,
          delivery_status: orderResult.delivery_status,
          delivery_confirmation: orderResult.delivery_confirmation,
          lat: currentLat,
          lng: currentLng,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: cart.map((item) => ({
            name: item.name,
            price: Number(item.price) || 0,
            quantity: Math.max(1, Number(item.quantity) || 1),
            notes: stripLegacyCardMachinePaymentSegment(
              item.specialInstructions || "",
            ),
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

          window.dispatchEvent(new Event("local-orders-synced"));
        } catch (storageErr) {
          console.warn("Storage sync notice on checkout:", storageErr);
        }

        if (normalizedPaymentMethod === "cash_on_arrival") {
          showAlert(
            "Order Confirmed!",
            "Your delivery order is confirmed. An approved rider can be assigned after the shop prepares it. Please have cash ready on arrival.",
          );
        } else if (normalizedPaymentMethod === "card_machine") {
          showAlert(
            "Order Confirmed!",
            "Your collection order is confirmed. Pay on the shop's physical card machine when you collect.",
          );
        } else {
          showAlert(
            "Order Confirmed!",
            "Your collection order is confirmed. Pay cash at the shop when you collect.",
          );
        }

        // Psychsound - play ascending major triad for immediate relief and confidence booster
        audioHelper.play("placed");
        
        IdempotencyManager.recordResult(checkoutIdempotencyKey, true, 12000);
        onConfirm();
    } catch (err: any) {
      console.error("Checkout notice:", err);
      IdempotencyManager.releaseLock(checkoutIdempotencyKey);

      if (err instanceof OrderApiError &&
        (err.code === "PRICE_CHANGED" || err.code === "PRICE_CONSENT_REQUIRED")) {
        setQuotedCheckout(null);
        showAlert(
          "Review Updated Total",
          err.code === "PRICE_CHANGED"
            ? "The authoritative total changed. No order was placed. Please review the new total and confirm again."
            : "Price consent could not be confirmed. No order was placed. Please review the final total again.",
        );
        return;
      }

      showAlert(
        action === "quote" ? "Final Total Unavailable" : "Checkout Failed",
        err?.message || "An error occurred while communicating with the kitchen. Please try again."
      );
    } finally {
      setLoading(false);
      setCheckoutAction(null);
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
                    <span>Cart Summary</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    {cart.reduce((s, c) => s + c.quantity, 0)} Items • Estimated subtotal
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs bg-orange-600 text-white px-3 py-1 rounded-full font-black tracking-tight block">
                    <AnimatedPrice value={subtotal} />
                  </span>
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
                    const itemTotal = item.price * item.quantity;

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
                                <p className="text-primary font-black text-xs leading-none">
                                  R {itemTotal.toFixed(2)}
                                </p>
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
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : distance > ZONE_A_LIMIT
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-green-100 text-green-700 border-green-200"
                  }`}
                >
                  {distance.toFixed(1)}km away{" "}
                  {distance > ZONE_B_LIMIT && "• Estimate only"}
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
                </div>
                <div className="text-center">
                  <p className="text-xs font-black leading-none mb-1">
                    Bicycle Courier
                  </p>
                  <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400">
                    {distance !== null && distance > ZONE_A_LIMIT
                      ? `Est. Zone B: +R10.00`
                      : `Est. Zone A: +R5.00`}
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
                          ? "bg-blue-100 text-blue-700"
                          : distance > ZONE_A_LIMIT
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {distance > ZONE_B_LIMIT
                        ? "Estimate only"
                        : distance > ZONE_A_LIMIT
                          ? "Est. Zone B"
                          : "Est. Zone A"}
                    </span>
                  )}
                </div>

                {distance !== null && distance > ZONE_B_LIMIT && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl flex flex-col gap-3 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                        <Info className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-blue-900 dark:text-blue-100 uppercase tracking-wide">
                          Local distance estimate: {distance.toFixed(1)} km
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold leading-relaxed">
                          This map estimate is beyond the displayed {ZONE_B_LIMIT.toFixed(1)} km radius. You may still place the order; the secure order service makes the final availability and pricing decision.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300">
                        Prefer certainty? Collection remains available as an alternative.
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
                        <>
                          <p className="text-[9px] text-slate-400 leading-tight italic truncate mb-1">
                            +{" "}
                            {item.selectedCustomizations
                              .map((c) => c.name)
                              .join(", ")}
                          </p>
                          {hasUnsupportedPaidCustomizations([item]) && (
                            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold leading-tight mb-1">
                              Remove paid add-ons before secure checkout.
                            </p>
                          )}
                        </>
                      ) : null}

                      <p className="text-primary font-black text-xs leading-none">
                        R {(item.price * item.quantity).toFixed(2)}
                      </p>
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

          {/* SECTION 6: Pilot payment method */}
          <section ref={paymentMethodSectionRef} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-orange-500" />
              Payment Method
            </h3>

            <div className="flex flex-col gap-2.5">
              <label
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === "cash" ? "border-orange-500 bg-orange-500/5 dark:bg-orange-500/10" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50"}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`size-9 rounded-full flex items-center justify-center shrink-0 ${paymentMethod === "cash" ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
                  >
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-slate-950 dark:text-white text-sm font-black uppercase tracking-tight">
                        {deliveryType === "collection"
                          ? "Cash at Shop"
                          : "Cash on Arrival"}
                      </p>
                    </div>
                    <p className="text-slate-400 text-[10px] font-bold tracking-tight">
                      {deliveryType === "collection"
                        ? "Pay cash directly at the shop when you collect your order."
                        : "Pay cash to the approved rider when your order arrives."}
                    </p>
                  </div>
                </div>
                <div
                  className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === "cash" ? "border-orange-500" : "border-slate-300"}`}
                >
                  {paymentMethod === "cash" && (
                    <div className="size-2.5 bg-orange-500 rounded-full animate-scale-in" />
                  )}
                </div>
                <input
                  type="radio"
                  name="payment"
                  value="cash"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
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
                        Card at Shop
                      </p>
                      <p className="text-slate-400 text-[10px] font-bold tracking-tight">
                        Pay on the merchant's physical card terminal when you collect.
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
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-emerald-900 dark:text-emerald-300">
                    Pay at the shop
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed mt-1">
                    Pay on the shop&apos;s physical card machine when you collect. LocalEats will never ask for your card number or CVV.
                  </p>
                </div>
              </div>
            )}
          </section>

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
                    {deliveryType === "delivery"
                      ? "Cash on Arrival"
                      : paymentMethod === "card_machine"
                        ? "Card at Shop"
                        : "Cash at Shop"}
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
                  const itemTotal = item.price * item.quantity;
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
                <span className="uppercase tracking-wider">Estimated Subtotal</span>
                <span className="font-mono">R {subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-400/80 text-[11px]">
                <span className="uppercase tracking-wider flex items-center gap-1">
                  <Percent className="w-3 h-3 text-orange-500/80" />
                  Tax / VAT (15% Included)
                </span>
                <span className="font-mono">R {(subtotal * 15 / 115).toFixed(2)}</span>
              </div>

              {deliveryType === "delivery" && (
                <div className="flex justify-between items-center text-orange-400">
                  <span className="uppercase tracking-wider flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5" />
                    Estimated Delivery Fee (
                    {distance !== null && distance > ZONE_A_LIMIT
                      ? "Zone B"
                      : "Zone A"}
                    )
                  </span>
                  <span className="font-mono">R {deliveryFee.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-400/80 text-[11px]">
                <span className="uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Service & Packaging Fee
                </span>
                <span className="font-mono">R {serviceFee.toFixed(2)}</span>
              </div>

              <div className="border-t border-dashed border-slate-800 pt-3 flex justify-between items-center text-slate-100">
                <span className="text-sm font-black uppercase tracking-widest">
                  Estimated Total
                </span>
                <span className="text-2xl font-black font-mono text-orange-500">
                  <AnimatedPrice value={totalAmount} />
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-800 pt-2.5 text-[9px] text-center text-slate-500 font-black uppercase tracking-widest">
              Final availability and pricing are confirmed securely when you review the final total.
            </div>
          </section>

          {quotedCheckout && !isQuotedIntentCurrent && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              Your checkout details changed. Review a fresh final total before placing the order.
            </div>
          )}

          {currentAuthoritativeQuote && (
            <section className="rounded-3xl border-2 border-emerald-500 bg-emerald-50 p-5 shadow-lg dark:bg-emerald-950/20">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h4 className="text-sm font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                  Authoritative server total
                </h4>
              </div>
              <div className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                <div className="flex justify-between"><span>Subtotal</span><span>R {currentAuthoritativeQuote.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Delivery fee</span><span>R {currentAuthoritativeQuote.delivery_fee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Service fee</span><span>R {currentAuthoritativeQuote.service_fee.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>- R {currentAuthoritativeQuote.discount_amount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Tip</span><span>R {currentAuthoritativeQuote.tip_amount.toFixed(2)}</span></div>
                <div className="mt-3 flex items-center justify-between border-t-2 border-emerald-300 pt-3 text-emerald-950 dark:border-emerald-800 dark:text-emerald-100">
                  <span className="font-black uppercase tracking-widest">Final total</span>
                  <span className="text-2xl font-black">R {currentAuthoritativeQuote.total_price.toFixed(2)}</span>
                </div>
              </div>
            </section>
          )}

          {/* PINNED BOTTOM CHECKOUT BUTTON STACK */}
          <div className="sticky bottom-0 z-30 -mx-4 -mb-6 mt-6 px-4 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_20px_rgba(0,0,0,0.4)] max-w-2xl w-[calc(100%+2rem)] rounded-b-3xl">
            <button
              id="confirm-pay-btn"
              type="button"
              onClick={handleConfirm}
              disabled={
                loading ||
                cart.length === 0
              }
              className={`relative overflow-hidden w-full py-4 rounded-2xl font-black shadow-xl uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:scale-100 cursor-pointer ${
                loading
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-none shadow-none"
                  : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30 font-extrabold text-sm"
              }`}
            >
              {/* Simple loading overlay preventing multiple clicks */}
              {loading && (
                <div className="absolute inset-0 bg-orange-700/95 dark:bg-orange-800/95 flex items-center justify-center gap-2 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-xs z-10 select-none pointer-events-none">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{checkoutAction === "quote" ? "Confirming Final Total..." : "Placing Order..."}</span>
                </div>
              )}

              <ShoppingBag className="w-5 h-5 shrink-0" />
              <span>
                {currentAuthoritativeQuote
                  ? `Place order for R${currentAuthoritativeQuote.total_price.toFixed(2)}`
                  : "Review final total"}
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
            {currentAuthoritativeQuote ? "Final " : "Est. "}R {(
              currentAuthoritativeQuote?.total_price ?? totalAmount
            ).toFixed(2)}
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
                {currentAuthoritativeQuote ? "Final server total" : "Estimate"} (Step {currentStep}/3)
              </span>
              <span className="text-base font-black font-mono text-orange-400 leading-none mt-0.5">
                R {(currentAuthoritativeQuote?.total_price ?? totalAmount).toFixed(2)}
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
                    cart.length === 0
                  }
                  className={`relative overflow-hidden py-2 px-3.5 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
                    loading
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{checkoutAction === "quote" ? "Reviewing..." : "Placing..."}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>
                        {currentAuthoritativeQuote
                          ? `Place R${currentAuthoritativeQuote.total_price.toFixed(2)}`
                          : "Review total"}
                      </span>
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
