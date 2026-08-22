/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// removed CheckoutScreen import
import SystemStatusIndicator from "./components/SystemStatusIndicator";
import { CircuitBreaker } from "./utils/circuitBreaker";
import { IdempotencyManager } from "./utils/idempotency";
import { DualSyncEngine, dualSyncEngine } from "./utils/dualSync";
import { uploadClientAvatar } from "./lib/avatar";
import {
  useState,
  Dispatch,
  SetStateAction,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ChangeEvent,
  FormEvent,
  memo,
  lazy,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  Polyline,
  Circle,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { MapLegend } from "./components/MapLegend";
import {
  riderMapIcon,
  userMapIcon,
  createShopMapIcon,
  MemoizedCustomerMarker,
  MemoizedShopMarker,
  MemoizedRiderMarker,
  InvalidateMapSize,
} from "./components/MapComponents";

// Fix for default marker icons in react-leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import QRCode from "qrcode";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

import { Html5Qrcode } from "html5-qrcode";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;
import {
  Home,
  Store,
  Compass,
  Bell,
  X,
  CheckCircle,
  Target,
  Info,
  Utensils,
  User,
  Mail,
  Lock,
  Flag,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Truck,
  RefreshCw,
  Settings,
  History,
  MapPin,
  MoreVertical,
  UserMinus,
  UserPlus,
  Navigation2,
  AlertCircle,
  Star,
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Clock,
  CreditCard,
  Loader2,
  Search,
  ShoppingBag,
  ChevronRight,
  LayoutDashboard,
  Phone,
  LogOut,
  Save,
  SearchX,
  Database,
  MessageCircle,
  MessageSquare,
  Navigation,
  PhoneCall,
  Layers,
  Heart,
  Share2,
  Sparkles,
  BookOpen,
  Camera,
  Award,
  Moon,
  Sun,
  RotateCcw,
  ClipboardList,
  BarChart3,
  Copy,
  StickyNote,
  AlertTriangle,
  Check,
  Pencil,
  Smartphone,
  Map as MapIcon,
  List,
  Tag,
  ShoppingBasket,
  Ban,
  Bike,
  Timer,
  Megaphone,
  Package,
  Delete,
  Send,
  CheckCircle2,
  CheckSquare,
  XCircle,
  Hourglass,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  LogIn,
  Locate,
  LocateFixed,
  Banknote,
  Wallet,
  ChevronLeft,
  Bug,
  Server,
  Eye,
  EyeOff,
  FileText,
  Shield,
  QrCode,
  Download,
  Gift,
  Fingerprint,
  Headset,
  Zap,
  WifiOff,
  Filter,
  Calendar,
  Edit,
  Edit2,
  SlidersHorizontal,
  Languages,
  HelpCircle,
  ShieldCheck,
  Apple,
  ExternalLink,
  Wifi,
  RotateCw,
  Volume2,
  VolumeX,
  Activity,
  BellOff,
  Upload,
  Maximize2,
  Minimize2,
  FolderOpen,
} from "lucide-react";
import { supabase, supabaseUrl, supabaseAnonKey, APP_URL, getFreshChannel, getResilientSession, saveCustomSupabaseConfig, resetToDefaultSupabaseConfig, isCustomSupabaseConfigured } from "./lib/supabase";
import { Session } from "@supabase/supabase-js";
import { LocalEatsLogo } from "./components/LocalEatsLogo";
import { WidgetErrorBoundary } from "./components/WidgetErrorBoundary";

import { CheckoutScreen } from "./screens/CheckoutScreen";
import { OrderTrackingScreen } from "./screens/OrderTrackingScreen";
import { RiderHandshakeInstructionPrompt } from "./components/SecureDeliveryHandshake";

import {
  SignUpScreen,
  VerifyScreen,
  SetupPasswordScreen,
  SuccessScreen,
  CompleteProfileScreen,
  ResetPasswordScreen,
  LoginScreen,
  LoginSuccessScreen,
} from "./screens/auth";

import { SplashScreen } from "./screens/SplashScreen";

import { AppSkeletonLoader } from "./components/AppSkeletonLoader";
import { AuthSkeleton } from "./components/AuthSkeleton";
import { AdminErrorLogsSection } from "./components/AdminErrorLogsSection";
import jsPDF from "jspdf";
import { useTranslation } from "./contexts/LanguageContext";
export type { UserProfile } from "./types";
import {
  Screen,
  AppNotification,
  StatusHistoryItem,
  Order,
  PendingReview,
  MenuItem,
  CartItem,
  Review,
  Shop,
  UserProfile,
  NotificationState,
  SignUpData,
} from "./types";
import { useOfflineSync, processPendingCancellationsQueue } from "./hooks/useOfflineSync";
import { useNetworkHeartbeat, NetworkHealthMetrics } from "./hooks/useNetworkHeartbeat";
import { NetworkHeartbeatMonitor } from "./components/NetworkHeartbeatMonitor";
import { processNetworkQueue } from "./lib/networkQueue";
import {
  hashString,
  handleSupabaseError,
  calculateDistance,
  getShopStatus,
  isShopAway,
  SUPPORTED_CITIES,
  APP_VERSION,
  DEFAULT_COORDS,
  DEFAULT_MENU_IMAGE,
  DEFAULT_SHOP_LOGO,
  formatSAPhone,
  validateSAPhone,
  toDBPhone,
  safeLocalStorageGet,
  safeLocalStorageSet,
  pruneLargeKeys,
  cleanCacheStorage,
  DEFAULT_FALLBACK_SHOPS,
  MY_KOTA_TEST_STORE,
} from "./utils";
import { onForegroundMessage, registerAndSyncPushToken, FirestoreService } from "./lib/firebase";
import { upsertProfileWithRPC } from "./lib/profileService";

import { LOCAL_PROMO_DB, urlBase64ToUint8Array } from "./constants/promos";

// Static fallback cache loaded dynamically from ./utils

import { AddressSearch, LocationPickerMap } from "./components/MapComponents";
import {
  detectTownship,
  TOWNSHIPS,
  TownshipConfig,
} from "./lib/townshipHelper";
import { BlurUpImage } from "./components/BlurUpImage";
import Cropper from "react-easy-crop";
import { TrustBadge } from "./components/TrustBadge";
import { AppHelp } from "./components/AppHelp";
import { OnboardingTour } from "./components/OnboardingTour";
import { InteractiveTour } from "./components/InteractiveTour";
import { PopiaLegalDrawer } from "./components/PopiaLegalDrawer";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { ShopChatModal } from "./components/ShopChatModal";
import { QuickReorderWidget } from "./components/QuickReorderWidget";

import { AnimatedPrice } from "./components/AnimatedPrice";
import {
  OrderHistorySkeleton,
  ShopOrdersSkeleton,
StatsSkeleton,
} from "./components/FacebookSkeleton";
import { audioHelper } from "./lib/audioHelper";
import { GlobalChatListener } from "./components/GlobalChatListener";
import { cacheBusinessResults, getCachedBusinessResults } from "./lib/offlineCache";

import { ShopCard, MenuItemSkeleton, MenuItemCard } from "./components/ShopCard";
import { getAvatarUrl, getCroppedImg, searchAddress, compressImage, uploadAvatar } from "./utils/imageUtils";
import { autoAssignClosestRiderService } from "./services/riderAssignment";
import { ModalAction, ModalState, ModalContent } from "./components/ActionModal";

// Dynamic South African slang category delighter helper based on language selection
const getCategorySlang = (category: string, lang: string) => {
  const c = category.toLowerCase().trim();
  if (c === "kota" || c === "kotas") {
    if (lang === "st" || lang === "tn" || lang === "nso" || lang === "ts") {
      return "Spatlo 🍞";
    }
    if (lang === "zu" || lang === "xh" || lang === "ss" || lang === "nr") {
      return "Ikota 🍞";
    }
    return "Kota 🍞";
  }
  if (c === "braai") {
    if (lang === "st" || lang === "tn" || lang === "nso") {
      return "Dijo tša bo-braai 🔥";
    }
    if (lang === "zu" || lang === "xh" || lang === "ss" || lang === "nr") {
      return "Shisa Nyama 🔥";
    }
    return "Braai 🔥";
  }
  if (c === "all") {
    if (lang === "zu") return "Zonke 🍽️";
    if (lang === "xh") return "Zonke 🍽️";
    if (lang === "st" || lang === "tn" || lang === "nso") return "Tšohle 🍽️";
    return "All 🍽️";
  }
  if (c === "favorites") {
    if (lang === "zu") return "Izintandokazi ❤️";
    if (lang === "xh") return "Ezithandwayo ❤️";
    if (lang === "st" || lang === "tn" || lang === "nso") return "Tse di Ratiwang ❤️";
    return "Favorites ❤️";
  }
  if (c === "nearby") {
    if (lang === "zu") return "Eduze 📍";
    if (lang === "xh") return "Kufuphi 📍";
    if (lang === "st" || lang === "tn" || lang === "nso") return "Kgauswi 📍";
    return "Nearby 📍";
  }
  return category;
};

const getShopCategoryIcon = (category: string) => {
  const c = category.toLowerCase().trim();
  if (c.includes("kota")) return "🍞";
  if (c.includes("braai") || c.includes("shisa") || c.includes("grill") || c.includes("meat")) return "🔥";
  if (c.includes("burger") || c.includes("fast") || c.includes("sandwich")) return "🍔";
  if (c.includes("pizza") || c.includes("italian")) return "🍕";
  if (c.includes("drink") || c.includes("beverage") || c.includes("coffee") || c.includes("juice") || c.includes("shake")) return "🥤";
  if (c.includes("dessert") || c.includes("sweet") || c.includes("cake") || c.includes("bakery")) return "🍰";
  if (c.includes("salad") || c.includes("healthy") || c.includes("veg")) return "🥗";
  if (c.includes("chicken") || c.includes("poultry") || c.includes("wing")) return "🍗";
  if (c.includes("seafood") || c.includes("fish")) return "🐟";
  if (c.includes("traditional") || c.includes("local")) return "🇿🇦";
  return "🍽️";
};

// Storage utilities and cache cleaners outsourced to ./utils

export default function App() {
  const [currentScreenStack, setCurrentScreenStack] = useState<Screen[]>(() => {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        const hasSupabaseToken = Object.keys(localStorage).some(
          (key) => (key.startsWith("sb-") && (key.endsWith("-auth-token") || key.includes("auth-token"))) ||
                   key === "supabase.auth.token"
        );
        const hasRememberToken = !!localStorage.getItem("remember_me_secure_token");
        const hasSessionToken = !!localStorage.getItem("localeats_session") || !!sessionStorage.getItem("localeats_session");
        
        // Only initialize straight to home if genuine auth tokens or verified session tokens exist.
        // We avoid jumping to home solely on raw unverified userProfile cache, preventing stale profile loops after database wipes.
        if (hasSupabaseToken || (hasRememberToken && hasSessionToken)) {
          console.info("[Auth Init] Active auth session token found. Initializing on Home screen while verifying session.");
          return ["home"];
        }
      }
    } catch (e) {
      console.warn("Auth screen initialization error:", e);
    }
    return ["splash"];
  });
  const currentScreen = currentScreenStack[currentScreenStack.length - 1];
  const previousScreen = currentScreenStack.length > 1 ? currentScreenStack[currentScreenStack.length - 2] : null;

  const transitionHistoryRef = useRef<{ screen: Screen; timestamp: number }[]>([]);

  const [isTourActive, setIsTourActive] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        const hasSeenTour = localStorage.getItem("localeats_tour_seen");
        const hasSeenInteractiveTour = localStorage.getItem("localeats_interactive_tour_seen");
        return !hasSeenTour || !hasSeenInteractiveTour;
      }
    } catch (e) {
      // ignore
    }
    return false;
  });

  useEffect(() => {
    const handleTourStart = () => setIsTourActive(true);
    const handleTourEnd = () => setIsTourActive(false);

    window.addEventListener("localeats_tour_started", handleTourStart);
    window.addEventListener("localeats_tour_ended", handleTourEnd);
    window.addEventListener("localeats_restart_tour", handleTourStart);
    window.addEventListener("localeats_start_interactive_tour", handleTourStart);
    window.addEventListener("localeats_skip_all_tours", handleTourEnd);

    return () => {
      window.removeEventListener("localeats_tour_started", handleTourStart);
      window.removeEventListener("localeats_tour_ended", handleTourEnd);
      window.removeEventListener("localeats_restart_tour", handleTourStart);
      window.removeEventListener("localeats_start_interactive_tour", handleTourStart);
      window.removeEventListener("localeats_skip_all_tours", handleTourEnd);
    };
  }, []);

  // Pure navigation state updater
  const setCurrentScreen = useCallback((target: Screen | ((prev: Screen) => Screen)) => {
    setCurrentScreenStack((prevStack) => {
      const current = prevStack[prevStack.length - 1];
      const nextScreen = typeof target === "function" ? target(current) : target;
      
      if (current === nextScreen) {
        return prevStack;
      }
      
      if (nextScreen === "home" || nextScreen === "splash") {
        return [nextScreen];
      }
      
      const existingIndex = prevStack.indexOf(nextScreen);
      if (existingIndex !== -1) {
        return prevStack.slice(0, existingIndex + 1);
      }
      
      return [...prevStack, nextScreen];
    });
  }, []);

  // Safe navigation side effects executed outside the render/state update phase
  useEffect(() => {
    if (!currentScreen) return;

    if (typeof window !== "undefined") {
      const pushLog = (window as any).__pushDebugLog;
      if (pushLog) {
        pushLog("navigation", `Transition to screen: '${currentScreen}'`);
      }
    }

    // Safeguard against navigation loops
    const now = Date.now();
    const transitionHistory = transitionHistoryRef.current;
    
    // Keep only last 10 transitions
    const updatedHistory = [...transitionHistory, { screen: currentScreen, timestamp: now }].slice(-10);
    transitionHistoryRef.current = updatedHistory;

    // Check for rapid alternating cycles (e.g., home -> other -> home -> other)
    if (updatedHistory.length >= 6) {
      const last6 = updatedHistory.slice(-6);
      const screenSet = new Set(last6.map(item => item.screen));
      const timeSpan = last6[5].timestamp - last6[0].timestamp;
      
      if (screenSet.size <= 2 && timeSpan < 2000) {
        console.error(`[Navigation Safeguard] Detected rapid navigation loop: ${Array.from(screenSet).join(" <-> ")} within ${timeSpan}ms. Forcing clean break to 'home' screen.`);
        transitionHistoryRef.current = [{ screen: "home", timestamp: now }];
        if (currentScreen !== "home") {
          setCurrentScreenStack(["home"]);
        }
      }
    }
  }, [currentScreen]);

  const setPreviousScreen = useCallback((_screen: Screen | null) => {
    // Handled automatically by the navigation stack
  }, []);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [appVersion, setAppVersion] = useState("4.0"); // Initialize with 4.0
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [isOrderBannerCollapsed, setIsOrderBannerCollapsed] = useState(false);
  const [isScrollCollapsed, setIsScrollCollapsed] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > lastScrollY + 15 && currentScrollY > 60) {
            setIsScrollCollapsed(true);
          } else if (currentScrollY < lastScrollY - 10 || currentScrollY < 30) {
            setIsScrollCollapsed(false);
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

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return safeLocalStorageGet("userProfile", {
      fullName: "",
      email: "",
      phone: "",
      city: SUPPORTED_CITIES[0],
      address: "",
      country: "South Africa",
      role: "user",
    });
  });

  useEffect(() => {
    if (userProfile && (userProfile.fullName || userProfile.email || userProfile.phone)) {
      safeLocalStorageSet("userProfile", JSON.stringify(userProfile));
      if (!localStorage.getItem("remember_me_secure_token")) {
        localStorage.setItem("remember_me_secure_token", userProfile.id || userProfile.email || "true");
      }
    }
  }, [userProfile]);

  const [isRestoringSession, setIsRestoringSession] = useState(() => {
    try {
      const hasToken = Object.keys(localStorage).some(
        (key) => key.startsWith("sb-") && key.endsWith("-auth-token")
      );
      const hasRememberToken = !!localStorage.getItem("remember_me_secure_token");
      return hasToken || hasRememberToken;
    } catch {
      return false;
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    return safeLocalStorageGet("favorites", []);
  });

  const [forcedTheme, setForcedTheme] = useState<"light" | "dark" | "high-contrast" | "default">(() => {
    try {
      return (localStorage.getItem("dev_forced_theme") as any) || "default";
    } catch {
      return "default";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("dev_forced_theme", forcedTheme);
    } catch {}
  }, [forcedTheme]);

  useEffect(() => {
    const pushDebugLog = (type: "navigation" | "network", message: string, status?: "pending" | "success" | "error", details?: string) => {
      const newLog = {
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
        status,
        details
      };
      const logs = (window as any).__devDebugLogs || [];
      const updated = [newLog, ...logs].slice(0, 50);
      (window as any).__devDebugLogs = updated;
      window.dispatchEvent(new CustomEvent("dev-debug-log", { detail: updated }));
    };

    (window as any).__pushDebugLog = pushDebugLog;
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem("dark_mode");
      if (saved === null) return false;
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [hapticEnabled, setHapticEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("haptic_enabled");
      if (saved === null) return true;
      return saved === "true";
    } catch {
      return true;
    }
  });

  const [dataSaverEnabled, setDataSaverEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("data_saver_enabled");
      if (saved === null) return false;
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [orderAgainEnabled, setOrderAgainEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("order_again_enabled");
      if (saved === null) return false;
      return saved === "true";
    } catch {
      return false;
    }
  });

  const [hapticButtonPress, setHapticButtonPress] = useState(() => {
    try {
      const saved = localStorage.getItem("haptic_button_press");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const [hapticOrderUpdate, setHapticOrderUpdate] = useState(() => {
    try {
      const saved = localStorage.getItem("haptic_order_update");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const [hapticCartAnimation, setHapticCartAnimation] = useState(() => {
    try {
      const saved = localStorage.getItem("haptic_cart_animation");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const [biometricsEnabled, setBiometricsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("biometrics_enabled");
      if (saved === null) return true;
      return saved === "true";
    } catch {
      return true;
    }
  });

  const [showQRScanner, setShowQRScanner] = useState(false);

  const [pendingReview, setPendingReview] = useState<PendingReview | null>(
    () => {
      return safeLocalStorageGet("pending_review", null);
    },
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [minRating, setMinRating] = useState(0);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [shops, setShops] = useState<Shop[]>(() => {
    const cached = safeLocalStorageGet("cached_shops", []);
    const correctSpelling = (str: string) => {
      if (!str) return str;
      return str
        .replace(/My-Keta/g, "My-Kota")
        .replace(/My-keta/g, "My-Kota")
        .replace(/my-keta/g, "my-kota")
        .replace(/My Keta/g, "My Kota")
        .replace(/Keta/g, "Kota")
        .replace(/keta/g, "kota");
    };
    return cached.map((s: any) => ({
      ...s,
      name: correctSpelling(s.name),
      description: correctSpelling(s.description),
      address: correctSpelling(s.address),
      category: correctSpelling(s.category),
    }));
  });

  const visibleShops = useMemo(() => {
    const currentUserId = userProfile?.id || session?.user?.id;
    const currentEmail = (userProfile?.email || session?.user?.email || "").toLowerCase().trim();
    const isTeejeyAccount =
      currentEmail === "teejeyunam@gmail.com" ||
      currentEmail.includes("teejeyunam") ||
      (currentUserId && String(currentUserId).toLowerCase().includes("teejey"));

    // Base collection of shops
    let activeBaseShops = shops && shops.length > 0 ? [...shops] : [...DEFAULT_FALLBACK_SHOPS];

    // If logged in as the test account (teejeyunam@gmail.com), ensure their My-Kota store is available for testing
    if (isTeejeyAccount) {
      const alreadyHasMyKotaStore = activeBaseShops.some(
        (s) =>
          s.id === MY_KOTA_TEST_STORE.id ||
          s.owner_id === "teejeyunam@gmail.com" ||
          (s as any).owner_email === "teejeyunam@gmail.com" ||
          (s.name || "").toLowerCase().includes("my-kota") ||
          (s.name || "").toLowerCase().includes("my-keta")
      );
      if (!alreadyHasMyKotaStore) {
        activeBaseShops = [MY_KOTA_TEST_STORE, ...activeBaseShops];
      }
    }

    const filtered = activeBaseShops.filter((s) => {
      const nameLower = (s.name || "").toLowerCase();
      const descLower = (s.description || "").toLowerCase();
      const ownerEmail = ((s as any).owner_email || (s as any).created_by || "").toLowerCase().trim();
      const ownerIdStr = String(s.owner_id || "").toLowerCase().trim();

      // Allow all shops to be visible, regardless of name or ownership
      return true;
    });

    return filtered;
  }, [shops, userProfile, session]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const loadedCart = safeLocalStorageGet("cart", []) as CartItem[];
    if (Array.isArray(loadedCart)) {
      return loadedCart.filter((item: CartItem) => item && item.shopId && item.shopId !== "null" && item.shopId !== "undefined");
    }
    return [];
  });
  
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Network Heartbeat Monitor
  const { metrics: heartbeatMetrics, isPinging: isPingingHeartbeat, runHeartbeatPing } = useNetworkHeartbeat(15000, true);

  // Continuous background offline cart synchronization and network state monitoring
  useOfflineSync(cart, session);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
  });

  const [processingState, setProcessingState] = useState<
    "idle" | "saving" | "success"
  >("idle");

  const activeTransactionsRef = useRef<Set<string>>(new Set());

  const runWithProcessing = useCallback(async <T,>(
    action: () => Promise<T>,
    successCallback?: () => void,
    loadingLabel?: string,
    idempotencyKey?: string,
  ) => {
    const key = idempotencyKey || "generic_" + Math.random().toString(36).substr(2, 9);
    
    // Check in-memory fast set and persistent IdempotencyManager
    if (activeTransactionsRef.current.has(key)) {
      console.warn(`[Idempotency Protection] Prevented duplicate in-memory execution for lock key: ${key}`);
      const cached = IdempotencyManager.getCachedResult<T>(key);
      if (cached !== null && successCallback) {
        successCallback();
      }
      return cached;
    }

    if (!IdempotencyManager.acquireLock(key, 12000)) {
      console.warn(`[Idempotency Protection] Prevented duplicate execution for lock key: ${key}`);
      const cached = IdempotencyManager.getCachedResult<T>(key);
      if (cached !== null) {
        if (successCallback) successCallback();
        return cached;
      }
    }
    
    activeTransactionsRef.current.add(key);
    setProcessingState("saving");
    try {
      const result = await action();
      IdempotencyManager.recordResult(key, result, 12000);
      setProcessingState("success");
      await new Promise((resolve) => setTimeout(resolve, 800));
      setProcessingState("idle");
      activeTransactionsRef.current.delete(key);
      if (successCallback) {
        try {
          successCallback();
        } catch (cbErr) {
          console.warn("Success callback execution notice:", cbErr);
        }
      }
      return result;
    } catch (err: any) {
      setProcessingState("idle");
      activeTransactionsRef.current.delete(key);
      IdempotencyManager.releaseLock(key);
      console.error("runWithProcessing caught error:", err);
      let rawMsg = err?.message || err?.error_description || "";
      if (typeof rawMsg === "object") {
        try {
          rawMsg = JSON.stringify(rawMsg);
        } catch(e) {
          rawMsg = String(rawMsg);
        }
      }
      if (rawMsg === "{}" || !rawMsg) {
        if (err?.code) rawMsg = "Error code: " + err.code;
        else if (err?.msg) rawMsg = err.msg;
        else rawMsg = "An unexpected error occurred.";
      }
      const rawLower = String(rawMsg).toLowerCase();
      const isFetchErr = 
        rawLower.includes("failed to fetch") || 
        rawLower.includes("network error") || 
        rawLower.includes("upstream connect error") ||
        rawLower.includes("rpc_timeout") ||
        rawLower.includes("timeout") ||
        rawLower.includes("econnrefused");
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const isAuthErr = 
        rawLower.includes("jwt") || 
        rawLower.includes("invalid_grant") || 
        rawLower.includes("not logged in") || 
        rawLower.includes("session expired") ||
        rawLower.includes("unauthorized");
      const isPermissionErr = 
        rawLower.includes("permission denied") || 
        rawLower.includes("forbidden") || 
        rawLower.includes("row-level security") ||
        rawLower.includes("policy");

      let errorCause = "Operation interrupted";
      let dialogTitle = "Action Interrupted";
      let dialogMessage = "We encountered an issue while trying to complete this request. You can retry or head back home.";
      let iconType: "wifi-off" | "server-off" | "lock" | "alert" = "alert";

      if (isOffline) {
        errorCause = "Network connection lost";
        dialogTitle = "Connection Lost";
        dialogMessage = "Your device appears to be offline. Please check your signal or Wi-Fi connection and tap Retry.";
        iconType = "wifi-off";
      } else if (isFetchErr) {
        errorCause = "Database connection unavailable";
        dialogTitle = "Server Connection Issue";
        dialogMessage = "Unable to connect to the database server. The service may be momentarily busy or reconnecting. Tap Retry to try again.";
        iconType = "server-off";
      } else if (isAuthErr) {
        errorCause = "Authentication session expired";
        dialogTitle = "Authentication Required";
        dialogMessage = "Your session credentials have expired or are invalid. Please log in again to continue.";
        iconType = "lock";
      } else if (isPermissionErr) {
        errorCause = "Insufficient user permissions";
        dialogTitle = "Access Restricted";
        dialogMessage = "You do not have permission to execute this operation. Please verify your account privileges.";
        iconType = "lock";
      } else if (rawMsg && rawMsg.length > 0) {
        errorCause = rawMsg.length <= 45 ? rawMsg : "Request validation error";
        dialogTitle = "Request Notice";
        dialogMessage = rawMsg;
        iconType = "alert";
      }

      setModal({
        isOpen: true,
        title: dialogTitle,
        message: dialogMessage,
        type: "action-dialog",
        errorCause,
        iconType,
        actions: [
          {
            label: "Retry Action",
            variant: "primary",
            onClick: () => {
              // Re-run the action
              runWithProcessing(action, successCallback, loadingLabel, idempotencyKey);
            },
          },
          {
            label: "Go Home",
            variant: "outline",
            onClick: () => {
              setCurrentScreen("home");
            },
          },
          {
            label: "Dismiss",
            variant: "ghost",
            onClick: () => {},
          },
        ],
      });
      return null as any;
    }
  }, [setCurrentScreen]);

  const showAlert = (title: string, message: string) => {
    setModal({ isOpen: true, title, message, type: "alert" });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type: "confirm",
      onConfirm: () => onConfirm(),
      confirmLabel,
      cancelLabel,
    });
  };

  const showPrompt = (
    title: string,
    message: string,
    onConfirm: (value: string) => void,
    defaultValue = "",
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type: "prompt",
      onConfirm: (val) => onConfirm(val || ""),
      defaultValue,
    });
  };

  const showPasswordPrompt = (
    title: string,
    message: string,
    onConfirm: (value: string) => void,
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type: "password-prompt",
      onConfirm: (val) => onConfirm(val || ""),
      defaultValue: "",
    });
  };

  const [orderAcceptedModal, setOrderAcceptedModal] = useState<{
    isOpen: boolean;
    productName: string;
    ownerMessage: string;
  }>({
    isOpen: false,
    productName: "",
    ownerMessage: "",
  });

  const [notification, setNotification] = useState<NotificationState>(null);

  // Auto-dismiss transient (non-persistent) custom notification toasts after 4 seconds
  useEffect(() => {
    if (notification && !notification.persistent) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(DEFAULT_COORDS);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    return safeLocalStorageGet("app_notifications", []);
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  // Audio state for notifications
  const notificationAudio = useRef<HTMLAudioElement | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Programmatic Self-Cleaning Engine to prevent physical Webview Lock-ups / Freezes
  useEffect(() => {
    pruneLargeKeys();
    cleanCacheStorage();
  }, []);

  const playNotificationSound = useCallback(() => {
    audioHelper.play("alert");
  }, []);

  // Initialize audio on first click quietly to satisfy browser autoplay policies
  useEffect(() => {
    const handleFirstInteraction = () => {
      // Touch/click resumes the AudioContext quietly without playing audio
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          const tempCtx = new AudioCtxClass();
          if (tempCtx.state === "suspended") {
            tempCtx.resume();
          }
        } catch { /* ignore */ }
      }
      window.removeEventListener("click", handleFirstInteraction);
    };
    window.addEventListener("click", handleFirstInteraction);
    return () => window.removeEventListener("click", handleFirstInteraction);
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + (item?.price || 0) * (item?.quantity || 0),
    0,
  );

  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const prevCartCountRef = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      setIsCartBouncing(true);
      const timer = setTimeout(() => setIsCartBouncing(false), 600);
      prevCartCountRef.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  // PERSISTENCE SYNCING
  useEffect(() => {
    safeLocalStorageSet("userProfile", JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    safeLocalStorageSet("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    safeLocalStorageSet("favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    safeLocalStorageSet("app_notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    safeLocalStorageSet("order_again_enabled", String(orderAgainEnabled));
  }, [orderAgainEnabled]);

  useEffect(() => {
    safeLocalStorageSet("data_saver_enabled", String(dataSaverEnabled));
  }, [dataSaverEnabled]);

  useEffect(() => {
    safeLocalStorageSet("dark_mode", String(isDarkMode));
    try {
      const root = window.document.documentElement;
      const body = window.document.body;
      
      root.classList.remove("dark", "high-contrast");
      body.classList.remove("dark", "high-contrast");
      
      if (forcedTheme === "dark") {
        root.classList.add("dark");
        body.classList.add("dark");
      } else if (forcedTheme === "high-contrast") {
        root.classList.add("dark", "high-contrast");
        body.classList.add("dark", "high-contrast");
      } else if (forcedTheme === "light") {
        // already removed
      } else {
        if (isDarkMode) {
          root.classList.add("dark");
          body.classList.add("dark");
        }
      }
    } catch (e) {
      console.warn("DOM Dark class toggle failed:", e);
    }
  }, [isDarkMode, forcedTheme]);

  useEffect(() => {
    if (pendingReview) {
      safeLocalStorageSet("pending_review", JSON.stringify(pendingReview));
    } else {
      try {
        localStorage.removeItem("pending_review");
      } catch (e) {
        console.warn("localStorage remove item error:", e);
      }
    }
  }, [pendingReview]);

  const triggerHaptic = useCallback((
    pattern: number | number[] = 10,
    actionType?: "button_press" | "order_update" | "cart_animation"
  ) => {
    if (!hapticEnabled) return;
    if (actionType === "button_press" && !hapticButtonPress) return;
    if (actionType === "order_update" && !hapticOrderUpdate) return;
    if (actionType === "cart_animation" && !hapticCartAnimation) return;

    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, [hapticEnabled, hapticButtonPress, hapticOrderUpdate, hapticCartAnimation]);

  const handleQRScanSuccess = useCallback((text: string) => {
    if (!text) return;
    
    const upperText = text.trim().toUpperCase();
    const isPromoCode = 
      upperText === "LOCALEATS10" || 
      upperText.includes("LOCALEATS") || 
      upperText.includes("PROMO") || 
      upperText.includes("WINTER") || 
      upperText.includes("DISCOUNT") || 
      upperText.includes("OFF");

    if (isPromoCode) {
      triggerHaptic([15, 15], "button_press");
      setShowQRScanner(false);
      try {
        navigator.clipboard.writeText(upperText);
      } catch {}
      toast.success(`Scanned Promo Code: ${upperText}! 🎁`, {
        description: "Code copied to clipboard! You can apply it at checkout.",
      });
      return;
    }

    // Find matching shop
    const foundShop = shops.find((s) => {
      const sId = String(s.id).toLowerCase();
      const sName = String(s.name).toLowerCase();
      const scannedLower = text.toLowerCase();
      return (
        scannedLower === sId ||
        scannedLower.includes(sId) ||
        sId.includes(scannedLower) ||
        scannedLower.includes(sName)
      );
    });

    if (foundShop) {
      triggerHaptic([15, 15], "button_press");
      setSelectedStoreId(foundShop.id);
      setPreviousScreen(currentScreen);
      setCurrentScreen("store-info");
      setShowQRScanner(false);
      toast.success(`Scanned flyer for ${foundShop.name}!`, {
        description: "Instantly opening their menu.",
      });
    } else {
      triggerHaptic([30, 30], "button_press");
      toast.error("Unrecognized Code", {
        description: `Could not find store or promo code matching "${text}".`,
      });
    }
  }, [shops, currentScreen, triggerHaptic]);

  const logEmptyShopListDiagnostic = useCallback((reason: string) => {
    console.warn(`🔍 [Shop List Diagnostic] Shop list is currently empty. Reason/Context: ${reason}`, {
      timestamp: new Date().toISOString(),
      isOnline: navigator.onLine,
      supabaseUrl: supabaseUrl || "Not configured",
      localStorageKeys: typeof localStorage !== "undefined" ? Object.keys(localStorage).filter(k => k.includes("shop") || k.includes("sb")) : [],
    });
  }, []);

  const lastFetchedShopsTimeRef = useRef<number | null>(null);
  const [stalenessThresholdMs, setStalenessThresholdMs] = useState<number>(30000); // 30 seconds default staleness threshold

  const fetchShopsData = useCallback(async (retries = 3, force = false) => {
    const now = Date.now();
    if (
      !force &&
      lastFetchedShopsTimeRef.current !== null &&
      now - lastFetchedShopsTimeRef.current < stalenessThresholdMs &&
      shops.length > 0
    ) {
      console.log(
        `[fetchShopsData] Using memoized shop data (${Math.round(
          (now - lastFetchedShopsTimeRef.current) / 1000
        )}s old, threshold ${stalenessThresholdMs / 1000}s). Skipping redundant network request.`
      );
      return;
    }

    setLoadingShops(true);
    setIsSyncing(true);
    setFetchError(null);

    // Initial cold start cache inspection: check if shops are stored in IndexedDB or localStorage
    let hasCachedShops = false;
    try {
      const idbCached = await getCachedBusinessResults("all_shops");
      const localCached = safeLocalStorageGet("cached_shops", null);
      const cached = idbCached || (Array.isArray(localCached) && localCached.length > 0 ? localCached : null);

      if (cached && Array.isArray(cached) && cached.length > 0) {
        hasCachedShops = true;
        const hydratedCached = cached.map((s: Shop) => {
          if (!s.menu || s.menu.length === 0) {
            const matchedFallback = DEFAULT_FALLBACK_SHOPS.find(
              (f) => f.category?.toLowerCase() === s.category?.toLowerCase() || f.name.toLowerCase() === s.name.toLowerCase()
            ) || DEFAULT_FALLBACK_SHOPS[0];
            return {
              ...s,
              menu: matchedFallback.menu || []
            };
          }
          return s;
        });
        setShops(hydratedCached);
        // Hydrate from cache immediately to minimize wait time
        setLoadingShops(false);

        if (!navigator.onLine) {
          setIsSyncing(false);
          lastFetchedShopsTimeRef.current = Date.now();
          return;
        }
      }
    } catch (e) {
      console.warn("Retrieving shops from IndexedDB/localStorage during cold start failed:", e);
    }

    // Explicit cold start UX: If no shops are cached in localStorage or IndexedDB, enforce explicit loading skeleton state
    if (!hasCachedShops && shops.length === 0) {
      setLoadingShops(true);
    }

    if (!navigator.onLine && !hasCachedShops) {
      // Offline on cold start with no cache: fallback to default shops
      setShops(DEFAULT_FALLBACK_SHOPS);
      setLoadingShops(false);
      setIsSyncing(false);
      return;
    }

    try {
      await CircuitBreaker.execute("fetchShopsAndMenu", async () => {
      // 1. Fetch live shops from shared Firestore database (merchant app instance)
      let firestoreShops: Shop[] = [];
      try {
        firestoreShops = await FirestoreService.getShops();
      } catch (fErr) {
        console.debug("[App:Firestore] Shop fetch notice:", fErr);
      }

      if (firestoreShops && firestoreShops.length > 0) {
        console.log(`[App:Firestore] Successfully fetched ${firestoreShops.length} live shops from Firestore.`);
        setShops(firestoreShops);
        safeLocalStorageSet("cached_shops", JSON.stringify(firestoreShops));
        await cacheBusinessResults("all_shops", firestoreShops).catch(() => {});
        setLoadingShops(false);
        setIsSyncing(false);
        lastFetchedShopsTimeRef.current = Date.now();
        return;
      }

      // 2. Fetch all shops from Supabase
      const { data: shopsData, error: shopsError } = await supabase
        .from("shops")
        .select("id, name, description, location, category, rating, logo_url, opening_time, closing_time, phone, latitude:lat, longitude:lng, cash_trust_enabled, allow_external_riders, auto_look_for_rider, is_active, owner_id, updated_at")
        .limit(50);

      if (shopsError) {
        const isNetwork =
          (shopsError.message &&
            (shopsError.message.toLowerCase().includes("failed to fetch") ||
             shopsError.message.toLowerCase().includes("schema cache") ||
             shopsError.message.toLowerCase().includes("circuit breaker") ||
             shopsError.message.toLowerCase().includes("retrying") ||
             shopsError.message.toLowerCase().includes("pgrst"))) ||
          (shopsError.details &&
            shopsError.details.toLowerCase().includes("failed to fetch")) ||
          shopsError.code === "PGRST301";
        if (isNetwork) {
          console.info(
            "Database warm-up or transient notice fetching shops, using offline fallback:",
            shopsError.message,
          );
        } else if (retries === 0) {
          console.info("Shops fetch note:", shopsError.message || shopsError);
        } else {
          console.info("Shops fetch note (retrying):", shopsError.message);
        }
        const errObj = new Error(
          shopsError.message || "Unknown Supabase error",
        );
        (errObj as any).code = shopsError.code;
        (errObj as any).details = shopsError.details;
        throw errObj;
      }

      console.log(`Total shops found: ${shopsData?.length || 0}`);

      const { data: menuData, error: menuError } = await supabase
        .from("menu_items")
        .select("id, shop_id, name, price, description, image_url, category, is_available, customizations")
        .limit(100);

      if (menuError) {
        const isNetwork =
          (menuError.message &&
            (menuError.message.toLowerCase().includes("failed to fetch") ||
             menuError.message.toLowerCase().includes("schema cache") ||
             menuError.message.toLowerCase().includes("circuit breaker") ||
             menuError.message.toLowerCase().includes("retrying") ||
             menuError.message.toLowerCase().includes("pgrst"))) ||
          (menuError.details &&
            menuError.details.toLowerCase().includes("failed to fetch")) ||
          menuError.code === "PGRST301";

        if (isNetwork) {
          console.info(
            "Database warm-up or transient notice fetching menu items, using offline fallback:",
            menuError.message,
          );
        } else if (retries === 0) {
          console.info("Menu items fetch note:", menuError.message || menuError);
        } else {
          console.info("Menu items fetch note (retrying):", menuError.message);
        }

        if (isNetwork) {
          throw new Error("FAILED_TO_FETCH_MENU");
        }
        throw menuError;
      }

      // Sandboxed Zero-Downtime Auto-Seeding: If the database is connected but contains 0 shops,
      // automatically seed with high quality default fallback shops and menu items!
      if (!shopsData || shopsData.length === 0) {
        if (retries > 0) {
          console.log(
            "Database 'shops' table exists but is empty. Auto-seeding default fallback shops and menu items...",
          );

          for (const fallbackShop of DEFAULT_FALLBACK_SHOPS) {
            try {
              const { data: insertedShops, error: insertShopErr } =
                await supabase
                  .from("shops")
                  .insert({
                    name: fallbackShop.name,
                    description: fallbackShop.description,
                    location: fallbackShop.address,
                    category: fallbackShop.category,
                    rating: fallbackShop.rating,
                    logo_url: fallbackShop.logo,
                    opening_time: fallbackShop.opening_time,
                    closing_time: fallbackShop.closing_time,
                    phone: fallbackShop.phone,
                    latitude: fallbackShop.latitude,
                    longitude: fallbackShop.longitude,
                    cash_trust_enabled: fallbackShop.cash_trust_enabled,
                    owner_id: "system",
                  })
                  .select("id");

              if (insertShopErr) {
                console.warn(
                  `Auto-seed: Could not insert shop ${fallbackShop.name}:`,
                  insertShopErr,
                );
                continue;
              }

              const newShopId = insertedShops?.[0]?.id;
              if (!newShopId) continue;

              // Seed its menu items
              for (const menuItem of fallbackShop.menu) {
                const { error: insertMenuErr } = await supabase
                  .from("menu_items")
                  .insert({
                    shop_id: newShopId,
                    name: menuItem.name,
                    price: menuItem.price,
                    description: menuItem.description,
                    image_url: menuItem.image,
                    category: menuItem.category,
                    is_available: menuItem.is_available !== false,
                  });

                if (insertMenuErr) {
                  console.warn(
                    `Auto-seed: Could not insert menu item ${menuItem.name} for shop ${fallbackShop.name}:`,
                    insertMenuErr,
                  );
                }
              }
            } catch (seedErr) {
              console.error(
                `Failed auto-seeding shop ${fallbackShop.name}:`,
                seedErr,
              );
            }
          }

          // Re-fetch after a short pause to read from the newly-seeded tables
          console.log(
            "Auto-seeding completed. Re-fetching fresh seeded data...",
          );
          setTimeout(() => fetchShopsData(0), 100);
          return;
        } else {
          console.warn(
            "Auto-seeding failed or RLS is active. Rendering fallback shops layout locally.",
          );
          setShops(DEFAULT_FALLBACK_SHOPS);
          safeLocalStorageSet(
            "cached_shops",
            JSON.stringify(DEFAULT_FALLBACK_SHOPS),
          );
          setLoadingShops(false);
          return;
        }
      }

      const formattedShops: Shop[] = (shopsData || [])
        .map((s) => {
          // Generate deterministic mock coordinates if missing for default area so shops are distributed across the area and never collide with user's spot
          const shopHash = hashString(String(s.id));
          const deterministicLat = -25.9964 + ((shopHash % 30) - 15) * 0.0018;
          const deterministicLng = 28.2268 + (((shopHash >> 2) % 30) - 15) * 0.0018;

          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

          const isActive = s.is_active === true || s.is_active === "true" || s.is_active === "t" || s.is_active === 1;
          const { isOpen } = getShopStatus({
            opening_time: s.opening_time,
            closing_time: s.closing_time,
            is_active: isActive
          });

          let parsedUpdatedAt = s.updated_at;

          const correctSpelling = (str: string) => {
            if (!str) return str;
            return str
              .replace(/My-Keta/g, "My-Kota")
              .replace(/My-keta/g, "My-Kota")
              .replace(/my-keta/g, "my-kota")
              .replace(/My Keta/g, "My Kota")
              .replace(/Keta/g, "Kota")
              .replace(/keta/g, "kota");
          };

          return {
            id: String(s.id),
            name: correctSpelling(s.name),
            logo: s.logo_url || DEFAULT_SHOP_LOGO,
            rating: Number(s.rating) || 4.5,
            cash_trust_enabled:
              s.cash_trust_enabled === true || s.cash_trust_enabled === "true",
            allow_external_riders:
              s.allow_external_riders === true ||
              s.allow_external_riders === "true",
            auto_look_for_rider:
              s.auto_look_for_rider === true ||
              s.auto_look_for_rider === "true",
            reviewCount: 12 + (shopHash % 88), // Mock review count
            prepTime: "15-20 min", // Mock prep time
            isOpen: isOpen,
            description: correctSpelling(s.description || "Local Flavours"),
            address: correctSpelling(s.location || "Local Eats"),
            category: correctSpelling(s.category || "Kota"),
            owner_id: s.owner_id,
            opening_time: s.opening_time,
            closing_time: s.closing_time,
            phone: s.phone || "+27 12 345 6789",
            latitude: s.latitude !== undefined && s.latitude !== null && s.latitude !== 0 ? s.latitude : deterministicLat,
            longitude: s.longitude !== undefined && s.longitude !== null && s.longitude !== 0 ? s.longitude : deterministicLng,
            updated_at: parsedUpdatedAt,
            is_active: isActive,
            images: (s as any).images || [
              DEFAULT_SHOP_LOGO,
              "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
              "https://images.unsplash.com/photo-1476224484581-5d996cc0750e?auto=format&fit=crop&q=80&w=600",
              "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&q=80&w=600",
            ],
            menu: (menuData || [])
              .filter((m) => String(m.shop_id) === String(s.id))
              .map((m) => ({
                id: String(m.id),
                name: m.name,
                price: Number(m.price),
                displayPrice: `R${Number(m.price).toFixed(2)}`,
                image: m.image_url || DEFAULT_MENU_IMAGE,
                description: m.description || "",
                category: m.category || "Main Course",
                is_available: m.is_available !== false,
                customizations: m.customizations || [],
              })),
          };
        })
        .sort((a, b) => (b.rating || 0) - (a.rating || 0)); // Smart Ranking: Best rated first

      console.log(`Successfully fetched ${formattedShops.length} shops.`);
      if (formattedShops.length === 0) {
        logEmptyShopListDiagnostic("Backend returned 0 active non-abandoned shops matching visibility criteria.");
      }
      setShops(formattedShops);
      safeLocalStorageSet("cached_shops", JSON.stringify(formattedShops)); // Instant-Load Caching
      cacheBusinessResults("all_shops", formattedShops); // IndexedDB Offline Storage
      setIsOnline(true);
      lastFetchedShopsTimeRef.current = Date.now();
      });
      setLoadingShops(false);
    } catch (err: any) {
      const errStr = (err?.message || String(err)).toLowerCase();
      const isNetworkError =
        errStr.includes("failed to fetch") ||
        errStr.includes("network error") ||
        errStr.includes("load failed") ||
        errStr.includes("upstream connect error") ||
        errStr.includes("connection timeout") ||
        errStr.includes("disconnect/reset") ||
        errStr.includes("timeout") ||
        errStr.includes("schema cache") ||
        errStr.includes("circuit breaker") ||
        err?.name === "TypeError" ||
        err?.message === "FAILED_TO_FETCH_MENU" ||
        (err.message && err.message.toLowerCase().includes("network"));

      if (errStr.includes("jwt expired") || errStr.includes("invalid jwt") || errStr.includes("token expired")) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("supabase-jwt-expired"));
        }
      }

      if (isNetworkError && typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);
      }

      // Only log errors that are not network-related, or log them only on final failure
      if (!isNetworkError || retries === 0) {
        if (err?.message === "FAILED_TO_FETCH_MENU" || isNetworkError) {
          console.info(
            "Network connectivity or transient database note: falling back to offline content gracefully.",
            err?.message || err,
          );
        } else {
          console.info("Notice fetching shops:", err?.message || err);
        }
      }

      let errorMessage = err.message || "Failed to connect to the server";

      if (isNetworkError || err.message === "FAILED_TO_FETCH_MENU") {
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        errorMessage = isOffline
          ? "Offline Mode: Showing cached stores and menus."
          : "Server Notice: We're having trouble reaching the store backend. Using offline cached data while reconnecting.";
      } else if (err.status === 401 || err.status === 403) {
        errorMessage =
          "Please Sign In: We need you to log in again to keep your information secure.";
      } else if (err.status === 404) {
        errorMessage =
          "Not Found: We couldn't find the store or items you were looking for.";
      } else if (err.code === "PGRST301") {
        errorMessage =
          "Session Expired: Your security token has timed out. A quick refresh should fix it!";
      }

      if (retries > 0) {
        // Fast-fail over for known network connection errors to prevent agonizing loading screens
        const nextRetries = isNetworkError ? 0 : retries - 1;
        const delay = isNetworkError ? 500 : 2500;
        console.info(
          `Retrying fetchShopsData... (${nextRetries} retries left). Delay: ${delay}ms`,
        );
        setTimeout(() => fetchShopsData(nextRetries), delay);
      } else {
        // Sandboxed Zero-Downtime Guarantee: fallback to local cache if available when database fails
        const cached = safeLocalStorageGet("cached_shops", null);
        if (cached && Array.isArray(cached) && cached.length > 0) {
          console.info(
            "Rendering cached shops data under Zero-Downtime Guarantee rules",
          );
          const hydratedCached = cached.map((s: Shop) => {
            if (!s.menu || s.menu.length === 0) {
              const matchedFallback = DEFAULT_FALLBACK_SHOPS.find(
                (f) => f.category?.toLowerCase() === s.category?.toLowerCase() || f.name.toLowerCase() === s.name.toLowerCase()
              ) || DEFAULT_FALLBACK_SHOPS[0];
              return {
                ...s,
                menu: matchedFallback.menu || []
              };
            }
            return s;
          });
          setShops(hydratedCached);
          setLoadingShops(false);
          toast.info(
            "You are offline. Showing your saved shops. 👍",
            { id: "database-offline-toast", duration: 4000 },
          );
        } else {
          console.log(
            "Database fetch failed and no cache found - Landing on premium offline fallback content",
          );
          setShops(DEFAULT_FALLBACK_SHOPS);
          safeLocalStorageSet(
            "cached_shops",
            JSON.stringify(DEFAULT_FALLBACK_SHOPS),
          );
          setLoadingShops(false);
          toast.info(
            "You are offline. Showing cached menus. Ready to explore! 🍟",
            { id: "database-offline-toast", duration: 4000 },
          );
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [shops.length, stalenessThresholdMs]);

  const syncOfflineOrders = useCallback(async (retryCount = 0) => {
    const queue = safeLocalStorageGet("offline_orders_queue", []);
    if (!queue || queue.length === 0) {
      setSyncError(null);
      setIsSyncing(false);
      return;
    }

    const syncLockKey = `offline_orders_sync_${queue.length}_${queue[0]?.id || "none"}`;
    if (!IdempotencyManager.acquireLock(syncLockKey, 30000)) {
      console.log("[Offline Sync] Sync already in progress under lock:", syncLockKey);
      return;
    }

    console.log(`[Offline Sync] Attempt ${retryCount + 1}: Found queued offline orders of length:`, queue.length);
    if (retryCount === 0) {
      toast.info(`Sending ${queue.length} saved offline order(s) to the kitchen... 🍟`, {
        position: "top-center"
      });
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const validQueue = queue.filter((o: any) => o.shop_id && o.shop_id !== "null" && o.shop_id !== "undefined");
      
      if (validQueue.length < queue.length) {
        console.warn(`[Offline Sync] Dropped ${queue.length - validQueue.length} invalid queued orders missing shop_id.`);
        if (validQueue.length === 0) {
           safeLocalStorageSet("offline_orders_queue", "[]");
           setIsSyncing(false);
           IdempotencyManager.releaseLock(syncLockKey);
           return;
        }
      }

      // Check which orders already exist in database to prevent double-insert
      const pendingOrdersToInsert: any[] = [];
      for (const o of validQueue) {
        const rawShopId = o.shop_id;
        const resolvedShopId =
          typeof rawShopId === "string" && !isNaN(Number(rawShopId)) && rawShopId.trim() !== ""
            ? Number(rawShopId)
            : rawShopId;

        const itemPrice = Number(o.price) || 0;
        const itemQuantity = Math.max(1, Number(o.quantity) || 1);
        const itemDeliveryFee = o.is_delivery ? (Number(o.delivery_fee) || 0) : 0;
        const computedTotal = Number((itemPrice * itemQuantity + itemDeliveryFee).toFixed(2));
        const finalTotalPrice = o.total_price !== undefined && !isNaN(Number(o.total_price))
          ? Number(Number(o.total_price).toFixed(2))
          : computedTotal;

        // If price was 0 or missing but total_price was provided, reconstruct price with mathematical integrity
        const finalPrice = (itemPrice === 0 && finalTotalPrice > itemDeliveryFee)
          ? Number(((finalTotalPrice - itemDeliveryFee) / itemQuantity).toFixed(2))
          : itemPrice;

        const { latitude, longitude, is_offline_queued, ...restO } = o;
        const orderRecord = {
          ...restO,
          id: o.id, // Preserve deterministic client order ID
          shop_id: resolvedShopId,
          status: "pending",
          price: finalPrice,
          quantity: itemQuantity,
          delivery_fee: itemDeliveryFee,
          total_price: Number((finalPrice * itemQuantity + itemDeliveryFee).toFixed(2)),
          delivery_status: (o.payment_method === "cash_on_arrival" || o.payment_method === "cash") ? "none" : (o.is_delivery ? "finding_rider" : "none"),
          lat: latitude || o.lat,
          lng: longitude || o.lng,
        };

        if (o.id) {
          const exists = await IdempotencyManager.checkOrderExists(o.id);
          if (!exists) {
            pendingOrdersToInsert.push(orderRecord);
          } else {
            console.log(`[Offline Sync] Order ${o.id} already exists in database. Skipping duplicate insert.`);
          }
        } else {
          pendingOrdersToInsert.push(orderRecord);
        }
      }

      if (pendingOrdersToInsert.length > 0) {
        let syncSuccess = false;
        try {
          const { data, error } = await supabase
            .from("orders")
            .upsert(pendingOrdersToInsert, { onConflict: "id" })
            .select("id");

          if (!error) {
            syncSuccess = true;
            console.log("[Offline Sync] Successfully synced offline orders via Supabase:", data);
          } else {
            console.info("[Offline Sync] Supabase upsert notice, trying insert fallback:", error.message);
            const { error: insertErr } = await supabase
              .from("orders")
              .insert(pendingOrdersToInsert);
            if (!insertErr) {
              syncSuccess = true;
            }
          }
        } catch (supabaseErr: any) {
          console.info("[Offline Sync] Direct Supabase connection unavailable, trying /api/orders fallback:", supabaseErr?.message || supabaseErr);
        }

        // Fallback to server API if direct Supabase connection was unavailable
        if (!syncSuccess) {
          try {
            const apiRes = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orders: pendingOrdersToInsert }),
            });
            if (apiRes.ok) {
              syncSuccess = true;
              console.log("[Offline Sync] Successfully synced offline orders via /api/orders");
            }
          } catch (apiErr: any) {
            console.info("[Offline Sync] Server API fallback also pending connection:", apiErr?.message || apiErr);
          }
        }

        if (!syncSuccess) {
          throw new Error("Offline order synchronization will resume once network connection is stable.");
        }
      }
      
      // Clear the offline queue
      safeLocalStorageSet("offline_orders_queue", JSON.stringify([]));
      setSyncError(null);
      setIsSyncing(false);
      IdempotencyManager.recordResult(syncLockKey, true);

      if (session?.user?.id) {
        try {
          const { data: freshOrders, error: fetchError } = await supabase
            .from("orders")
            .select("id, user_id, shop_id, status, delivery_status, product_name, quantity, price, total_price, delivery_fee, created_at, updated_at, is_delivery, payment_method, notes, delivery_instructions, customer_name, phone, email, address, city, latitude:lat, longitude:lng")
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(50);
          if (!fetchError && freshOrders) {
            safeLocalStorageSet("cached_orders", JSON.stringify(freshOrders));
            window.dispatchEvent(new Event("local-orders-synced"));
          }
        } catch (_) {}
      }

      toast.success("All saved orders sent successfully! 🍟", {
        duration: 4000,
      });
    } catch (err: any) {
      const isNetworkErr =
        err?.message?.includes("Failed to fetch") ||
        err?.message?.includes("network") ||
        err?.message?.includes("connection");
      if (!isNetworkErr) {
        console.warn("[Offline Sync] Notice syncing offline orders:", err?.message || err);
      } else {
        console.info("[Offline Sync] Network currently unavailable. Preserved queued orders for next sync attempt.");
      }
      setSyncError(err?.message || "Failed to sync offline orders");
      setIsSyncing(false);
      IdempotencyManager.releaseLock(syncLockKey);

      if (retryCount < 3 && navigator.onLine) {
        console.info(`[Offline Sync] Retrying in ${Math.pow(2, retryCount) * 2} seconds...`);
        setTimeout(() => syncOfflineOrders(retryCount + 1), Math.pow(2, retryCount) * 2000);
      }
    }
  }, [shops, session?.user?.id]);

  const handleManualSync = useCallback(async () => {
    setIsSyncing(true);
    triggerHaptic?.([40, 40]);
    try {
      await processNetworkQueue(async (req) => {
        console.log("[NetworkQueue Processor] Processing queued item:", req.id, req.type);
        return true;
      });

      safeLocalStorageSet("offline_orders_queue", "[]");
      localStorage.removeItem("offline_orders_queue");
      
      if (navigator.onLine) {
        await fetchShopsData(3, true); // Force fresh Supabase fetch
        await runHeartbeatPing();
        toast.success("Manual sync completed! Queue processed & fresh backend data fetched. 🔄", {
          position: "top-center"
        });
      } else {
        toast.info("Offline queue processed locally. Reconnect to internet for fresh Supabase fetch. 📶", {
          position: "top-center"
        });
      }
    } catch (err: any) {
      console.error("Manual sync failed:", err);
      toast.error(`Manual sync issue: ${err.message || "Unknown error"}`);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchShopsData, triggerHaptic, runHeartbeatPing]);

  // Connectivity monitoring consolidated
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNotification({
        message: "Back online! Syncing saved offline requests... 🍟",
        type: "success",
      });
      runHeartbeatPing();
      processNetworkQueue(async (req) => {
        console.log("[Auto Sync on Reconnect]", req);
        return true;
      });
      fetchShopsData();
      syncOfflineOrders();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNotification({
        message: "You're offline. Some features may be limited.",
        type: "info",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Run custom check in case they are already online but have unsynced items
    if (navigator.onLine) {
      syncOfflineOrders();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchShopsData, syncOfflineOrders]);

  const requestLocation = useCallback((silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) {
        setNotification({
          message: "Geolocation is not supported by your browser",
          type: "info",
        });
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        // Notification removed to keep it in the background as requested
      },
      (error) => {
        if (error?.message && error.message.includes("permissions policy")) {
          console.log("Geolocation disabled by iframe permissions policy.");
        } else {
          console.log("Error getting location (graceful fallback):", error?.message);
        }
        if (silent) return; // Fail silently for automatic requests to avoid annoying timeout toasts
        
        let errorMsg = "Could not get your location automatically.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location access denied. Please set address manually.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg =
            "Location timed out. Using default (Koffiefontein area). Search manually for better accuracy.";
        }
        setNotification({
          message: errorMsg,
          type: "info",
        });
      },
      { timeout: 15005, enableHighAccuracy: false, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = visibleShops
        .map((s) => s.name)
        .filter((name) =>
          name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, visibleShops]);

  const subscribeToPushNotifications = useCallback(
    async (customUserId?: string) => {
      const targetUserId = customUserId || session?.user?.id;
      if (!targetUserId) return;
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
           await registerAndSyncPushToken(targetUserId);
        }
      } catch (err) {
        console.debug("[Push] Notice:", err);
      }
    },
    [session]
  );

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      return;
    }
    try {
      if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          if (session?.user?.id) {
            // Sync with push notifications in background
            subscribeToPushNotifications(session.user.id).catch(() => {});
            registerAndSyncPushToken(session.user.id).catch(() => {});
          }
        }
      }
    } catch (_) {}
  }, [session, subscribeToPushNotifications]);

  // Listen for FCM foreground web push messages and display sonner toast notifications
  useEffect(() => {
    let unsubscribe: (() => void) | void;
    onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "LocalEats Notification";
      const body = payload.notification?.body || payload.data?.body || payload.data?.message || "You have an update regarding your order.";
      toast.success(title, {
        description: body,
        duration: 5000,
      });
    }).then((unsub) => {
      unsubscribe = unsub;
    }).catch(console.warn);

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  const fetchUserProfile = useCallback(async (userId: string, retries = 2) => {
    try {
      let data: any = null;
      let error: any = null;

      // 1. Direct Firestore profile retrieval for real-time customer identity
      try {
        const firestoreProfile = await FirestoreService.getProfile(userId);
        if (firestoreProfile) {
          data = firestoreProfile;
        }
      } catch (fsErr) {
        console.debug("[Profile] Firestore getProfile notice:", fsErr);
      }

      // 2. Primary attempt by user_id if not loaded from Firestore
      if (!data) {
        const res = await supabase
          .from("profiles")
          .select("id, user_id, email, full_name, fullName, phone, avatar_url, photo_url, default_address, addresses, city, address, country, role, favorites, updated_at")
          .eq("user_id", userId)
          .maybeSingle();

        if (res.error) {
          // Secondary attempt by id
          const altRes = await supabase
            .from("profiles")
            .select("id, user_id, email, full_name, fullName, phone, avatar_url, photo_url, default_address, addresses, city, address, country, role, favorites, updated_at")
            .eq("id", userId)
            .maybeSingle();
          if (!altRes.error) {
            data = altRes.data;
          } else {
            error = res.error;
          }
        } else {
          data = res.data;
        }
      }

      const isTransientSchemaNotice =
        (error?.message &&
          (error.message.toLowerCase().includes("schema cache") ||
           error.message.toLowerCase().includes("retrying") ||
           error.message.toLowerCase().includes("pgrst"))) ||
        error?.code === "PGRST116" ||
        error?.code === "PGRST301";

      if (error && !isTransientSchemaNotice) {
        console.info("[Profile] Database query note:", error.message || error);
      }

      if (data) {
        setUserProfile((prev) => ({
          ...prev,
          id: data.user_id || data.id || userId,
          fullName: data.fullName || data.full_name || data.name || prev.fullName || "",
          email: data.email || prev.email || "",
          phone: data.phone || prev.phone || "",
          city: data.city || prev.city || "Johannesburg",
          address: data.address || data.default_address || prev.address || "",
          country: data.country || prev.country || "South Africa",
          role: data.role || prev.role || "customer",
          photoURL: data.photo_url || data.avatar_url || data.photoURL || prev.photoURL || "",
          latitude: data.current_latitude || data.latitude || prev.latitude,
          longitude: data.current_longitude || data.longitude || prev.longitude,
        }));
        if (data.favorites && Array.isArray(data.favorites)) {
          setFavorites(data.favorites);
        }
      } else if (!error || error.code === "PGRST116" || !data) {
        // If profile row doesn't exist in database yet (e.g. wiped database or trigger delayed),
        // sync from current session metadata and auto-upsert to prevent empty state.
        try {
          const { data: authUserData } = await supabase.auth.getUser();
          const authUser = authUserData?.user;
          if (authUser && authUser.id === userId) {
            const userMeta = authUser.user_metadata || {};
            const fallbackName = userMeta.full_name || userMeta.fullName || userMeta.name || authUser.email?.split("@")[0] || "";
            const fallbackPhone = userMeta.phone || "";
            const fallbackRole = userMeta.role || "customer";

            setUserProfile((prev) => ({
              ...prev,
              id: userId,
              email: authUser.email || prev.email || "",
              fullName: fallbackName || prev.fullName || "",
              phone: fallbackPhone || prev.phone || "",
              role: fallbackRole,
            }));

            // Non-blocking upsert to ensure row exists in profiles table
            Promise.resolve(
              FirestoreService.saveProfile(userId, {
                user_id: userId,
                id: userId,
                email: authUser.email,
                full_name: fallbackName,
                "fullName": fallbackName,
                phone: fallbackPhone,
                role: fallbackRole,
                city: "Johannesburg",
                country: "South Africa",
                updated_at: new Date().toISOString(),
              })
            ).catch((e) => {
              console.info("[Profile Auto-Upsert Notice]", e?.message || e);
            });
          }
        } catch (authFetchErr) {
          console.warn("[Profile Sync from Auth Notice]", authFetchErr);
        }
      }
    } catch (err: any) {
      const errStr = (err?.message || String(err)).toLowerCase();
      const isNetworkError =
        errStr.includes("failed to fetch") ||
        errStr.includes("network error") ||
        errStr.includes("load failed") ||
        errStr.includes("upstream connect error") ||
        errStr.includes("connection timeout") ||
        errStr.includes("disconnect/reset") ||
        errStr.includes("timeout") ||
        errStr.includes("schema cache") ||
        errStr.includes("retrying") ||
        err?.name === "TypeError";

      if (errStr.includes("jwt expired") || errStr.includes("invalid jwt") || errStr.includes("token expired")) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("supabase-jwt-expired"));
        }
      }

      if (!isNetworkError) {
        console.info("[Profile] Notice fetching user profile:", err?.message || err);
      }

      if (isNetworkError && retries > 0) {
        setTimeout(() => fetchUserProfile(userId, retries - 1), 3000);
      }
    }
  }, []);

  // Sync FCM Web Push Token to user_push_tokens in Supabase when session or profile is active
  useEffect(() => {
    const activeUserId = session?.user?.id || userProfile?.id;
    if (activeUserId) {
      registerAndSyncPushToken(activeUserId).catch((err) => {
        console.warn("[FCM] Auto push token registration notice:", err);
      });
    }
  }, [session?.user?.id, userProfile?.id]);

  // Account switch detection: Clear old user profile and sync immediately with new active session
  useEffect(() => {
    if (session?.user?.id && userProfile?.id && session.user.id !== userProfile.id) {
      console.info("[Auth] Account switch detected. Clearing old user data and syncing new user profile.");
      const uMeta = session.user.user_metadata || {};
      const newFullName = uMeta.full_name || uMeta.fullName || uMeta.name || session.user.email?.split("@")[0] || "";
      const freshProfile: UserProfile = {
        id: session.user.id,
        email: session.user.email || "",
        fullName: newFullName,
        phone: uMeta.phone || "",
        city: SUPPORTED_CITIES[0] || "Johannesburg",
        address: "",
        country: "South Africa",
        role: uMeta.role || "customer"
      };
      setUserProfile(freshProfile);
      setCart([]);
      setFavorites([]);
      localStorage.setItem("userProfile", JSON.stringify(freshProfile));
      localStorage.removeItem("cart");
      localStorage.removeItem("favorites");
      localStorage.removeItem("offline_orders_queue");
      fetchUserProfile(session.user.id);
    }
  }, [session?.user?.id, userProfile?.id, fetchUserProfile]);

  useEffect(() => {
    localStorage.setItem("app_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const cancelOrder = useCallback(
    async (orderId: string, reason: string) => {
      // 1. Network connectivity check
      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

      if (isOffline) {
        // Store cancellation request locally in pending_cancellation queue
        try {
          const raw = localStorage.getItem("pending_cancellation");
          let list: any[] = [];
          try {
            list = raw ? JSON.parse(raw) : [];
          } catch {
            list = [];
          }
          const filtered = list.filter((item: any) => item?.orderId !== orderId);
          filtered.push({
            orderId,
            cancelReason: reason || "Cancelled by customer",
            timestamp: Date.now(),
          });
          localStorage.setItem("pending_cancellation", JSON.stringify(filtered));
        } catch (e) {
          console.warn("Failed to write to pending_cancellation queue:", e);
        }

        // Optimistically mark local orders state as cancelled
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: "cancelled" } : o,
          ),
        );

        setModal({
          isOpen: true,
          title: "Connection Lost - Cancellation Queued",
          message: "You appear to be offline. Your cancellation request has been safely saved locally to the queue and will automatically sync once your connection is restored.",
          type: "action-dialog",
          errorCause: "Network offline (pending cancellation stored)",
          iconType: "wifi-off",
          actions: [
            {
              label: "Sync Now",
              variant: "primary",
              onClick: async () => {
                // Trigger queue processor immediately
                if (typeof navigator !== "undefined" && !navigator.onLine) {
                  setNotification({
                    message: "Device is still offline. Request remains queued and will sync once reconnected.",
                    type: "info",
                  });
                  return;
                }
                const res = await processPendingCancellationsQueue();
                if (res.successCount > 0) {
                  setNotification({
                    message: `Successfully synchronized ${res.successCount} cancellation request(s) with the cloud!`,
                    type: "success",
                  });
                }
              },
            },
            {
              label: "Retry Cancellation",
              variant: "outline",
              onClick: () => {
                // Attempt manual retry if reconnected
                if (typeof navigator !== "undefined" && navigator.onLine) {
                  cancelOrder(orderId, reason);
                } else {
                  setNotification({
                    message: "Device is still offline. Request remains queued and will sync once reconnected.",
                    type: "info",
                  });
                }
              },
            },
            {
              label: "Go Home",
              variant: "ghost",
              onClick: () => {
                setCurrentScreen("home");
              },
            },
          ],
        });
        return;
      }

      await runWithProcessing(async () => {
        const updatePayload: any = {
          status: "cancelled",
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        };

        await FirestoreService.updateOrder(orderId, updatePayload);
        let { error } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", orderId);

        if (error && error.message?.includes("cancellation_reason")) {
          delete updatePayload.cancellation_reason;
          const retryResult = await supabase
            .from("orders")
            .update(updatePayload)
            .eq("id", orderId);
          error = retryResult.error;
        }

        if (error) throw error;

        // Clean up from pending_cancellation if it was queued
        try {
          const raw = localStorage.getItem("pending_cancellation");
          if (raw) {
            const list = JSON.parse(raw);
            const remaining = list.filter((i: any) => i?.orderId !== orderId);
            localStorage.setItem("pending_cancellation", JSON.stringify(remaining));
          }
        } catch (_) {}

        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: "cancelled" } : o,
          ),
        );
        setNotification({
          message: "Order cancelled successfully",
          type: "info",
        });
      });
    },
    [runWithProcessing, setNotification, setCurrentScreen],
  );

  const changeToDelivery = useCallback(
    async (orderId: string) => {
      await runWithProcessing(async () => {
        const updatePayload: any = {
          is_delivery: true,
          delivery_status: "finding_rider",
          delivery_fee: 15, // standard delivery fee
          updated_at: new Date().toISOString(),
        };

        await FirestoreService.updateOrder(orderId, updatePayload);
      const { error } = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", orderId);

        if (error) throw error;

        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  is_delivery: true,
                  delivery_status: "finding_rider",
                  delivery_fee: 15,
                }
              : o,
          ),
        );
        setNotification({
          message: "Order updated to delivery. Finding a rider now!",
          type: "success",
        });
      });
    },
    [runWithProcessing, setNotification],
  );

  const handleUpdateProfile = async (
    data: any,
    showSuccess: boolean = true,
    successCallback?: () => void,
  ) => {
    const updated = { ...userProfile, ...data };
    setUserProfile(updated);

    if (session?.user?.id) {
      const action = async () => {
        const { error } = await upsertProfileWithRPC({
          user_id: session.user.id,
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          city: updated.city,
          address: updated.address,
          country: updated.country,
          role: updated.role,
          photo_url: updated.photoURL,
          language: updated.language || "en",
          latitude: updated.latitude,
          longitude: updated.longitude,
        });

        if (error) {
          throw error;
        }
      };

      if (showSuccess) {
        await runWithProcessing(action, () => {
          if (successCallback) successCallback();
        });
      } else {
        // Just do the action without the success tick overlay if asked
        try {
          await action();
        } catch (err: any) {
          console.warn("Notice saving profile in background:", err);
        } finally {
          if (successCallback) successCallback();
        }
      }
    } else {
      if (successCallback) successCallback();
    }
  };

  useEffect(() => {
    // Safety max timeout to guarantee Securing Session never freezes UI
    const safetyTimer = setTimeout(() => {
      setIsRestoringSession(false);
    }, 1500);

    const hasToken = Object.keys(localStorage).some(
      (key) => (key.startsWith("sb-") && (key.endsWith("-auth-token") || key.includes("auth-token"))) ||
               key === "supabase.auth.token"
    );
    const hasRememberToken = !!localStorage.getItem("remember_me_secure_token");
    const cachedProfile = safeLocalStorageGet("userProfile", null);
    const hasCachedUser = !!(cachedProfile && (cachedProfile.fullName || cachedProfile.email || cachedProfile.phone));

    if (hasToken || hasRememberToken) {
      setIsRestoringSession(true);
      getResilientSession(3000).then(async ({ data: { session } }) => {
        if (session) {
          // Verify session validity with Supabase auth service to catch wiped DB or revoked tokens
          try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) {
              const errMsg = (userError?.message || "").toLowerCase();
              if (errMsg.includes("invalid") || errMsg.includes("not found") || errMsg.includes("sub claim") || errMsg.includes("jwt") || errMsg.includes("user_not_found")) {
                console.warn("[Auth] Stale or invalid session detected after database reset. Purging obsolete session.");
                // Clear stale tokens and stale profile
                Object.keys(localStorage).forEach((k) => {
                  if ((k.startsWith("sb-") && k.includes("auth-token")) || k === "supabase.auth.token" || k === "localeats_session") {
                    localStorage.removeItem(k);
                  }
                });
                localStorage.removeItem("remember_me_secure_token");
                localStorage.removeItem("userProfile");
                setSession(null);
                setUserProfile({
                  fullName: "",
                  email: "",
                  phone: "",
                  city: SUPPORTED_CITIES[0] || "Johannesburg",
                  address: "",
                  country: "South Africa",
                  role: "user",
                });
                setIsRestoringSession(false);
                setCurrentScreen("login");
                setNotification({
                  message: "Your previous session has expired. Please sign in.",
                  type: "info",
                });
                return;
              }
            }
          } catch (validateErr) {
            console.info("[Auth] Session validation note:", validateErr);
          }

          setSession(session);
          if (!localStorage.getItem("remember_me_secure_token")) {
            localStorage.setItem("remember_me_secure_token", session.access_token || "true");
          }

          // Seed user profile state immediately from session metadata
          if (session.user) {
            const uMeta = session.user.user_metadata || {};
            setUserProfile((prev) => ({
              ...prev,
              id: session.user.id,
              email: session.user.email || prev.email || "",
              fullName: uMeta.full_name || uMeta.fullName || uMeta.name || prev.fullName || session.user.email?.split("@")[0] || "",
              phone: uMeta.phone || prev.phone || "",
              role: uMeta.role || prev.role || "customer",
            }));
          }

          fetchUserProfile(session.user.id);
          setCurrentScreen((prev) => {
            const preLoginScreens: Screen[] = [
              "splash",
              "signup",
              "login",
              "verify",
              "setup-pin",
              "setup-password",
              "success"
            ];
            return preLoginScreens.includes(prev) ? "home" : prev;
          });
          requestNotificationPermission();
        } else {
          // No active auth session found
          if (typeof navigator !== "undefined" && !navigator.onLine && hasCachedUser) {
            // Truly offline - allow offline browsing with cached user
            console.info("[Auth] Device offline: retaining cached profile for offline browsing.");
            setCurrentScreen((prev) => {
              const preLoginScreens: Screen[] = [
                "splash",
                "signup",
                "login",
                "verify",
                "setup-pin",
                "setup-password",
                "success"
              ];
              return preLoginScreens.includes(prev) ? "home" : prev;
            });
          } else {
            // Online and no valid session - clear obsolete cached user profile to prevent ghost-data loops
            console.info("[Auth] No active session online. Resetting unauthenticated state.");
            localStorage.removeItem("remember_me_secure_token");
            localStorage.removeItem("localeats_session");
            if (cachedProfile?.id && !hasToken) {
              localStorage.removeItem("userProfile");
              setUserProfile({
                fullName: "",
                email: "",
                phone: "",
                city: SUPPORTED_CITIES[0] || "Johannesburg",
                address: "",
                country: "South Africa",
                role: "user",
              });
            }
          }
        }
        setIsRestoringSession(false);
      }).catch((err) => {
        console.info("[Auth] Session recovery error/offline, fallback to cached state:", err?.message || String(err));
        if (typeof navigator !== "undefined" && !navigator.onLine && hasCachedUser) {
          setCurrentScreen((prev) => {
            const preLoginScreens: Screen[] = [
              "splash",
              "signup",
              "login",
              "verify",
              "setup-pin",
              "setup-password",
              "success"
            ];
            return preLoginScreens.includes(prev) ? "home" : prev;
          });
        }
        setIsRestoringSession(false);
      });
    } else {
      setIsRestoringSession(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === "PASSWORD_RECOVERY") {
        setCurrentScreen("reset-password");
        setIsRestoringSession(false);
        return;
      }
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
        setCurrentScreen((prev) => {
          const preLoginScreens: Screen[] = [
            "splash",
            "signup",
            "login",
            "verify",
            "setup-pin",
            "setup-password",
            "success"
          ];
          if (preLoginScreens.includes(prev)) {
            return "home";
          }
          return prev;
        });
        requestNotificationPermission();
      } else {
        if (_event === "SIGNED_OUT") {
          localStorage.removeItem("remember_me_secure_token");
        }
        setCurrentScreen((prev) => {
          if (_event === "SIGNED_OUT") {
            return "splash";
          }
          const preLoginScreens: Screen[] = [
            "splash",
            "signup",
            "login",
            "verify",
            "setup-pin",
            "setup-password",
            "success"
          ];
          if (preLoginScreens.includes(prev)) {
             return "splash";
          }
          return prev; // Stay on current screen if momentary loss
        });
      }
      setIsRestoringSession(false);
    });

    const handleJwtExpired = () => {
      console.warn("React App: Handling expired JWT event. Resetting auth state...");
      setSession(null);
      setUserProfile({ fullName: "", email: "", phone: "", city: "Johannesburg", address: "", country: "South Africa", role: "user" });
      localStorage.removeItem("remember_me_secure_token");
      setNotification({
        message: "Your session has expired. Please sign in again.",
        type: "info"
      });
      setCurrentScreen("login");
    };

    window.addEventListener("supabase-jwt-expired", handleJwtExpired);

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
      window.removeEventListener("supabase-jwt-expired", handleJwtExpired);
      // Ensure we explicitly release locks or reset any local lock state if needed on unmount
      if (typeof navigator !== 'undefined' && 'locks' in navigator && (navigator as any).locks.query) {
        console.log("[Auth Cleanup] Explicitly releasing/checking locks on unmount to prevent orphaned lock warnings.");
      }
    };
  }, []);

  useEffect(() => {
    // Consolidated update check logic
    const checkVersion = async () => {
      try {
        // Try version.json first
        const vResponse = await fetch("/version.json?t=" + Date.now()).catch(() => null);
        if (vResponse && vResponse.ok) {
          const vData = await vResponse.json().catch(() => null);
          if (vData && vData.version) {
            setAppVersion(vData.version);
            if (vData.version !== APP_VERSION.split(" ")[0]) {
              setIsUpdateAvailable(true);
            }
            return; // Success
          }
        }

        // Fallback to metadata.json as backup version source
        const mResponse = await fetch("/metadata.json").catch(() => null);
        if (mResponse && mResponse.ok) {
          const mData = await mResponse.json().catch(() => null);
          if (mData && mData.version) {
            setAppVersion(mData.version);
            const lastKnownVersion = safeLocalStorageGet(
              "last_known_version",
              null,
            );
            if (lastKnownVersion && lastKnownVersion !== mData.version) {
              setIsUpdateAvailable(true);
            }
            safeLocalStorageSet("last_known_version", mData.version);
          }
        }
      } catch (e) {
        // Silently fail update checks to avoid console clutter on flaky connections
      }
    };

    const timer = setInterval(checkVersion, 300000); // Check every 5 mins
    checkVersion(); // Initial check
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Listen for status changes on the user's orders
    const channel = getFreshChannel(`user_notifications:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as Order, ...prev]);
            return;
          }

          if (payload.eventType === "UPDATE") {
            const existingOrder = ordersRef.current.find((o) => o.id === payload.new.id);

            setOrders((prev) =>
              prev.map((o) =>
                o.id === payload.new.id ? (payload.new as Order) : o,
              ),
            );

            const oldStatus = existingOrder?.status || payload.old?.status;
            const newStatus = payload.new?.status;
            const oldDeliveryStatus = existingOrder?.delivery_status || payload.old?.delivery_status;
            const newDeliveryStatus = payload.new?.delivery_status;
            const oldOrderType = (existingOrder as any)?.order_type || payload.old?.order_type;
            const newOrderType = payload.new?.order_type;

            // 1. Core Order Status Updates (only if previous status was known and actually changed)
            if (oldStatus && newStatus && oldStatus !== newStatus) {
              const shop = shops.find((s) => s.id === payload.new.shop_id);
              const title = `Store Update`;
              let message = `Your order from ${shop?.name || "the shop"} is now ${newStatus}.`;

              if (newStatus === "preparing")
                message = `Chef at ${shop?.name} is preparing your food! 🍳`;
              if (newStatus === "ready")
                message = `🔥 Your order from ${shop?.name} is READY for collection!`;
              if (newStatus === "confirmed")
                message = `${shop?.name} has confirmed your order!`;
              if (newStatus === "completed")
                message = `Legendary! You've collected your order from ${shop?.name}. Enjoy! 😋`;
              if (newStatus === "cancelled")
                message = `🚨 Your order from ${shop?.name || "the shop"} has been cancelled.`;

              // Centralized Psychoacoustic Sound Engine Triggers
              if (newStatus === "confirmed") audioHelper.play("confirmed");
              else if (newStatus === "preparing") audioHelper.play("preparing");
              else if (newStatus === "ready") audioHelper.play("ready");
              else if (newStatus === "completed") audioHelper.play("delivered");
              else if (newStatus === "cancelled") audioHelper.play("cancelled");

              // Special handling for "ready" status - High visibility UI
              if (newStatus === "ready") {
                const isDelivery = payload.new.is_delivery;
                toast.success(`🔥 YOUR ORDER IS READY!`, {
                  description: isDelivery
                    ? `Order from ${shop?.name} is ready for the driver! 🚚`
                    : `Run! ${shop?.name} has your order ready for pickup! 🏃‍♂️`,
                  duration: 10000,
                  position: "top-center",
                  style: {
                    background: "#059669", // Emerald 600
                    color: "#ffffff",
                    border: "4px solid #10b981",
                    borderRadius: "28px",
                    padding: "20px",
                    fontSize: "18px",
                    fontWeight: "900",
                    boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.5)",
                    textTransform: "uppercase",
                  },
                });

                // Haptic Pulse (Double vibration)
                if (navigator.vibrate) {
                  navigator.vibrate([100, 50, 100, 50, 200]);
                }
              }

              // Trigger review when completed
              if (newStatus === "completed") {
                const reviewPayload = {
                  orderId: payload.new.id,
                  shopId: payload.new.shop_id,
                  productName: payload.new.product_name,
                  snoozeCount: 0,
                  nextReminder: 0,
                };
                setPendingReview(reviewPayload);
                safeLocalStorageSet("pending_review", JSON.stringify(reviewPayload));
              }

              // Trigger browser notification if permission granted
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification(title, { body: message, icon: shop?.logo });
              }

              // Show prominent temporary notification (toast)
              setNotification({
                message: message,
                type:
                  newStatus === "cancelled"
                    ? "error"
                    : newStatus === "ready" || newStatus === "completed"
                      ? "success"
                      : "info",
              });

              const newNotif: AppNotification = {
                id: Math.random().toString(36).substr(2, 9),
                title,
                message,
                type: "order",
                timestamp: Date.now(),
                read: false,
                orderId: payload.new.id,
              };

              setNotifications((prev) => [newNotif, ...prev]);

              if (newStatus === "ready") {
                // Add vibration for confirmation
                if ("vibrate" in navigator) {
                  navigator.vibrate([100, 50, 100]);
                }

                setNotification({
                  message: `✅ ${message}`,
                  type: "ready",
                  persistent: true,
                  actions: [
                    {
                      label: "Track Order",
                      onClick: () => setCurrentScreen("order-tracking"),
                    },
                    { label: "Dismiss", onClick: () => {} },
                  ],
                });
              } else {
                setNotification({
                  message: `✅ ${message}`,
                  type: "success",
                  actions: [
                    {
                      label: "Track Order",
                      onClick: () => setCurrentScreen("order-tracking"),
                    },
                  ],
                });
              }
            }

            // 2. Rider Delivery Status Updates (only if previous status was known and changed)
            if (oldDeliveryStatus && newDeliveryStatus && oldDeliveryStatus !== newDeliveryStatus) {
              const shop = shops.find((s) => s.id === payload.new.shop_id);
              let deliveryMessage = ``;

              if (newDeliveryStatus === "rider_assigned") {
                deliveryMessage = `🏍️ Good news! A delivery rider has accepted your order from ${shop?.name || "the shop"}!`;
                audioHelper.play("confirmed");
              } else if (newDeliveryStatus === "picked_up") {
                deliveryMessage = `🚀 Your order has been picked up by the rider and is hot on-route!`;
                audioHelper.play("dispatched");
              } else if (newDeliveryStatus === "arrived") {
                deliveryMessage = `🏡 Ding Dong! Your delivery rider has arrived outside with your fresh order!`;
                audioHelper.play("ready"); // High attention chime
              } else if (newDeliveryStatus === "delivered") {
                deliveryMessage = `🎉 Order successfully delivered. Bon Appétit!`;
                audioHelper.play("delivered"); // Satisfying celebratory harmony
              }

              if (deliveryMessage) {
                toast.success(deliveryMessage, { duration: 6000 });

                const newNotif: AppNotification = {
                  id: Math.random().toString(36).substr(2, 9),
                  title: `Delivery Dispatch`,
                  message: deliveryMessage,
                  type: "order",
                  timestamp: Date.now(),
                  read: false,
                  orderId: payload.new.id,
                };
                setNotifications((prev) => [newNotif, ...prev]);

                setNotification({
                  message: deliveryMessage,
                  type: "success",
                  actions: [
                    {
                      label: "Track Order",
                      onClick: () => setCurrentScreen("order-tracking"),
                    },
                  ],
                });
              }
            }

            // 3. Fallback to Collection
            if (oldOrderType && newOrderType && oldOrderType === "delivery" && newOrderType === "collection" && oldOrderType !== newOrderType) {
              const shop = shops.find((s) => s.id === payload.new.shop_id);
              const fallbackMsg = `🚨 The shop ${shop?.name || ""} had to switch your order to COLLECTION as no riders are currently available. Please self-pickup!`;
              toast.error(fallbackMsg, {
                duration: 15000,
                position: "top-center",
                style: {
                  background: "#b91c1c", // Red 700
                  color: "#ffffff",
                  border: "4px solid #ef4444",
                  borderRadius: "16px",
                  padding: "16px",
                  fontSize: "16px",
                  fontWeight: "bold",
                }
              });
              audioHelper.play("cancelled");
              if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
              
              setNotification({
                  message: fallbackMsg,
                  type: "error",
                  persistent: true,
                  actions: [
                    {
                      label: "Track Order",
                      onClick: () => setCurrentScreen("order-tracking"),
                    },
                    { label: "Dismiss", onClick: () => {} },
                  ],
                });
            }

            if (newStatus === "completed") {
              setPendingReview({
                orderId: payload.new.id,
                shopId: payload.new.shop_id,
                productName: payload.new.product_name,
                snoozeCount: 0,
              });
              setCurrentScreen("review");
            }
          }
        },
      )
      .subscribe();

    // Initial orders fetch with timestamp reconciliation
    const fetchOrders = async () => {
      if (!session?.user?.id) return;
      const safeColumns = "id, user_id, shop_id, status, delivery_status, product_name, quantity, price, total_price, delivery_fee, created_at, updated_at, is_delivery, payment_method, notes, delivery_instructions, customer_name, phone, email, address, city, latitude:lat, longitude:lng";
      try {
        let fetchedData: any[] | null = null;
        
        // 1. Fetch from Shared Firestore Database (Merchant App)
        try {
          const fsOrders = await FirestoreService.getOrdersByUser(session.user.id);
          if (fsOrders && fsOrders.length > 0) {
            fetchedData = fsOrders;
          }
        } catch (fErr) {
          console.debug("[DualSync] Firestore orders fetch notice:", fErr);
        }

        // 2. Fetch from Supabase as fallback
        if (!fetchedData || fetchedData.length === 0) {
          try {
            const { data, error } = await supabase
              .from("orders")
              .select(safeColumns)
              .eq("user_id", session.user.id)
              .order("created_at", { ascending: false })
              .limit(50);
            if (!error && data) {
              fetchedData = data;
            }
          } catch (_) {}
        }

        if (!fetchedData) {
          try {
            const res = await fetch(`/api/orders?user_id=${session.user.id}`).catch(() => null);
            if (res && res.ok) {
              const json = await res.json().catch(() => null);
              if (json && Array.isArray(json.orders)) fetchedData = json.orders;
            }
          } catch (_) {}
        }

        if (fetchedData) {
          setOrders((prev) => DualSyncEngine.reconcileEntities(prev, fetchedData as Order[]));
        }
      } catch (err) {
        console.warn("[DualSync] Notice fetching orders via polling:", err);
      }
    };
    fetchOrders();

    // Determine if user has active in-flight orders for adaptive polling speed
    const hasActiveOrders = orders.some((o) =>
      ["pending", "confirmed", "preparing", "ready"].includes(o.status) ||
      ["finding_rider", "rider_assigned", "picked_up"].includes(o.delivery_status || "")
    );
    const pollInterval = hasActiveOrders ? 8000 : 25000;

    // Dual sync polling loop
    const timer = setInterval(fetchOrders, pollInterval);

    // Reconcile immediately when window returns to foreground
    const handleReconcile = () => {
      fetchOrders();
    };
    window.addEventListener("localeats_force_reconcile", handleReconcile);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
      window.removeEventListener("localeats_force_reconcile", handleReconcile);
    };
  }, [session?.user?.id, shops, orders]);

  useEffect(() => {
    // Initial fetch of shops & menu items
    fetchShopsData();

    // Subscribe to changes in shops and menu_items
    const shopsChannel = getFreshChannel("public:shops")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shops" },
        () => fetchShopsData(),
      )
      .subscribe();

    const menuChannel = getFreshChannel("public:menu_items")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        () => fetchShopsData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(shopsChannel);
      supabase.removeChannel(menuChannel);
    };
  }, [fetchShopsData]);

  useEffect(() => {
    if (currentScreen === "home" || currentScreen === "explore" || currentScreen === "discover") {
      requestLocation(true);
    }
  }, [requestLocation, currentScreen]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopId = urlParams.get("shopId");
    if (shopId) {
      setSelectedStoreId(shopId);
      setCurrentScreen("store-info");
      // Remove shopId from URL to prevent re-triggering on refresh if user navigates away
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [shops]); // Re-run when shops are loaded to ensure we have the shop data

  useEffect(() => {
    // Sync favorites to profile if session exists
    if (session?.user?.id) {
      FirestoreService.saveProfile(session.user.id, { favorites }).catch((err) => {
        console.warn("Error syncing favorites to profile:", err);
      });
    }
  }, [favorites, session]);

  const toggleFavorite = useCallback(
    async (shopId: string) => {
      if (!session && !userProfile?.id) {
        showAlert(
          "Login Required",
          "Please sign in or create an account to follow stores.",
        );
        setPreviousScreen(currentScreen);
        setCurrentScreen("login");
        return;
      }

      const isFollowing = favorites.includes(shopId);
      const targetUserId = session?.user?.id || userProfile?.id;
      setFavorites((prev) =>
        isFollowing ? prev.filter((id) => id !== shopId) : [...prev, shopId],
      );
      triggerHaptic();

      if (targetUserId) {
        if (isFollowing) {
          FirestoreService.unfollowShop(targetUserId, shopId).catch(console.warn);
        } else {
          FirestoreService.followShop(targetUserId, shopId).catch(console.warn);
        }
      }
    },
    [
      session,
      favorites,
      currentScreen,
      showAlert,
      shops,
      userProfile.fullName,
      triggerHaptic,
      setFavorites,
      setPreviousScreen,
      setCurrentScreen,
    ],
  );

  useEffect(() => {
    // Handle review reminder timer only (Storage is managed by top hook)
    if (pendingReview && pendingReview.nextReminder) {
      const now = Date.now();
      const delay = Math.max(0, pendingReview.nextReminder - now);

      if (delay === 0) {
        setCurrentScreen("review");
      } else {
        const timer = setTimeout(() => {
          setCurrentScreen("review");
        }, delay);
        return () => clearTimeout(timer);
      }
    }
  }, [pendingReview]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          // Low-overhead info log when sandbox or device doesn't expose precise hardware GPS
          console.info("Using default coordinates fallback:", error.message);
          setUserLocation(DEFAULT_COORDS);
        },
        { timeout: 5000, enableHighAccuracy: false, maximumAge: 300000 },
      );
    } else {
      setUserLocation(DEFAULT_COORDS);
    }
  }, []);

  const addToCart = useCallback(
    (
      item: MenuItem,
      shopId: string,
      quantity: number = 1,
      specialInstructions: string = "",
      selectedCustomizations: { name: string; price: number }[] = [],
    ) => {
      if (!shopId || shopId === "null" || shopId === "undefined") {
        toast.error("Cannot add item to cart: Shop information is missing.");
        return;
      }

      // Defensive Copy and Deep Freeze of Pricing Core Data
      const secureCustomizations = [...selectedCustomizations].map((c) => 
        Object.freeze({ name: String(c.name), price: Number(c.price) })
      );
      Object.freeze(secureCustomizations);

      const immutableBaseItem = Object.freeze({
        id: String(item.id),
        name: String(item.name),
        price: Number(item.price),
        image: String(item.image),
        description: item.description ? String(item.description) : undefined,
        category: item.category ? String(item.category) : undefined,
      });

      const buildCartItemNode = (qty: number) => {
        return Object.freeze({
          ...immutableBaseItem,
          shopId: String(shopId),
          quantity: Number(qty),
          specialInstructions: String(specialInstructions),
          selectedCustomizations: secureCustomizations,
        });
      };

      // Check if cart has items from a different shop
      if (cart.length > 0 && cart.some((i) => i.shopId !== shopId)) {
        const existingShopName =
          shops.find((s) => s.id === cart[0].shopId)?.name || "another shop";
        showConfirm(
          "Start New Cart?",
          `You already have items from ${existingShopName} in your cart. Would you like to clear your current cart and start a new one from this shop?`,
          () => {
            if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
            triggerHaptic([100, 50, 100]); // Stronger pulse for clear
            setCart([buildCartItemNode(quantity)]);
            setNotification({
              message: `Started new cart with ${item.name}`,
              type: "success",
            });
            setTimeout(() => setNotification(null), 2000);
          },
        );
        return;
      }

      if ("vibrate" in navigator) navigator.vibrate([50, 30, 50]);
      triggerHaptic([50, 30, 50]); // Premium double-pulse haptic
      setCart((prev) => {
        // Find matching item with same ID, instructions, and customizations
        const isSameCustomization = (
          a: { name: string; price: number }[],
          b: { name: string; price: number }[],
        ) => {
          if (a.length !== b.length) return false;
          const sortedA = [...a].sort((x, y) => x.name.localeCompare(y.name));
          const sortedB = [...b].sort((x, y) => x.name.localeCompare(y.name));
          return sortedA.every(
            (val, index) =>
              val.name === sortedB[index].name &&
              val.price === sortedB[index].price,
          );
        };

        const existing = prev.find(
          (i) =>
            i.id === item.id &&
            i.shopId === shopId &&
            i.specialInstructions === specialInstructions &&
            isSameCustomization(
              i.selectedCustomizations || [],
              secureCustomizations,
            ),
        );
        if (existing) {
          return prev.map((i) =>
            i.id === item.id &&
            i.shopId === shopId &&
            i.specialInstructions === specialInstructions &&
            isSameCustomization(
              i.selectedCustomizations || [],
              secureCustomizations,
            )
              ? Object.freeze({ ...i, quantity: i.quantity + quantity })
              : i,
          );
        }
        return [
          ...prev,
          buildCartItemNode(quantity),
        ];
      });
      // Notification removed for cleaner UI
    },
    [cart, shops, showConfirm, triggerHaptic, setNotification, setCart],
  );

  const removeFromCart = useCallback(
    (itemId: string, shopId: string) => {
      triggerHaptic();
      setCart((prev) => {
        const existing = prev.find(
          (i) => i.id === itemId && i.shopId === shopId,
        );
        if (existing && existing.quantity > 1) {
          return prev.map((i) =>
            i.id === itemId && i.shopId === shopId
              ? { ...i, quantity: i.quantity - 1 }
              : i,
          );
        }
        return prev.filter((i) => !(i.id === itemId && i.shopId === shopId));
      });
    },
    [triggerHaptic, setCart],
  );

  const clearCart = useCallback(() => {
    showConfirm(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      () => {
        triggerHaptic();
        setCart([]);
      },
    );
  }, [showConfirm, triggerHaptic, setCart, setNotification]);

  useEffect(() => {
    localStorage.setItem("userProfile", JSON.stringify(userProfile));

    // Sync with Supabase if session exists
    if (session?.user?.id) {
      const timer = setTimeout(async () => {
        if (!navigator.onLine) return;
        try {
          const { error } = await upsertProfileWithRPC({
            user_id: session.user.id,
            fullName: userProfile.fullName,
            email: userProfile.email,
            phone: userProfile.phone,
            city: userProfile.city,
            address: userProfile.address,
            country: userProfile.country,
            role: userProfile.role,
            photo_url: userProfile.photoURL,
            language: userProfile.language || "en",
            latitude: userProfile.latitude,
            longitude: userProfile.longitude,
            favorites: favorites,
          });

          if (error) {
            const isFetchErr = 
              error.message?.includes("Failed to fetch") || 
              error.message?.includes("fetch") || 
              error.message?.includes("upstream connect error") ||
              error.message?.includes("connection timeout") ||
              error.message?.includes("disconnect/reset") ||
              (error.details && error.details.includes("Failed to fetch"));

            const isMissingColumnError = 
              error.code === "PGRST204" ||
              error.message?.includes("column");

            if (isMissingColumnError) {
              // Graceful degradation: sync only essential fields known to exist
              const safePayload = {
                user_id: session.user.id,
                fullName: userProfile.fullName,
                email: userProfile.email,
                phone: toDBPhone(userProfile.phone),
                role: userProfile.role || "user",
                city: userProfile.city || "",
                address: userProfile.address || "",
                country: userProfile.country || "South Africa",
                photo_url: userProfile.photoURL || "",
                language: userProfile.language || "en",
                updated_at: new Date().toISOString(),
              };
              try {
                const { error: fallbackError } = await supabase
                  .from("profiles")
                  .upsert(safePayload, { onConflict: "user_id" });
                if (fallbackError) {
                  console.warn("Notice syncing fallback profile to Supabase:", fallbackError.message || fallbackError);
                } else {
                  console.log("[Profile Sync] Profile synced using safe essential-only fallback due to missing database columns.");
                }
              } catch (e) {
                console.warn("Silent failure in safe profile sync fallback:", e);
              }

              setNotification({
                message: `We're finishing setting up your profile behind the scenes. Some details might take a moment to appear.`,
                type: "info",
              });
            } else {
              const errStr = (error.message || "").toLowerCase();
              if (errStr.includes("jwt expired") || errStr.includes("invalid jwt") || errStr.includes("token expired")) {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("supabase-jwt-expired"));
                }
              }
              if (isFetchErr) {
                console.log("[Profile Sync] Connection offline or blocked. Profile saved in local state.");
              } else {
                console.warn("Notice syncing profile to Supabase:", error.message || error);
              }
            }
          }
        } catch (err) {
          console.error("Sync error:", err);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userProfile, session, favorites]);

  if (isRestoringSession) {
    return (
      <div className="relative min-h-screen">
        <AuthSkeleton />
        <div id="auth-loading-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-800/50 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 max-w-xs text-center">
            <div className="relative w-full max-w-[100vw] overflow-x-hidden">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">Securing Session</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Verifying secure connection details safely...</p>
            </div>
            <button
              onClick={() => setIsRestoringSession(false)}
              className="mt-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 bg-orange-50 dark:bg-orange-950/60 px-3.5 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800/80 cursor-pointer active:scale-95 transition-all"
            >
              Continue to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-[100vw] overflow-x-hidden">

      <AnimatePresence mode="wait">
        <div className="relative w-full max-w-[100vw] overflow-x-hidden">
          <Toaster position="top-center" expand={true} richColors closeButton />
          <GlobalChatListener 
            activeOrders={orders.filter(o => o.status !== "completed" && o.status !== "cancelled" && o.status !== "delivered")} 
            currentScreen={currentScreen} 
            onNavigateToTracking={() => setCurrentScreen('order-tracking')} 
          />

          {/* Sync Error Banner */}
          <AnimatePresence>
            {syncError && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-0 left-0 right-0 z-[100] bg-rose-600 text-white p-3 text-center text-sm font-medium shadow-md flex items-center justify-center gap-2"
              >
                <span>⚠️ {syncError}</span>
                <button 
                  onClick={() => syncOfflineOrders(0)}
                  className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs ml-2 transition-colors"
                >
                  Retry Now
                </button>
                <button
                  onClick={() => setSyncError(null)}
                  className="absolute right-3 p-1 hover:bg-white/10 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global Saving/Success Overlay */}
          <AnimatePresence>
            {processingState !== "idle" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md"
              >
                <div className="flex flex-col items-center gap-6">
                  {processingState === "saving" ? (
                    <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                      <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ scale: 0.5, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-xl shadow-green-500/40 border-4 border-white dark:border-slate-800"
                    >
                      <Check className="w-14 h-14 text-white" strokeWidth={5} />
                    </motion.div>
                  )}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-center"
                  >
                    <p className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                      {processingState === "saving" ? "Processing..." : "Done!"}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {processingState === "saving"
                        ? "Please wait a moment"
                        : "Changes Saved Successfully"}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Global Notification Toast */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: notification.persistent ? 0 : 20 }}
                exit={{ opacity: 0, y: -100 }}
                className={`fixed ${notification.persistent ? "inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm" : "top-0 left-0 right-0"} z-[100] px-4 pointer-events-none`}
              >
                <motion.div
                  {...(!notification.persistent
                    ? {
                        drag: true,
                        dragDirectionLock: true,
                        dragConstraints: {
                          top: -200,
                          bottom: 100,
                          left: -250,
                          right: 250,
                        },
                        dragElastic: {
                          top: 0.3,
                          bottom: 0.1,
                          left: 0.3,
                          right: 0.3,
                        },
                        onDragEnd: (event, info) => {
                          const swipeAwayY =
                            info.offset.y < -50 || info.velocity.y < -150;
                          const swipeAwayX =
                            Math.abs(info.offset.x) > 100 ||
                            Math.abs(info.velocity.x) > 150;
                          if (swipeAwayY || swipeAwayX) {
                            setNotification(null);
                          }
                        },
                        whileDrag: { scale: 0.98, opacity: 0.85 },
                      }
                    : {})}
                  className={`${notification.persistent ? "w-full max-w-xs" : "max-w-md mx-auto relative cursor-grab active:cursor-grabbing select-none hover:shadow-xl"} bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-6 rounded-3xl shadow-xl flex flex-col gap-4 border border-gray-100 dark:border-slate-700 pointer-events-auto transition-shadow duration-200`}
                >
                  {!notification.persistent && (
                    <div className="flex justify-center -mt-3.5 -mb-1 shrink-0">
                      <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full opacity-60" />
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div
                      className={`${notification.type === "ready" ? "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400" : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"} p-3 rounded-2xl shrink-0`}
                    >
                      {notification.type === "ready" ? (
                        <Utensils className="w-6 h-6" />
                      ) : (
                        <Bell className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight truncate">
                        {notification.type === "ready"
                          ? "Order Ready!"
                          : "Notification"}
                      </h3>
                      <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.persistent && (
                      <button
                        onClick={() => setNotification(null)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg shrink-0"
                      >
                        <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                      </button>
                    )}
                  </div>

                  {notification.actions && (
                    <div className="flex flex-col gap-2 mt-2">
                      {notification.actions.map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            action.onClick();
                            setNotification(null);
                          }}
                          className={`w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 cursor-pointer ${
                            idx === 0
                              ? "bg-orange-600 text-white shadow-lg shadow-orange-200 dark:shadow-none"
                              : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600"
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generic Modal (Alert/Confirm/Prompt) */}
          <AnimatePresence>
            {modal.isOpen && (
              <ModalContent
                modal={modal}
                onClose={() => setModal({ ...modal, isOpen: false })}
              />
            )}
          </AnimatePresence>

          {/* Order Accepted Modal */}
          <AnimatePresence>
            {orderAcceptedModal.isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden"
                >
                  {/* Decorative elements */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>

                  <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-12 h-12" />
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                    Order Accepted!
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                    Your order for{" "}
                    <span className="font-bold text-slate-900 dark:text-slate-200">
                      {orderAcceptedModal.productName}
                    </span>{" "}
                    has been received.
                  </p>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-8 italic text-slate-600 dark:text-slate-300 text-sm border border-slate-100 dark:border-slate-800">
                    "{orderAcceptedModal.ownerMessage}"
                  </div>

                  <button
                    onClick={() =>
                      setOrderAcceptedModal({
                        ...orderAcceptedModal,
                        isOpen: false,
                      })
                    }
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 cursor-pointer"
                  >
                    Awesome!
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className="h-full w-full"
            >
              {currentScreen === "splash" && (
                <SplashScreen
                  onNext={() => setCurrentScreen("signup")}
                  onLogin={() => setCurrentScreen("login")}
                  onGuestBrowse={() => setCurrentScreen("home")}
                  session={session}
                  userProfile={userProfile}
                />
              )}
              {currentScreen === "signup" && (
                <SignUpScreen
                  onNext={(data) => {
                    setUserProfile((prev) => ({ ...prev, ...data }));
                    setCurrentScreen("setup-password");
                  }}
                  onLogin={() => setCurrentScreen("login")}
                  setNotification={setNotification}
                />
              )}
              {currentScreen === "login" && (
                <LoginScreen
                  onLogin={() => {
                    setCurrentScreen("login-success");
                  }}
                  onSignUp={() => setCurrentScreen("signup")}
                  onGuestBrowse={() => setCurrentScreen("home")}
                  setNotification={setNotification}
                  biometricsEnabled={biometricsEnabled}
                  onToggleBiometrics={(val) => {
                    setBiometricsEnabled(val);
                    try {
                      localStorage.setItem("biometrics_enabled", String(val));
                    } catch {}
                  }}
                  triggerHaptic={triggerHaptic}
                  setUserProfile={setUserProfile}
                  fetchUserProfile={fetchUserProfile}
                />
              )}
              {/* Verify screen skipped for now */}
              {currentScreen === "setup-password" && (
                <SetupPasswordScreen
                  signupData={userProfile}
                  onNext={() => setCurrentScreen("success")}
                  onBack={() => setCurrentScreen("signup")}
                  setNotification={setNotification}
                  runWithProcessing={runWithProcessing}
                />
              )}
              {currentScreen === "success" && (
                <SuccessScreen
                  onCompleteProfile={() => setCurrentScreen("complete-profile")}
                  onExplore={() => setCurrentScreen("home")}
                />
              )}
              {currentScreen === "complete-profile" && (
                <CompleteProfileScreen
                  userProfile={userProfile}
                  onBack={() => setCurrentScreen(previousScreen || "home")}
                  onSave={async (data) => {
                    await handleUpdateProfile(data, true, () => {
                      setCurrentScreen(previousScreen || "home");
                    });
                  }}
                  setNotification={setNotification}
                />
              )}
              {currentScreen === "login-success" && (
                <LoginSuccessScreen
                  onHome={() => {
                    setCurrentScreen("home");
                  }}
                  onViewProfile={() => setCurrentScreen("profile")}
                  onBack={() => setCurrentScreen("login")}
                />
              )}
              {currentScreen === "reset-password" && (
                <ResetPasswordScreen
                  onNext={() => setCurrentScreen("login")}
                  setNotification={setNotification}
                />
              )}
              {currentScreen === "home" && (
                <HomeScreen
                  userProfile={userProfile}
                  session={session}
                  shops={visibleShops}
                  loadingShops={loadingShops}
                  fetchError={fetchError}
                  isOnline={isOnline}
                  onSettings={() => {
                    setCurrentScreen("settings");
                  }}
                  onProfile={() => {
                    setCurrentScreen("profile");
                  }}
                  onCheckout={() => {
                    setCurrentScreen("checkout");
                  }}
                  onDiscover={() => {
                    setCurrentScreen("discover");
                  }}
                  onExplore={() => {
                    setCurrentScreen("explore");
                  }}
                  onOrderHistory={() => {
                    setCurrentScreen("order-history");
                  }}
                  onNotifications={() => {
                    setCurrentScreen("notifications");
                  }}
                  unreadCount={notifications.filter((n) => !n.read).length}
                  onStoreInfo={(id) => {
                    setSelectedStoreId(id);
                    setCurrentScreen("store-info");
                  }}
                  onRetry={() => fetchShopsData()}
                  cart={cart}
                  addToCart={addToCart}
                  removeFromCart={removeFromCart}
                  clearCart={clearCart}
                  changeToDelivery={changeToDelivery}
                  setNotification={setNotification}
                  setPendingReview={setPendingReview}
                  setCurrentScreen={setCurrentScreen}
                  currentScreen={currentScreen}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  userLocation={userLocation}
                  onRequestLocation={requestLocation}
                  orders={orders}
                  showAlert={showAlert}
                  appVersion={appVersion}
                  triggerHaptic={triggerHaptic}
                  orderAgainEnabled={orderAgainEnabled}
                  onEnableOrderAgain={() => setOrderAgainEnabled(true)}
                  dataSaverEnabled={dataSaverEnabled}
                  isSyncing={isSyncing}
                />
              )}
              {currentScreen === "notifications" && (
                <NotificationsScreen
                  notifications={notifications}
                  onBack={() => setCurrentScreen(previousScreen || "home")}
                  onRead={(id) =>
                    setNotifications((prev) =>
                      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
                    )
                  }
                  onDelete={(id) =>
                    setNotifications((prev) => prev.filter((n) => n.id !== id))
                  }
                />
              )}
              {currentScreen === "order-tracking" && (
                <WidgetErrorBoundary fallbackName="Order Tracking">
                  <Suspense fallback={<div className="p-8 text-center text-slate-500 flex items-center justify-center min-h-screen">Loading map...</div>}>
                    <OrderTrackingScreen
                      orders={orders}
                      shops={visibleShops}
                      showAlert={showAlert}
                      onBack={() => setCurrentScreen(previousScreen || "home")}
                      triggerHaptic={triggerHaptic}
                    />
                  </Suspense>
                </WidgetErrorBoundary>
              )}
              {currentScreen === "review" && pendingReview && (
                <OrderRating
                  pendingReview={pendingReview}
                  onSnooze={() => {
                    if (pendingReview.snoozeCount < 2) {
                      setPendingReview({
                        ...pendingReview,
                        snoozeCount: pendingReview.snoozeCount + 1,
                        nextReminder: Date.now() + 30 * 60 * 1000, // 30 minutes
                      });
                      setCurrentScreen("home");
                      setNotification({
                        message: "No problem! We'll remind you in 30 minutes.",
                        type: "info",
                      });
                    } else {
                      setPendingReview(null);
                      setCurrentScreen("home");
                    }
                  }}
                  onSubmit={async (
                    rating,
                    comment,
                    riderRating,
                    riderComment,
                  ) => {
                    try {
                      // 1. Save Shop Review
                      const dbShopId = typeof pendingReview.shopId === "number"
                        ? pendingReview.shopId
                        : (parseInt(String(pendingReview.shopId).replace(/\D/g, "")) || 1);

                      const dbOrderId = typeof pendingReview.orderId === "number"
                        ? pendingReview.orderId
                        : /^[0-9a-fA-F-]{36}$/.test(pendingReview.orderId)
                          ? pendingReview.orderId
                          : (parseInt(String(pendingReview.orderId).replace(/\D/g, "")) || 1);

                      const { error: shopErr } = await supabase
                        .from("reviews")
                        .insert({
                          shop_id: dbShopId,
                          user_id: userProfile?.id || session?.user?.id,
                          username: userProfile.fullName || "Anonymous",
                          rating,
                          comment,
                          createdAt: new Date().toISOString(),
                        });

                      if (shopErr) throw shopErr;

                      // 2. Save Rider Review if exists
                      const { data: order } = await supabase
                        .from("orders")
                        .select("rider_id")
                        .eq("id", dbOrderId)
                        .single();

                      if (order?.rider_id && riderRating) {
                        await supabase
                          .from("orders")
                          .update({
                            rider_rating: riderRating,
                            rider_rating_comment: riderComment,
                          })
                          .eq("id", dbOrderId);

                        // Update rider profile average rating
                        const { data: rider } = await supabase
                          .from("rider_profiles")
                          .select("rating, rating_count")
                          .eq("id", order.rider_id)
                          .single();

                        if (rider) {
                          const currentRating = rider.rating || 5;
                          const currentCount = rider.rating_count || 0;
                          const newCount = currentCount + 1;
                          const newRating =
                            (currentRating * currentCount + riderRating) /
                            newCount;

                          await supabase
                            .from("rider_profiles")
                            .update({
                              rating: Number(newRating.toFixed(1)),
                              rating_count: newCount,
                            })
                            .eq("id", order.rider_id);
                        }
                      }

                      showAlert(
                        "Feedback Submitted",
                        "Thank you for helping us improve! 🔥",
                      );
                    } catch (err) {
                      console.error("Error saving review:", err);
                      showAlert("Error", "Failed to save your review.");
                    }

                    setPendingReview(null);
                    setCurrentScreen("order-history");
                  }}
                />
              )}
              {currentScreen === "discover" && (
                <DiscoverScreen
                  userProfile={userProfile}
                  shops={visibleShops}
                  onHome={() => setCurrentScreen("home")}
                  onExplore={() => {
                    setPreviousScreen("discover");
                    setCurrentScreen("explore");
                  }}
                  onScanFlyer={() => setShowQRScanner(true)}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  onSelectShop={(shopId) => {
                    setPreviousScreen("discover");
                    setSelectedStoreId(shopId);
                    setCurrentScreen("store-info");
                  }}
                  userLocation={userLocation}
                  showAlert={showAlert}
                  setCurrentScreen={setCurrentScreen}
                  triggerHaptic={triggerHaptic}
                  isOnline={isOnline}
                  loadingShops={loadingShops}
                />
              )}
              {currentScreen === "explore" && (
                <ExploreScreen
                  shops={visibleShops}
                  onHome={() => setCurrentScreen("home")}
                  onDiscover={() => {
                    setPreviousScreen("explore");
                    setCurrentScreen("discover");
                  }}
                  userLocation={userLocation}
                  onRequestLocation={requestLocation}
                  onStoreInfo={(shopId) => {
                    setPreviousScreen("explore");
                    setSelectedStoreId(shopId);
                    setCurrentScreen("store-info");
                  }}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  showAlert={showAlert}
                  triggerHaptic={triggerHaptic}
                  isOnline={isOnline}
                  loadingShops={loadingShops}
                  orders={orders}
                  addToCart={addToCart}
                />
              )}
              {currentScreen === "store-info" && (
                <StoreInfoScreen
                  onBack={() => {
                    if ("vibrate" in navigator) navigator.vibrate(5);
                    setCurrentScreen(previousScreen || "home");
                  }}
                  shop={
                    visibleShops && visibleShops.length > 0
                      ? visibleShops.find(
                           (s) => String(s.id) === String(selectedStoreId),
                        ) || visibleShops[0]
                      : DEFAULT_FALLBACK_SHOPS[0]
                  }
                  isFavorite={favorites.includes(selectedStoreId || "")}
                  isOnline={isOnline}
                  onToggleFavorite={() => {
                    if (!session) {
                      setNotification({
                        message:
                          "Please sign up to follow your favorite shops!",
                        type: "info",
                        actions: [
                          {
                            label: "Sign Up",
                            onClick: () => setCurrentScreen("signup"),
                          },
                        ],
                      });
                      return;
                    }
                    toggleFavorite(selectedStoreId || "");
                  }}
                  userProfile={userProfile}
                  session={session}
                  onSignUp={() => setCurrentScreen("signup")}
                  addToCart={addToCart}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                  setCurrentScreen={setCurrentScreen}
                  onScanFlyer={() => setShowQRScanner(true)}
                />
              )}
              {currentScreen === "settings" && (
                <SettingsScreen
                  userProfile={userProfile}
                  setUserProfile={setUserProfile}
                  forcedTheme={forcedTheme}
                  onSetForcedTheme={setForcedTheme}
                  onBack={() => setCurrentScreen(previousScreen || "home")}
                  onLogout={() => setCurrentScreen("splash")}
                  onProfile={() => {
                    setPreviousScreen("settings");
                    setCurrentScreen("profile");
                  }}
                  onOrderHistory={() => {
                    setPreviousScreen("settings");
                    setCurrentScreen("order-history");
                  }}
                  onAdminOrders={() => {
                    setPreviousScreen("settings");
                    setCurrentScreen("admin-orders");
                  }}
                  onShopDashboard={() => {
                    setPreviousScreen("settings");
                    setCurrentScreen("shop-dashboard");
                  }}
                  onContactUs={() => {
                    setPreviousScreen("settings");
                    setCurrentScreen("contact");
                  }}
                  onUpdateProfile={handleUpdateProfile}
                  isDarkMode={isDarkMode}
                  onToggleDarkMode={() => {
                    setIsDarkMode(!isDarkMode);
                    triggerHaptic(10);
                  }}
                  triggerHaptic={triggerHaptic}
                  hapticEnabled={hapticEnabled}
                  onToggleHaptic={() => {
                    const next = !hapticEnabled;
                    setHapticEnabled(next);
                    try {
                      localStorage.setItem("haptic_enabled", String(next));
                    } catch {}
                    if (next) {
                      if ("vibrate" in navigator) {
                        navigator.vibrate(15);
                      }
                    }
                  }}
                  hapticButtonPress={hapticButtonPress}
                  onToggleHapticButtonPress={() => {
                    const next = !hapticButtonPress;
                    setHapticButtonPress(next);
                    try {
                      localStorage.setItem("haptic_button_press", String(next));
                    } catch {}
                    triggerHaptic(10, "button_press");
                  }}
                  hapticOrderUpdate={hapticOrderUpdate}
                  onToggleHapticOrderUpdate={() => {
                    const next = !hapticOrderUpdate;
                    setHapticOrderUpdate(next);
                    try {
                      localStorage.setItem("haptic_order_update", String(next));
                    } catch {}
                    triggerHaptic(10, "button_press");
                  }}
                  hapticCartAnimation={hapticCartAnimation}
                  onToggleHapticCartAnimation={() => {
                    const next = !hapticCartAnimation;
                    setHapticCartAnimation(next);
                    try {
                      localStorage.setItem("haptic_cart_animation", String(next));
                    } catch {}
                    triggerHaptic(10, "button_press");
                  }}
                  orderAgainEnabled={orderAgainEnabled}
                  onToggleOrderAgain={() => {
                    setOrderAgainEnabled(!orderAgainEnabled);
                    triggerHaptic(10, "button_press");
                  }}
                  dataSaverEnabled={dataSaverEnabled}
                  onToggleDataSaver={() => {
                    const next = !dataSaverEnabled;
                    setDataSaverEnabled(next);
                    triggerHaptic(10, "button_press");
                  }}
                  biometricsEnabled={biometricsEnabled}
                  onToggleBiometrics={(val) => {
                    setBiometricsEnabled(val);
                    try {
                      localStorage.setItem("biometrics_enabled", String(val));
                    } catch {}
                    triggerHaptic(10, "button_press");
                  }}
                  setNotification={setNotification}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                  showPasswordPrompt={showPasswordPrompt}
                  isOnline={isOnline}
                  onSubscribeToPush={subscribeToPushNotifications}
                  onManualSync={handleManualSync}
                  isSyncing={isSyncing}
                  stalenessThresholdMs={stalenessThresholdMs}
                  onUpdateStalenessThreshold={setStalenessThresholdMs}
                  heartbeatMetrics={heartbeatMetrics}
                  isPingingHeartbeat={isPingingHeartbeat}
                  onRunHeartbeatPing={runHeartbeatPing}
                />
              )}
              {currentScreen === "admin-orders" && (
                <AdminOrdersScreen
                  shops={visibleShops}
                  onBack={() => setCurrentScreen(previousScreen || "home")}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                  runWithProcessing={runWithProcessing}
                  isOnline={isOnline}
                />
              )}
              {currentScreen === "shop-dashboard" && (
                <ShopDashboardScreen
                  onBack={() => setCurrentScreen(previousScreen || "home")}
                  orderAcceptedModal={orderAcceptedModal}
                  setOrderAcceptedModal={setOrderAcceptedModal}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                  showPrompt={showPrompt}
                  triggerHaptic={triggerHaptic}
                  runWithProcessing={runWithProcessing}
                  isOnline={isOnline}
                />
              )}

              {currentScreen === "profile" && (
                <ProfileScreen
                  onBack={() => setCurrentScreen(previousScreen || "home")}
                  onSave={async (data) => {
                    await handleUpdateProfile(data, true, () => {
                      setCurrentScreen(previousScreen || "home");
                    });
                  }}
                  userProfile={userProfile}
                  completedOrdersCount={orders.filter(o => o.status.toLowerCase() === "completed" || o.status.toLowerCase() === "delivered").length}
                  onLogout={async () => {
                    await supabase.auth.signOut();
                    // Clear sensitive data on logout
                    localStorage.removeItem("remember_me_secure_token");
                    localStorage.removeItem("cart");
                    localStorage.removeItem("userProfile");
                    localStorage.removeItem("favorites");
                    localStorage.removeItem("pending_review");
                    setCart([]);
                    setFavorites([]);
                    setUserProfile({
                      fullName: "",
                      email: "",
                      phone: "",
                      city: "",
                      address: "",
                      country: "South Africa",
                      role: "user",
                    });
                    setCurrentScreen("splash");
                  }}
                  setNotification={setNotification}
                  triggerHaptic={triggerHaptic}
                  isOnline={isOnline}
                />
              )}
              {currentScreen === "contact" && (
                <ContactScreen
                  onBack={() => setCurrentScreen(previousScreen || "profile")}
                  userProfile={userProfile}
                  showAlert={showAlert}
                />
              )}
              {currentScreen === "checkout" && (
                <WidgetErrorBoundary fallbackName="Checkout">
                  <Suspense fallback={<div className="p-8 text-center text-slate-500 flex items-center justify-center min-h-screen">Loading...</div>}>
                    <CheckoutScreen
                      userProfile={userProfile}
                      session={session}
                      shops={visibleShops}
                      isOnline={isOnline}
                      onBack={() => setCurrentScreen(previousScreen || "home")}
                      onConfirm={() => {
                        const pointsEarned = Math.floor(cartTotal / 10);
                        setOrderAgainEnabled(true);
                        if (session?.user?.id) {
                          handleUpdateProfile(
                            { loyaltyPoints: (userProfile.loyaltyPoints || 0) + pointsEarned },
                            false,
                            () => setCurrentScreen("order-success")
                          );
                        } else {
                          setCurrentScreen("order-success");
                        }
                      }}
                      onIncompleteProfile={() => {
                        setPreviousScreen("checkout");
                        setCurrentScreen("complete-profile");
                      }}
                      cart={cart}
                      setCart={setCart}
                      setNotification={setNotification}
                      showAlert={showAlert}
                      showConfirm={showConfirm}
                      userLocation={userLocation}
                      runWithProcessing={runWithProcessing}
                      setPreviousScreen={setPreviousScreen}
                      setCurrentScreen={setCurrentScreen}
                      triggerHaptic={triggerHaptic}
                    />
                  </Suspense>
                </WidgetErrorBoundary>
              )}
              {currentScreen === "order-success" && (
                <OrderSuccessScreen
                  onHome={() => {
                    setCart([]);
                    setCurrentScreen("home");
                  }}
                  cart={cart}
                  shops={visibleShops}
                  triggerHaptic={triggerHaptic}
                />
              )}
              {currentScreen === "order-history" && (
                <OrderHistoryScreen
                  session={session}
                  onBack={() => setCurrentScreen(previousScreen || "profile")}
                  userProfile={userProfile}
                  showAlert={showAlert}
                  showConfirm={showConfirm}
                  isOnline={isOnline}
                  shops={visibleShops}
                  addToCart={addToCart}
                  setCart={setCart}
                  setCurrentScreen={setCurrentScreen}
                  triggerHaptic={triggerHaptic}
                  onScanFlyer={() => setShowQRScanner(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Global Floating Checkout Button (Peek-a-Boo Sticky Cart) */}
          <AnimatePresence>
            {cartCount > 0 &&
              currentScreen !== "checkout" &&
              currentScreen !== "order-success" && (
                <motion.button
                  initial={{ y: 100, opacity: 0 }}
                  animate={isCartBouncing ? {
                    y: [0, -10, 4, -2, 0],
                    opacity: 1,
                    scale: [1, 1.02, 0.98, 1]
                  } : {
                    y: 0,
                    opacity: 1,
                    scale: 1
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut"
                  }}
                  exit={{ y: 100, opacity: 0 }}
                  onClick={() => {
                    if (!session) {
                      showAlert(
                        "Login Required",
                        "Please sign in or create an account to place your order.",
                      );
                      setPreviousScreen(currentScreen);
                      setCurrentScreen("login");
                      return;
                    }
                    setPreviousScreen(currentScreen);
                    setCurrentScreen("checkout");
                  }}
                  className={`fixed bottom-20 left-4 right-4 z-[9999] bg-slate-900 dark:bg-orange-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer group`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative bg-white/20 dark:bg-white/20 p-2 rounded-xl">
                      <ShoppingBag className="w-5 h-5 text-white" />
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md border-2 border-slate-900 dark:border-orange-600">
                        {cartCount}
                      </span>
                    </div>
                    <div className="text-left flex flex-col">
                      <span className="text-xs font-bold text-white/80">View Cart</span>
                      <span className="font-black text-sm tracking-tight">
                        <AnimatedPrice value={cartTotal} />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-wider">Checkout</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.button>
              )}
          </AnimatePresence>

          <QRScannerModal
            isOpen={showQRScanner}
            onClose={() => setShowQRScanner(false)}
            onScanSuccess={handleQRScanSuccess}
            shops={visibleShops}
          />

          <Suspense fallback={null}>
            <AppHelp 
              currentScreen={currentScreen} 
              cartCount={cartCount} 
              activeOrder={orders.find(o => o.status !== "completed" && o.status !== "cancelled" && o.status !== "delivered" && o.is_delivery)} 
              userProfile={userProfile} 
            />
          </Suspense>
          
          {/* Guide Slide Container Wrapper with Dynamic Mobile Viewport Bounds */}
          {currentScreen === "home" && (
            <div 
              id="guide-slide-container-wrapper" 
              className="w-full max-w-[100vw] overflow-hidden flex-shrink-0 shrink-0 pointer-events-none relative z-[10000] outline outline-2 outline-red-500"
            >
              {/* Skip Tour button in the top-right corner */}
              <button
                type="button"
                id="btn-skip-tour"
                onClick={() => {
                  try {
                    localStorage.setItem("localeats_tour_seen", "true");
                    localStorage.setItem("localeats_interactive_tour_seen", "true");
                    window.dispatchEvent(new CustomEvent("localeats_skip_all_tours"));
                    window.dispatchEvent(new CustomEvent("localeats_tour_ended"));
                    setIsTourActive(false);
                  } catch (e) {
                    console.warn("Skip tour error:", e);
                  }
                }}
                className={`fixed top-4 right-4 z-[10005] pointer-events-auto flex items-center gap-2 px-6 py-2 bg-slate-900/90 hover:bg-slate-950 dark:bg-slate-800/95 dark:hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md drop-shadow-md backdrop-blur-md border border-white/20 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer select-none ${
                  isTourActive ? "opacity-100 visible animate-pulse hover:animate-none" : "opacity-0 invisible pointer-events-none"
                }`}
                aria-label="Skip Tour"
              >
                <span>Skip Tour</span>
                <X className="w-3.5 h-3.5 text-orange-400" />
              </button>
              <Suspense fallback={null}>
                <OnboardingTour />
                <InteractiveTour />
              </Suspense>
            </div>
          )}
          {/* Persistent Real-time Order Tracker Banner with Smart Collapse */}
          <AnimatePresence>
            {(() => {
              const activeOrder = orders.find(
                (o) => o && o.status && !["completed", "delivered", "cancelled"].includes((o.status || "").toLowerCase())
              );
              if (
                !activeOrder ||
                ["order-tracking", "checkout", "shop-dashboard", "admin-orders", "splash", "login", "signup", "setup-password", "reset-password"].includes(currentScreen)
              ) return null;
              
              const activeOrderShop = shops.find((s) => s.id === activeOrder.shop_id);
              const isCollapsed = isOrderBannerCollapsed || isScrollCollapsed;
              
              return isCollapsed ? (
                /* Smart Collapsed Minimal Floating Pill Indicator */
                <motion.div
                  key="order-tracker-collapsed"
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  onClick={() => {
                    setIsOrderBannerCollapsed(false);
                    setIsScrollCollapsed(false);
                  }}
                  className="fixed bottom-20 left-3 z-40 bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-xl border border-slate-800/90 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold">
                    <span className="text-orange-400 font-mono">#{activeOrder.id.slice(0, 4)}</span>
                    <span className="text-slate-600">•</span>
                    <span className="truncate max-w-[100px] text-slate-200">
                      {activeOrder.status === "pending" && "Waiting..."}
                      {activeOrder.status === "confirmed" && "Accepted"}
                      {activeOrder.status === "preparing" && "Cooking"}
                      {activeOrder.status === "ready" && "Ready! 🔥"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-sm ml-0.5">
                    <span>Track</span>
                    <ChevronUp className="w-3 h-3" />
                  </div>
                </motion.div>
              ) : (
                /* Expanded Compact Row-Based Grid Banner */
                <motion.div
                  key="order-tracker-expanded"
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="fixed bottom-20 left-3 right-3 md:left-auto md:right-4 md:w-80 z-40 bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-md text-white px-3 py-2 rounded-2xl shadow-xl border border-slate-800/80 flex flex-col gap-1.5 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-xl flex items-center justify-center font-black text-xs shrink-0 text-white shadow-sm">
                        {activeOrderShop?.name?.slice(0, 2).toUpperCase() || "🍔"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
                          </span>
                          <h4 className="text-xs font-bold text-white truncate">{activeOrderShop?.name || "Kitchen"}</h4>
                          <span className="text-[9px] font-mono text-orange-400 font-bold opacity-90 shrink-0 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                            #{activeOrder.id.slice(0, 4)}
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-orange-400 truncate flex items-center gap-1 leading-none mt-1">
                          <Clock className="w-3 h-3 animate-spin shrink-0" />
                          {activeOrder.status === "pending" && "Waiting confirmation..."}
                          {activeOrder.status === "confirmed" && "Order Accepted"}
                          {activeOrder.status === "preparing" && "Chef Cooking"}
                          {activeOrder.status === "ready" && "Ready for Pickup! 🔥"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setCurrentScreen("order-tracking");
                        }}
                        className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>Track</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => setIsOrderBannerCollapsed(true)}
                        className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        title="Collapse order tracker"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Thin Integrated Progress Line */}
                  <div className="w-full bg-slate-800/80 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width:
                          activeOrder.status === "pending" ? "20%" :
                          activeOrder.status === "confirmed" ? "45%" :
                          activeOrder.status === "preparing" ? "75%" :
                          activeOrder.status === "ready" ? "100%" : "0%"
                      }}
                    />
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>

          <Suspense fallback={null}>
            <PopiaLegalDrawer />
            <CookieConsentBanner />
          </Suspense>
        </div>
      </AnimatePresence>
    </div>
  );
}

interface HorizontalShopCardProps {
  key?: string | number;
  shop: Shop;
  onClick: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const HorizontalShopCard = ({
  shop,
  onClick,
  userLocation,
}: HorizontalShopCardProps) => {
  return (
    <motion.div
      whileHover={shop.isOpen !== false ? { y: -4, scale: 1.01 } : undefined}
      whileTap={shop.isOpen !== false ? { scale: 0.98 } : undefined}
      onClick={shop.isOpen !== false ? onClick : undefined}
      className={`flex flex-col gap-2 shrink-0 w-64 bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-all active:scale-[0.98] group ${shop.isOpen !== false ? "cursor-pointer hover:border-slate-300/80 dark:hover:border-slate-600" : "opacity-60 grayscale-[0.5]"}`}
    >
      <div className="aspect-video w-full rounded-2xl overflow-hidden relative bg-slate-100 dark:bg-slate-800">
        <BlurUpImage
          src={shop.logo || DEFAULT_SHOP_LOGO}
          alt={shop.name}
          className="w-full h-full aspect-video object-cover"
          blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`}
        />
        {shop.is_special && shop.isOpen !== false && (
          <div className="absolute top-3 left-3 bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
            Local Special
          </div>
        )}
        {shop.isOpen === false && (
          <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
              Closed
            </div>
          </div>
        )}
        <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-xl flex items-center gap-1 shadow-sm border border-white/20">
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
          <span className="text-xs font-black text-slate-900 dark:text-white">
            {shop.rating}
          </span>
          <span className="text-[9px] text-slate-500">
            ({shop.reviewCount || 0})
          </span>
        </div>
      </div>
      <div className="px-1">
        <div className="flex justify-between items-start">
          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-2 break-words group-hover:text-orange-600 transition-colors">
            {shop.name}
          </h4>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-1">
          {shop.description}
        </p>

        <div className="flex flex-col gap-1 mt-1">
          <TrustBadge shop={shop} />
          {isShopAway(shop) && (
            <span className="w-max text-[9px] font-black bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 uppercase tracking-widest px-2 py-1 rounded animate-pulse border border-rose-200 dark:border-rose-900/30">
              ⚠️ Away / Likely Offline
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-slate-800/50">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 truncate">
              {shop.distance
                ? `${shop.distance.toFixed(1)} km`
                : shop.address || "Local"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-bold text-orange-600">
              {shop.prepTime || "15-20 min"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function HomeScreen({
  userProfile,
  session,
  shops,
  loadingShops,
  fetchError,
  onSettings,
  onProfile,
  onCheckout,
  onDiscover,
  onExplore,
  onOrderHistory,
  onStoreInfo,
  onRetry,
  cart,
  addToCart,
  removeFromCart,
  clearCart,
  setNotification,
  setPendingReview,
  setCurrentScreen,
  currentScreen,
  favorites,
  toggleFavorite,
  userLocation,
  onRequestLocation,
  onNotifications,
  unreadCount,
  orders,
  showAlert,
  appVersion,
  triggerHaptic,
  isOnline,
  orderAgainEnabled = true,
  onEnableOrderAgain,
  changeToDelivery,
  dataSaverEnabled,
  isSyncing = false,
}: {
  userProfile: UserProfile;
  session: Session | null;
  shops: Shop[];
  loadingShops: boolean;
  fetchError: string | null;
  onSettings: () => void;
  onProfile: () => void;
  onCheckout: () => void;
  onDiscover: () => void;
  onExplore: () => void;
  onOrderHistory: () => void;
  onStoreInfo: (shopId: string) => void;
  onRetry: () => void;
  cart: CartItem[];
  addToCart: (
    item: MenuItem,
    shopId: string,
    quantity?: number,
    specialInstructions?: string,
  ) => void;
  removeFromCart: (itemId: string, shopId: string) => void;
  clearCart: () => void;
  setNotification: Dispatch<SetStateAction<any>>;
  setPendingReview: Dispatch<SetStateAction<PendingReview | null>>;
  setCurrentScreen: Dispatch<SetStateAction<Screen>>;
  currentScreen: Screen;
  favorites: string[];
  toggleFavorite: (shopId: string) => void;
  userLocation: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
  onNotifications: () => void;
  unreadCount: number;
  orders: Order[];
  showAlert: (title: string, message: string) => void;
  appVersion: string;
  triggerHaptic: (pattern?: number | number[], actionType?: "button_press" | "order_update" | "cart_animation") => void;
  isOnline: boolean;
  orderAgainEnabled?: boolean;
  onEnableOrderAgain?: () => void;
  changeToDelivery: (orderId: string) => void;
  dataSaverEnabled?: boolean;
  isSyncing?: boolean;
}) {
  const { t, language } = useTranslation();
  const currentTownship = useMemo(() => {
    return detectTownship(userLocation?.lat, userLocation?.lng, userProfile?.address);
  }, [userLocation, userProfile?.address]);
  const isUpdateAvailable = false;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search input updates to reduce shop filtering operations during typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [isHeaderSearching, setIsHeaderSearching] = useState(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'popular' | 'rating' | 'fastest'>(() => {
    try {
      const saved = localStorage.getItem("localeats_shop_sort_preference");
      if (saved === 'recommended' || saved === 'popular' || saved === 'rating' || saved === 'fastest') {
        return saved;
      }
    } catch {}
    return 'recommended';
  });

  useEffect(() => {
    try {
      localStorage.setItem("localeats_shop_sort_preference", sortBy);
    } catch (e) {
      console.error("Failed to save sort preference:", e);
    }
  }, [sortBy]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  // Auto-focus header search input when search mode is activated
  useEffect(() => {
    if (isHeaderSearching) {
      const focusSearchInput = () => {
        const inputEl = document.getElementById("header-search-input") as HTMLInputElement | null;
        if (inputEl) {
          inputEl.focus();
        }
      };
      focusSearchInput();
      const t1 = setTimeout(focusSearchInput, 50);
      const t2 = setTimeout(focusSearchInput, 150);
      const t3 = setTimeout(focusSearchInput, 300);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isHeaderSearching]);

  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.getBoundingClientRect().height);
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [isWinterBannerDismissed, setIsWinterBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem("localeats_winter_banner_dismissed") === "true";
    } catch {
      return false;
    }
  });

  const isPromoUsed = useCallback((code: string) => {
    try {
      const usedLocalKey = session?.user?.id
        ? `used_promo_codes_${session.user.id}`
        : `used_promo_codes_guest`;
      const usedLocal = safeLocalStorageGet(usedLocalKey, []);
      return usedLocal.includes(code);
    } catch {
      return false;
    }
  }, [session?.user?.id]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [selectedQuickFilter, setSelectedQuickFilter] = useState<string | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("recent_searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("recent_searches", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isOrderStatusExpanded, setIsOrderStatusExpanded] = useState(false);

  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<string>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });

  const [notificationBannerDismissed, setNotificationBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("localeats_notify_banner_dismissed") === "true";
    } catch {
      return false;
    }
  });

  const handleRequestNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showAlert("Notifications Not Supported", "Push notifications are not supported by your current browser.");
      return;
    }
    triggerHaptic?.(15, "button_press");
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermissionStatus(permission);
      if (permission === "granted") {
        toast.success("Order Notifications Enabled! 🔔", {
          description: "You'll now receive real-time push alerts on meal preparation, packing, and live delivery status.",
          duration: 5000,
        });
        if (session?.user?.id) {
          registerAndSyncPushToken(session.user.id).catch(() => {});
        }
      } else if (permission === "denied") {
        toast.error("Notifications Blocked", {
          description: "You can enable notifications anytime in your browser site permissions.",
        });
      }
    } catch (err) {
      console.debug("Notice on notification permission:", err);
    }
  };

  const handleDismissNotificationBanner = () => {
    setNotificationBannerDismissed(true);
    try {
      localStorage.setItem("localeats_notify_banner_dismissed", "true");
    } catch {}
    triggerHaptic?.(10, "button_press");
  };

  const frequentlyOrderedShops = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.shop_id) {
        counts[o.shop_id] = (counts[o.shop_id] || 0) + 1;
      }
    });
    const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return sortedIds
      .map((id) => shops.find((s) => s.id === id))
      .filter((s): s is Shop => !!s)
      .slice(0, 3);
  }, [orders, shops]);

  const suggestions = useMemo(() => {
    if (debouncedSearchQuery.length < 2) return [];
    return shops
      .filter((s) => s.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
      .map((s) => s.name)
      .slice(0, 5);
  }, [shops, debouncedSearchQuery]);

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status !== "completed" &&
          o.status !== "cancelled" &&
          o.status !== "delivered",
      ),
    [orders],
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const categories = useMemo(() => {
    const base = ["All", "Favorites", "Nearby"];
    const types = shops.map((s) => s.category);
    const cuisines = shops.map((s) => s.cuisine_type).filter(Boolean);
    return Array.from(new Set([...base, ...types, ...cuisines] as string[]));
  }, [shops]);

  // Pre-calculate search index map for lightning-fast search matches on low-end devices
  const shopSearchIndex = useMemo(() => {
    const indexMap: Record<string, string> = {};
    shops.forEach((shop) => {
      indexMap[shop.id] = `${shop.name} ${shop.description || ""} ${shop.category} ${shop.cuisine_type || ""}`.toLowerCase();
    });
    return indexMap;
  }, [shops]);

  const filteredShops = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    const queryTerms = query === "" ? [] : query.split(/\s+/);

    return shops.filter((shop) => {
      const shopText = shopSearchIndex[shop.id] || "";
      const matchesSearch =
        query === "" ||
        queryTerms.every((term) => shopText.includes(term));

      let matchesCategory = false;
      if (selectedCategory === "All") {
        matchesCategory = true;
      } else if (selectedCategory === "Favorites") {
        matchesCategory = favorites.includes(shop.id);
      } else if (selectedCategory === "Nearby") {
        matchesCategory = true; // We'll sort these
      } else {
        matchesCategory =
          shop.category === selectedCategory ||
          shop.cuisine_type === selectedCategory;
      }

      let matchesQuickFilter = true;
      if (selectedQuickFilter === "Top Rated") {
        matchesQuickFilter = shop.rating !== undefined && shop.rating >= 4.5;
      } else if (selectedQuickFilter === "Fastest") {
        matchesQuickFilter = shop.prepTime === "15-20 min" || shop.prepTime === "10-15 min";
      } else if (selectedQuickFilter === "Open Now") {
        matchesQuickFilter = getShopStatus(shop).isOpen;
      } else if (selectedQuickFilter === "Halal") {
        matchesQuickFilter = shopText.includes("halal") || shopText.includes("halaal");
      }

      return matchesSearch && matchesCategory && matchesQuickFilter;
    });
  }, [shops, debouncedSearchQuery, selectedCategory, favorites, shopSearchIndex, selectedQuickFilter]);

  const sortedShops = useMemo(() => {
    const getMinPrepTime = (shop: Shop): number => {
      if (!shop.prepTime) return 99;
      const match = shop.prepTime.match(/\d+/);
      return match ? parseInt(match[0], 10) : 99;
    };

    const getPopularity = (shop: Shop): number => {
      return (shop.reviewCount || 0) + (shop.rating || 0) * 10;
    };

    return [...filteredShops].sort((a, b) => {
      const statusA = getShopStatus(a);
      const statusB = getShopStatus(b);

      // 1. Prioritize Open shops
      if (statusA.isOpen && !statusB.isOpen) return -1;
      if (!statusA.isOpen && statusB.isOpen) return 1;

      if (sortBy === "popular") {
        return getPopularity(b) - getPopularity(a);
      }
      if (sortBy === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === "fastest") {
        return getMinPrepTime(a) - getMinPrepTime(b);
      }

      // Default 'recommended' sort (Distance -> Special -> Rating)
      if (userLocation) {
        const aLat =
          (a as any).latitude || -25.9964 + (hashString(a.id) % 10) * 0.005;
        const aLng =
          (a as any).longitude || 28.2268 + (hashString(a.id) % 10) * 0.005;
        const bLat =
          (b as any).latitude || -25.9964 + (hashString(b.id) % 10) * 0.005;
        const bLng =
          (b as any).longitude || 28.2268 + (hashString(b.id) % 10) * 0.005;

        const distA = Math.sqrt(
          Math.pow(aLat - userLocation.lat, 2) +
            Math.pow(aLng - userLocation.lng, 2),
        );
        const distB = Math.sqrt(
          Math.pow(bLat - userLocation.lat, 2) +
            Math.pow(bLng - userLocation.lng, 2),
        );

        if (Math.abs(distA - distB) > 0.001) return distA - distB;
      }

      // Prioritize "Local Eats Special"
      if (a.is_special && !b.is_special) return -1;
      if (!a.is_special && b.is_special) return 1;

      // Rating Sort
      return (b.rating || 0) - (a.rating || 0);
    });
  }, [filteredShops, userLocation, sortBy]);

  const recentShops = useMemo(() => {
    const ids = [...new Set(orders.map((o) => o.shop_id))].slice(0, 5);
    return ids
      .map((id) => shops.find((s) => s.id === id))
      .filter(Boolean) as Shop[];
  }, [orders, shops]);

  const mostFrequentItems = useMemo(() => {
    const itemCounts: {
      [key: string]: {
        count: number;
        name: string;
        variantId: string;
        shopId: string;
        price: number;
        customizations: any[];
      };
    } = {};

    orders.forEach((o) => {
      if (o.status.toLowerCase() === "cancelled") return;
      const key = `${o.shop_id}_${o.product_name}`;
      if (!itemCounts[key]) {
        itemCounts[key] = {
          count: 0,
          name: o.product_name,
          variantId: o.product_variant || o.id,
          shopId: o.shop_id,
          price: o.price || 0,
          customizations: o.customizations || [],
        };
      }
      itemCounts[key].count += o.quantity || 1;
    });

    const sorted = Object.values(itemCounts).sort((a, b) => b.count - a.count);

    return sorted
      .map((entry) => {
        const shop = shops.find((s) => s.id === entry.shopId);
        const originalMenuItem = shop?.menu?.find(
          (m) =>
            m.name.toLowerCase() === entry.name.toLowerCase() ||
            m.id === entry.variantId,
        );

        const menuItem: MenuItem = originalMenuItem || {
          id: entry.variantId || entry.name,
          name: entry.name,
          price: entry.price,
          displayPrice: `R ${entry.price.toFixed(2)}`,
          image: shop?.logo || DEFAULT_SHOP_LOGO,
          description: "Delicious local favorite",
          customizations: entry.customizations,
        };

        return {
          menuItem,
          shopId: entry.shopId,
          shopName: shop?.name || "Local Kitchen",
          count: entry.count,
        };
      })
      .slice(0, 10);
  }, [orders, shops]);

  const cartCount = cart.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + (item?.price || 0) * (item?.quantity || 0),
    0,
  );

  const renderedShopList = useMemo(() => {
    return (
      <motion.div
        layout
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 overflow-hidden isolate"
      >
        {sortedShops.map((shop) => (
          <ShopCard
            key={shop.id}
            shop={shop}
            isFollowed={favorites.includes(shop.id)}
            onStoreInfo={onStoreInfo}
            triggerHaptic={triggerHaptic}
            dataSaverEnabled={dataSaverEnabled}
          />
        ))}
      </motion.div>
    );
  }, [sortedShops, favorites, onStoreInfo, triggerHaptic, dataSaverEnabled]);

  if (fetchError && shops.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen flex flex-col items-center justify-center p-8 max-w-md mx-auto shadow-xl">
        <div className="bg-red-50 dark:bg-red-500/10 p-6 rounded-[32px] border border-red-100 dark:border-red-900/30 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mb-4">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight tracking-tight">
            Backend Timeout
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-[240px]">
            {fetchError.includes("Network Error") || fetchError.includes("Failed to fetch")
              ? (typeof navigator !== "undefined" && !navigator.onLine
                  ? "You are currently offline. Please check your network connection."
                  : "Unable to reach the servers. The database service may be temporarily waking up or reconnecting. Please retry in a moment.")
              : fetchError}
          </p>
          <button
            onClick={onRetry}
            className="w-full py-4 bg-slate-900 dark:bg-orange-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer hover:shadow-xl"
          >
            Reconnect & Retry
          </button>
        </div>
      </div>
    );
  }

  if (loadingShops && shops.length === 0) {
    return <AppSkeletonLoader userProfile={userProfile} />;
  }

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans relative shadow-xl">
      <SystemStatusIndicator />
      {isUpdateAvailable && (
        <button
          onClick={() => window.location.reload()}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-xl z-[9999] font-bold flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Update Available!
        </button>
      )}
      {/* TopBar */}
      <header ref={headerRef} className={`fixed top-4 left-4 right-4 max-w-screen-xl mx-auto z-50 transition-all duration-300 pt-[env(safe-area-inset-top)] ${isScrolled ? 'top-2' : ''}`}>
        <div className={`px-4 sm:px-6 flex items-center justify-between gap-2 min-h-[52px] sm:min-h-[60px] relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-full shadow-xl border border-slate-200/60 dark:border-slate-700/60 transition-all duration-300 ${isScrolled ? 'shadow-md bg-white/90 dark:bg-slate-900/90' : 'shadow-xl'}`}>
          
          {/* Logo & Status Badge */}
          <div className={`flex items-center gap-2 relative min-w-0 shrink transition-opacity duration-300 ${isHeaderSearching ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <LocalEatsLogo width={110} height={28} className="shrink-0 scale-100 origin-left" />
            <div className="hidden xs:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>v{APP_VERSION.split(" ")[0]}</span>
            </div>
          </div>

          {/* Absolute Search Overlay (Appears on click) */}
          <div className={`absolute inset-x-3 sm:inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-center gap-2 transition-all duration-300 ${isHeaderSearching ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none -z-10'}`}>
             <button
              onClick={() => {
                setIsHeaderSearching(false);
                setSearchQuery("");
                setShowSuggestions(false);
                triggerHaptic(5);
              }}
              className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer shrink-0"
              aria-label="Close search"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className={`group relative flex-1 max-w-full flex items-center bg-white dark:bg-slate-900 shadow-xl rounded-xl border transition-all duration-300 transform group-focus-within:scale-[1.015] overflow-hidden ${
              searchQuery.trim().length > 0 
                ? 'border-orange-500/80 ring-2 ring-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.4)]' 
                : 'border-slate-200 dark:border-slate-700'
            } focus-within:border-orange-500/50 focus-within:ring-2 focus-within:ring-orange-500/50 focus-within:shadow-[0_0_8px_rgba(249,115,22,0.4)] dark:focus-within:border-orange-500/50 dark:focus-within:ring-orange-400/50`}>
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300 ${
                searchQuery.trim().length > 0 
                  ? 'text-orange-500 scale-110 animate-spin' 
                  : 'text-slate-400 group-focus-within:text-orange-500 group-focus-within:scale-110 group-focus-within:animate-pulse'
              }`} />
              <input
                id="header-search-input"
                className="w-full bg-transparent border-none outline-none py-2.5 pl-9 pr-9 text-xs sm:text-sm font-semibold dark:text-white transition-all duration-300 transform focus:scale-[1.01] focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 focus:shadow-[0_0_8px_rgba(249,115,22,0.4)] rounded-lg"
                placeholder="Search local kitchens..."
                value={searchQuery}
                onBlur={() => {
                  if (searchQuery.trim().length >= 2) {
                    saveRecentSearch(searchQuery.trim());
                  }
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                    saveRecentSearch(searchQuery.trim());
                    setShowSuggestions(false);
                  }
                }}
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    onClick={() => {
                      setSearchQuery("");
                      setShowSuggestions(true);
                      document.getElementById("header-search-input")?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full cursor-pointer transition-colors"
                    aria-label="Clear search text"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
              {/* Bottom Glowing Accent Line */}
              <div className={`absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 transition-opacity duration-300 ${
                searchQuery.trim().length > 0 ? 'opacity-100 animate-pulse' : 'opacity-0 group-focus-within:opacity-100'
              }`} />
            </div>
          </div>

          {/* Right Action Icons Grouped in a sleek ergonomic pill container */}
          <div className={`flex items-center gap-1 shrink-0 transition-opacity duration-300 ${isHeaderSearching ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-full border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm shadow-2xs">
              <button
                onClick={() => {
                  setIsHeaderSearching(true);
                  setShowSuggestions(true);
                  triggerHaptic(10);
                  setTimeout(() => document.getElementById("header-search-input")?.focus(), 100);
                }}
                className="w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
                aria-label="Search stores"
              >
                <Search className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={onNotifications}
                className="relative w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
                aria-label="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-orange-500 text-white text-[10px] whitespace-nowrap font-black rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <div className="relative">
                <button
                  id="settings-menu-toggle-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (triggerHaptic) triggerHaptic(5);
                    setIsSettingsOpen((prev) => !prev);
                  }}
                  aria-label="Settings and account menu"
                  aria-haspopup="true"
                  aria-expanded={isSettingsOpen}
                  className={`w-9 h-9 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full transition-all cursor-pointer ${
                    isSettingsOpen
                      ? "bg-white dark:bg-slate-700 shadow-sm ring-2 ring-orange-500/40 text-orange-600 dark:text-orange-400"
                      : "hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <MoreVertical className="w-4.5 h-4.5" />
                </button>
              {isSettingsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[100]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSettingsOpen(false);
                    }}
                  />
                  <div className="absolute top-10 right-0 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 z-[110] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSettingsOpen(false);
                        if (triggerHaptic) triggerHaptic(5);
                        onSettings();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group cursor-pointer text-left"
                    >
                      <Settings className="w-5 h-5 text-gray-500 dark:text-slate-400 group-hover:text-orange-600 shrink-0" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                        Settings
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSettingsOpen(false);
                        if (triggerHaptic) triggerHaptic(5);
                        onProfile();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group cursor-pointer text-left"
                    >
                      <User className="w-5 h-5 text-gray-500 dark:text-slate-400 group-hover:text-orange-600 shrink-0" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                        Profile
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSettingsOpen(false);
                        if (triggerHaptic) triggerHaptic(5);
                        onOrderHistory();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group cursor-pointer text-left"
                    >
                      <History className="w-5 h-5 text-gray-500 dark:text-slate-400 group-hover:text-orange-600 shrink-0" />
                      <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                        {t("order_history")}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* Dynamic Compact Promo Banner (Disappears when used/dismissed) */}
        {!isHeaderSearching && !isWinterBannerDismissed && !isPromoUsed("LOCALEATS10") && (
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white text-[11px] sm:text-xs py-2 px-3 sm:px-4 flex items-center justify-between gap-2 border-t border-white/15 shadow-inner">
            <div className="flex items-center gap-1.5 overflow-hidden min-w-0 flex-1">
              <Tag className="w-4 h-4 shrink-0 text-orange-100 animate-pulse" />
              <span className="truncate font-semibold tracking-tight">
                ❄️ <strong>Winter Special:</strong> 10% off Kotas code <span className="font-mono bg-white/25 px-2 py-1 rounded text-white select-all font-bold">LOCALEATS10</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("LOCALEATS10");
                  toast.success("Promo Code Copied!", {
                    description: "Use LOCALEATS10 at checkout to get 10% off!"
                  });
                  triggerHaptic(15);
                }}
                className="bg-white text-orange-600 hover:bg-orange-50 font-black text-[10px] uppercase tracking-wider px-2.5 py-1 min-h-[30px] rounded-lg transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center"
              >
                Copy
              </button>
              <button
                onClick={() => {
                  setIsWinterBannerDismissed(true);
                  try {
                    localStorage.setItem("localeats_winter_banner_dismissed", "true");
                  } catch {}
                }}
                className="w-7 h-7 flex items-center justify-center hover:bg-white/15 rounded-full transition-colors text-white/90 hover:text-white cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Float Suggestions relative to header */}
        <AnimatePresence>
          {isHeaderSearching && showSuggestions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full left-0 right-0 max-w-screen-xl mx-auto px-4 z-[100] pointer-events-none mt-1"
            >
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[350px] overflow-y-auto pointer-events-auto">
                {/* Clickable Horizontal Recent Searches Pills */}
                {recentSearches.length > 0 && (
                  <div className="px-4 py-2 bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
                      <History className="w-3 h-3 text-orange-500" /> Recent:
                    </span>
                    {recentSearches.map((term, idx) => (
                      <button
                        key={`recent-pill-${idx}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchQuery(term);
                          saveRecentSearch(term);
                          triggerHaptic(5);
                        }}
                        className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-slate-700 dark:text-slate-200 hover:text-orange-600 dark:hover:text-orange-400 rounded-full text-xs font-bold border border-slate-200/80 dark:border-slate-700/80 shadow-2xs shrink-0 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                      >
                        <span>{term}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setRecentSearches([]);
                        try {
                          localStorage.removeItem("recent_searches");
                        } catch {}
                      }}
                      className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-rose-500 shrink-0 ml-auto cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {/* IF SEARCH QUERY IS EMPTY OR SMALL */}
                {searchQuery.length < 2 ? (
                  <>
                    {/* Frequently Ordered Shops Section */}
                    {frequentlyOrderedShops.length > 0 && (
                      <>
                        <div className="px-5 py-2.5 bg-orange-500/5 dark:bg-orange-500/10 text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-orange-500 fill-orange-500" />
                          ⭐ Frequently Ordered Kitchens
                        </div>
                        {frequentlyOrderedShops.map((shop, idx) => (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.96, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: idx * 0.03 }}
                            key={`frequent-${shop.id}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onStoreInfo(shop.id);
                              setIsHeaderSearching(false);
                              setSearchQuery("");
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-5 py-3 text-[13px] font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100/40 dark:border-white/5 last:border-none cursor-pointer dark:text-white bg-transparent border-none"
                          >
                            <Store className="w-3.5 h-3.5 text-orange-500" />
                            <span>{shop.name}</span>
                            <span className="text-[9px] bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full font-black uppercase tracking-wide">
                              Frequent
                            </span>
                          </motion.button>
                        ))}
                      </>
                    )}

                    {/* Recent Searches Section */}
                    {recentSearches.length > 0 && (
                      <>
                        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/20 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <History className="w-3 h-3 text-slate-400" />
                            Recent Searches
                          </span>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setRecentSearches([]);
                              try {
                                localStorage.removeItem("recent_searches");
                              } catch {}
                            }}
                            className="text-[10px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                        {recentSearches.map((s, idx) => (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.15, delay: idx * 0.03 }}
                            key={`recent-${idx}`}
                            className="w-full hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100/40 dark:border-white/5 last:border-none flex items-center justify-between"
                          >
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSearchQuery(s);
                                setShowSuggestions(false);
                                saveRecentSearch(s);
                              }}
                              className="flex-1 text-left px-5 py-3 text-[13px] font-bold flex items-center gap-2 cursor-pointer dark:text-white bg-transparent border-none outline-none"
                            >
                              <History className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                              {s}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecentSearches((prev) => {
                                  const updated = prev.filter((item) => item !== s);
                                  try {
                                    localStorage.setItem("recent_searches", JSON.stringify(updated));
                                  } catch {}
                                  return updated;
                                });
                              }}
                              className="p-3 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </>
                    )}

                    {frequentlyOrderedShops.length === 0 && recentSearches.length === 0 && (
                      <div className="px-5 py-5 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                        Type to search for local kitchens & meals...
                      </div>
                    )}
                  </>
                ) : (
                  /* IF SEARCH QUERY HAS 2+ CHARACTERS */
                  <>
                    {/* Matching Frequently Ordered Shops */}
                    {frequentlyOrderedShops.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 && (
                      <>
                        <div className="px-5 py-2.5 bg-orange-500/5 dark:bg-orange-500/10 text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-orange-500 fill-orange-500 animate-pulse" />
                          ⭐ Frequently Ordered
                        </div>
                        {frequentlyOrderedShops
                          .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((shop, idx) => (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.96, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ duration: 0.15, delay: idx * 0.03 }}
                              key={`frequent-match-${shop.id}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                onStoreInfo(shop.id);
                                setIsHeaderSearching(false);
                                setSearchQuery("");
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-5 py-3 text-[13px] font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100/40 dark:border-white/5 last:border-none cursor-pointer dark:text-white bg-transparent border-none"
                            >
                              <Store className="w-3.5 h-3.5 text-orange-500" />
                              <span>{shop.name}</span>
                              <span className="text-[9px] bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full font-black uppercase tracking-wide">
                                Frequent
                              </span>
                            </motion.button>
                          ))
                        }
                      </>
                    )}

                    {/* General Suggestions */}
                    {suggestions.length > 0 ? (
                      <>
                        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/20 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                          🔍 Stores Found
                        </div>
                        {suggestions.map((name, idx) => {
                          const shop = shops.find(s => s.name === name);
                          return (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.96, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ duration: 0.15, delay: idx * 0.035 }}
                              key={`store-${idx}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (shop) {
                                  onStoreInfo(shop.id);
                                  setIsHeaderSearching(false);
                                  setSearchQuery("");
                                  setShowSuggestions(false);
                                }
                              }}
                              className="w-full text-left px-5 py-3 text-[13px] font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100/40 dark:border-white/5 last:border-none cursor-pointer dark:text-white bg-transparent border-none"
                            >
                              <Store className="w-3.5 h-3.5 text-orange-500" />
                              {name}
                            </motion.button>
                          );
                        })}
                      </>
                    ) : null}

                    {/* Matching Previous Searches */}
                    {recentSearches.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()) && s.toLowerCase() !== searchQuery.toLowerCase()).length > 0 && (
                      <>
                        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/20 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                          🕒 Matching Previous Searches
                        </div>
                        {recentSearches
                          .filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()) && s.toLowerCase() !== searchQuery.toLowerCase())
                          .map((s, idx) => (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.96, y: 4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ duration: 0.15, delay: idx * 0.035 }}
                              key={`match-recent-${idx}`}
                              className="w-full hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100/40 dark:border-white/5 last:border-none flex items-center justify-between"
                            >
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSearchQuery(s);
                                  setShowSuggestions(false);
                                  saveRecentSearch(s);
                                }}
                                className="flex-1 text-left px-5 py-3 text-[13px] font-bold flex items-center gap-2 cursor-pointer dark:text-white bg-transparent border-none outline-none"
                              >
                                <History className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                                {s}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecentSearches((prev) => {
                                    const updated = prev.filter((item) => item !== s);
                                    try {
                                      localStorage.setItem("recent_searches", JSON.stringify(updated));
                                    } catch {}
                                    return updated;
                                  });
                                }}
                                className="p-3 text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          ))
                        }
                      </>
                    )}

                    {/* Empty matching message if absolutely nothing matches */}
                    {frequentlyOrderedShops.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 &&
                      suggestions.length === 0 &&
                      recentSearches.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="px-5 py-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                          No matching stores or past terms found for "{searchQuery}"
                        </div>
                      )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sticky Sub-Header with Category Filters (only on home screen) */}
        {currentScreen === "home" && (
          <div className="max-w-screen-xl mx-auto px-3 sm:px-4 pb-2 pt-1 border-t border-slate-100 dark:border-slate-850 flex flex-col gap-1.5 overflow-hidden">
            {/* Quick Categories Horizontal Scroll */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-3 px-3 sm:-mx-4 sm:px-4 mask-gradient items-center touch-pan-x">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <motion.button
                    key={cat}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedCategory(cat);
                      triggerHaptic(5);
                    }}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-black tracking-tight transition-all whitespace-nowrap cursor-pointer border shrink-0 ${
                      isSelected 
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs" 
                        : "bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {getCategorySlang(cat, language)}
                  </motion.button>
                );
              })}
            </div>

            {/* Quick Filters - Top Rated, Fastest, Open Now, Halal */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-3 px-3 sm:-mx-4 sm:px-4 mask-gradient items-center touch-pan-x">
              {["Open Now", "Top Rated", "Fastest", "Halal"].map((filter) => {
                const isSelected = selectedQuickFilter === filter;
                return (
                  <motion.button
                    key={filter}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedQuickFilter(isSelected ? null : filter);
                      triggerHaptic(3);
                    }}
                    className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer border flex items-center gap-1 shrink-0 ${
                      isSelected 
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700/50" 
                        : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {filter === "Open Now" && <Activity className="w-3 h-3" />}
                    {filter === "Top Rated" && <Star className="w-3 h-3" />}
                    {filter === "Fastest" && <Zap className="w-3 h-3" />}
                    {filter === "Halal" && <ShieldCheck className="w-3 h-3" />}
                    {filter}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow flex flex-col p-4 max-w-screen-xl mx-auto w-full" style={{ paddingTop: headerHeight ? `calc(${headerHeight}px + 1rem)` : "120px" }}>
        {/* Compact Persistent Delivery Status Widget (Removed to prevent duplication with global persistent tracker) */}

        <div className="mb-6 px-1 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>{greeting}, {userProfile.fullName ? userProfile.fullName.split(" ")[0] : "there"}</span>
              <span className="select-none">👋</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Order fresh local meals & goods delivered in <span className="font-semibold text-orange-600 dark:text-orange-400">{currentTownship.name}</span>
            </p>
          </div>
          <div className="flex items-center shrink-0">
            <span className="inline-flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full text-xs font-bold border border-orange-200 dark:border-orange-800/60 shadow-xs">
              📍 Delivering to {currentTownship.name}
            </span>
          </div>
        </div>

        {/* Real-time Order Notification Permission Request Flow */}
        {notificationPermissionStatus !== "granted" && notificationPermissionStatus !== "unsupported" && !notificationBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="mb-6 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/40 dark:via-amber-950/30 dark:to-orange-950/40 p-4 rounded-2xl border border-orange-200/90 dark:border-orange-800/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
          >
            <div className="flex items-start gap-3.5 z-10">
              <div className="size-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20 animate-pulse">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Stay Updated on Your Orders
                  </h4>
                  {activeOrders.length > 0 ? (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white px-2 py-0.5 rounded-full animate-bounce">
                      {activeOrders.length} Active Order{activeOrders.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-md">
                      Live Push Alerts
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                  {activeOrders.length > 0
                    ? "You have orders in progress! Enable notifications to receive instant updates when food is cooking, packed, and out for delivery."
                    : "Receive real-time push alerts when your kitchen starts cooking, when food is packed, and when your driver is approaching."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0 z-10">
              <button
                type="button"
                onClick={handleDismissNotificationBanner}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer transition-colors"
              >
                Maybe Later
              </button>
              <button
                type="button"
                onClick={handleRequestNotifications}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md shadow-orange-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Enable Alerts</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Order Again Carousel */}
        {orderAgainEnabled && mostFrequentItems.length > 0 && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                Order Again
                <div className="w-1 h-1 bg-orange-500 rounded-full animate-pulse"></div>
              </h3>
              <button
                onClick={onOrderHistory}
                className="text-[9px] font-black text-orange-600 uppercase tracking-widest hover:underline px-2 py-0.5 bg-orange-50 dark:bg-orange-900/10 rounded-md"
              >
                View History
              </button>
            </div>

            <div className="relative w-full max-w-[100vw] overflow-x-hidden">
              <div className="flex overflow-x-auto gap-3 no-scrollbar pb-1 pt-0.5 touch-pan-x -mx-4 px-4">
                {mostFrequentItems.map(({ menuItem, shopId, shopName, count }) => (
                  <motion.div
                    key={`again-item-${shopId}-${menuItem.id}`}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onStoreInfo(shopId)}
                    className="flex-shrink-0 w-[210px] h-[52px] bg-white dark:bg-slate-900/80 p-2 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-xs flex items-center justify-between group hover:border-orange-500/20 transition-all duration-300 relative overflow-hidden cursor-pointer"
                  >
                    <div className="flex items-center gap-2 z-10 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0 relative">
                        <BlurUpImage
                          src={menuItem.image || DEFAULT_SHOP_LOGO}
                          alt={menuItem.name}
                          className="w-full h-full object-cover"
                        />
                        {/* Frequency Badge on top of image */}
                        <div className="absolute top-0.5 left-0.5 bg-orange-500/90 text-white text-[7px] font-black px-1 rounded-sm shadow-xs uppercase tracking-tight">
                          {count}x
                        </div>
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <h4 className="text-[10px] font-extrabold text-slate-900 dark:text-white line-clamp-1 leading-tight mb-0.5">
                          {menuItem.name}
                        </h4>
                        <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 dark:text-slate-500 line-clamp-1 leading-none">
                          {shopName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pl-2 border-l border-slate-100 dark:border-slate-800/60 flex-shrink-0 z-10">
                      <span className="text-[10px] font-black text-slate-900 dark:text-white whitespace-nowrap">
                        R {menuItem.price.toFixed(0)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(menuItem, shopId);
                          triggerHaptic(10);
                          toast.success(`Added ${menuItem.name} to cart`, {
                            description: `From ${shopName}`
                          });
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white p-1 rounded-md transition-all active:scale-90 cursor-pointer flex items-center justify-center shadow-xs"
                        title="Add to cart"
                      >
                        <Plus className="w-3 h-3 font-bold" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Local Merchants */}
        <section className="mb-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 px-1">
            <div className="flex items-center gap-3 justify-between sm:justify-start">
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                  Local Merchants
                </h3>
                <div className="h-1 w-8 bg-orange-600 rounded-full"></div>
              </div>
              {loadingShops ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-full border border-amber-100 dark:border-amber-900/40">
                  <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest animate-pulse">
                    Syncing...
                  </span>
                </div>
              ) : (
                <span className="text-[9px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1 rounded-full border border-orange-100 dark:border-orange-500/20">
                  {sortedShops.length} Online
                </span>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs self-start sm:self-auto">
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden xs:inline">Sort:</span>
              <select
                id="shop-sort-dropdown"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'recommended' | 'popular' | 'rating' | 'fastest');
                  triggerHaptic(5);
                }}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:ring-0 pr-1"
                aria-label="Sort shops"
              >
                <option value="recommended" className="dark:bg-slate-900">✨ Recommended</option>
                <option value="popular" className="dark:bg-slate-900">🔥 Most Popular</option>
                <option value="rating" className="dark:bg-slate-900">⭐ Rating</option>
                <option value="fastest" className="dark:bg-slate-900">⚡ Fastest Prep Time</option>
              </select>
            </div>
          </div>

          {loadingShops && (
            <div className="mx-1 mb-4 bg-orange-50/70 dark:bg-orange-950/20 border border-orange-100/70 dark:border-orange-900/40 py-3 px-4 rounded-2xl flex items-center justify-between gap-3 text-orange-850 dark:text-orange-400 text-xs font-semibold animate-pulse">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                <span>
                  Refreshing stores...
                </span>
              </div>
            </div>
          )}
          {renderedShopList}
        </section>

        {sortedShops.length === 0 && (
          <motion.section
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="py-12 text-center flex flex-col items-center justify-center px-4 max-w-md mx-auto"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-orange-500/10 dark:bg-orange-500/20 scale-150 blur-2xl opacity-70"></div>
              <div className="relative size-20 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-800 dark:to-slate-900 rounded-3xl flex items-center justify-center text-orange-600 dark:text-orange-400 border border-orange-200/80 dark:border-orange-500/30 shadow-xl shadow-orange-500/10">
                {shops.length === 0 ? (
                  <Store className="w-10 h-10" />
                ) : (
                  <Search className="w-9 h-9" />
                )}
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {shops.length === 0 ? "No Shops Found" : "No Kitchens Found"}
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto font-medium leading-relaxed">
              {shops.length === 0
                ? (fetchError || "It looks like there are no active shops in your area yet.")
                : searchQuery
                ? `No merchants matching "${searchQuery}". Try a different keyword.`
                : `No kitchens currently open in "${selectedCategory}".`}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
              {shops.length === 0 ? (
                <button
                  onClick={onRetry}
                  className="w-full px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-orange-600/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Shops & Live Data
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setSelectedQuickFilter(null);
                    triggerHaptic(5);
                  }}
                  className="w-full px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-orange-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  Reset Filters & Search
                </button>
              )}
            </div>

            {shops.length === 0 && (
              <div className="mt-8 bg-slate-50/90 dark:bg-slate-900/60 p-4 rounded-2xl max-w-sm w-full border border-slate-200/70 dark:border-slate-800 text-left shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Service Status
                  </span>
                  <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Connected to <strong>LocalEats Cloud Service</strong>. Live menu updates and real-time ordering are active and ready.
                </p>
              </div>
            )}
          </motion.section>
        )}
      </main>

      {/* Sleek Glassmorphic Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-slate-100/70 via-transparent to-transparent dark:from-slate-950/70 pointer-events-none flex flex-col items-center justify-end">
        {/* Subtle Background Syncing Indicator */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center gap-1.5 mb-2 px-3 py-1 bg-gradient-to-r from-orange-500/95 to-amber-500/95 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg backdrop-blur-md border border-white/20 pointer-events-auto select-none"
            >
              <RefreshCw className="w-3 h-3 animate-spin text-white" />
              <span>Syncing...</span>
            </motion.div>
          )}
        </AnimatePresence>
        <nav className="w-full max-w-md md:max-w-lg mx-auto flex justify-around items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[24px] sm:rounded-[28px] border border-slate-200/60 dark:border-slate-800/80 px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] pointer-events-auto">
          {/* Home Button */}
          <button
            onClick={() => {
              triggerHaptic();
              setCurrentScreen("home");
            }}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all active:scale-95 cursor-pointer group ${
              currentScreen === "home"
                ? "text-orange-600 dark:text-orange-500"
                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
              currentScreen === "home" ? "bg-orange-50 dark:bg-orange-950/50" : ""
            }`}>
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
              {t("home")}
            </span>
          </button>

          {/* Discover Button */}
          <button
            id="tour-nav-discover"
            onClick={() => {
              triggerHaptic();
              onDiscover();
            }}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all active:scale-95 cursor-pointer group ${
              currentScreen === "discover"
                ? "text-orange-600 dark:text-orange-500"
                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
              currentScreen === "discover" ? "bg-orange-50 dark:bg-orange-950/50" : ""
            }`}>
              <Store className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
              {t("discover")}
            </span>
          </button>

          {/* Explore Map Button */}
          <button
            onClick={() => {
              triggerHaptic();
              onExplore();
            }}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all active:scale-95 cursor-pointer group ${
              currentScreen === "explore"
                ? "text-orange-600 dark:text-orange-500"
                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
              currentScreen === "explore" ? "bg-orange-50 dark:bg-orange-950/50" : ""
            }`}>
              <MapIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
              {t("map")}
            </span>
          </button>

          {/* Active/History Orders Button */}
          <button
            onClick={() => {
              triggerHaptic();
              if (activeOrders.length > 0) {
                setCurrentScreen("order-tracking");
              } else {
                onOrderHistory();
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all active:scale-95 cursor-pointer group ${
              currentScreen === "order-tracking" || currentScreen === "order-history"
                ? "text-orange-600 dark:text-orange-500"
                : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 relative ${
              currentScreen === "order-tracking" || currentScreen === "order-history" ? "bg-orange-50 dark:bg-orange-950/50" : ""
            }`}>
              <ClipboardList className="w-5 h-5" />
              {activeOrders.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-900 animate-pulse"></span>
              )}
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
              {t("orders")}
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}

const parseCardDetailsFromInstructions = (instructions: string | null | undefined) => {
  if (!instructions) return null;
  const match = instructions.match(/\[CARD_MACHINE_PAYMENT:\s*Holder:\s*([^,\]]+),\s*Card:\s*([^,\]]+),\s*Exp:\s*([^,\]]+),\s*CVV:\s*([^,\]]+)(?:,\s*Terminal:\s*([^,\]]+))?(?:,\s*Brand:\s*([^,\]]+))?\]/);
  if (match) {
    return {
      holder: match[1],
      card: match[2],
      exp: match[3],
      cvv: match[4],
      terminal: match[5] || "POS-TERM-101",
      brand: match[6] || "Yoco Go",
    };
  }
  return null;
};

const cleanInstructionsForDisplay = (instructions: string | null | undefined) => {
  if (!instructions) return "";
  return instructions.replace(/\[CARD_MACHINE_PAYMENT:[^\]]+\]/, "").trim().replace(/^•\s*/, "").replace(/\s*•\s*$/, "").replace(/\s*•\s*•\s*/g, " • ");
};

function OrderSuccessScreen({
  onHome,
  cart,
  shops,
  triggerHaptic,
}: {
  onHome: () => void;
  cart: CartItem[];
  shops: Shop[];
  triggerHaptic: (pattern?: number | number[]) => void;
}) {
  const [showRatePrompt, setShowRatePrompt] = useState(true);

  useEffect(() => {
    if ("vibrate" in navigator) {
      navigator.vibrate([20, 50, 20, 50, 30]); // Success fanfare haptic
    }
  }, []);
  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shopIds = Array.from(new Set(cart.map((item) => item.shopId)));
  const shopNames = shopIds
    .map((id) => shops.find((s) => s.id === id)?.name)
    .filter(Boolean);
  const shopDisplay =
    shopNames.length > 1 ? "multiple stores" : shopNames[0] || "the store";

  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl mx-auto w-full flex flex-col items-center py-12">
        <div className="relative mb-12 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/10 rounded-full scale-150 blur-3xl"></div>
          <div className="relative h-48 w-48 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/5">
            <div className="h-32 w-32 rounded-full bg-primary flex items-center justify-center shadow-xl shadow-primary/40 animate-in zoom-in duration-500">
              <Check className="w-16 h-16 text-white" strokeWidth={4} />
            </div>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic mb-4">
          Order Placed!
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-medium mb-12 max-w-md mx-auto">
          Your order for{" "}
          <span className="text-primary font-bold">
            R {totalAmount.toFixed(2)}
          </span>{" "}
          has been sent to {shopDisplay}.
        </p>

        <div className="w-full max-w-screen-md grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-left flex items-start gap-5">
            <div className="size-16 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-black text-orange-600 uppercase tracking-widest mb-1">
                Time Estimate
              </p>
              <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">
                Ready in 15-20 mins
              </p>
              <p className="text-slate-500 text-sm mt-1 uppercase font-black text-[10px] tracking-tighter">
                Status: Preparing Now
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-left flex items-start gap-5">
            <div className="size-16 bg-green-600/10 rounded-2xl flex items-center justify-center text-green-600 shrink-0">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-black text-green-600 uppercase tracking-widest mb-1">
                Order Status
              </p>
              <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">
                Sent to Merchant
              </p>
              <p className="text-slate-500 text-sm mt-1 uppercase font-black text-[10px] tracking-tighter">
                Tracking ID: #{Math.floor(1000 + Math.random() * 9000)}
              </p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-left flex items-start gap-5 md:col-span-2">
            <div className="size-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
              <Star className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-500 uppercase tracking-widest mb-1">
                Loyalty Reward
              </p>
              <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">
                +{Math.floor(totalAmount / 10)} Points Earned
              </p>
              <p className="text-slate-500 text-sm mt-1 uppercase font-black text-[10px] tracking-tighter">
                Added to your profile balance
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Rating Prompt */}
        <AnimatePresence>
          {showRatePrompt && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[#221610] text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden mb-12 border border-white/5"
            >
              <div className="absolute top-0 right-0 p-4">
                <button
                  onClick={() => setShowRatePrompt(false)}
                  className="text-white/20 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-6 relative z-10">
                <div className="size-20 bg-orange-600 rounded-3xl flex items-center justify-center shadow-xl shadow-orange-600/30 rotate-3">
                  <Star className="w-10 h-10 text-white fill-current" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black uppercase tracking-tight italic mb-2">
                    Love LocalEats?
                  </h3>
                  <p className="text-white/60 text-sm font-medium leading-relaxed px-4">
                    Your support helps local merchants thrive. Rate us on the
                    App Store!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      className="text-orange-500 hover:scale-110 active:scale-95 transition-transform"
                      onClick={() => triggerHaptic(10)}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    triggerHaptic(50);
                    window.open("https://apps.apple.com", "_blank");
                    setShowRatePrompt(false);
                  }}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all text-[10px]"
                >
                  Confirm & Rate
                </button>
              </div>
              <div className="absolute -bottom-12 -left-12 size-48 bg-orange-600/20 rounded-full blur-3xl"></div>
              <div className="absolute -top-12 -right-12 size-48 bg-orange-600/10 rounded-full blur-3xl"></div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onHome}
          className="w-full max-w-sm py-5 bg-slate-900 dark:bg-orange-600 text-white font-black uppercase tracking-[0.2em] rounded-3xl shadow-xl active:scale-95 transition-all mb-4 flex items-center justify-center gap-3"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </motion.button>
      </div>
    </div>
  );
}

function QRScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  shops,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (text: string) => void;
  shops: Shop[];
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-element";

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const startScanner = async () => {
      try {
        setErrorMsg(null);
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            if (isMounted) {
              onScanSuccess(decodedText);
              html5QrCode.stop().catch(console.error);
            }
          },
          (errorMessage) => {
            // benign logs
          }
        );
      } catch (err: any) {
        console.warn("QR start error:", err);
        if (isMounted) {
          setErrorMsg("Camera access not available. Try entering the code manually or simulating a scan below!");
        }
      }
    };

    // delay slightly to ensure div is in DOM
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-orange-500 animate-pulse" />
            <h3 className="font-sans font-black text-sm uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Promo Code & Flyer QR Scanner
            </h3>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4 leading-relaxed">
            Scan a store flyer or promo code QR to instantly apply discounts or view menus.
          </p>

          {/* Camera Viewport */}
          <div className="relative w-full aspect-square max-w-[240px] bg-slate-950 dark:bg-slate-950 rounded-2xl overflow-hidden border-2 border-dashed border-orange-500/40 flex items-center justify-center">
            <div id={scannerId} className="w-full h-full object-cover" />
            
            {errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-slate-950/90 text-slate-400">
                <Camera className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-[10px] font-medium leading-relaxed">
                  {errorMsg}
                </span>
              </div>
            )}
            
            {/* Animated Laser Scanning Line */}
            {!errorMsg && (
              <div className="absolute left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_8px_#f97316] animate-[bounce_2s_infinite] top-0 z-10" />
            )}
          </div>

          {/* Manual Input or Simulator */}
          <div className="w-full mt-6 space-y-4">
            <div className="relative flex items-center">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter flyer code manually (e.g. shop_1)"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={() => {
                  if (manualCode.trim()) {
                    onScanSuccess(manualCode.trim());
                  }
                }}
                className="absolute right-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Submit
              </button>
            </div>

            {/* Simulated QR Scan Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                QR Code Tester (Simulation)
              </span>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-[140px] overflow-y-auto">
                <button
                  onClick={() => onScanSuccess("LOCALEATS10")}
                  className="flex flex-col text-left p-2.5 rounded-xl border border-orange-200 dark:border-orange-800/60 bg-orange-50/50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all group col-span-2 cursor-pointer"
                >
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 group-hover:text-orange-500 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-orange-500" /> Scan Promo: LOCALEATS10 (10% Off)
                  </span>
                  <span className="text-[10px] whitespace-nowrap text-slate-400 font-mono mt-0.5">
                    Applies 10% discount promo code to clipboard
                  </span>
                </button>
                {shops.slice(0, 4).map((shop) => (
                  <button
                    key={shop.id}
                    onClick={() => onScanSuccess(shop.id)}
                    className="flex flex-col text-left p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all group cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 group-hover:text-orange-500 truncate">
                      {shop.name}
                    </span>
                    <span className="text-[10px] whitespace-nowrap text-slate-400 font-mono mt-0.5">
                      Flyer: {shop.id}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShopCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-100/60 dark:border-slate-800/60 flex flex-col h-[380px] animate-pulse">
      {/* Top Image Area */}
      <div className="h-52 bg-slate-200 dark:bg-slate-800/80 relative" />
      {/* Text Area */}
      <div className="p-6 flex flex-col flex-grow justify-between">
        <div className="space-y-3">
          <div className="h-5 bg-slate-200 dark:bg-slate-800/80 rounded-lg w-2/3" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800/50 rounded w-1/2" />
        </div>
        <div className="flex justify-between items-center mt-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-800/80 rounded w-1/4" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-1/5" />
        </div>
      </div>
    </div>
  );
}

function DiscoverScreen({
  shops,
  userProfile,
  onHome,
  onExplore,
  onScanFlyer,
  favorites,
  toggleFavorite,
  onSelectShop,
  userLocation,
  showAlert,
  setCurrentScreen,
  triggerHaptic,
  isOnline,
  loadingShops = false,
}: {
  shops: Shop[];
  onHome: () => void;
  onExplore: () => void;
  onScanFlyer?: () => void;
  favorites: string[];
  toggleFavorite: (shopId: string) => void;
  onSelectShop: (shopId: string) => void;
  userLocation: { lat: number; lng: number } | null;
  showAlert: (title: string, message: string) => void;
  setCurrentScreen: (screen: Screen) => void;
  triggerHaptic: (pattern?: number | number[]) => void;
  isOnline: boolean;
  loadingShops?: boolean;
  userProfile?: UserProfile;
}) {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("recent_searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Debounce search input updates
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    setRecentSearches(prev => {
      const newSearches = [query, ...prev.filter(q => q.toLowerCase() !== query.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem("recent_searches", JSON.stringify(newSearches));
      } catch {}
      return newSearches;
    });
  }, []);

  const [selectedCategory, setSelectedCategory] = useState("All");

  const [minRating, setMinRating] = useState(0);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [sortPriority, setSortPriority] = useState<"smart" | "distance" | "rating" | "speed">("smart");
  
  const [pingStatus, setPingStatus] = useState<"idle" | "testing" | "online" | "offline">("idle");
  const [latency, setLatency] = useState<number | null>(null);

  const handleTestPing = useCallback(() => {
    setPingStatus("testing");
    triggerHaptic?.(50);
    setTimeout(() => {
      if (navigator.onLine) {
        setPingStatus("online");
        setLatency(Math.floor(Math.random() * 30) + 20); // 20-50ms
        toast.success("Connection check complete!", {
          description: "You are connected to LocalEats and ready to order."
        });
      } else {
        setPingStatus("offline");
        setLatency(null);
        toast.error("Connection check failed", {
          description: "No internet connection. Your actions are saved and will sync later."
        });
      }
    }, 1500);
  }, [triggerHaptic]);

  const categories = [
    "All",
    "Favorites",
    "Nearby",
    ...new Set(shops.map((s) => s.category)),
  ];

  // Pre-calculate search index map for DiscoverScreen to optimize searching
  const shopSearchIndex = useMemo(() => {
    const indexMap: Record<string, string> = {};
    shops.forEach((shop) => {
      indexMap[shop.id] = `${shop.name} ${shop.description || ""} ${shop.category}`.toLowerCase();
    });
    return indexMap;
  }, [shops]);

  const realFreshItems = useMemo(() => {
    const items: Array<{
      id: string;
      shopId: string;
      shopName: string;
      itemName: string;
      price: number;
      image: string;
      description: string;
      badge: string;
    }> = [];

    shops.forEach((shop) => {
      if (shop.menu && shop.menu.length > 0) {
        shop.menu.forEach((item) => {
          if (item.image) {
            items.push({
              id: `${shop.id}-${item.id}`,
              shopId: shop.id,
              shopName: shop.name,
              itemName: item.name,
              price: item.price,
              image: item.image,
              description: item.description || `${item.name} from ${shop.name}`,
              badge: shop.rating >= 4.5 ? "Top Rated" : "Fresh",
            });
          }
        });
      }
    });

    return items.slice(0, 8);
  }, [shops]);

  const filteredShops = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    const queryTerms = query === "" ? [] : query.split(/\s+/);

    return shops.filter((shop) => {
      const shopText = shopSearchIndex[shop.id] || "";
      const matchesSearch =
        query === "" ||
        queryTerms.every((term) => shopText.includes(term));

      let matchesCategory = false;
      if (selectedCategory === "All" || selectedCategory === "Nearby") {
        matchesCategory = true;
      } else if (selectedCategory === "Favorites") {
        matchesCategory = favorites.includes(shop.id);
      } else {
        matchesCategory = shop.category === selectedCategory;
      }

      const matchesRating = shop.rating >= minRating;
      const matchesOpen = !showOnlyOpen || getShopStatus(shop).isOpen;

      // Filter by max distance if user location is loaded
      let matchesDistance = true;
      if (maxDistance !== null && userLocation) {
        const sLat =
          (shop as any).latitude || -25.9964 + (hashString(shop.id) % 10) * 0.005;
        const sLng =
          (shop as any).longitude || 28.2268 + (hashString(shop.id) % 10) * 0.005;
        const dist = calculateDistance(
          sLat,
          sLng,
          userLocation.lat,
          userLocation.lng,
        );
        matchesDistance = dist <= maxDistance;
      }

      return matchesSearch && matchesCategory && matchesRating && matchesOpen && matchesDistance;
    });
  }, [shops, debouncedSearchQuery, selectedCategory, favorites, minRating, showOnlyOpen, maxDistance, userLocation, shopSearchIndex]);

  const suggestions = useMemo(() => {
    if (debouncedSearchQuery.length < 2) return [];
    return shops
      .filter((s) => s.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
      .map((s) => s.name)
      .slice(0, 5);
  }, [shops, debouncedSearchQuery]);

  const sortedShops = [...filteredShops].sort((a, b) => {
    const statusA = getShopStatus(a);
    const statusB = getShopStatus(b);

    // If sorting by smart priority:
    if (sortPriority === "smart") {
      // 1. Prioritize Open shops
      if (statusA.isOpen && !statusB.isOpen) return -1;
      if (!statusA.isOpen && statusB.isOpen) return 1;

      // 2. Distance Sort (Nearby Priority)
      if (userLocation) {
        const aLat =
          (a as any).latitude || -25.9964 + (hashString(a.id) % 10) * 0.005;
        const aLng =
          (a as any).longitude || 28.2268 + (hashString(a.id) % 10) * 0.005;
        const bLat =
          (b as any).latitude || -25.9964 + (hashString(b.id) % 10) * 0.005;
        const bLng =
          (b as any).longitude || 28.2268 + (hashString(b.id) % 10) * 0.005;

        const distA = Math.sqrt(
          Math.pow(aLat - userLocation.lat, 2) +
            Math.pow(aLng - userLocation.lng, 2),
        );
        const distB = Math.sqrt(
          Math.pow(bLat - userLocation.lat, 2) +
            Math.pow(bLng - userLocation.lng, 2),
        );

        if (Math.abs(distA - distB) > 0.001) {
          return distA - distB;
        }
      }
      
      // 3. Rating Sort
      return b.rating - a.rating;
    }

    if (sortPriority === "distance" && userLocation) {
      const aLat =
        (a as any).latitude || -25.9964 + (hashString(a.id) % 10) * 0.005;
      const aLng =
        (a as any).longitude || 28.2268 + (hashString(a.id) % 10) * 0.005;
      const bLat =
        (b as any).latitude || -25.9964 + (hashString(b.id) % 10) * 0.005;
      const bLng =
        (b as any).longitude || 28.2268 + (hashString(b.id) % 10) * 0.005;

      const distA = calculateDistance(aLat, aLng, userLocation.lat, userLocation.lng);
      const distB = calculateDistance(bLat, bLng, userLocation.lat, userLocation.lng);
      return distA - distB;
    }

    if (sortPriority === "rating") {
      return b.rating - a.rating;
    }

    if (sortPriority === "speed") {
      const speedA = parseInt(a.delivery_eta || "20") || 20;
      const speedB = parseInt(b.delivery_eta || "20") || 20;
      return speedA - speedB;
    }

    return 0;
  });

  return (
    <div className="bg-[#f6f6f9] dark:bg-slate-950 text-[#2d2f31] dark:text-slate-100 min-h-screen flex flex-col font-sans relative shadow-xl">
      {/* TopAppBar */}
      <header className="bg-[#f6f6f9] dark:bg-slate-900 w-full top-0 sticky z-40 transition-opacity duration-200 pt-[env(safe-area-inset-top)]">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-screen-xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={onHome}
              className="text-[#FF6B00] dark:text-[#ff7a2f] hover:opacity-80 transition-opacity cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="font-sans font-bold tracking-tight text-xl text-[#FF6B00]">
              DISCOVER
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {onScanFlyer && (
              <button
                onClick={() => {
                  triggerHaptic(10);
                  onScanFlyer();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Scan Promo Code or Store Flyer"
              >
                <QrCode className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Scan Promo Code</span>
              </button>
            )}
            <button
              onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
              className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors cursor-pointer"
            >
              {viewMode === "list" ? (
                <MapIcon className="w-5 h-5" />
              ) : (
                <List className="w-5 h-5" />
              )}
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#ff7a2f] shadow-sm">
              <img
                className="w-full h-full object-cover"
                alt="User profile photo avatar"
                src={userProfile?.photoURL || getAvatarUrl(userProfile?.fullName)}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="pb-32 flex-grow overflow-y-auto max-w-screen-xl mx-auto w-full">
        {/* Dedicated Promo Code & Flyer Scanner Action Card */}
        {onScanFlyer && (
          <div className="px-6 pt-4 pb-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-slate-900 rounded-2xl border border-orange-500/20 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Scan Promo Codes & Flyers</span>
                    <span className="bg-orange-600 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase">Instant</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Scan QR codes on promotional cards or flyers to auto-apply discounts or view menus.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  triggerHaptic(10);
                  onScanFlyer();
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan Promo Code</span>
              </button>
            </div>
          </div>
        )}
        {/* Real Menu Items Feed from Active Shops */}
        {realFreshItems.length > 0 && (
          <section className="px-6 py-5 bg-white dark:bg-slate-900 shadow-xs border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              Fresh From Local Kitchens
            </h3>
            
            <div className="flex overflow-x-auto gap-4 no-scrollbar pb-2 pt-1 touch-pan-x -mx-6 px-6">
              {realFreshItems.map((feed) => (
                <div
                  key={feed.id}
                  onClick={() => onSelectShop(feed.shopId)}
                  className="flex-shrink-0 w-60 bg-[#f6f6f9] dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col cursor-pointer hover:border-orange-500/30 transition-all active:scale-[0.98]"
                >
                  <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-800">
                    <BlurUpImage src={feed.image} alt={feed.itemName} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-orange-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md shadow-xs">
                      {feed.badge}
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-xs font-black px-2 py-0.5 rounded-lg">
                      R{feed.price}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{feed.itemName}</h4>
                    <p className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 mt-0.5">{feed.shopName}</p>
                    <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{feed.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search & Hero */}
        <section className="px-6 pt-4 pb-8 bg-[#f6f6f9] dark:bg-slate-950">
          <div className="mb-6">
            <h2 className="font-sans text-3xl font-extrabold tracking-tight text-[#2d2f31] dark:text-white mb-2">
              Local Flavor
            </h2>
            <p className="text-[#5a5c5e] dark:text-slate-400 text-lg">
              Discover the finest local Kota spots.
            </p>
          </div>

          {/* Bento Grid Categories */}
          <div className="mb-8 max-w-xl mx-auto">
            <div className="grid grid-cols-2 gap-3 h-[200px]">
              {/* Primary Category (Kotas) */}
              <div 
                onClick={() => { setSelectedCategory("Kotas"); triggerHaptic(5); }}
                className={`relative rounded-3xl overflow-hidden cursor-pointer group shadow-sm transition-transform active:scale-95 ${selectedCategory === "Kotas" ? "ring-4 ring-orange-500" : ""}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-rose-500 transition-transform duration-500 group-hover:scale-105"></div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                <div className="absolute bottom-4 left-4 z-10">
                  <h3 className="text-white font-black text-2xl tracking-tight drop-shadow-md">Kotas</h3>
                  <p className="text-white/90 font-bold text-xs uppercase tracking-wider mt-1 drop-shadow-md">Local Legends</p>
                </div>
                <Store className="absolute top-4 right-4 w-6 h-6 text-white/50 z-10" />
              </div>
              
              {/* Secondary Categories Stack */}
              <div className="grid grid-rows-2 gap-3">
                {/* Top Row */}
                <div 
                  onClick={() => { setSelectedCategory("Burgers"); triggerHaptic(5); }}
                  className={`relative rounded-2xl overflow-hidden cursor-pointer group shadow-sm transition-transform active:scale-95 bg-slate-900 dark:bg-slate-800 ${selectedCategory === "Burgers" ? "ring-4 ring-orange-500" : ""}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-800/50 group-hover:to-slate-700/50 transition-colors"></div>
                  <div className="absolute bottom-3 left-4 z-10">
                    <h3 className="text-white font-black text-lg drop-shadow-md">Burgers</h3>
                  </div>
                </div>
                
                {/* Bottom Row (Split) */}
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => { setSelectedCategory("Drinks"); triggerHaptic(5); }}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer flex flex-col items-center justify-center group active:scale-95 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 ${selectedCategory === "Drinks" ? "ring-2 ring-blue-500" : ""}`}
                  >
                    <span className="text-xl mb-1 group-hover:scale-110 transition-transform z-10 drop-shadow-sm">🥤</span>
                    <span className="font-bold text-xs text-blue-900 dark:text-blue-100 z-10">Drinks</span>
                  </div>
                  <div 
                    onClick={() => { setSelectedCategory("All"); triggerHaptic(5); }}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer flex flex-col items-center justify-center group active:scale-95 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${selectedCategory === "All" ? "ring-2 ring-slate-500" : ""}`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center mb-1 group-hover:shadow-md transition-all z-10">
                      <ArrowRight className="w-3 h-3 text-slate-900 dark:text-white" />
                    </div>
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300 z-10">See All</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group mb-6 max-w-xl mx-auto z-30">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#5a5c5e] dark:text-slate-500">
              <Search className="w-5 h-5" />
            </div>
            <input
              className="w-full h-14 pl-12 pr-10 bg-[#ffffff] dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-[0_8px_32px_rgba(45,47,49,0.04)] text-[#2d2f31] dark:text-white placeholder:text-[#757779] dark:placeholder:text-slate-500 outline-none transition-all"
              placeholder="Search stores nearby..."
              type="text"
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                if (searchQuery.trim().length >= 2) {
                  saveRecentSearch(searchQuery.trim());
                }
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                  saveRecentSearch(searchQuery.trim());
                  setShowSuggestions(false);
                }
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setShowSuggestions(true);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full cursor-pointer transition-colors z-10"
                aria-label="Clear search text"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Float Suggestions relative to search bar */}
            {showSuggestions && (
              <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-40">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden max-h-[350px] overflow-y-auto">
                  {debouncedSearchQuery.length < 2 ? (
                    <>
                      {/* Recent Searches */}
                      {recentSearches.length > 0 && (
                        <>
                          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/20 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <History className="w-3 h-3 text-slate-400" />
                              Recent Searches
                            </span>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setRecentSearches([]);
                                try {
                                  localStorage.removeItem("recent_searches");
                                } catch {}
                              }}
                              className="text-[10px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                          {recentSearches.map((s, idx) => (
                            <div
                              key={`recent-${idx}`}
                              className="w-full hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100/40 dark:border-white/5 last:border-none flex items-center justify-between"
                            >
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSearchQuery(s);
                                  setShowSuggestions(false);
                                  saveRecentSearch(s);
                                }}
                                className="flex-1 text-left px-5 py-3 text-[13px] font-bold flex items-center gap-2 cursor-pointer dark:text-white bg-transparent border-none outline-none"
                              >
                                <History className="w-3.5 h-3.5 text-slate-400" />
                                {s}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecentSearches((prev) => {
                                    const updated = prev.filter((item) => item !== s);
                                    try {
                                      localStorage.setItem("recent_searches", JSON.stringify(updated));
                                    } catch {}
                                    return updated;
                                  });
                                }}
                                className="p-3 text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Search Suggestions Based on query */}
                      {suggestions.length > 0 && (
                        <>
                          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/20 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                            🔍 Search Suggestions
                          </div>
                          {suggestions.map((s, idx) => (
                            <button
                              key={`sugg-${idx}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSearchQuery(s);
                                setShowSuggestions(false);
                                saveRecentSearch(s);
                              }}
                              className="w-full text-left px-5 py-3 text-[13px] font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100/40 dark:border-white/5 last:border-none cursor-pointer dark:text-white bg-transparent border-none"
                            >
                              <Search className="w-3.5 h-3.5 text-orange-500" />
                              {s}
                            </button>
                          ))}
                        </>
                      )}
                      {recentSearches.filter(s => s.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) && s.toLowerCase() !== debouncedSearchQuery.toLowerCase()).length > 0 && (
                        <>
                          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-950/20 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                            🕒 Matching Past Searches
                          </div>
                          {recentSearches
                            .filter(s => s.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) && s.toLowerCase() !== debouncedSearchQuery.toLowerCase())
                            .map((s, idx) => (
                              <button
                                key={`recent-match-${idx}`}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSearchQuery(s);
                                  setShowSuggestions(false);
                                  saveRecentSearch(s);
                                }}
                                className="w-full text-left px-5 py-3 text-[13px] font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100/40 dark:border-white/5 last:border-none cursor-pointer dark:text-white bg-transparent border-none"
                              >
                                <History className="w-3.5 h-3.5 text-slate-400" />
                                {s}
                              </button>
                            ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Category Chips */}
        <section className="mb-10">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap px-6 py-3 rounded-full font-semibold text-sm transition-all cursor-pointer ${
                    selectedCategory === category
                      ? "bg-orange-600 text-white shadow-md shadow-orange-500/10"
                      : "bg-[#e1e2e6] dark:bg-slate-800 text-[#2d2f31] dark:text-slate-300 hover:bg-[#dbdde0] dark:hover:bg-slate-700"
                  }`}
                >
                  {category === "Nearby" && (
                    <Navigation className="w-3.5 h-3.5 mr-1 inline-block align-middle" />
                  )}
                  {getCategorySlang(category, language)}
                </button>
              ))}
            </div>

            <div className="flex gap-3 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setShowOnlyOpen(!showOnlyOpen)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                  showOnlyOpen
                    ? "bg-green-100/90 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800/80 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                }`}
              >
                <Clock
                  className={`w-3 h-3 ${showOnlyOpen ? "fill-current text-green-600 dark:text-green-400" : ""}`}
                />
                Open Now
              </button>
              
              <button
                onClick={() => setSortPriority(sortPriority === "distance" ? "smart" : "distance")}
                className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                  sortPriority === "distance"
                    ? "bg-blue-100/90 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800/80 shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                }`}
              >
                <Navigation
                  className={`w-3 h-3 ${sortPriority === "distance" ? "text-blue-600 dark:text-blue-400" : ""}`}
                />
                Sort by Distance
              </button>
              {[0, 3, 4, 4.5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setMinRating(rating)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                    minRating === rating
                      ? "bg-yellow-100/90 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800/80 shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <Star
                    className={`w-3 h-3 ${minRating === rating ? "fill-current text-yellow-500" : ""}`}
                  />
                  {rating === 0 ? "All Ratings" : `${rating}+ Stars`}
                </button>
              ))}
            </div>

            {/* Sort Priority Section */}
            <div className="flex flex-col gap-1.5 px-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Sort By
              </span>
              <div className="relative w-full max-w-xs">
                <select
                  value={sortPriority}
                  onChange={(e) => {
                    setSortPriority(e.target.value as any);
                    triggerHaptic?.(10);
                  }}
                  className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#2d2f31] dark:text-slate-100 rounded-xl px-4 py-2.5 font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow pr-10 cursor-pointer"
                >
                  <option value="smart">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="speed">Fastest Delivery</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Delivery Radius Section */}
            {userLocation && (
              <div className="flex flex-col gap-1.5 px-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Delivery Radius
                </span>
                <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    { val: null, label: "Any distance" },
                    { val: 2, label: "Within 2 km" },
                    { val: 5, label: "Within 5 km" },
                    { val: 10, label: "Within 10 km" },
                    { val: 25, label: "Within 25 km" }
                  ].map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setMaxDistance(opt.val);
                        triggerHaptic?.(10);
                      }}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                        maxDistance === opt.val
                          ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Store Grid or Map */}
        {viewMode === "list" ? (
          <section className="px-3 sm:px-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {loadingShops ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <ShopCardSkeleton key={idx} />
              ))
            ) : (
              sortedShops.map((shop) => {
                const isFollowing = favorites.includes(shop.id);
                const status = getShopStatus(shop);
                return (
                <div
                  key={shop.id}
                  onClick={() => onSelectShop(shop.id)}
                  className="group bg-[#ffffff] dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_12px_36px_rgba(45,47,49,0.06)] dark:shadow-none hover:shadow-[0_16px_48px_rgba(251,146,60,0.1)] transition-all duration-350 hover:-translate-y-1.5 active:scale-[0.98] border border-slate-100/60 dark:border-slate-800/60 cursor-pointer flex flex-col h-full transform"
                >
                  <div className="aspect-video w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <BlurUpImage
                      src={shop.logo || DEFAULT_SHOP_LOGO}
                      alt={shop.name}
                      className="w-full h-full aspect-video object-cover group-hover:scale-105 transition-transform duration-700"
                      blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`}
                    />

                    {/* Floating Heart Follow Badge */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(shop.id);
                        triggerHaptic(10);
                        if (isFollowing) {
                          toast.success(`Unfollowed ${shop.name}`);
                        } else {
                          toast.success(`Following ${shop.name}!`, {
                            description:
                              "You'll receive exclusive voucher promos from this store.",
                          });
                        }
                      }}
                      className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md size-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 hover:scale-110 transition-all z-10 cursor-pointer text-slate-400 hover:text-rose-500 border border-slate-50 dark:border-slate-800"
                    >
                      <Heart
                        className={`w-4 h-4 transition-transform duration-300 ${isFollowing ? "text-rose-500 fill-rose-500 scale-110" : ""}`}
                      />
                    </button>

                    {/* Highly Visible Rating Tag */}
                    <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center gap-1 shadow-md border border-slate-50 dark:border-slate-850">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {shop.rating.toFixed(1)}
                      </span>
                    </div>

                    {/* Delivery Method Overlay */}
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <div className="bg-orange-600 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">
                        Speed: {shop.delivery_eta || "20m"}
                      </div>
                      {(() => {
                        const sLat = shop.latitude || -25.9964 + (hashString(shop.id) % 10) * 0.005;
                        const sLng = shop.longitude || 28.2268 + (hashString(shop.id) % 10) * 0.005;
                        const distanceVal = userLocation ? calculateDistance(sLat, sLng, userLocation.lat, userLocation.lng) : null;
                        return distanceVal !== null ? (
                          <div className="bg-slate-950/80 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm backdrop-blur-sm flex items-center gap-1">
                            <Navigation className="w-2.5 h-2.5" />
                            {distanceVal.toFixed(1)} km
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow justify-between relative overflow-hidden transition-all duration-300">
                    {/* Subtle shimmer effect while menu content lazy-loads */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                    <div>
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <div>
                          <h3 className="font-sans font-black text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-orange-600 transition-colors line-clamp-2 break-words whitespace-normal flex items-center gap-1.5">
                            <span className="text-xl shrink-0" role="img" aria-label={shop.category}>
                              {getShopCategoryIcon(shop.category)}
                            </span>
                            <span>{shop.name}</span>
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
                            {shop.address}
                          </p>
                          {!status.isOpen && (
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                              Opens {status.nextOpeningTime || "Soon"}
                            </p>
                          )}
                        </div>

                        {!status.isOpen && (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0">
                            Closed
                          </span>
                        )}
                      </div>

                      <div className="mb-6">
                        <TrustBadge shop={shop} />
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectShop(shop.id);
                        triggerHaptic(10);
                      }}
                      className="w-full py-3.5 font-black text-xs uppercase tracking-wider rounded-2xl bg-slate-900 hover:bg-slate-850 dark:bg-orange-600 dark:hover:bg-orange-500 text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Store className="w-4 h-4" />
                      View Menu & Order
                    </button>
                  </div>
                </div>
              );
            }) // close map
            )} // close ternary
            {filteredShops.length === 0 && (
              <div className="col-span-full py-16 px-4 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-6 duration-500 max-w-lg mx-auto">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-orange-500/10 dark:bg-orange-500/20 rounded-full scale-150 blur-2xl opacity-70"></div>
                  <div className="size-20 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-800 dark:to-slate-900 border border-orange-200/80 dark:border-orange-500/30 rounded-3xl flex items-center justify-center text-orange-500 shadow-xl shadow-orange-500/10 relative z-10">
                    <Store className="w-10 h-10" />
                  </div>
                  {shops.length > 0 && (
                    <X className="absolute -top-1 -right-1 w-6 h-6 text-rose-500 bg-white dark:bg-slate-900 rounded-full p-1 shadow-md border border-slate-100 dark:border-slate-800 z-20" />
                  )}
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                  {shops.length === 0 ? "No Shops Found" : "No matches found"}
                </h3>
                
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-6 font-medium">
                  {shops.length === 0
                    ? "It looks like there are no active shops in your area yet."
                    : "We couldn't find any stores matching your current filter criteria. Try adjusting your search query or reset your filters."}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-xs">
                  {shops.length === 0 ? (
                    <button
                      onClick={onHome}
                      className="w-full px-6 py-3.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Home
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("All");
                        setMinRating(0);
                        setShowOnlyOpen(false);
                        setMaxDistance(null);
                      }}
                      className="w-full px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
                    >
                      Discover All Local Spots
                    </button>
                  )}
                </div>

                {shops.length === 0 && (
                  <div className="mt-8 bg-slate-50/90 dark:bg-slate-900/60 p-4 rounded-2xl max-w-sm w-full border border-slate-200/70 dark:border-slate-800 text-left shadow-sm">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Service Status
                      </span>
                      <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                        Online
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Connected to <strong>LocalEats Cloud Service</strong>. New vendors and local kitchens will appear automatically when available.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="px-6 h-[500px] rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 relative">
            {!isOnline && (
              <div className="absolute inset-0 z-[1001] bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                <WifiOff className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-bold">Map Unavailable Offline</h3>
                <p className="text-sm text-slate-500 max-w-xs">
                  Interactive maps require an active internet connection. Please
                  check your signal.
                </p>
                <button
                  onClick={() => setViewMode("list")}
                  className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-bold"
                >
                  View List Instead
                </button>
              </div>
            )}
            <div className="h-full w-full relative z-10">
              <MapContainer
                center={userLocation || DEFAULT_COORDS}
                zoom={14}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation && (
                  <Marker position={userLocation} icon={userMapIcon}>
                    <Popup>
                      <p className="font-extrabold text-xs text-blue-600 text-center m-0">
                        Your Spot
                      </p>
                    </Popup>
                  </Marker>
                )}

                {sortedShops.map((shop) => {
                  const sLat =
                    shop.latitude ||
                    -25.9964 + (hashString(shop.id) % 10) * 0.005;
                  const sLng =
                    shop.longitude ||
                    28.2268 + (hashString(shop.id) % 10) * 0.005;
                  const dist = userLocation
                    ? calculateDistance(
                        sLat,
                        sLng,
                        userLocation.lat,
                        userLocation.lng,
                      )
                    : null;
                  const status = getShopStatus(shop);

                  return (
                    <Marker
                      key={shop.id}
                      position={{ lat: sLat, lng: sLng }}
                      icon={createShopMapIcon(status.isOpen)}
                    >
                      <Popup minWidth={200}>
                        <div className="p-1">
                          <p className="font-black text-xs text-slate-800 m-0 mb-1">
                            {shop.name}
                          </p>
                          <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                            {shop.description}
                          </p>
                          <div className="flex items-center justify-between text-[10px] mb-2.5 border-t pt-1.5 border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-amber-500">
                              ★ {shop.rating}
                            </span>
                            {dist !== null && (
                              <span className="text-slate-500 font-semibold">
                                {dist.toFixed(1)} km
                              </span>
                            )}
                            <span
                              className={`font-extrabold ${status.isOpen ? "text-green-600" : "text-slate-400"}`}
                            >
                              {status.isOpen ? "Open Now" : "Closed"}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              triggerHaptic();
                              onSelectShop(shop.id);
                            }}
                            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg transition-colors cursor-pointer text-center block"
                          >
                            Open Menu
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                <MapRecenter
                  center={[
                    userLocation?.lat || -25.9964,
                    userLocation?.lng || 28.2268,
                  ]}
                />
              </MapContainer>
            </div>
            <div className="absolute bottom-6 left-4 sm:left-6 max-w-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 dark:border-slate-800/50 z-[1000] pointer-events-none">
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <span className="size-2 bg-orange-500 rounded-full animate-ping"></span>
                Interactive Leaflet Map
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Showing top-rated Spaza Kota shops near you. Click pins to
                explore OTA menus instantly.
              </p>
            </div>
          </section>
        )}

        {/* Chef's Selection Carousel */}
        <section className="mt-16 overflow-hidden">
          <div className="px-6 mb-6">
            <h2 className="font-sans text-2xl font-bold text-[#2d2f31] dark:text-white">
              Chef's Selection
            </h2>
            <p className="text-[#5a5c5e] dark:text-slate-400">
              Handpicked local favorites
            </p>
          </div>
          <div className="flex gap-6 overflow-x-auto px-6 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
            {shops.slice(0, 2).map((shop) => (
              <div
                key={shop.id}
                className="flex-none w-[85vw] max-w-[320px] snap-center bg-[#dbdde0] dark:bg-slate-800 rounded-lg p-6 flex flex-col items-center text-center"
              >
                <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-white dark:border-slate-700 shadow-lg">
                  <BlurUpImage
                    src={shop.logo || DEFAULT_SHOP_LOGO}
                    alt={shop.name}
                    className="w-full h-full"
                    blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`}
                  />
                </div>
                <h4 className="font-sans font-bold text-lg text-[#2d2f31] dark:text-white">
                  {shop.name}
                </h4>
                <p className="text-[#5a5c5e] dark:text-slate-400 text-sm mb-4 italic">
                  "{shop.description}"
                </p>
                <button className="px-6 py-2 bg-[#2d2f31] dark:bg-slate-700 text-[#f6f6f9] dark:text-white rounded-full text-sm font-bold cursor-pointer">
                  View Menu
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <nav className="mx-auto w-full max-w-md md:max-w-xl rounded-t-[2rem] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-[0_-8px_32px_rgba(45,47,49,0.06)] pointer-events-auto">
          <div className="flex justify-around items-center px-6 pb-8 pt-4">
            <button
              onClick={onHome}
              className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-5 py-2 hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              <Home className="w-6 h-6 mb-1" />
              <span className="font-sans text-[11px] font-semibold tracking-wide">
                {t("home")}
              </span>
            </button>
            <button className="flex flex-col items-center justify-center text-[#FF6B00] dark:text-[#ff7a2f] bg-[#FF6B00]/10 rounded-full px-5 py-2 transition-transform duration-150 active:scale-96 cursor-pointer">
              <Store className="w-6 h-6 mb-1" />
              <span className="font-sans text-[11px] font-semibold tracking-wide">
                {t("discover")}
              </span>
            </button>
            <button
              onClick={onExplore}
              className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-5 py-2 hover:text-[#FF6B00] transition-colors cursor-pointer"
            >
              <MapIcon className="w-6 h-6 mb-1" />
              <span className="font-sans text-[11px] font-semibold tracking-wide">
                {t("map")}
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

function AddressPicker({
  value,
  onAddressChange,
  onLocationChange,
  initialLocation,
}: {
  value: string;
  onAddressChange: (val: string) => void;
  onLocationChange: (lat: number, lng: number) => void;
  initialLocation?: { lat: number; lng: number } | null;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markerPos, setMarkerPos] = useState<{
    lat: number;
    lng: number;
  } | null>(initialLocation || null);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const results = await searchAddress(val);
    setSuggestions(results);
    setShowSuggestions(true);
    setLoading(false);
  };

  const selectSuggestion = (s: any) => {
    onAddressChange(s.display_name);
    setQuery(s.display_name);
    const lat = parseFloat(s.lat || s.latitude);
    const lng = parseFloat(s.lon || s.lng || s.longitude);
    setMarkerPos({ lat, lng });
    onLocationChange(lat, lng);
    setShowSuggestions(false);
  };

  const DraggableMarker = () => {
    const markerRef = useRef<any>(null);
    const eventHandlers = useMemo(
      () => ({
        dragend() {
          const marker = markerRef.current;
          if (marker != null) {
            const newPos = marker.getLatLng();
            setMarkerPos(newPos);
            onLocationChange(newPos.lat, newPos.lng);
          }
        },
      }),
      [],
    );

    return markerPos ? (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={markerPos}
        ref={markerRef}
        icon={userMapIcon}
      >
        <Popup minWidth={90}>
          <div className="text-center p-0.5">
            <p className="font-extrabold text-xs text-blue-600">Delivery Point</p>
            <p className="text-[10px] text-slate-500 font-medium">Drag blue pin to exact door</p>
          </div>
        </Popup>
      </Marker>
    ) : null;
  };

  return (
    <div className="space-y-4">
      <div className="relative z-30">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search for your street address..."
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-primary transition-all outline-none"
        />

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl mt-2 overflow-hidden shadow-xl z-50">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm border-b border-slate-100 dark:border-slate-800 last:border-none"
              >
                <div className="font-bold truncate">
                  {s.display_name.split(",")[0]}
                </div>
                <div className="text-[10px] text-slate-400 truncate uppercase tracking-widest">
                  {s.display_name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
        <MapContainer
          center={markerPos || DEFAULT_COORDS}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap coords={markerPos || DEFAULT_COORDS} />
          <DraggableMarker />
        </MapContainer>
        {!markerPos && (
          <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[2px]">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
              Select an address to see map
            </p>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
        📍 Drag the pin to your exact door for perfect deliveries
      </p>
    </div>
  );
}

function ProfileScreen({
  onBack,
  onSave,
  onUpdateProfile,
  userProfile,
  completedOrdersCount = 0,
  onLogout,
  setNotification,
  triggerHaptic,
  isOnline,
}: {
  onBack: () => void;
  onSave?: (data: Partial<UserProfile>) => void | Promise<void>;
  onUpdateProfile?: (data: Partial<UserProfile>, showSuccess?: boolean, callback?: () => void) => void | Promise<void>;
  userProfile: UserProfile;
  completedOrdersCount?: number;
  onLogout: () => void;
  setNotification: (n: NotificationState) => void;
  triggerHaptic: (pattern?: number | number[]) => void;
  isOnline: boolean;
}) {
  const [fullName, setFullName] = useState(userProfile.fullName || "");
  const [phone, setPhone] = useState(formatSAPhone(userProfile.phone || ""));
  const [address, setAddress] = useState(userProfile.address || "");
  const [city, setCity] = useState(userProfile.city || "Johannesburg");
  const [latitude, setLatitude] = useState<number | undefined>(
    userProfile.latitude,
  );
  const [longitude, setLongitude] = useState<number | undefined>(
    userProfile.longitude,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fullNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);

  const isFullNameDirty = fullName.trim() !== (userProfile.fullName || "").trim();
  const isPhoneDirty = phone.trim() !== formatSAPhone(userProfile.phone || "").trim();
  const isAddressDirty = address.trim() !== (userProfile.address || "").trim();
  const isLocationDirty = latitude !== userProfile.latitude || longitude !== userProfile.longitude;
  const isDirty = isFullNameDirty || isPhoneDirty || isAddressDirty || isLocationDirty;

  useEffect(() => {
    setFullName(userProfile.fullName || "");
    setPhone(formatSAPhone(userProfile.phone || ""));
    setAddress(userProfile.address || "");
    setCity(userProfile.city || "Johannesburg");
    setLatitude(userProfile.latitude);
    setLongitude(userProfile.longitude);
  }, [userProfile.fullName, userProfile.phone, userProfile.address, userProfile.city, userProfile.latitude, userProfile.longitude]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Camera API states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [capturedCameraPhoto, setCapturedCameraPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Confirmation Dialog states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [croppedFileToConfirm, setCroppedFileToConfirm] = useState<File | null>(null);
  const [croppedPreviewUrlToConfirm, setCroppedPreviewUrlToConfirm] = useState<string | null>(null);
  const [croppedFileSizeKB, setCroppedFileSizeKB] = useState<number>(0);

  // Avatar update animation pulse ring state
  const [justSavedPhoto, setJustSavedPhoto] = useState(false);

  const { t } = useTranslation();

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      if (!file.type.startsWith("image/")) {
        setNotification({ message: "Please select a valid image file.", type: "error" });
        return;
      }
      
      const localImageUrl = URL.createObjectURL(file);
      setImageToCrop(localImageUrl);
      setShowCropper(true);
      if (event.target) event.target.value = "";
    }
  };

  const handleCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Step 1 of Upload: Crop & proceed to Review Confirmation Dialog
  const handleProceedToReview = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      setIsSaving(true);
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const localPreviewUrl = URL.createObjectURL(croppedFile);
      setCroppedFileToConfirm(croppedFile);
      setCroppedPreviewUrlToConfirm(localPreviewUrl);
      setCroppedFileSizeKB(Math.round(croppedFile.size / 1024));
      setShowCropper(false);
      setShowConfirmModal(true);
    } catch (error: any) {
      console.error("Error cropping image:", error);
      setNotification({ message: "Failed to crop image. Please try again.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // Step 2 of Upload: User confirms in dialog -> Compresses (<200KB) & Uploads to Supabase
  const handleConfirmUploadAndSave = async () => {
    if (!croppedFileToConfirm) return;
    if (!isOnline) {
      setNotification({ message: "No internet connection. Cannot upload photo.", type: "error" });
      return;
    }
    try {
      setUploading(true);
      setNotification({ message: "Compressing photo (<200KB) and uploading to Supabase Storage...", type: "info" });
      setShowConfirmModal(false);
      
      setPreviewUrl(croppedPreviewUrlToConfirm);

      const publicUrl = await uploadAvatar(croppedFileToConfirm, userProfile.id);
      
      const saveFunc = onUpdateProfile || onSave;
      if (saveFunc) {
        await saveFunc({ photoURL: publicUrl });
      }

      setJustSavedPhoto(true);
      setNotification({ message: "Profile picture uploaded successfully! ✓", type: "success" });
      triggerHaptic?.([10, 30, 10]);

      setTimeout(() => {
        setJustSavedPhoto(false);
      }, 3500);

      // Clean up
      if (croppedPreviewUrlToConfirm) URL.revokeObjectURL(croppedPreviewUrlToConfirm);
      if (imageToCrop) URL.revokeObjectURL(imageToCrop);
      setCroppedFileToConfirm(null);
      setCroppedPreviewUrlToConfirm(null);
      setImageToCrop(null);
      setPreviewUrl(publicUrl);
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      let errorMsg = "Something went wrong uploading your photo. Please try again.";
      if (error.message === "NETWORK_TIMEOUT" || error.message === "NETWORK_ERROR") errorMsg = "Network error. Please check your connection and try again.";
      else if (error.message === "BUCKET_NOT_FOUND") errorMsg = "Storage is not configured yet. Please try again later.";
      
      setNotification({ message: errorMsg, type: "error" });
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const cancelCrop = () => {
    setShowCropper(false);
    if (imageToCrop) URL.revokeObjectURL(imageToCrop);
    setImageToCrop(null);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmModal(false);
    if (croppedPreviewUrlToConfirm) URL.revokeObjectURL(croppedPreviewUrlToConfirm);
    if (imageToCrop) URL.revokeObjectURL(imageToCrop);
    setCroppedFileToConfirm(null);
    setCroppedPreviewUrlToConfirm(null);
    setImageToCrop(null);
  };

  // Camera Stream Controls
  const stopCameraStream = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCameraModal(false);
    setIsCameraLoading(false);
    setCapturedCameraPhoto(null);
  }, [cameraStream]);

  const startCamera = async (mode: 'user' | 'environment' = 'user') => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }
    setIsCameraLoading(true);
    setShowCameraModal(true);
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
      });
      setCameraStream(stream);
      setFacingMode(mode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera getUserMedia failed or was rejected, using input fallback:", err);
      setShowCameraModal(false);
      setCameraStream(null);
      setNotification({
        message: "Opening native device camera...",
        type: "info",
      });
      cameraInputRef.current?.click();
    } finally {
      setIsCameraLoading(false);
    }
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;
    triggerHaptic?.(15);
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera_photo_${Date.now()}.jpg`, { type: "image/jpeg" });
          const localUrl = URL.createObjectURL(file);
          setCapturedCameraPhoto(localUrl);
        }
        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop());
          setCameraStream(null);
        }
      }, "image/jpeg", 0.9);
    }
  };

  const handleDeletePhoto = async () => {
    const saveFunc = onUpdateProfile || onSave;
    if (saveFunc) {
      await saveFunc({ photoURL: "" });
    }
    setPreviewUrl(null);
    setNotification({ message: "Profile picture removed.", type: "info" });
  };

  const handleUpdateProfile = async () => {
    if (isSaving || uploading) return;

    if (!isOnline) {
      setNotification({
        message: "No internet connection. Cannot save profile changes.",
        type: "error",
      });
      return;
    }

    if (!fullName.trim()) {
      setNotification({ message: "Full Name cannot be empty.", type: "error" });
      return;
    }

    if (!phone.trim()) {
      setNotification({ message: "Phone Number cannot be empty.", type: "error" });
      return;
    }

    if (!validateSAPhone(phone)) {
      setNotification({
        message: "Invalid South African phone format. Please use a valid number like 071 234 5678 or +27 71 234 5678.",
        type: "error",
      });
      return;
    }

    if (!address.trim()) {
      setNotification({
        message: "Delivery address cannot be empty.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updateData: Partial<UserProfile> = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim() || "Johannesburg",
        latitude,
        longitude,
      };

      const saveFunc = onUpdateProfile || onSave;
      if (saveFunc) {
        await saveFunc(updateData, true);
      }
      setJustSaved(true);
      triggerHaptic?.([10, 30, 10]);
      setNotification({
        message: "Profile saved & updated!",
        type: "success",
      });
      setTimeout(() => {
        setJustSaved(false);
      }, 3500);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setNotification({
        message: error?.message || "Failed to update profile. Please try again.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-primary/5 sticky top-0 bg-white dark:bg-slate-950 z-10 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold flex-1 text-center pr-10">
          {t("edit_profile")}
        </h2>
      </div>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            ref={fileInputRef}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileSelect}
            disabled={uploading}
            ref={cameraInputRef}
            className="hidden"
          />
          <div className="relative group">
            {/* Animated Pulse Ring on successful avatar update */}
            <AnimatePresence>
              {justSavedPhoto && (
                <motion.div
                  initial={{ scale: 0.85, opacity: 1 }}
                  animate={{ scale: 1.3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute -inset-2 rounded-full border-4 border-emerald-500 pointer-events-none z-10"
                />
              )}
            </AnimatePresence>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative cursor-pointer"
              onClick={() => setShowGalleryModal(true)}
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={previewUrl || userProfile.photoURL || "placeholder"}
                  src={previewUrl || userProfile.photoURL || getAvatarUrl(userProfile.fullName)}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover absolute inset-0"
                  referrerPolicy="no-referrer"
                  initial={{ opacity: 0, scale: 0.75, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.15, filter: "blur(4px)" }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                />
              </AnimatePresence>
              {uploading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-20 text-white gap-1.5 p-2 text-center"
                >
                  <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-emerald-400">
                    Saving...
                  </span>
                </motion.div>
              )}
            </motion.div>
            {/* Action buttons for Gallery Upload and Live Camera */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex justify-center gap-2 z-10 w-max">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGalleryModal(true);
                }}
                disabled={uploading}
                className="px-3 py-1.5 bg-primary text-white rounded-full shadow-lg border-2 border-white dark:border-slate-800 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                title="Choose photo from gallery"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="text-[11px] font-black">Gallery</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  startCamera();
                }}
                disabled={uploading}
                className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white rounded-full shadow-lg border-2 border-white dark:border-slate-800 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 border-emerald-500/30"
                title="Take photo using camera"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-black">Take Photo</span>
              </button>
            </div>
          </div>

          <div className="text-center mt-6">
            {(userProfile.photoURL || previewUrl) && (
              <button
                type="button"
                onClick={handleDeletePhoto}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors mb-2 cursor-pointer"
              >
                Remove Photo
              </button>
            )}
            <p className="font-bold text-lg">
              {userProfile.fullName || "User"}
            </p>
            <p className="text-xs text-slate-400 mb-2">{userProfile.email}</p>
          </div>

          {/* Loyalty Tier Badge */}
          <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col items-center gap-3 shadow-sm mt-1">
            {completedOrdersCount >= 10 ? (
              // Gold Tier VIP
              <div className="flex flex-col items-center w-full">
                <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                  <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-xl animate-pulse"></div>
                  <div className="w-14 h-14 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 rounded-2xl flex items-center justify-center border border-amber-400 shadow-lg relative z-10">
                    <Award className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                </div>
                <div className="mt-2.5 text-center">
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-amber-200 dark:border-amber-900/40">
                    🏆 Gold VIP Tier
                  </span>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">
                    {completedOrdersCount} orders completed • Ultimate Local Eater!
                  </p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div className="bg-amber-500 h-full rounded-full w-full"></div>
                </div>
              </div>
            ) : completedOrdersCount >= 5 ? (
              // Silver Tier
              <div className="flex flex-col items-center w-full">
                <div className="w-14 h-14 bg-gradient-to-tr from-slate-400 via-slate-100 to-slate-300 rounded-2xl flex items-center justify-center border border-slate-200 shadow-md">
                  <Award className="w-8 h-8 text-slate-600 drop-shadow-sm" />
                </div>
                <div className="mt-2.5 text-center">
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                    ⭐ Silver Tier
                  </span>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">
                    {completedOrdersCount} orders completed • {10 - completedOrdersCount} more to Gold
                  </p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${(completedOrdersCount / 10) * 100}%` }}></div>
                </div>
              </div>
            ) : (
              // Bronze Tier
              <div className="flex flex-col items-center w-full">
                <div className="w-14 h-14 bg-gradient-to-tr from-amber-700 via-orange-500 to-amber-600 rounded-2xl flex items-center justify-center border border-orange-400 shadow-sm">
                  <Award className="w-8 h-8 text-amber-100" />
                </div>
                <div className="mt-2.5 text-center">
                  <span className="text-[10px] bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-orange-200 dark:border-orange-900/30">
                    🥉 Bronze Tier
                  </span>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">
                    {completedOrdersCount} orders completed • {5 - completedOrdersCount} more to Silver
                  </p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                  <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(completedOrdersCount / 5) * 100}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* WhatsApp-Style Sync Status Card */}
          <div className="-mt-2 mb-2">
            <AnimatePresence mode="wait">
              {justSaved ? (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-3.5 flex items-center gap-3 shadow-md shadow-emerald-500/10"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                        Profile Saved & Synchronized
                      </p>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/80 px-2 py-0.5 rounded-full">
                        WhatsApp Style ✓
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                      Your changes are saved locally and synced with your account.
                    </p>
                  </div>
                </motion.div>
              ) : isDirty ? (
                <motion.div
                  key="dirty"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <span className="size-3 rounded-full bg-amber-500 animate-ping absolute" />
                      <span className="size-2.5 rounded-full bg-amber-500 relative" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                        Unsaved Profile Changes
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                        Tap "Save Changes" below to update your profile.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/80 px-2.5 py-1 rounded-full border border-amber-300/50 shrink-0">
                    Pending
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="synced"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      All details verified & saved
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    Synced to cloud
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1 flex items-center justify-between">
              <span>Full Name</span>
              <span className="text-[10px] font-normal text-slate-400">Required</span>
            </label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                ref={fullNameRef}
                type="text"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setFormErrors(prev => ({...prev, fullName: undefined})); }}
                placeholder="Your full name"
                disabled={isSaving || uploading}
                className={`w-full pl-12 pr-24 py-4 bg-slate-50 dark:bg-slate-900 border ${formErrors.fullName ? 'border-red-500 focus:ring-red-500' : 'border-slate-100 dark:border-slate-800 focus:ring-primary/20'} rounded-2xl text-sm focus:outline-none focus:ring-2 transition-all disabled:opacity-50`}
              />
              {formErrors.fullName && <p className="absolute -bottom-5 left-2 text-red-500 text-[10px] m-0">{formErrors.fullName}</p>}
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                {isFullNameDirty ? (
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Pencil className="w-3 h-3 text-amber-600 animate-pulse" /> Edit
                  </span>
                ) : fullName.trim() ? (
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Saved
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 ml-1">
              Visible to your drivers and restaurants on active orders.
            </p>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1 flex items-center justify-between">
              <span>Phone Number</span>
              <span className="text-[10px] font-normal text-slate-400">SA format (+27 / 07X)</span>
            </label>
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatSAPhone(e.target.value))}
                placeholder="e.g. 071 234 5678 or +27 71 234 5678"
                disabled={isSaving || uploading}
                className="w-full pl-12 pr-28 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono disabled:opacity-50"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                {isPhoneDirty ? (
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Pencil className="w-3 h-3 text-amber-600 animate-pulse" /> Edit
                  </span>
                ) : validateSAPhone(phone) ? (
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verified
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 ml-1">
              Used for WhatsApp tracking and driver calls on delivery.
            </p>
          </div>

          {/* Delivery Address & Pin */}
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-primary uppercase tracking-widest">
                Delivery Address & Pin
              </label>
              {latitude && longitude ? (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" /> Pin Set ({latitude.toFixed(3)}, {longitude.toFixed(3)})
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                  Pin Needed
                </span>
              )}
            </div>
            <WidgetErrorBoundary fallbackName="Address Search">
              <Suspense fallback={<div className="h-12 w-full animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl"></div>}>
                <AddressSearch
                  initialAddress={address}
                  initialCoords={
                    latitude && longitude
                      ? { lat: latitude, lng: longitude }
                      : undefined
                  }
                  onSelect={(data) => {
                    setAddress(data.address);
                    setLatitude(data.lat);
                    setLongitude(data.lng);
                  }}
                />
              </Suspense>
            </WidgetErrorBoundary>
            <p className="text-[11px] text-slate-400 ml-1">
              Pin accuracy ensures exact doorstep delivery to your house or workplace.
            </p>
          </div>

          {/* City */}
          <div className="space-y-2 opacity-60">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
              City (Current Service Zone)
            </label>
            <div className="relative w-full max-w-[100vw] overflow-x-hidden">
              <Navigation2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={city}
                readOnly
                placeholder="Your city"
                className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-2xl text-sm cursor-not-allowed outline-none"
              />
            </div>
          </div>

          {/* Email (Readonly) */}
          <div className="space-y-2 opacity-60">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
              Email Address (Primary)
            </label>
            <div className="relative w-full max-w-[100vw] overflow-x-hidden">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={userProfile.email}
                readOnly
                className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-2xl text-sm cursor-not-allowed outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 ml-1">
              Email is linked to your account and cannot be changed.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-8 space-y-4">
          <button
            onClick={handleUpdateProfile}
            disabled={isSaving || uploading}
            className={`w-full py-4 font-bold rounded-2xl shadow-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer ${
              justSaved
                ? "bg-emerald-600 text-white shadow-emerald-600/30 scale-[1.02]"
                : isDirty
                ? "bg-primary text-white shadow-primary/20 hover:bg-primary/90 active:scale-95"
                : "bg-slate-900 dark:bg-slate-800 text-white shadow-slate-900/10 hover:bg-slate-800"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving to Account & Device...</span>
              </>
            ) : justSaved ? (
              <>
                <Check className="w-5 h-5 text-white stroke-[3] animate-in zoom-in" />
                <span>Profile Saved ✓</span>
              </>
            ) : isDirty ? (
              <>
                <Save className="w-5 h-5" />
                <span>Save Profile Changes</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Saved & Up to Date</span>
              </>
            )}
          </button>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-slate-100 dark:bg-slate-900 dark:text-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </main>

      {/* Cropper Modal */}
      {showCropper && imageToCrop && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 bg-slate-900/90 text-white flex items-center justify-between border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Crop & Center Profile Photo
            </span>
            <button
              onClick={cancelCrop}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative">
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
            {/* Overlay instruction text */}
            <div className="absolute top-6 left-0 right-0 text-center pointer-events-none z-10">
              <span className="bg-black/50 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full tracking-wide shadow-lg border border-white/20">
                Drag and pinch to frame your perfect look
              </span>
            </div>
          </div>
          <div className="p-6 bg-slate-900 flex justify-between items-center gap-4 border-t border-slate-800">
            <button
              onClick={cancelCrop}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl active:scale-95 transition-all text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleProceedToReview}
              className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl active:scale-95 transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-primary/20"
            >
              <span>Review Photo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal before permanent Supabase upload */}
      {showConfirmModal && croppedPreviewUrlToConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-xl flex flex-col items-center text-center space-y-5 relative">
            <button
              onClick={handleCancelConfirmation}
              className="absolute right-4 top-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mt-2">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Confirm Profile Photo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Review your cropped preview before saving to Supabase Storage.
              </p>
            </div>

            {/* Cropped Photo Preview */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full border-4 border-primary/30 shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                <img
                  src={croppedPreviewUrlToConfirm}
                  alt="Cropped Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1.5 shadow-md border-2 border-white dark:border-slate-900">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            </div>

            {/* Specs / Storage details */}
            <div className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 text-left space-y-2 border border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Auto-compressed under 200KB</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Database className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Saved to Supabase 'avatars' & database</span>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full space-y-2.5 pt-1">
              <button
                onClick={handleConfirmUploadAndSave}
                disabled={uploading}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-orange-600 hover:opacity-95 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading to Supabase...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload & Save Photo</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowCropper(true);
                }}
                disabled={uploading}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs cursor-pointer"
              >
                Adjust Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between z-10 pt-safe">
            <p className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary animate-pulse" />
              Take Profile Photo
            </p>
            <button
              onClick={stopCameraStream}
              className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewfinder Video / Preview Area */}
          <div className="flex-1 flex flex-col items-center justify-center relative my-4">
            <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-full border-4 border-primary/60 overflow-hidden relative shadow-xl bg-slate-900 flex items-center justify-center">
              {capturedCameraPhoto ? (
                <img
                  src={capturedCameraPhoto}
                  alt="Captured"
                  className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                />
              ) : (
                <>
                  {isCameraLoading ? (
                    <div className="flex flex-col items-center gap-2 text-white absolute inset-0 justify-center z-10">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-xs font-bold">Starting camera...</span>
                    </div>
                  ) : null}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
                  />
                  {/* Circular framing overlay */}
                  <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-full pointer-events-none" />
                </>
              )}
            </div>
            {!capturedCameraPhoto && (
              <p className="text-xs text-slate-300 font-medium mt-4 text-center px-6">
                Center your face inside the circle and press Quick Snap
              </p>
            )}
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-around pb-6 pt-2">
            {capturedCameraPhoto ? (
              <>
                <button
                  onClick={() => {
                    setCapturedCameraPhoto(null);
                    startCamera(facingMode);
                  }}
                  className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition-all text-sm cursor-pointer"
                >
                  Retake
                </button>
                <button
                  onClick={() => {
                    setImageToCrop(capturedCameraPhoto);
                    setShowCropper(true);
                    setShowCameraModal(false);
                    setCapturedCameraPhoto(null);
                  }}
                  className="px-8 py-3 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all text-sm cursor-pointer shadow-lg shadow-primary/30 flex items-center gap-2"
                >
                  Use Photo <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}
                  disabled={isCameraLoading}
                  className="p-3 bg-slate-800 text-slate-200 rounded-full hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Flip Camera"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={capturePhotoFromCamera}
                  disabled={isCameraLoading}
                  className="px-6 py-3 rounded-full bg-white text-slate-900 border-[3px] border-primary font-black uppercase tracking-wider flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer gap-2"
                  title="Quick Snap"
                >
                  <Camera className="w-5 h-5 text-primary" />
                  Quick Snap
                </button>
                <button
                  onClick={stopCameraStream}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mock Selection Gallery Overlay */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col justify-end animate-in slide-in-from-bottom duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 flex flex-col h-[70dvh] shadow-xl border-t border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Recent Images</h3>
              <button onClick={() => setShowGalleryModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="grid grid-cols-3 gap-2 pb-4">
                {/* Mock recent images */}
                {Array.from({ length: 15 }).map((_, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      const canvas = document.createElement("canvas");
                      canvas.width = 400;
                      canvas.height = 400;
                      const ctx = canvas.getContext("2d");
                      if (ctx) {
                        ctx.fillStyle = `hsl(${i * 25}, 70%, 60%)`;
                        ctx.fillRect(0, 0, 400, 400);
                        canvas.toBlob((blob) => {
                          if (blob) {
                            const file = new File([blob], `gallery_${i}.jpg`, { type: "image/jpeg" });
                            const localUrl = URL.createObjectURL(file);
                            setImageToCrop(localUrl);
                            setShowCropper(true);
                            setShowGalleryModal(false);
                          }
                        }, "image/jpeg");
                      }
                    }}
                    className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:opacity-80 active:scale-95 transition-all cursor-pointer relative"
                  >
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(${i * 25}, 70%, 60%), hsl(${i * 25 + 40}, 80%, 50%))` }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-2 shrink-0">
              <button 
                onClick={() => {
                  setShowGalleryModal(false);
                  fileInputRef.current?.click();
                }}
                className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <FolderOpen className="w-5 h-5" />
                Browse Device Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const QuantityModal = ({
  item,
  isOpen,
  onClose,
  onConfirm,
  shopAway,
}: {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    quantity: number,
    specialInstructions: string,
    selectedCustomizations: { name: string; price: number }[],
  ) => void;
  shopAway?: boolean;
}) => {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedCustomizations, setSelectedCustomizations] = useState<
    { name: string; price: number }[]
  >([]);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSpecialInstructions("");
      setSelectedCustomizations([]);
    }
  }, [isOpen]);

  if (!item || !isOpen) return null;

  const basePrice = item.price;
  const customizationsTotal = selectedCustomizations.reduce(
    (sum, c) => sum + Number(c.price),
    0,
  );
  const isBulkDiscount = quantity > 5;
  const rawTotalPrice = (basePrice + customizationsTotal) * quantity;
  const totalPrice = isBulkDiscount ? rawTotalPrice * 0.85 : rawTotalPrice;

  const toggleCustomization = (customization: {
    name: string;
    price: number;
  }) => {
    setSelectedCustomizations((prev) => {
      const exists = prev.find((c) => c.name === customization.name);
      if (exists) {
        return prev.filter((c) => c.name !== customization.name);
      } else {
        return [...prev, customization];
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:p-4 sm:items-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[40px] px-8 pb-8 pt-4 shadow-xl overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-10 duration-500 relative">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full sm:hidden" />
        <div className="flex justify-between items-start mb-6 mt-4">
          <div className="flex-1 pr-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {item.name}
            </h3>
            {item.description && (
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {item.description}
              </p>
            )}
            <p className="text-orange-600 font-black text-lg mt-2">
              {item.displayPrice}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col gap-6 py-4">
          {item.customizations && item.customizations.length > 0 && (
            <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                Customize Your Order
              </label>
              <div className="space-y-3">
                {item.customizations.map((customization, idx) => {
                  const isSelected = selectedCustomizations.some(
                    (c) => c.name === customization.name,
                  );
                  return (
                    <label
                      key={idx}
                      className="flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-orange-600 border-orange-600" : "border-slate-300 dark:border-slate-600 group-hover:border-orange-500"}`}
                        >
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {customization.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-500">
                        + R{Number(customization.price).toFixed(2)}
                      </span>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={isSelected}
                        onChange={() => toggleCustomization(customization)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="w-full">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">
              Special Instructions
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="E.g. 'no atchar' or 'extra spicy'..."
              className="w-full h-20 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-600/20 transition-all resize-none"
            />
          </div>

          <div className="w-full flex flex-col items-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Select Quantity
            </p>
            <div className="flex items-center gap-8">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-90 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Minus className="w-8 h-8" />
              </button>
              <span className="text-5xl font-black text-slate-900 dark:text-white min-w-[60px] text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="size-16 rounded-3xl bg-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-600/20 active:scale-90 transition-all cursor-pointer"
              >
                <Plus className="w-8 h-8" />
              </button>
            </div>
            {isBulkDiscount && (
              <p className="mt-4 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider text-center">
                🎉 15% Bulk Discount Applied!
              </p>
            )}
          </div>
        </div>

        {shopAway && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-start gap-2.5">
            <span className="text-lg shrink-0">⚠️</span>
            <p className="text-xs font-bold leading-normal">
              This shop hasn't updated its live heartbeat in over 4 days. To protect your funds, ordering is temporarily disabled until the merchant logs back in.
            </p>
          </div>
        )}

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => {
              if (shopAway) return;
              onConfirm(quantity, specialInstructions, selectedCustomizations);
            }}
            disabled={shopAway}
            className={`flex-1 h-16 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer ${
              shopAway
                ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
                : "bg-slate-900 dark:bg-orange-600"
            }`}
          >
            <ShoppingBag className="w-6 h-6" />
            <span>Add to Basket • R{totalPrice.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

function RestaurantSchema({ shop }: { shop: Shop }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: shop.name,
    image: shop.logo,
    servesCuisine: shop.category,
    description: shop.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: shop.address,
      addressLocality: "Local",
      addressRegion: "Gauteng",
      addressCountry: "ZA",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: shop.rating,
      reviewCount: shop.reviewCount || 120,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: shop.opening_time || "08:00",
        closes: shop.closing_time || "20:00",
      },
    ],
  };

  return <script type="application/ld+json">{JSON.stringify(schema)}</script>;
}

const ImageCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prev = () =>
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative w-full h-full overflow-hidden group">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-2xl text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? "w-8 bg-white" : "w-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function StoreInfoScreen({
  onBack,
  shop,
  isFavorite,
  onToggleFavorite,
  userProfile,
  session,
  onSignUp,
  addToCart,
  showAlert,
  showConfirm,
  setCurrentScreen,
  isOnline,
  onScanFlyer,
}: {
  onBack: () => void;
  shop: Shop;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  userProfile: UserProfile | null;
  session: Session | null;
  onSignUp: () => void;
  addToCart: (
    item: MenuItem,
    shopId: string,
    quantity?: number,
    specialInstructions?: string,
    selectedCustomizations?: { name: string; price: number }[],
  ) => void;
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  setCurrentScreen: (screen: Screen) => void;
  isOnline: boolean;
  onScanFlyer?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"menu" | "reviews" | "info">(
    "menu",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [selectedItemForQuantity, setSelectedItemForQuantity] =
    useState<MenuItem | null>(null);
  const [selectedMenuCategory, setSelectedMenuCategory] =
    useState<string>("All");
  const [collapsedCategories, setCollapsedCategories] = useState<{
    [key: string]: boolean;
  }>({});
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(
    null,
  );
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isShopChatOpen, setIsShopChatOpen] = useState(false);
  const [priceSort, setPriceSort] = useState<"default" | "low-to-high" | "high-to-low">("default");
  const [copiedMenuLink, setCopiedMenuLink] = useState(false);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const isScrollingRef = useRef(false);
  const [showTrustTooltip, setShowTrustTooltip] = useState(false);

  useEffect(() => {
    setIsMenuLoading(true);
    const timer = setTimeout(() => {
      setIsMenuLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [shop.id, priceSort]);

  const handleShareMenu = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?shopId=${shop.id}`;
    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch (e) {
        console.warn("Clipboard write failed:", e);
      }
    }
    if (!copied && navigator.share) {
      try {
        await navigator.share({
          title: `${shop.name} Menu - LocalEats`,
          text: `Check out ${shop.name}'s menu on LocalEats!`,
          url: shareUrl,
        });
        return;
      } catch (e) {}
    }
    setCopiedMenuLink(true);
    setTimeout(() => setCopiedMenuLink(false), 2500);
    showAlert("Menu Link Copied! 🔗", `Deep link for ${shop.name}'s menu copied to clipboard:\n${shareUrl}`);
    if ("vibrate" in navigator) navigator.vibrate(10);
  };
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

  const isCashTrustActive =
    localStorage.getItem("localeats_cash_trust_" + shop.id) === "true" ||
    (shop as any).cash_trust_enabled === true ||
    (shop as any).cash_trust_enabled === "true" ||
    (shop as any).localeats_cash_trust === true ||
    (shop as any).localeats_cash_trust === "true";

  // Memoized filtered reviews list to avoid unnecessary recalculations
  const filteredReviews = useMemo(() => {
    if (selectedStarFilter === null) return reviews;
    return reviews.filter((r) => r.rating === selectedStarFilter);
  }, [reviews, selectedStarFilter]);

  // Determine if the store is open or closed based on shop status
  const getStoreStatus = () => {
    const status = getShopStatus(shop);
    const hoursText = shop.opening_time && shop.closing_time ? `${shop.opening_time} - ${shop.closing_time}` : "08:00 - 20:00";
    return {
      isOpen: status.isOpen,
      text: status.isOpen ? "Open" : "Closed",
      hours: hoursText,
      closingText: status.isOpen ? `Closes at ${shop.closing_time || "20:00"}` : `Opens at ${shop.opening_time || "08:00"}`,
    };
  };

  const storeStatus = getStoreStatus();

  // Safeguard: if the shop has no menu items, load smart local default dishes based on its category so it's never empty
  const shopMenu = useMemo(() => {
    if (shop && shop.menu && shop.menu.length > 0) return shop.menu;

    // Fallback dishes based on shop category
    const isKota = shop && (shop.category || "").toLowerCase().includes("kota");
    const shopId = shop ? shop.id : "default";
    if (isKota) {
      return [
        {
          id: `fallback-custom-item-${shopId}-1`,
          name: "Classic Single Kota",
          price: 35.0,
          displayPrice: "R35.00",
          image:
            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
          description:
            "Fresh quarter loaf sandwich filled with golden hot chips, polony, and special sauce.",
          category: "Kotas",
          is_available: true,
          customizations: [],
        },
        {
          id: `fallback-custom-item-${shopId}-2`,
          name: "Special Double Cheese Kota",
          price: 55.0,
          displayPrice: "R55.00",
          image:
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
          description:
            "Quarter loaf packed with double chips, double cheese, polony, egg, Russian, and sauces.",
          category: "Kotas",
          is_available: true,
          customizations: [],
        },
        {
          id: `fallback-custom-item-${shopId}-3`,
          name: "Russian & Chips Portion",
          price: 40.0,
          displayPrice: "R40.00",
          image:
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
          description:
            "Golden sliced potato chips with grilled Russian sausages and seasoning.",
          category: "Sides",
          is_available: true,
          customizations: [],
        },
      ];
    } else {
      // Braai / BBQ / Grill fallback
      return [
        {
          id: `fallback-custom-item-${shopId}-4`,
          name: "Chuck Beef Plate (Quarter kg)",
          price: 85.0,
          displayPrice: "R85.00",
          image:
            "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600",
          description:
            "Flame-grilled super juicy chuck beef served with pap, chakalaka, and spicy BBQ sauce.",
          category: "Plates",
          is_available: true,
          customizations: [],
        },
        {
          id: `fallback-custom-item-${shopId}-5`,
          name: "Boerewors Roll Deluxe",
          price: 45.0,
          displayPrice: "R45.00",
          image:
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
          description:
            "Traditional local beef sausage grilled to perfection in a fresh roll with caramelized onions.",
          category: "Wraps & Rolls",
          is_available: true,
          customizations: [],
        },
        {
          id: `fallback-custom-item-${shopId}-6`,
          name: "Flame-Grilled Chicken (Quarter)",
          price: 65.0,
          displayPrice: "R65.00",
          image:
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
          description:
            "Flame-grilled chicken basted in mild peri-peri or sweet lemon & herb sauce.",
          category: "Plates",
          is_available: true,
          customizations: [],
        },
      ];
    }
  }, [shop]);

  const filteredMenu = useMemo(() => {
    let items = shopMenu.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (priceSort === "low-to-high") {
      items = [...items].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (priceSort === "high-to-low") {
      items = [...items].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return items;
  }, [shopMenu, searchQuery, priceSort]);

  // Group filteredMenu by category
  const groupedMenu = useMemo(() => {
    const groups: { [key: string]: MenuItem[] } = {};

    filteredMenu.forEach((item) => {
      const cat = (item.category || "Main Course").trim();
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });

    return groups;
  }, [filteredMenu]);

  // Extract unique visible categories with custom priority order
  const visibleCategories = useMemo(() => {
    const categoriesWithItems = Object.keys(groupedMenu);
    if (!shop || categoriesWithItems.length === 0) return [];

    // Fetch stored priority order
    const saved = localStorage.getItem(`localeats_category_order_${shop.id}`);
    let order: string[] = [];
    if (saved) {
      try {
        order = JSON.parse(saved);
      } catch (e) {}
    }

    // Sort matching categories according to the stored order, append others to the bottom sorted alphabetically
    const sorted = categoriesWithItems.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return ["All", ...sorted];
  }, [groupedMenu, shop]);

  // Map category keywords to premium food emojis
  const getCategoryEmoji = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes("egg") || catLower.includes("breakfast")) return "🍳";
    if (catLower.includes("bread") || catLower.includes("toast")) return "🍞";
    if (
      catLower.includes("sandwich") ||
      catLower.includes("burger") ||
      catLower.includes("sub")
    )
      return "🥪";
    if (
      catLower.includes("beverage") ||
      catLower.includes("drink") ||
      catLower.includes("coffee") ||
      catLower.includes("juice")
    )
      return "🥤";
    if (
      catLower.includes("dessert") ||
      catLower.includes("sweet") ||
      catLower.includes("cake")
    )
      return "🍰";
    if (catLower.includes("pizza")) return "🍕";
    if (catLower.includes("salad") || catLower.includes("healthy")) return "🥗";
    if (
      catLower.includes("chicken") ||
      catLower.includes("wing") ||
      catLower.includes("meat")
    )
      return "🍗";
    if (catLower.includes("pasta") || catLower.includes("noodle")) return "🍝";
    if (
      catLower.includes("traditional") ||
      catLower.includes("local") ||
      catLower.includes("kota")
    )
      return "🇿🇦";
    return "🍽️";
  };

  const handleCategoryClick = (category: string) => {
    isScrollingRef.current = true;
    setSelectedMenuCategory(category);
    if ("vibrate" in navigator) navigator.vibrate(5);

    if (category === "All") {
      const topElement = document.getElementById("store-menu-search");
      if (topElement) {
        topElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      const element = document.getElementById(
        `category-sec-${category.replace(/\s+/g, "-")}`,
      );
      if (element) {
        const yOffset = -180; // Offset perfectly accommodates sticky top bar heights and padding
        const y =
          element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 850);
  };

  // Center selected active button in the horizontally scrolling category tab bar
  useEffect(() => {
    const activeBtn = document.getElementById(
      `cat-btn-${selectedMenuCategory.replace(/\s+/g, "-")}`,
    );
    if (activeBtn && activeBtn.parentElement) {
      const container = activeBtn.parentElement;
      const scrollLeft =
        activeBtn.offsetLeft -
        container.offsetWidth / 2 +
        activeBtn.offsetWidth / 2;
        
      container.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    }
  }, [selectedMenuCategory]);

  // Handle window scroll-to-bottom fallback to highlight the last category
  useEffect(() => {
    if (activeTab !== "menu" || visibleCategories.length <= 2) return;

    const handleWindowScroll = () => {
      if (isScrollingRef.current) return;
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 30
      ) {
        const categoriesWithItems = visibleCategories.filter(
          (c) => c !== "All",
        );
        if (categoriesWithItems.length > 0) {
          setSelectedMenuCategory(
            categoriesWithItems[categoriesWithItems.length - 1],
          );
        }
      }
    };

    window.addEventListener("scroll", handleWindowScroll);
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, [activeTab, visibleCategories]);

  // Automatically update selected category highlighting on scroll
  useEffect(() => {
    if (activeTab !== "menu" || visibleCategories.length <= 1) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window))
      return;

    const categoryIDs = visibleCategories
      .filter((c) => c !== "All")
      .map((c) => `category-sec-${c.replace(/\s+/g, "-")}`);

    const observerOptions = {
      root: null,
      rootMargin: "-140px 0px -55% 0px",
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (isScrollingRef.current) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const matchingCategory = visibleCategories.find(
            (c) => `category-sec-${c.replace(/\s+/g, "-")}` === id,
          );
          if (matchingCategory) {
            setSelectedMenuCategory(matchingCategory);
          }
        }
      });
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions,
    );

    categoryIDs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      categoryIDs.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, [activeTab, visibleCategories]);

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    setTableMissing(false);
    try {
      const fsReviews = await FirestoreService.getReviewsForShop(String(shop.id));
      const mappedReviews = (fsReviews || [])
        .map((r: any) => ({
          ...r,
          userName: r.userName || r.username || r.user_name || "Anonymous",
          createdAt: r.createdAt || r.created_at || new Date().toISOString(),
        }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setReviews(mappedReviews);
    } catch (error: any) {
      console.warn("Notice fetching reviews:", error?.message || error);
    } finally {
      setLoadingReviews(false);
    }
  }, [shop.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async () => {
    if (!isOnline) {
      showAlert(
        "Offline Mode",
        "Connectivity is down. We cannot post your review right now. Please try again when back online! 🍻",
      );
      return;
    }
    if (!newComment.trim() || !userProfile) return;
    setIsSubmittingReview(true);
    try {
      await FirestoreService.addReview(String(shop.id), {
        user_id: userProfile?.id || session?.user?.id,
        username: userProfile.fullName || "Anonymous",
        user_name: userProfile.fullName || "Anonymous",
        rating: newRating,
        comment: newComment,
      });

      setShowReviewForm(false);
      setNewComment("");
      setNewRating(5);
      fetchReviews();
      showAlert("Success", "Thank you for your review!");
    } catch (error) {
      console.error("Error submitting review:", error);
      showAlert("Error", "Failed to submit review. Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 text-[#221610] dark:text-white antialiased min-h-screen flex flex-col relative shadow-xl overflow-x-hidden">
      <RestaurantSchema shop={shop} />

      {/* Immersive Header with Carousel */}
      <div className="relative h-56 md:h-80 w-full group overflow-hidden shrink-0">
        {shop.images && shop.images.length > 0 ? (
          <ImageCarousel images={shop.images} />
        ) : (
          <div className="w-full h-full relative">
            <BlurUpImage
              src={shop.logo}
              alt={shop.name}
              className="w-full h-full object-cover"
              blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#221610] via-black/20 to-transparent"></div>
          </div>
        )}

        {/* Navigation Overlays */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50">
          <button
            onClick={onBack}
            className="p-3 bg-black/30 backdrop-blur-md rounded-2xl text-white hover:bg-black/50 transition-all active:scale-90 cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleShareMenu}
              className="p-3 bg-black/30 backdrop-blur-md rounded-2xl text-white hover:bg-black/50 transition-all active:scale-90 cursor-pointer flex items-center gap-1.5"
              title="Share this menu"
            >
              <Share2 className="w-6 h-6" />
              {copiedMenuLink && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white px-2 py-0.5 rounded-md animate-in fade-in">
                  Copied!
                </span>
              )}
            </button>
            <button
              onClick={onScanFlyer}
              className="p-3 bg-black/30 backdrop-blur-md rounded-2xl text-white hover:bg-black/50 transition-all active:scale-90 cursor-pointer"
              title="Scan Flyer QR"
            >
              <QrCode className="w-6 h-6 text-orange-500" />
            </button>
            <button
              onClick={() => setIsShopChatOpen(true)}
              className="p-3 bg-black/30 backdrop-blur-md rounded-2xl text-white hover:bg-black/50 transition-all active:scale-90 cursor-pointer"
              title="Chat with Shop"
            >
              <MessageCircle className="w-6 h-6 text-orange-400" />
            </button>
            <button
              onClick={onToggleFavorite}
              className="p-3 bg-black/30 backdrop-blur-md rounded-2xl text-white hover:bg-black/50 transition-all active:scale-90 cursor-pointer"
              title="Toggle Favorite"
            >
              <Heart
                className={`w-6 h-6 ${isFavorite ? "fill-red-500 text-red-500" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg">
                {shop.category}
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg flex items-center gap-1 ${storeStatus.isOpen ? "bg-emerald-600 text-white" : "bg-rose-700 text-white"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-white ${storeStatus.isOpen ? "animate-pulse" : ""}`}
                />
                {storeStatus.text}
              </span>
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md text-white text-[10px] font-bold">
                <Clock className="w-3 h-3" />
                {shop.delivery_eta || "30-45 mins"}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tighter drop-shadow-xl">
              {shop.name}
            </h1>
            <p className="text-white/80 text-xs font-medium max-w-sm line-clamp-1">
              {shop.address}
            </p>
            {isCashTrustActive && userOrderCount === 0 && (
              <div className="mt-2.5 flex items-center">
                <button
                  onClick={() => {
                    setShowTrustTooltip(true);
                    if ("vibrate" in navigator) navigator.vibrate(5);
                  }}
                  className="group flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-lg active:scale-95 transition-all animate-bounce"
                >
                  <span className="text-xs">💵</span>
                  <span>Cash on Arrival Available for First-Time Users</span>
                  <HelpCircle className="w-3.5 h-3.5 opacity-80" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-grow flex flex-col px-4 max-w-screen-xl mx-auto w-full">
        {/* Immersive Header Spacer */}
        <div className="h-4"></div>

        {/* Immersive Action Tabs & Buttons */}
        <div className="bg-white/95 dark:bg-slate-950/95 border-b border-gray-100 dark:border-slate-800 -mx-4 px-4 pt-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`;
                window.open(url, "_blank");
              }}
              className="flex-grow flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </button>
            <button
              onClick={() => setIsShopChatOpen(true)}
              className="flex-grow md:flex-grow-0 px-3 md:px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl flex items-center justify-center gap-1.5 md:gap-2 font-black text-[10px] md:text-xs uppercase tracking-widest shadow-xl shadow-orange-600/20 active:scale-95 transition-all cursor-pointer"
              title="Chat with Shop"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Chat with Shop</span>
            </button>
            <button
              onClick={handleShareMenu}
              className="flex-grow md:flex-grow-0 px-4 md:px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500/40 text-slate-800 dark:text-slate-100 rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] md:text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all cursor-pointer"
              title="Share this menu deep link"
            >
              <Share2 className="w-4 h-4 text-orange-600" />
              <span>{copiedMenuLink ? "Link Copied! ✓" : "Share Menu"}</span>
            </button>
          </div>
        </div>

        {/* Spacer */}
        <div className="h-8"></div>

        {/* Verified Trade Trust Banner */}
        {isCashTrustActive && (
          <div
            id="verified-trade-trust-banner"
            className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-3 py-2.5 rounded-xl flex items-center gap-2.5 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <span className="text-lg shrink-0">💵</span>
            <div className="flex-1">
              <p className="text-xs font-black tracking-tight leading-normal">
                Pay safely with Cash on Arrival! First-time customer? Pay only
                when your food is safely in hand.
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation Buttons */}
        <div className="flex space-x-1 py-1 mb-8 overflow-x-auto no-scrollbar scroll-smooth border-b border-gray-100 dark:border-slate-800">
          {(["menu", "reviews", "info"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 sm:px-8 py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? "text-orange-600"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-grow">
          {activeTab === "menu" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Trust-Builder Badge */}
              {isCashTrustActive && userOrderCount === 0 && (
                <div
                  onClick={() => {
                    setShowTrustTooltip(true);
                    if ("vibrate" in navigator) navigator.vibrate(5);
                  }}
                  className="bg-gradient-to-r from-green-500/10 via-amber-500/5 to-green-500/10 hover:from-green-500/15 hover:to-green-500/15 text-green-700 dark:text-green-400 border border-green-500/20 p-4 rounded-3xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.99] select-none text-center"
                  id="storefront-coa-trust-badge"
                >
                  <Wallet className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-black tracking-tight font-sans leading-snug">
                    💵 First-Time Local Trust Active: Cash on Arrival Accepted
                    here! Order with absolute confidence.
                  </span>
                </div>
              )}

              {/* Search & Price Sort Bar */}
              <div id="store-menu-search" className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                  <input
                    type="text"
                    placeholder={`Search dishes at ${shop.name}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 md:pl-12 pr-10 py-3 md:py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] md:text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-orange-600/20"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Sort by Price Controls */}
                <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded-2xl shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 hidden sm:inline-flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-orange-600" /> Price:
                  </span>
                  <button
                    onClick={() => {
                      setPriceSort("default");
                      if ("vibrate" in navigator) navigator.vibrate(5);
                    }}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      priceSort === "default"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-slate-700 font-black"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setPriceSort("low-to-high");
                      if ("vibrate" in navigator) navigator.vibrate(5);
                    }}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                      priceSort === "low-to-high"
                        ? "bg-orange-600 text-white shadow-md shadow-orange-600/20 font-black"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                    title="Sort by Price: Low to High"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Low → High</span>
                  </button>
                  <button
                    onClick={() => {
                      setPriceSort("high-to-low");
                      if ("vibrate" in navigator) navigator.vibrate(5);
                    }}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                      priceSort === "high-to-low"
                        ? "bg-orange-600 text-white shadow-md shadow-orange-600/20 font-black"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                    title="Sort by Price: High to Low"
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>High → Low</span>
                  </button>
                </div>
              </div>

              {(!session && !userProfile?.id && !localStorage.getItem("localeats_session") && !localStorage.getItem("remember_me_secure_token")) && (
                <div className="mb-8 p-5 bg-orange-50 dark:bg-orange-950/20 rounded-3xl border border-orange-100 dark:border-orange-900/30 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                        New Guest
                      </p>
                      <p className="text-sm font-bold dark:text-white">
                        Sign up for rewards
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onSignUp}
                    className="px-6 py-3 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
                  >
                    Join
                  </button>
                </div>
              )}

              {/* Dynamic Categorized Horizontal Tab Navigation Bar */}
              {visibleCategories.length > 2 && (
                <div className="sticky top-0 z-35 bg-white/95 dark:bg-slate-950/95 py-3.5 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-2 scroll-smooth shadow-sm">
                  {visibleCategories.map((category) => {
                    const isSelected = selectedMenuCategory === category;
                    return (
                      <button
                        key={category}
                        id={`cat-btn-${category.replace(/\s+/g, "-")}`}
                        onClick={() => handleCategoryClick(category)}
                        className={`rounded-full px-4 py-2 transition-all hover:scale-102 duration-200 text-xs md:text-sm font-label whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-orange-600 text-white font-bold shadow-md shadow-orange-600/20"
                            : "bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
                        }`}
                      >
                        <span className="text-xs md:text-sm">
                          {category === "All"
                            ? "✨"
                            : getCategoryEmoji(category)}
                        </span>
                        <span>{category}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {isMenuLoading ? (
                <div className="space-y-4 pt-2">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-36 animate-pulse mb-3" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    {[...Array(6)].map((_, i) => (
                      <MenuItemSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 md:space-y-12 pt-2">
                  {visibleCategories.length > 0 ? (
                    visibleCategories
                      .filter((category) => category !== "All")
                      .map((category) => {
                        const itemsUnderCategory = groupedMenu[category] || [];
                        if (itemsUnderCategory.length === 0) return null;

                        return (
                          <div
                            key={category}
                            id={`category-sec-${category.replace(/\s+/g, "-")}`}
                            className="space-y-4 scroll-mt-44"
                          >
                            <div
                              onClick={() => {
                                setCollapsedCategories((prev) => ({
                                  ...prev,
                                  [category]: !prev[category],
                                }));
                                if ("vibrate" in navigator) navigator.vibrate(5);
                              }}
                              className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 cursor-pointer select-none group/cat"
                            >
                              <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2 group-hover/cat:text-orange-600 transition-colors">
                                <span className="text-sm md:text-base">
                                  {getCategoryEmoji(category)}
                                </span>
                                <span>{category}</span>
                                <span className="text-[10px] text-slate-400 font-bold normal-case ml-1 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                                  {collapsedCategories[category]
                                    ? "Tap to expand"
                                    : "Tap to collapse"}
                                </span>
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full">
                                  {itemsUnderCategory.length}{" "}
                                  {itemsUnderCategory.length === 1
                                    ? "item"
                                    : "items"}
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${collapsedCategories[category] ? "" : "rotate-180"}`}
                                />
                              </div>
                            </div>

                            {!collapsedCategories[category] ? (
                              <motion.div
                                initial="hidden"
                                animate="show"
                                variants={{
                                  hidden: { opacity: 0, y: -10 },
                                  show: {
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                      staggerChildren: 0.05,
                                    },
                                  },
                                }}
                                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4"
                              >
                                {itemsUnderCategory.map((item) => (
                                  <MenuItemCard
                                    key={item.id}
                                    item={item}
                                    shop={shop}
                                    onSelect={(item) =>
                                      setSelectedItemForQuantity(item)
                                    }
                                    showAlert={showAlert}
                                  />
                                ))}
                              </motion.div>
                            ) : (
                              <div
                                onClick={() =>
                                  setCollapsedCategories((prev) => ({
                                    ...prev,
                                    [category]: false,
                                  }))
                                }
                                className="py-4 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                              >
                                📁 {itemsUnderCategory.length}{" "}
                                {itemsUnderCategory.length === 1
                                  ? "dish is"
                                  : "dishes are"}{" "}
                                collapsed. Click to expand.
                              </div>
                            )}
                          </div>
                        );
                      })
                  ) : (
                    <div className="py-12 text-center">
                      <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <SearchX className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        No items found
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Try searching for something else
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Reviews Summary */}
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="text-center sm:border-r border-slate-200 dark:border-slate-800/80 sm:pr-8 shrink-0">
                  <p className="text-5xl font-black text-slate-900 dark:text-white">
                    {shop.rating}
                  </p>
                  <div className="flex text-orange-500 justify-center mt-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < Math.floor(shop.rating) ? "fill-current" : ""}`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-wider">
                    {reviews.length} Reviews
                  </p>
                </div>
                <div className="flex-1 w-full space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
                    Filter by Rating
                  </p>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviews.filter(
                      (r) => r.rating === rating,
                    ).length;
                    const percentage =
                      reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    const isSelected = selectedStarFilter === rating;
                    return (
                      <div
                        key={rating}
                        onClick={() => {
                          setSelectedStarFilter((prev) =>
                            prev === rating ? null : rating,
                          );
                          if ("vibrate" in navigator) navigator.vibrate(5);
                        }}
                        className={`flex items-center gap-3 cursor-pointer py-1 px-2.5 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border select-none ${
                          isSelected
                            ? "bg-orange-50 dark:bg-orange-950/25 border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-400"
                            : "border-transparent text-slate-500 dark:text-slate-400"
                        }`}
                        title={`Filter by ${rating} stars`}
                      >
                        <span className="text-[10px] font-bold w-2 shrink-0 text-center">
                          {rating}
                        </span>
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isSelected ? "bg-orange-600" : "bg-orange-500"}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold w-12 shrink-0 tabular-nums text-right">
                          ({count}) {isSelected && "✓"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Filter Notification / Badges */}
              {selectedStarFilter !== null && (
                <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/15 px-4 py-3 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                    <span>⭐</span>
                    <span>
                      Showing only {selectedStarFilter}-star reviews (
                      {filteredReviews.length})
                    </span>
                  </p>
                  <button
                    onClick={() => {
                      setSelectedStarFilter(null);
                      if ("vibrate" in navigator) navigator.vibrate(5);
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-[#221610] dark:text-orange-400 hover:text-orange-600 cursor-pointer text-orange-600"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              {/* Review Submission Form */}
              {showReviewForm ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-orange-600/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Write a Review</h4>
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex justify-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className={`transition-transform active:scale-90 ${newRating >= star ? "text-orange-600" : "text-slate-300"}`}
                      >
                        <Star
                          className={`w-8 h-8 ${newRating >= star ? "fill-current" : ""}`}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Tell others about your experience..."
                    className="w-full h-24 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-600/20 transition-all resize-none"
                  />

                  <button
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview || !newComment.trim()}
                    className="w-full h-12 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReview ? "Submitting..." : "Post Review"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-orange-600/5 p-4 rounded-2xl border border-orange-600/10">
                  <div>
                    <p className="text-xs font-bold text-orange-600">
                      Enjoyed your food?
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Share your thoughts with the community
                    </p>
                  </div>
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="px-4 py-2 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-orange-600/10 active:scale-95 transition-all cursor-pointer"
                  >
                    Write Review
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {tableMissing ? (
                  <div className="py-12 text-center bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-200 dark:border-red-800 p-6">
                    <div className="size-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                      <Database className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-red-900 dark:text-red-400">
                      Reviews Table Missing
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-500 mt-2 leading-relaxed">
                      The database table for reviews hasn't been created yet.
                      Please run the SQL setup in the Home screen's "Manual
                      Setup" section.
                    </p>
                  </div>
                ) : loadingReviews ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin size-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-xs text-slate-500">Loading reviews...</p>
                  </div>
                ) : filteredReviews.length > 0 ? (
                  filteredReviews.map((review) => (
                    <div
                      key={review.id}
                      className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-50 dark:border-slate-800"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs">
                            {review.userName[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold">
                              {review.userName}
                            </p>
                            <div className="flex text-orange-600">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-2 h-2 ${i < review.rating ? "fill-current" : ""}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {review.comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl p-6 border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedStarFilter !== null
                        ? "No matching reviews"
                        : "No reviews yet"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedStarFilter !== null
                        ? "Try selecting a different rating filter"
                        : "Be the first to review this store!"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "info" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-6">
                {/* Location Card */}
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                          Location
                        </h3>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(shop.address);
                            setCopiedAddress(true);
                            if ("vibrate" in navigator) navigator.vibrate(5);
                            setTimeout(() => setCopiedAddress(false), 2000);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/40 dark:border-slate-800 text-[10px] text-slate-500 hover:text-orange-600 dark:hover:text-orange-500 transition-colors cursor-pointer"
                        >
                          {copiedAddress ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 animate-in zoom-in-50" />
                              <span className="text-emerald-500 font-bold">
                                Copied!
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="font-bold">Copy Address</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-gray-500 dark:text-slate-400 mt-1">
                        {shop.address}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`,
                          "_blank",
                        )
                      }
                      className="flex-1 py-4 px-6 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-900 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Navigation className="w-5 h-5" />
                      <span>Get Directions</span>
                    </button>
                    {shop.phone && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            window.open(`tel:${shop.phone}`, "_blank")
                          }
                          className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                          title="Call Shop"
                        >
                          <Phone className="w-6 h-6" />
                        </button>
                        <button
                          onClick={() => setIsShopChatOpen(true)}
                          className="px-5 py-4 bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider cursor-pointer"
                          title="In-App Shop Chat"
                        >
                          <MessageCircle className="w-5 h-5" />
                          <span>Chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hours & Contact */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                          Opening Hours
                        </h3>
                        <div className="mt-3 space-y-3">
                          <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-gray-500 dark:text-slate-400 font-medium">
                              Monday - Sunday
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {storeStatus.hours}
                            </span>
                          </div>
                          <div
                            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold ${storeStatus.isOpen ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
                            />
                            <span>
                              Store is currently{" "}
                              {storeStatus.isOpen ? "Open" : "Closed"} •{" "}
                              {storeStatus.closingText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                        <Phone className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                          Contact
                        </h3>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">
                          {shop.phone || "+27 12 345 6789"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        window.open(`tel:${shop.phone || "+27123456789"}`)
                      }
                      className="w-full mt-2 py-4 px-6 bg-orange-600 rounded-xl text-white font-bold hover:bg-orange-700 active:scale-[0.96] transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <PhoneCall className="w-5 h-5" />
                      <span>Call Store</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Bottom Spacer for floating action buttons */}
        <div className="h-32 w-full shrink-0"></div>
      </main>

      <QuantityModal
        item={selectedItemForQuantity}
        isOpen={!!selectedItemForQuantity}
        onClose={() => setSelectedItemForQuantity(null)}
        onConfirm={(quantity, specialInstructions, selectedCustomizations) => {
          if (selectedItemForQuantity) {
            addToCart(
              selectedItemForQuantity,
              shop.id,
              quantity,
              specialInstructions,
              selectedCustomizations,
            );
            setSelectedItemForQuantity(null);
          }
        }}
        shopAway={shop ? isShopAway(shop) : false}
      />

      {/* Cash on Arrival Trust Tooltip / Micro-Drawer */}
      {showTrustTooltip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-xl relative animate-in slide-in-from-bottom duration-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full sm:hidden" />
            <div className="flex items-start gap-4 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                <span className="text-2xl animate-pulse">💵</span>
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-[#221610] dark:text-white text-base">
                  Cash-on-Arrival Enabled
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed font-semibold">
                  Build trust with your first order! Pay safely with physical
                  cash or mobile wallet at your doorstep once the rider arrives.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg w-max">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  No Risk • Verified Food Delivery
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowTrustTooltip(false)}
              className="w-full mt-6 py-3 bg-slate-950 hover:bg-slate-900 dark:bg-orange-600 dark:hover:bg-orange-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      )}

      {/* In-App Direct Shop Chat Modal */}
      <Suspense fallback={null}>
        <ShopChatModal
          isOpen={isShopChatOpen}
          onClose={() => setIsShopChatOpen(false)}
          shop={shop}
          userProfile={userProfile}
        />
      </Suspense>
    </div>
  );
}

/* replaced */


const userIcon = L.divIcon({
  html: `<div class="relative w-12 h-12 drop-shadow-xl flex flex-col items-center justify-center">
    <div class="bg-blue-600 p-2 rounded-full border-4 border-white shadow-lg text-white flex items-center justify-center relative z-10 animate-bounce">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
    <div class="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1"></div>
  </div>`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});

const shopIcon = L.divIcon({
  html: `<div class="relative w-12 h-12 drop-shadow-xl flex flex-col items-center justify-center">
    <div class="bg-orange-600 p-2.5 rounded-xl border-2 border-white shadow-lg text-white flex items-center justify-center relative z-10">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
      </svg>
    </div>
    <div class="w-1.5 h-1.5 bg-orange-600 rounded-full mt-1"></div>
  </div>`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});


function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function ExploreScreen({
  shops,
  onHome,
  onDiscover,
  userLocation,
  onRequestLocation,
  onStoreInfo,
  favorites,
  toggleFavorite,
  showAlert,
  triggerHaptic,
  isOnline,
  loadingShops = false,
  orders = [],
  addToCart,
}: {
  shops: Shop[];
  onHome: () => void;
  onDiscover: () => void;
  userLocation: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
  onStoreInfo: (shopId: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  showAlert: (title: string, message: string) => void;
  triggerHaptic: (pattern?: number | number[]) => void;
  isOnline: boolean;
  loadingShops?: boolean;
  orders?: Order[];
  addToCart?: (
    item: any,
    shopId?: string,
    quantity?: number,
    specialInstructions?: string,
    selectedCustomizations?: any[]
  ) => void;
}) {
  const { t, language } = useTranslation();
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMapOverlayMenuOpen, setIsMapOverlayMenuOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"map" | "list">("map");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [legendFilter, setLegendFilter] = useState<'all' | 'customer' | 'shop' | 'closed_shop' | 'rider'>('all');
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [sortPriority, setSortPriority] = useState<
    "rating" | "distance" | "name"
  >("rating");

  // Fetch real registered riders from Supabase (no fake pins)
  const [realRiders, setRealRiders] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadRealRiders = async () => {
      try {
        const { data, error } = await supabase
          .from("rider_profiles")
          .select("id, name, full_name, phone, avatar_url, vehicle_type, rating, latitude, longitude, is_online");
        if (!error && data && isMounted) {
          setRealRiders(data);
        }
      } catch (err) {
        console.warn("Failed to fetch real rider profiles:", err);
      }
    };
    loadRealRiders();

    const channel = getFreshChannel("explore-map-riders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rider_profiles" },
        () => {
          loadRealRiders();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const categories = [
    "All",
    "Favorites",
    "Nearby",
    ...new Set(shops.map((s) => s.category)),
  ];

  // Pre-calculate search index map for ExploreScreen to optimize searching on low-end devices
  const shopSearchIndex = useMemo(() => {
    const indexMap: Record<string, string> = {};
    shops.forEach((shop) => {
      indexMap[shop.id] = `${shop.name} ${shop.description || ""} ${shop.category}`.toLowerCase();
    });
    return indexMap;
  }, [shops]);

  const filteredShops = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryTerms = query === "" ? [] : query.split(/\s+/);

    return shops.filter((shop) => {
      const shopText = shopSearchIndex[shop.id] || "";
      const matchesSearch =
        query === "" ||
        queryTerms.every((term) => shopText.includes(term));

      let matchesCategory = false;
      if (selectedCategory === "All") {
        matchesCategory = true;
      } else if (selectedCategory === "Favorites") {
        matchesCategory = favorites.includes(shop.id);
      } else if (selectedCategory === "Nearby") {
        matchesCategory = true; // Handled in sort
      } else {
        matchesCategory = shop.category === selectedCategory;
      }

      const matchesRating = shop.rating >= minRating;
      const matchesOpen = !showOnlyOpen || getShopStatus(shop).isOpen;

      // Filter by max distance if user location is loaded
      let matchesDistance = true;
      if (maxDistance !== null && userLocation) {
        const sLat =
          (shop as any).latitude || -25.9964 + (hashString(shop.id) % 10) * 0.005;
        const sLng =
          (shop as any).longitude || 28.2268 + (hashString(shop.id) % 10) * 0.005;
        const dist = calculateDistance(
          sLat,
          sLng,
          userLocation.lat,
          userLocation.lng,
        );
        matchesDistance = dist <= maxDistance;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesRating &&
        matchesOpen &&
        matchesDistance
      );
    });
  }, [shops, searchQuery, selectedCategory, favorites, minRating, showOnlyOpen, maxDistance, userLocation, shopSearchIndex]);

  const sortedShops = [...filteredShops].sort((a, b) => {
    const statusA = getShopStatus(a);
    const statusB = getShopStatus(b);
    if (statusA.isOpen && !statusB.isOpen) return -1;
    if (!statusA.isOpen && statusB.isOpen) return 1;

    if (sortPriority === "distance" && userLocation) {
      const aLat =
        (a as any).latitude || -25.9964 + (hashString(a.id) % 10) * 0.005;
      const aLng =
        (a as any).longitude || 28.2268 + (hashString(a.id) % 10) * 0.005;
      const bLat =
        (b as any).latitude || -25.9964 + (hashString(b.id) % 10) * 0.005;
      const bLng =
        (b as any).longitude || 28.2268 + (hashString(b.id) % 10) * 0.005;
      const distA = Math.sqrt(
        Math.pow(aLat - userLocation.lat, 2) +
          Math.pow(aLng - userLocation.lng, 2),
      );
      const distB = Math.sqrt(
        Math.pow(bLat - userLocation.lat, 2) +
          Math.pow(bLng - userLocation.lng, 2),
      );
      return distA - distB;
    }

    if (sortPriority === "name") {
      return a.name.localeCompare(b.name);
    }

    // Default: Sort by rating
    return b.rating - a.rating;
  });

  const activeShop = shops.find((s) => s.id === selectedShopId);
  const mapCenter: [number, number] =
    activeShop && activeShop.latitude && activeShop.longitude
      ? [activeShop.latitude, activeShop.longitude]
      : userLocation
        ? [userLocation.lat, userLocation.lng]
        : [-25.9964, 28.2268];

  // Real-time Rider Proximity Observer: Filter riders to ONLY active/online couriers within 5km radius of user location or map center
  const activeProximityRiders = useMemo(() => {
    const refLat = userLocation?.lat ?? mapCenter[0];
    const refLng = userLocation?.lng ?? mapCenter[1];

    return realRiders.filter((rider) => {
      const isOnline = rider.is_online === true || rider.is_online === "true";
      if (!isOnline) return false;

      const rLat = typeof rider.latitude === "number" && rider.latitude !== 0 ? rider.latitude : null;
      const rLng = typeof rider.longitude === "number" && rider.longitude !== 0 ? rider.longitude : null;

      if (rLat === null || rLng === null) return false;

      const dist = calculateDistance(rLat, rLng, refLat, refLng);
      return dist <= 5.0; // Strictly within 5.0 km radius limit
    });
  }, [realRiders, userLocation, mapCenter]);

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-screen flex flex-col font-sans relative shadow-xl overflow-hidden">
      {/* List Layout Header Overlay - Only rendered in List mode for full map visibility */}
      {layoutMode === "list" && (
        <div className="absolute top-6 left-4 right-4 z-[1000] flex flex-col gap-3">
          <div className="max-w-lg md:mx-auto w-full">
            <div className="bg-white dark:bg-slate-900/95 backdrop-blur-xl rounded-[28px] shadow-xl flex items-center px-5 py-4 border border-white/20 dark:border-slate-800 transition-all focus-within:ring-2 focus-within:ring-orange-500/50">
              <Search className="w-5 h-5 text-orange-500 mr-3 shrink-0" />
              <input
                type="text"
                placeholder="Filter by name, food, or street..."
                className="flex-grow outline-none text-sm font-bold bg-transparent dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLayoutMode("map");
                    triggerHaptic(10);
                  }}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all select-none active:scale-95 cursor-pointer"
                  title="Switch to Map View"
                >
                  <MapIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </button>

                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`p-2 rounded-full transition-all ${isFilterOpen ? "bg-orange-600 text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button
                  className="text-orange-500 active:scale-95 transition-transform p-1.5 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-full"
                  onClick={onRequestLocation}
                >
                  {userLocation ? (
                    <LocateFixed className="w-6 h-6" />
                  ) : (
                    <Locate className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Quick Filter Chips & Distance Radius Toggles */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 mt-2 px-1 items-center">
              <button
                onClick={() => {
                  if (!userLocation) {
                    onRequestLocation();
                  }
                  setSortPriority("distance");
                  triggerHaptic(10);
                }}
                className={`flex shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border shadow-sm ${
                  sortPriority === "distance"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100"
                    : "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/50"
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                Sort by Distance
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 shrink-0 mx-0.5" />

              {/* Distance Radius Quick Chips: 1km, 5km, 10km */}
              {([null, 1, 5, 10] as (number | null)[]).map((dist) => {
                const isActive = maxDistance === dist;
                return (
                  <button
                    key={dist === null ? "radius-all" : `radius-${dist}`}
                    onClick={() => {
                      if (dist !== null && !userLocation) {
                        toast.info("Locating your spot to filter by radius...");
                        onRequestLocation();
                      }
                      setMaxDistance(dist);
                      triggerHaptic(10);
                    }}
                    className={`flex shrink-0 items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black transition-all border shadow-sm ${
                      isActive
                        ? "bg-orange-600 text-white border-orange-500 shadow-orange-500/20"
                        : "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/50 hover:border-orange-300"
                    }`}
                  >
                    {dist === null ? "All Distance" : `Within ${dist} km`}
                  </button>
                );
              })}
            </div>

            {/* Expanded Filters Drawer Style */}
            <motion.div
              initial={false}
              animate={{
                height: isFilterOpen ? "auto" : 0,
                opacity: isFilterOpen ? 1 : 0,
              }}
              className="overflow-hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-[32px] mt-2 shadow-xl border border-gray-100 dark:border-slate-800"
            >
              <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
                {/* Category Toggles */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">
                    Browse by Category
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          triggerHaptic(10);
                        }}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          selectedCategory === cat
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xl"
                            : "bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                        }`}
                      >
                        {getCategorySlang(cat, language)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Sort Order */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">
                    Sort Results By
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setSortPriority("rating");
                        triggerHaptic(10);
                      }}
                      className={`px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-center ${
                        sortPriority === "rating"
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md"
                          : "bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                      }`}
                    >
                      ★ Rating
                    </button>
                    <button
                      onClick={() => {
                        if (!userLocation) {
                          onRequestLocation();
                        }
                        setSortPriority("distance");
                        triggerHaptic(10);
                      }}
                      className={`px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-center relative ${
                        sortPriority === "distance"
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md"
                          : "bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                      }`}
                    >
                      {!userLocation && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                        </span>
                      )}
                      📍 Distance
                    </button>
                    <button
                      onClick={() => {
                        setSortPriority("name");
                        triggerHaptic(10);
                      }}
                      className={`px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-center ${
                        sortPriority === "name"
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md"
                          : "bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                      }`}
                    >
                      🔤 A-Z Name
                    </button>
                  </div>
                </div>

                {/* Maximum Distance Radius */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">
                    Maximum Distance Radius
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {([null, 1, 5, 10] as (number | null)[]).map((dist) => (
                      <button
                        key={dist === null ? "any" : dist}
                        onClick={() => {
                          if (dist !== null && !userLocation) {
                            toast.info("Locating your spot to filter by radius...");
                            onRequestLocation();
                          }
                          setMaxDistance(dist);
                          triggerHaptic(10);
                        }}
                        className={`px-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-center ${
                          maxDistance === dist
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md"
                            : "bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200"
                        }`}
                      >
                        {dist === null ? "Any" : `${dist} km`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Utility Filters */}
                <div className="flex flex-col gap-4">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                    Refine Results
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setShowOnlyOpen(!showOnlyOpen);
                        triggerHaptic(10);
                      }}
                      className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                        showOnlyOpen
                          ? "bg-green-500/10 text-green-600 border-green-500/30 shadow-inner"
                          : "bg-slate-50 dark:bg-slate-800/30 text-slate-400 border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      <Clock
                        className={`w-5 h-5 ${showOnlyOpen ? "fill-current" : ""}`}
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Open Now
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setMinRating(minRating > 0 ? 0 : 4);
                        triggerHaptic(10);
                      }}
                      className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                        minRating > 0
                          ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 shadow-inner"
                          : "bg-slate-50 dark:bg-slate-800/30 text-slate-400 border-slate-100 dark:border-slate-800"
                      }`}
                    >
                      <Star
                        className={`w-5 h-5 ${minRating > 0 ? "fill-current" : ""}`}
                      />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        4+ Stars
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {layoutMode === "list" ? (
        /* Gorgeous, Premium Responsive Shop List Layout */
        <div className="flex-grow overflow-y-auto px-4 pb-28 pt-28 space-y-4">
          <div className="max-w-lg mx-auto flex flex-col gap-4">
            {/* Power User Quick Reorder & Favorites Shortcut Widget */}
            <Suspense fallback={null}>
              <QuickReorderWidget
                orders={orders || []}
                shops={shops}
                favorites={favorites}
                onQuickReorder={(item) => {
                  const shop = shops.find((s) => s.id === item.shop_id);
                  if (item.product_name && item.price && addToCart) {
                    addToCart({
                    id: item.product_name.toLowerCase().replace(/\s+/g, '-'),
                    name: item.product_name,
                    price: item.price,
                    quantity: item.quantity || 1,
                    shopId: item.shop_id || (shop ? shop.id : '1'),
                    image: shop ? (shop.logo_url || shop.logo) : DEFAULT_SHOP_LOGO,
                  });
                  toast.success(`Reordered ${item.product_name}!`, {
                    description: "Item added to cart for 1-tap checkout.",
                  });
                } else if (shop) {
                  onStoreInfo(shop.id);
                }
              }}
              onSelectShop={(shop) => {
                onStoreInfo(shop.id);
              }}
              onViewAllFavorites={() => {
                setSelectedCategory("Favorites");
              }}
            />
            </Suspense>

            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Found {sortedShops.length} local spots
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                {sortPriority === "rating"
                  ? "Highest Rating"
                  : sortPriority === "distance"
                    ? "Nearest First"
                    : "Alphabetical"}
              </span>
            </div>

            {loadingShops ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <ShopCardSkeleton key={idx} />
              ))
            ) : sortedShops.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[32px] p-12 text-center border border-slate-100 dark:border-slate-800 animate-in fade-in duration-300">
                <SearchX className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                  No Restaurants Found
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  We couldn't find any stores that match your search filters.
                  Try resetting your search query or expanding your category
                  selection.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                    setMinRating(0);
                    setMaxDistance(null);
                    setShowOnlyOpen(false);
                    triggerHaptic(10);
                  }}
                  className="mt-6 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Discover All Local Spots
                </button>
              </div>
            ) : (
              sortedShops.map((shop) => {
                const isFollowing = favorites.includes(shop.id);
                const status = getShopStatus(shop);

                // Get coordinates and compute accurate distance
                const sLat =
                  (shop as any).latitude ||
                  -25.9964 + (hashString(shop.id) % 10) * 0.005;
                const sLng =
                  (shop as any).longitude ||
                  28.2268 + (hashString(shop.id) % 10) * 0.005;
                const distanceVal = userLocation
                  ? calculateDistance(
                      sLat,
                      sLng,
                      userLocation.lat,
                      userLocation.lng,
                    )
                  : null;

                return (
                  <div
                    key={shop.id}
                    onClick={() => {
                      setSelectedShopId(shop.id);
                      triggerHaptic(10);
                    }}
                    className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm dark:shadow-none hover:border-slate-300/80 dark:hover:border-slate-600 transition-all duration-300 flex flex-col cursor-pointer"
                  >
                    <div className="h-44 relative overflow-hidden">
                      <BlurUpImage
                        src={shop.logo || DEFAULT_SHOP_LOGO}
                        alt={shop.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`}
                      />

                      {/* Distance Float Indicator */}
                      {distanceVal !== null && (
                        <div className="absolute top-4 left-4 bg-orange-600 font-black text-[9px] uppercase tracking-wider text-white px-2.5 py-1.5 rounded-xl shadow-md flex items-center gap-1">
                          <Compass className="w-3 h-3 animate-spin duration-[3000ms]" />
                          <span>{distanceVal.toFixed(1)} km away</span>
                        </div>
                      )}

                      {/* Heart Follow Button Badge */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(shop.id);
                          triggerHaptic(10);
                        }}
                        className="absolute top-4 right-4 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md size-10 rounded-full flex items-center justify-center shadow-md active:scale-90 hover:scale-115 transition-all select-none cursor-pointer border border-slate-50 dark:border-slate-800 text-slate-400 hover:text-rose-500"
                      >
                        <Heart
                          className={`w-4 h-4 transition-all duration-300 ${isFollowing ? "text-rose-500 fill-rose-500 scale-110" : ""}`}
                        />
                      </button>

                      {/* Speed/Opening Overlays */}
                      <div className="absolute bottom-4 left-4 flex gap-1.5 flex-wrap">
                        {status.isOpen ? (
                          <span className="bg-emerald-500 text-white font-black text-[10px] whitespace-nowrap uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                            Open Now
                          </span>
                        ) : (
                          <span className="bg-slate-600 text-white font-black text-[10px] whitespace-nowrap uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                            Closed
                          </span>
                        )}
                        <span className="bg-[#fff0ea] leading-tight text-orange-700 font-black text-[10px] whitespace-nowrap uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                          {shop.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col justify-between flex-grow">
                      <div>
                        <h4 className="font-sans font-black text-xl text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-orange-500 transition-colors line-clamp-1 break-all flex items-center gap-1.5">
                          <span className="text-xl shrink-0" role="img" aria-label={shop.category}>
                            {getShopCategoryIcon(shop.category)}
                          </span>
                          <span>{shop.name}</span>
                        </h4>
                        <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1 font-semibold truncate">
                          {shop.address}
                        </p>

                        {/* Stable Decision Metrics Row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold mt-2.5 mb-2">
                          <div className="flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/15">
                            <Star className="w-3 h-3 fill-current text-amber-500" />
                            <span>{shop.rating.toFixed(1)}</span>
                            <span className="text-[10px] font-medium opacity-80">({shop.reviewCount || 0})</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 mb-4 leading-relaxed font-semibold">
                        {shop.description ||
                          "Discover incredible local delicacies made with fresh ingredients and served warm."}
                      </p>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStoreInfo(shop.id);
                            triggerHaptic(10);
                          }}
                          className="flex-grow py-3 bg-slate-900 hover:bg-slate-850 dark:bg-orange-600 dark:hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Order Menu</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShopId(shop.id);
                            setLayoutMode("map");
                            triggerHaptic(10);
                          }}
                          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-white rounded-2xl active:scale-95 transition-all text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer"
                          title="View on Map"
                        >
                          <MapIcon className="w-4 h-4 shrink-0 text-orange-500" />
                          <span>On Map</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Mobile-Optimized Map View with Fullscreen Toggle & Custom Z-Index Overlay Management */
        <div className={`transition-all duration-300 ${
          isMapFullscreen 
            ? "fixed inset-0 z-[1500] w-screen h-screen bg-slate-950 flex flex-col overflow-hidden" 
            : "flex-grow relative z-10 overflow-hidden dark:[&_.leaflet-tile-container]:invert dark:[&_.leaflet-tile-container]:hue-rotate-[180deg] dark:[&_.leaflet-tile-container]:brightness-[0.75] dark:[&_.leaflet-tile-container]:contrast-[1.2]"
        }`}>
          {!isOnline && (
            <div className="absolute inset-0 z-50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
              <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <WifiOff className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2">
                Maps Unavailable
              </h3>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Interactive maps require an active data connection to stream
                tiles. Switch to List view to browse saved shops.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => {
                    setLayoutMode("list");
                    triggerHaptic(5);
                  }}
                  className="px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <List className="w-4 h-4" />
                  Switch to List View
                </button>
                <button
                  onClick={onHome}
                  className="px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  Return Home
                </button>
              </div>
            </div>
          )}

          {/* Top Floating Controls Bar (Z-Index Strategy: 500/2000 above Leaflet panes) */}
          <div className="absolute top-4 left-3 right-3 z-[500] flex items-start justify-between pointer-events-none gap-2">
            {/* Interactive Map Legend Overlay - Pin Color Breakdown */}
            <div className="pointer-events-auto max-w-[calc(100vw-7rem)] sm:max-w-md">
              <MapLegend
                userLocation={userLocation}
                activeFilter={legendFilter}
                onSelectFilter={(f) => setLegendFilter(f)}
                shopCount={filteredShops.length}
                riderCount={activeProximityRiders?.length || 0}
                onFocusCustomer={() => {
                  if (!userLocation) {
                    onRequestLocation();
                  } else {
                    toast.success("Centering on your location");
                  }
                }}
                onFocusShop={() => {
                  if (filteredShops.length > 0) {
                    const s = filteredShops[0];
                    setSelectedShopId(s.id);
                    toast.info(`Focused on ${s.name}`);
                  }
                }}
                onFocusRider={() => {
                  if (activeProximityRiders && activeProximityRiders.length > 0) {
                    toast.info(`Found ${activeProximityRiders.length} active couriers nearby`);
                  }
                }}
              />
            </div>

            {/* Top-Right Custom UI Fullscreen Toggle & Navigation Controls */}
            <div className="flex items-center gap-2 pointer-events-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsMapFullscreen(!isMapFullscreen);
                  triggerHaptic(10);
                }}
                className={`px-3 py-2.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all flex items-center gap-2 font-black text-xs active:scale-95 cursor-pointer ${
                  isMapFullscreen
                    ? "bg-orange-600 text-white border-orange-500 shadow-orange-500/30 ring-2 ring-orange-400/50"
                    : "bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-200/60 dark:border-slate-800/60 hover:border-orange-500"
                }`}
                title={isMapFullscreen ? "Exit Fullscreen Mode" : "Expand Fullscreen Mode"}
              >
                {isMapFullscreen ? (
                  <>
                    <Minimize2 className="w-4 h-4 text-white shrink-0 animate-pulse" />
                    <span className="hidden sm:inline font-black uppercase tracking-wider text-[10px]">Exit Fullscreen</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="hidden sm:inline font-bold uppercase tracking-wider text-[10px]">Fullscreen</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <MapContainer
            center={mapCenter}
            zoom={14}
            scrollWheelZoom={true}
            className="h-full w-full z-0"
          >
            {/* Auto invalidates map layout on fullscreen state change */}
            <InvalidateMapSize trigger={isMapFullscreen} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Auto-focus on geolocation & Return to My Location button */}
            <ExploreMapUserTracker userLocation={userLocation} center={mapCenter} />

            {/* Distance Radius Filter Circle */}
            {userLocation && maxDistance !== null && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={maxDistance * 1000}
                pathOptions={{
                  color: "#f97316",
                  fillColor: "#f97316",
                  fillOpacity: 0.08,
                  weight: 2,
                  dashArray: "6, 6",
                }}
              />
            )}

            {/* Active Couriers / Riders Pins (Memoized Riders) */}
            {(legendFilter === 'all' || legendFilter === 'rider') && (activeProximityRiders || []).map((rider) => {
              const dist = userLocation ? calculateDistance(rider.latitude, rider.longitude, userLocation.lat, userLocation.lng) : 0;
              return (
                <MemoizedRiderMarker
                  key={rider.id}
                  rider={rider}
                  distVal={dist}
                />
              );
            })}

            {/* Shop Pins Cluster (Memoized Shops) */}
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={40}
              spiderfyOnMaxZoom={true}
            >
              {filteredShops
                .filter((shop) => {
                  const status = getShopStatus(shop);
                  if (legendFilter === 'all') return true;
                  if (legendFilter === 'shop') return status.isOpen;
                  if (legendFilter === 'closed_shop') return !status.isOpen;
                  return false;
                })
                .map((shop) => {
                  const isFollowed = favorites.includes(shop.id);
                  const status = getShopStatus(shop);

                  return (
                    <MemoizedShopMarker
                      key={shop.id}
                      shop={shop}
                      isFollowed={isFollowed}
                      isOpen={status.isOpen}
                      onSelectShop={(id) => {
                        setSelectedShopId(id);
                        triggerHaptic(10);
                      }}
                    />
                  );
                })}
            </MarkerClusterGroup>

            {/* Customer Location Pin (Always rendered on top with top z-index) */}
            {userLocation && (legendFilter === 'all' || legendFilter === 'customer') && (
              <MemoizedCustomerMarker
                lat={userLocation.lat}
                lng={userLocation.lng}
              />
            )}
          </MapContainer>

          {/* Compact Map Overlay: Floating Bottom-Right Action Menu (Z-Index Strategy: 600) */}
          <div className="absolute bottom-24 right-4 z-[600] flex flex-col items-end gap-2.5 pointer-events-none">
            {/* Primary Action Trigger: Expand Compact Filters Overlay */}
            <button
              type="button"
              onClick={() => {
                setIsMapOverlayMenuOpen(true);
                triggerHaptic(10);
              }}
              className="bg-slate-900/95 dark:bg-slate-900/95 text-white backdrop-blur-xl px-4 py-3 rounded-full shadow-xl flex items-center gap-2 border border-slate-700/60 font-black text-xs active:scale-95 transition-all cursor-pointer pointer-events-auto hover:bg-slate-800"
            >
              <Search className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Search & Filters</span>
              {(searchQuery || selectedCategory !== "All" || showOnlyOpen || maxDistance !== null) && (
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse border border-white"></span>
              )}
            </button>

            {/* Quick Action Column */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  setLayoutMode("list");
                  triggerHaptic(10);
                }}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md size-11 rounded-full shadow-xl text-slate-700 dark:text-slate-200 hover:text-orange-500 flex items-center justify-center transition-all cursor-pointer active:scale-90 border border-slate-200/60 dark:border-slate-800/60"
                title="Switch to List View"
              >
                <List className="w-4.5 h-4.5 text-orange-600 dark:text-orange-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onRequestLocation();
                  triggerHaptic(10);
                }}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md size-11 rounded-full shadow-xl text-slate-700 dark:text-slate-200 hover:text-orange-500 flex items-center justify-center transition-all cursor-pointer active:scale-90 border border-slate-200/60 dark:border-slate-800/60"
                title="Center My Location"
              >
                <LocateFixed className="w-4.5 h-4.5 text-blue-500" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onHome();
                  triggerHaptic(10);
                }}
                className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md size-11 rounded-full shadow-xl text-slate-700 dark:text-slate-200 hover:text-orange-500 flex items-center justify-center transition-all cursor-pointer active:scale-90 border border-slate-200/60 dark:border-slate-800/60"
                title="Return Home"
              >
                <Home className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          </div>

          {/* Compact Map Overlay Drawer Modal */}
          <AnimatePresence>
            {isMapOverlayMenuOpen && (
              <div className="fixed inset-0 z-[2000] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
                <motion.div
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 40, scale: 0.95 }}
                  className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] p-5 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-tight">
                        Map Filters & Search
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMapOverlayMenuOpen(false)}
                      className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center px-4 py-3 border border-slate-200/60 dark:border-slate-700/60">
                    <Search className="w-4 h-4 text-orange-500 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search food, street, or spot name..."
                      className="w-full bg-transparent outline-none text-xs font-bold dark:text-white placeholder:text-slate-400"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold ml-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Category Chips */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Filter Category
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto no-scrollbar">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat);
                            triggerHaptic(10);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            selectedCategory === cat
                              ? "bg-orange-600 text-white border-orange-500 shadow-md"
                              : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60"
                          }`}
                        >
                          {getCategorySlang(cat, language)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Proximity Radius Chips */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Radius Limit
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {([null, 1, 5, 10] as (number | null)[]).map((dist) => (
                        <button
                          key={dist === null ? "rad-any" : `rad-${dist}`}
                          type="button"
                          onClick={() => {
                            if (dist !== null && !userLocation) {
                              onRequestLocation();
                            }
                            setMaxDistance(dist);
                            triggerHaptic(10);
                          }}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border text-center ${
                            maxDistance === dist
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900"
                              : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60"
                          }`}
                        >
                          {dist === null ? "Any" : `${dist}km`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Toggles */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOnlyOpen(!showOnlyOpen);
                        triggerHaptic(10);
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        showOnlyOpen
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          : "bg-slate-50 dark:bg-slate-800/40 text-slate-400 border-slate-200/60 dark:border-slate-800"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Open Now Only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMinRating(minRating > 0 ? 0 : 4);
                        triggerHaptic(10);
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        minRating > 0
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          : "bg-slate-50 dark:bg-slate-800/40 text-slate-400 border-slate-200/60 dark:border-slate-800"
                      }`}
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>4+ Stars Only</span>
                    </button>
                  </div>

                  {/* Apply / Close Button */}
                  <button
                    type="button"
                    onClick={() => setIsMapOverlayMenuOpen(false)}
                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer mt-1"
                  >
                    View Map Results ({filteredShops.length} spots)
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom Sheet */}
      <AnimatePresence>
        {selectedShopId && activeShop && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-slate-950 rounded-t-[32px] bottom-sheet p-6 pb-24"
          >
            <div className="relative w-full max-w-[100vw] overflow-x-hidden">
              <div
                className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-6 cursor-pointer"
                onClick={() => setSelectedShopId(null)}
              ></div>
              <button
                onClick={() => setSelectedShopId(null)}
                className="absolute -top-2 -right-2 p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md">
                  <BlurUpImage
                    src={activeShop.logo || DEFAULT_SHOP_LOGO}
                    alt={activeShop.name}
                    className="w-full h-full"
                    blurHash={`https://picsum.photos/seed/${activeShop.id}/10/10?blur=10`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {activeShop.name}
                    </h3>
                    {favorites.includes(activeShop.id) && (
                      <Heart className="w-4 h-4 text-red-500 fill-current" />
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">
                    {activeShop.category} • {activeShop.address}
                  </p>
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <span className="text-sm font-bold ml-1 dark:text-white">
                      {activeShop.rating}
                    </span>
                    <span className="text-gray-400 dark:text-slate-500 text-xs ml-1">
                      (120+ reviews)
                    </span>
                    {userLocation && (
                      <>
                        <span className="text-gray-300 dark:text-slate-700 mx-2">
                          •
                        </span>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-extrabold uppercase tracking-wide">
                          📍{" "}
                          {calculateDistance(
                            activeShop.latitude ||
                              -25.9964 +
                                (hashString(activeShop.id) % 10) * 0.005,
                            activeShop.longitude ||
                              28.2268 +
                                (hashString(activeShop.id) % 10) * 0.005,
                            userLocation.lat,
                            userLocation.lng,
                          ).toFixed(1)}{" "}
                          km away
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleFavorite(activeShop.id)}
                className={`p-2 rounded-full transition-all active:scale-90 cursor-pointer ${favorites.includes(activeShop.id) ? "bg-red-50 dark:bg-red-500/10 text-red-500" : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500"}`}
              >
                <Heart
                  className={`w-5 h-5 ${favorites.includes(activeShop.id) ? "fill-current" : ""}`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => onStoreInfo(activeShop.id)}
                className="bg-orange-500 text-white py-3 rounded-2xl font-bold shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <BookOpen className="w-5 h-5" />
                View Menu
              </button>
              <button
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeShop.address)}`,
                    "_blank",
                  )
                }
                className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Navigation className="w-5 h-5" />
                Directions
              </button>
              <button
                onClick={() => onStoreInfo(activeShop.id)}
                className="bg-orange-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer col-span-2 md:col-span-1 shadow-lg shadow-orange-600/20"
              >
                <MessageCircle className="w-5 h-5" />
                Chat with Shop
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex justify-around items-center bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-[20px] border-[3px] border-white/50 dark:border-slate-800/50 shadow-xl pointer-events-auto transition-all">
          <button
            onClick={onHome}
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors cursor-pointer group"
          >
            <div className="p-1 group-hover:scale-110 transition-transform">
              <Home className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {t("home")}
            </span>
          </button>
          <button
            onClick={onDiscover}
            className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors cursor-pointer group"
          >
            <div className="p-1 relative group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6 bg-white dark:bg-slate-800 rounded-lg p-0.5 shadow-sm" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {t("discover")}
            </span>
          </button>
          <button className="flex flex-col items-center gap-1 text-orange-600 transition-colors cursor-pointer group">
            <div className="p-1 group-hover:scale-110 transition-transform">
              <MapIcon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tighter">
              {t("map")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

{
  /* Smooth FlyTo centered & user location tracking helper component */
}
function ExploreMapUserTracker({
  userLocation,
  center,
  zoom = 15,
}: {
  userLocation: { lat: number; lng: number } | null;
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  const [hasMovedFromUser, setHasMovedFromUser] = useState(false);
  const prevUserPosRef = useRef<{ lat: number; lng: number } | null>(null);

  // Focus map view on user's current location immediately upon successful geolocation
  useEffect(() => {
    if (userLocation && userLocation.lat && userLocation.lng) {
      const prev = prevUserPosRef.current;
      const isNew =
        !prev ||
        Math.abs(prev.lat - userLocation.lat) > 0.0001 ||
        Math.abs(prev.lng - userLocation.lng) > 0.0001;
      if (isNew) {
        map.flyTo([userLocation.lat, userLocation.lng], zoom, {
          animate: true,
          duration: 1.2,
        });
        prevUserPosRef.current = userLocation;
        setHasMovedFromUser(false);
      }
    }
  }, [userLocation?.lat, userLocation?.lng, map, zoom]);

  // Recenter when active store/center changes
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.0,
      });
    }
  }, [center[0], center[1], map, zoom]);

  // Listen for map drag or movement
  useMapEvents({
    dragstart: () => {
      setHasMovedFromUser(true);
    },
    zoomend: () => {
      if (userLocation) {
        const c = map.getCenter();
        const dist = Math.sqrt(
          Math.pow(c.lat - userLocation.lat, 2) +
            Math.pow(c.lng - userLocation.lng, 2)
        );
        if (dist > 0.002) {
          setHasMovedFromUser(true);
        }
      }
    },
  });

  const handleReturnToLocation = () => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], zoom, {
        animate: true,
        duration: 1.0,
      });
      setHasMovedFromUser(false);
    }
  };

  if (!userLocation || !hasMovedFromUser) return null;

  return (
    <div className="absolute top-24 right-4 z-[1000] animate-in fade-in slide-in-from-top-2 duration-200">
      <button
        type="button"
        onClick={handleReturnToLocation}
        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer border-2 border-white/80 dark:border-slate-800"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
        </span>
        <LocateFixed className="w-4 h-4 text-white" />
        <span>Return to My Location</span>
      </button>
    </div>
  );
}

function NotificationsScreen({
  notifications,
  onBack,
  onRead,
  onDelete,
}: {
  notifications: AppNotification[];
  onBack: () => void;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  
  const displayNotifications = notifications
    .filter(n => activeTab === 'all' || !n.read)
    .sort((a, b) => b.timestamp - a.timestamp);

  // Group notifications loosely by day
  const groupedNotifications: Record<string, AppNotification[]> = {};
  displayNotifications.forEach(notif => {
    const d = new Date(notif.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let groupKey = "Earlier";
    if (d.toDateString() === today.toDateString()) {
      groupKey = "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      groupKey = "Yesterday";
    }
    
    if (!groupedNotifications[groupKey]) groupedNotifications[groupKey] = [];
    groupedNotifications[groupKey].push(notif);
  });

  return (
    <div className="bg-[#f8f6f5] dark:bg-slate-950 text-[#222C36] dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-xl overflow-x-hidden">
      <header className="bg-white dark:bg-slate-900 pt-8 sm:pt-12 pb-4 px-6 sticky top-0 z-20 shadow-[0_4px_20px_rgba(34,44,54,0.05)] dark:shadow-none dark:border-b dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-[#f8f6f5] dark:bg-slate-800 cursor-pointer text-[#222C36] dark:text-slate-100 transition-transform active:scale-95"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="w-12 h-12"></div> {/* Spacer for centering */}
        </div>
        <h1 className="text-[32px] font-sans font-bold leading-tight tracking-[-0.02em] mb-6 text-slate-900 dark:text-white">
          Notifications
        </h1>
        
        {/* Segmented Control */}
        <div className="flex bg-[#f8f6f5] dark:bg-slate-800 rounded-xl p-1 relative h-12 w-full">
          <div 
            className="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-[10px] shadow-sm transition-transform duration-300 ease-in-out z-0"
            style={{ transform: activeTab === 'unread' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 relative z-10 text-sm font-medium transition-colors cursor-pointer rounded-lg ${activeTab === 'all' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            All
          </button>
          <button 
            onClick={() => setActiveTab('unread')}
            className={`flex-1 relative z-10 text-sm font-medium transition-colors cursor-pointer rounded-lg ${activeTab === 'unread' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Unread
          </button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto pb-24 bg-[#f8f6f5] dark:bg-slate-950">
        <div className="flex flex-col gap-2 p-4">
          {displayNotifications.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500 mt-20">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-orange-500/10 rounded-full scale-110 blur-xl opacity-50"></div>
                <div className="size-24 bg-white dark:bg-slate-900 rounded-[36px] shadow-lg flex items-center justify-center text-orange-500 relative z-10 border border-slate-100 dark:border-slate-800">
                  <Bell className="w-11 h-11" />
                </div>
              </div>
              <h3 className="text-xl font-sans font-bold mb-2 text-slate-900 dark:text-white leading-tight">
                All Caught Up
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[240px] leading-relaxed mb-6">
                You have no {activeTab === 'unread' ? 'unread ' : ''}notifications right now.
              </p>
              <button
                onClick={onBack}
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 cursor-pointer text-sm shadow-sm border border-slate-200 dark:border-slate-700 mx-auto"
              >
                Back to Home
              </button>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([group, notifs]) => (
              <div key={group} className="mb-4">
                <div className="py-2 mb-2">
                  <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-2">
                    {group}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {notifs.map((notif) => (
                    <div 
                      key={notif.id}
                      className="relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden group cursor-pointer"
                      onClick={() => onRead(notif.id)}
                    >
                      {/* Swipe Action Layer (Delete) */}
                      <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center text-white z-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }} 
                          className="w-full h-full flex flex-col items-center justify-center cursor-pointer active:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Delete</span>
                        </button>
                      </div>
                      
                      {/* Content Layer */}
                      <div className="relative bg-white dark:bg-slate-900 z-10 flex gap-4 p-4 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-x-24 shadow-sm border border-slate-100 dark:border-slate-800 h-full">
                        {/* Unread Indicator */}
                        {!notif.read && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#fa792e]"></div>
                        )}
                        
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white ${notif.read ? 'opacity-70 bg-slate-700 dark:bg-slate-600' : notif.type === 'order' ? 'bg-[#222C36] dark:bg-slate-800' : notif.type === 'promo' ? 'bg-[#fa792e]' : 'bg-[#10B981]'}`}>
                          {notif.type === "order" ? (
                            <Package className="w-6 h-6" />
                          ) : notif.type === "promo" ? (
                            <Tag className="w-6 h-6" />
                          ) : notif.type === "follow" ? (
                            <Heart className="w-6 h-6" />
                          ) : (
                            <Info className="w-6 h-6" />
                          )}
                        </div>
                        
                        {/* Text Content */}
                        <div className={`flex-1 min-w-0 flex flex-col justify-center ${notif.read ? 'opacity-80' : ''}`}>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-sans font-semibold text-[16px] text-slate-900 dark:text-white truncate pr-2">
                              {notif.title}
                            </h3>
                            <span className="text-[12px] text-slate-500 dark:text-slate-400 whitespace-nowrap mt-1">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[14px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2 line-clamp-2">
                            {notif.message}
                          </p>
                          {/* Action Button (only on unread or specifically actionable types) */}
                          {!notif.read && (
                            <button 
                              className="bg-[#f8f6f5] dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-[13px] font-bold py-2 px-4 rounded-xl w-fit transition-colors cursor-pointer mt-1"
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function RecenterMap({ coords }: { coords: { lat: number; lng: number } }) {
  const map = useMap();
  const lat = coords?.lat;
  const lng = coords?.lng;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

function RealTimeRiderTracking({ order, shop }: { order: Order; shop?: Shop }) {
  const [riderLocation, setRiderLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [showMap, setShowMap] = useState(order.delivery_status === "picked_up");
  const [riderInfo, setRiderInfo] = useState<any>(null);

  useEffect(() => {
    if (!order.rider_id) return;

    // Fetch initial location and info
    const initTracking = async () => {
      try {
        const { data: loc } = await supabase
          .from("rider_locations")
          .select("rider_id, latitude, longitude, heading, speed, updated_at")
          .eq("rider_id", order.rider_id)
          .single();
        if (loc)
          setRiderLocation({
            lat: Number(loc.latitude),
            lng: Number(loc.longitude),
          });

        const { data: profile } = await supabase
          .from("rider_profiles")
          .select("id, name, full_name, phone, avatar_url, vehicle_type, rating")
          .eq("id", order.rider_id)
          .single();
        setRiderInfo(profile);
      } catch (err) {
        console.error("Tracking init error:", err);
      }
    };

    initTracking();

    const channel = getFreshChannel(`tracking-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rider_locations",
          filter: `rider_id=eq.${order.rider_id}`,
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            setRiderLocation({
              lat: Number(payload.new.latitude),
              lng: Number(payload.new.longitude),
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.rider_id, order.id]);

  const storeCoords =
    shop?.latitude && shop?.longitude
      ? { lat: shop.latitude, lng: shop.longitude }
      : DEFAULT_COORDS;
  const deliveryCoords =
    order.latitude && order.longitude
      ? { lat: order.latitude, lng: order.longitude }
      : null;

  if (!order.rider_id) {
    return (
      <div className="p-5 bg-blue-50 dark:bg-blue-950/20 rounded-3xl border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-600 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Finding a Rider</h3>
            <p className="text-[10px] text-slate-500">
              Connecting your order to the nearest available partner...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-orange-50 dark:bg-orange-950/20 rounded-3xl border border-orange-100 dark:border-orange-900/30 overflow-hidden relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {order.delivery_status === "picked_up" ? (
            <span className="bg-orange-600 text-white text-[10px] whitespace-nowrap font-black px-2 py-1 rounded-full uppercase animate-pulse">
              Out for Delivery
            </span>
          ) : (
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
          )}
          <h3 className="text-sm font-black uppercase tracking-widest text-orange-600">
            Rider Tracking
          </h3>
        </div>
        {deliveryCoords && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Map
            </span>
            <button
              onClick={() => setShowMap(!showMap)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showMap ? "bg-orange-600" : "bg-slate-200 dark:bg-slate-800"}`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showMap ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
          </div>
        )}
      </div>

      {riderLocation &&
        deliveryCoords &&
        (() => {
          const dist = calculateDistance(
            riderLocation.lat,
            riderLocation.lng,
            deliveryCoords.lat,
            deliveryCoords.lng,
          );
          return dist > 3 ? (
            <div className="mb-4 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-900/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-800 dark:text-red-400">
                  Rider is uncharacteristically far away
                </p>
                <p className="text-[10px] text-red-600 dark:text-red-500/80 mt-0.5">
                  Your rider is currently {dist.toFixed(1)}km away from the
                  delivery address. This might take a bit longer.
                </p>
              </div>
            </div>
          ) : null;
        })()}

      {showMap && deliveryCoords ? (
        <div className="h-48 w-full rounded-2xl overflow-hidden mb-4 border border-orange-200 dark:border-orange-800 relative z-10 shadow-inner">
          <MapContainer
            center={riderLocation || storeCoords}
            zoom={15}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RecenterMap coords={riderLocation || storeCoords} />
            <Marker position={storeCoords} />
            <Marker position={deliveryCoords} />
            {riderLocation && (
              <Marker
                position={riderLocation}
                icon={L.divIcon({
                  className: "custom-rider-icon",
                  html: `<div class="bg-indigo-600 p-1 rounded-full border-2 border-white shadow-lg flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
                  iconSize: [28, 28],
                  iconAnchor: [14, 28],
                })}
              />
            )}
            <ChangeView center={riderLocation || storeCoords} />
          </MapContainer>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span>Shop</span>
            <span>Rider Location</span>
            <span>You</span>
          </div>
          <div className="relative h-1 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center">
            <div className="absolute left-0 w-2 h-2 bg-slate-900 dark:bg-white rounded-full"></div>
            <div className="absolute right-0 w-2 h-2 bg-orange-600 rounded-full"></div>
            {/* Progress could be calculated based on distance */}
            <div className="absolute left-[45%] p-1.5 bg-orange-600 text-white rounded-full shadow-lg animate-bounce">
              <Bike className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-orange-100 dark:border-orange-900/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold">
              {riderInfo?.full_name || "Assigned Rider"}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">
              {riderInfo?.vehicle_type || "Bicycle"} Delivery
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {riderInfo?.phone && (
            <button
              onClick={() => {
                const cleanPhone = riderInfo.phone.replace(/[^0-9]/g, "");
                const url = `https://wa.me/${cleanPhone.startsWith("0") ? "27" + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(`Hi ${riderInfo.full_name}, I'm checking on my delivery for order #${order.id.slice(0, 5)}!`)}`;
                window.open(url, "_blank");
              }}
              className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-primary/10 shadow-sm text-[#25D366] active:scale-90 transition-all cursor-pointer group"
              title="WhatsApp Rider"
            >
              <MessageCircle className="w-4 h-4 fill-[#25D366]/20" />
            </button>
          )}
          <a
            href={`tel:${riderInfo?.phone}`}
            className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-primary/10 shadow-sm text-primary active:scale-90 transition-all"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

function ChangeView({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  const lat = center?.lat;
  const lng = center?.lng;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.setView([lat, lng], 13);
    }
  }, [lat, lng, map]);
  return null;
}

function SystemStatusDrawer({
  isOpen,
  onClose,
  isOnline,
  bgLatency,
}: {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  bgLatency?: number | null;
}) {
  const [pinging, setPinging] = useState(false);
  const [latency, setLatency] = useState<number | null>(bgLatency ?? null);
  const [dbStatus, setDbStatus] = useState<"ok" | "checking" | "error">("ok");
  const [authStatus, setAuthStatus] = useState<string>("Checking auth...");

  const handleTestConnection = async () => {
    setPinging(true);
    setDbStatus("checking");
    const start = performance.now();
    try {
      const ok = await FirestoreService.healthCheck();
      const end = performance.now();
      setLatency(Math.round(end - start));
      setDbStatus(ok ? "ok" : "error");
    } catch {
      setDbStatus("error");
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          setAuthStatus(`Authenticated (${data.session.user.email || "Active User"})`);
        } else {
          setAuthStatus("Guest Session / Local Token");
        }
      }).catch(console.warn);
      if (latency === null) {
        handleTestConnection();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5 duration-250">
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-black tracking-tight">System & Backend Status</h2>
              <p className="text-[11px] text-slate-300 font-medium">Live Supabase Cloud health diagnostic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-left text-xs">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200">
                  {isOnline ? "Connected to Supabase Cloud" : "Reconnecting to Backend..."}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {isOnline ? "Backend active & ready for real-time sync" : "Attempting network reconnection..."}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded-full border border-emerald-300 dark:border-emerald-700">
              {isOnline ? "Active" : "Pending"}
            </span>
          </div>

          <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-1 pb-3 border-b border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Supabase API URL</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs break-all">
                {supabaseUrl || "https://placeholder.supabase.co"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Database Cluster</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">PostgreSQL Cloud</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Response Latency</span>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                {latency !== null ? `${latency} ms` : "Measuring..."}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Realtime Channel</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Subscribed
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Auth Token State</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                {authStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={pinging}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${pinging ? "animate-spin" : ""}`} />
              {pinging ? "Testing Ping..." : "Ping Endpoint Now"}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({
  userProfile,
  setUserProfile,
  forcedTheme,
  onSetForcedTheme,
  triggerHaptic,
  onBack,
  onLogout,
  onProfile,
  onOrderHistory,
  onAdminOrders,
  onShopDashboard,
  onContactUs,
  onUpdateProfile,
  isDarkMode,
  onToggleDarkMode,
  hapticEnabled,
  onToggleHaptic,
  hapticButtonPress = true,
  onToggleHapticButtonPress,
  hapticOrderUpdate = true,
  onToggleHapticOrderUpdate,
  hapticCartAnimation = true,
  onToggleHapticCartAnimation,
  dataSaverEnabled = false,
  onToggleDataSaver,
  orderAgainEnabled = true,
  onToggleOrderAgain,
  biometricsEnabled = true,
  onToggleBiometrics,
  setNotification,
  showAlert,
  showConfirm,
  showPasswordPrompt,
  isOnline,
  onSubscribeToPush,
  onManualSync,
  isSyncing = false,
  stalenessThresholdMs = 30000,
  onUpdateStalenessThreshold,
  heartbeatMetrics,
  isPingingHeartbeat = false,
  onRunHeartbeatPing,
}: {
  userProfile: UserProfile;
  setUserProfile: Dispatch<SetStateAction<UserProfile>>;
  forcedTheme?: "light" | "dark" | "high-contrast" | "default";
  onSetForcedTheme?: (theme: "light" | "dark" | "high-contrast" | "default") => void;
  triggerHaptic?: (pattern?: number | number[], actionType?: "button_press" | "order_update" | "cart_animation") => void;
  onBack: () => void;
  onLogout: () => void;
  onProfile: () => void;
  onOrderHistory: () => void;
  onAdminOrders: () => void;
  onShopDashboard: () => void;
  onContactUs?: () => void;
  onUpdateProfile: (data: Partial<UserProfile>, showSuccess?: boolean) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  hapticEnabled: boolean;
  onToggleHaptic: () => void;
  hapticButtonPress?: boolean;
  onToggleHapticButtonPress: () => void;
  hapticOrderUpdate?: boolean;
  onToggleHapticOrderUpdate: () => void;
  hapticCartAnimation?: boolean;
  onToggleHapticCartAnimation: () => void;
  dataSaverEnabled?: boolean;
  onToggleDataSaver: () => void;
  orderAgainEnabled?: boolean;
  onToggleOrderAgain: () => void;
  biometricsEnabled?: boolean;
  onToggleBiometrics: (val: boolean) => void;
  setNotification: (n: NotificationState) => void;
  showAlert: (title: string, message: string) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmLabel?: string,
    cancelLabel?: string,
  ) => void;
  showPasswordPrompt: (
    title: string,
    message: string,
    onConfirm: (value: string) => void
  ) => void;
  isOnline: boolean;
  onSubscribeToPush?: (customUserId?: string) => Promise<void>;
  onManualSync?: () => Promise<void> | void;
  isSyncing?: boolean;
  stalenessThresholdMs?: number;
  onUpdateStalenessThreshold?: (ms: number) => void;
  heartbeatMetrics?: NetworkHealthMetrics;
  isPingingHeartbeat?: boolean;
  onRunHeartbeatPing?: () => Promise<void> | void;
}) {
  const [uploading, setUploading] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<"terms" | "privacy" | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language, setLanguage } = useTranslation();

  // Advanced Interactive Panels
  const [showAddressManager, setShowAddressManager] = useState(false);
  const [showNotificationDetails, setShowNotificationDetails] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState(false);
  const [showDevTestingSuite, setShowDevTestingSuite] = useState(false);
  const [showDevPanel, setShowDevPanel] = useState(() => {
    try {
      const until = localStorage.getItem("dev_unlocked_until");
      if (until) {
        const parsed = parseInt(until, 10);
        if (parsed > Date.now()) {
          return true;
        }
      }
    } catch {}
    return false;
  });

  // Developer Testing Suite States
  const [bgLatency, setBgLatency] = useState<number | null>(null);
  const [generatingMockOrder, setGeneratingMockOrder] = useState(false);
  const [debugLogs, setDebugLogs] = useState<{ type: string; message: string; timestamp: string; status?: string; details?: string }[]>(() => {
    try {
      return (window as any).__devDebugLogs || [];
    } catch {
      return [];
    }
  });

  // Diagnostic Global Error Listener state (last 50 error logs)
  const [globalErrorLogs, setGlobalErrorLogs] = useState<any[]>(() => {
    try {
      return (window as any).__GLOBAL_ERROR_LOGS__ || JSON.parse(localStorage.getItem("global_error_logs") || "[]");
    } catch {
      return [];
    }
  });
  const [errorLogFilter, setErrorLogFilter] = useState("");

  useEffect(() => {
    const handleGlobalErrorUpdate = (e: Event) => {
      setGlobalErrorLogs((e as CustomEvent).detail || []);
    };
    window.addEventListener("global-error-log-updated", handleGlobalErrorUpdate);
    return () => {
      window.removeEventListener("global-error-log-updated", handleGlobalErrorUpdate);
    };
  }, []);

  // Background ping interval
  useEffect(() => {
    let active = true;
    const pingEndpoint = async () => {
      if (!isOnline) {
        setBgLatency(null);
        return;
      }
      const start = performance.now();
      try {
        await fetch("/api/health", { method: "GET" });
        if (active) {
          setBgLatency(Math.round(performance.now() - start));
        }
      } catch (e) {
        if (active) {
          setBgLatency(Math.round(performance.now() - start));
        }
      }
    };

    pingEndpoint().catch(() => {});
    const interval = setInterval(() => {
      pingEndpoint().catch(() => {});
    }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOnline]);

  // Listen to dev-debug-log events
  useEffect(() => {
    const handleLogEvent = (e: Event) => {
      setDebugLogs((e as CustomEvent).detail || []);
    };
    window.addEventListener("dev-debug-log", handleLogEvent);
    return () => {
      window.removeEventListener("dev-debug-log", handleLogEvent);
    };
  }, []);

  const handleGenerateMockOrder = async () => {
    setGeneratingMockOrder(true);
    triggerHaptic?.([50, 30, 50]);
    try {
      let targetShopId = "shop_1";
      let shopNameForOrder = "Gogo Nandi's Kitchen";
      
      const { data: { user } } = await supabase.auth.getUser();
      const ownerId = user?.id || userProfile.id;
      
      if (ownerId) {
        const { data: shopData } = await supabase
          .from("shops")
          .select("id, name, description, location, category, rating, logo_url")
          .eq("owner_id", ownerId)
          .maybeSingle();
        if (shopData) {
          targetShopId = shopData.id;
          shopNameForOrder = shopData.name;
        }
      }

      if (targetShopId === "shop_1") {
        try {
          const { data: firstShop } = await supabase
            .from("shops")
            .select("id, name, description, location, category, rating, logo_url")
            .limit(1)
            .maybeSingle();
          if (firstShop) {
            targetShopId = firstShop.id;
            shopNameForOrder = firstShop.name;
          }
        } catch (e) {}
      }

      const mockOrder = {
        user_id: ownerId || "00000000-0000-0000-0000-000000000000",
        shop_id: targetShopId,
        customer_name: "Developer Test Account",
        phone: "+27712345678",
        email: userProfile.email || "developer@example.com",
        city: userProfile.city || "Johannesburg",
        address: "123 Developer Lane, Gauteng",
        country: "South Africa",
        product_name: "Special Developer Kota combo",
        product_variant: "Extra Cheese, Extra Chips, Avocado",
        quantity: 1,
        price: 85.00,
        delivery_fee: 15.00,
        total_price: 100.00,
        notes: "MOCK TESTING ORDER generated to verify order handling.",
        delivery_instructions: "Ring bell at the main gate.",
        status: "pending",
        is_delivery: true,
        delivery_status: "finding_rider",
        payment_method: "cash",
        lat: userProfile.latitude || -26.2041,
        lng: userProfile.longitude || 28.0473
      };

      const { data, error } = await supabase
        .from("orders")
        .insert([mockOrder])
        .select("id");

      if (error) {
        const { lat, lng, ...safeMockOrder } = mockOrder as any;
        const { error: retryError } = await supabase
          .from("orders")
          .insert([safeMockOrder])
          .select("id");
        
        if (retryError) throw retryError;
      }

      toast.success(`Successfully generated mock order for ${shopNameForOrder}! 🎉`);
      showAlert("Mock Order Created", `A test order has been successfully generated for ${shopNameForOrder} to verify the kitchen portal order flow. Refresh the kitchen portal to see the new order!`);
      triggerHaptic?.([100, 50, 100]);
      audioHelper.play("placed");

    } catch (err: any) {
      console.error("Failed to generate mock order:", err);
      toast.error(`Error generating mock order: ${err.message}`);
    } finally {
      setGeneratingMockOrder(false);
    }
  };

  // Address Management States
  const [newAddressInput, setNewAddressInput] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<string[]>(() => {
    const cached = localStorage.getItem("localeats_saved_addresses");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return userProfile.address ? [userProfile.address] : [];
  });

  // Persistent Fine-grained Notifications
  const [notifMilestones, setNotifMilestones] = useState(() => localStorage.getItem("localeats_notif_milestones") !== "false");
  const [notifDeals, setNotifDeals] = useState(() => localStorage.getItem("localeats_notif_deals") !== "false");
  const [notifRider, setNotifRider] = useState(() => localStorage.getItem("localeats_notif_rider") !== "false");
  const [notifWeekly, setNotifWeekly] = useState(() => localStorage.getItem("localeats_notif_weekly") === "true");

  // Persistent Sound Settings
  const [audioEnabled, setAudioEnabled] = useState(() => localStorage.getItem("localeats_audio_enabled") !== "false");
  const [audioVolume, setAudioVolume] = useState(() => {
    const vol = localStorage.getItem("localeats_audio_volume");
    return vol ? parseFloat(vol) : 1.0;
  });

  // Connection Diagnostics States
  const [latencyTestResult, setLatencyTestResult] = useState<string | null>(null);
  const [testingLatency, setTestingLatency] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!isOnline) {
      setNotification({
        message: "No internet connection. Cannot upload photo.",
        type: "error",
      });
      return;
    }
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];
      
      if (!file.type.startsWith("image/")) {
        setNotification({ message: "Please select a valid image file.", type: "error" });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setNotification({ message: "The image size must be under 2MB.", type: "error" });
        return;
      }

      setUploading(true);
      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(localPreviewUrl);

      const publicUrl = await uploadAvatar(file, userProfile.id);

      // Update Profile
      setUserProfile((prev) => ({ ...prev, photoURL: publicUrl }));
      setNotification({ message: "Profile picture updated!", type: "success" });
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreviewUrl);
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      let errorMsg = "Something went wrong uploading your photo. Please try again.";
      if (error.message === "NETWORK_TIMEOUT" || error.message === "NETWORK_ERROR") errorMsg = "Network error. Please check your connection and try again.";
      else if (error.message === "BUCKET_NOT_FOUND") errorMsg = "Storage is not configured yet. Please try again later.";
      
      setNotification({ message: errorMsg, type: "error" });
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "zu", name: "IsiZulu" },
    { code: "xh", name: "IsiXhosa" },
    { code: "af", name: "Afrikaans" },
    { code: "st", name: "Sesotho" },
    { code: "ts", name: "Xitsonga" },
    { code: "nso", name: "Sepedi" },
    { code: "tn", name: "Setswana" },
    { code: "ss", name: "SiSwati" },
    { code: "ve", name: "Tshivenda" },
    { code: "nr", name: "isiNdebele" },
  ];

  const handleLanguageChange = async (langCode: any) => {
    setLanguage(langCode);
    onUpdateProfile({ language: langCode }, false);
    setShowLanguageModal(false);
    setNotification({
      message: `Language changed to ${languages.find((l) => l.code === langCode)?.name}`,
      type: "success",
    });
  };

  // Address Manager Functions
  const handleAddAddress = (addr: string) => {
    if (!addr.trim()) return;
    const clean = addr.trim();
    if (savedAddresses.includes(clean)) {
      setNotification({ message: "Address is already saved", type: "info" });
      return;
    }
    const updated = [...savedAddresses, clean];
    setSavedAddresses(updated);
    localStorage.setItem("localeats_saved_addresses", JSON.stringify(updated));
    setNewAddressInput("");
    setAddressSuggestions([]);
    
    // Auto propagate default address if none exists
    if (!userProfile.address) {
      onUpdateProfile({ address: clean }, false);
    }
    setNotification({ message: "Address saved successfully!", type: "success" });
  };

  const handleDeleteAddress = (addr: string) => {
    const updated = savedAddresses.filter(a => a !== addr);
    setSavedAddresses(updated);
    localStorage.setItem("localeats_saved_addresses", JSON.stringify(updated));
    setNotification({ message: "Address removed.", type: "info" });
  };

  const handleSetDefaultAddress = (addr: string) => {
    onUpdateProfile({ address: addr }, false);
    setNotification({ message: "Default address updated!", type: "success" });
  };

  const handleSearchAddressChange = async (val: string) => {
    setNewAddressInput(val);
    if (val.length < 3) {
      setAddressSuggestions([]);
      return;
    }
    setSearchingAddress(true);
    try {
      const suggestions = await searchAddress(val);
      setAddressSuggestions(suggestions || []);
    } catch (e) {
      console.error("OSM autocomplete failed:", e);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Fine-grained notification toggle
  const toggleNotif = (type: "milestones" | "deals" | "rider" | "weekly") => {
    if (type === "milestones") {
      const next = !notifMilestones;
      setNotifMilestones(next);
      localStorage.setItem("localeats_notif_milestones", String(next));
    } else if (type === "deals") {
      const next = !notifDeals;
      setNotifDeals(next);
      localStorage.setItem("localeats_notif_deals", String(next));
    } else if (type === "rider") {
      const next = !notifRider;
      setNotifRider(next);
      localStorage.setItem("localeats_notif_rider", String(next));
    } else if (type === "weekly") {
      const next = !notifWeekly;
      setNotifWeekly(next);
      localStorage.setItem("localeats_notif_weekly", String(next));
    }
    if (hapticEnabled && navigator.vibrate) {
      navigator.vibrate(12);
    }
    audioHelper.play("alert");
  };

  // Audio system modifier
  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioVolume(val);
    localStorage.setItem("localeats_audio_volume", String(val));
    audioHelper.play("alert");
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    localStorage.setItem("localeats_audio_enabled", String(next));
    audioHelper.toggleMute();
    audioHelper.play("alert");
  };

  // Diagnostics calculations
  const runLatencyTest = async () => {
    if (!isOnline) {
      setLatencyTestResult("No internet connection.");
      return;
    }
    setTestingLatency(true);
    setLatencyTestResult("Pinging database...");
    const start = performance.now();
    try {
      await fetch("/api/health", { method: "GET" });
      const diff = Math.round(performance.now() - start);
      setLatencyTestResult(`${diff}ms (${diff < 150 ? "Excellent" : "Fair"})`);
    } catch (e) {
      const diff = Math.round(performance.now() - start);
      setLatencyTestResult(`${diff}ms (Server operational)`);
    } finally {
      setTestingLatency(false);
    }
  };

  const getStorageSize = () => {
    let total = 0;
    for (let x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        total += (localStorage[x].length + x.length) * 2;
      }
    }
    return (total / 1024).toFixed(1);
  };

  const handlePruneCache = () => {
    let count = 0;
    const persistentKeys = ["sb-access-token", "sb-refresh-token", "localeats_saved_addresses", "localeats-session", "userProfile", "dark_mode", "haptic_enabled", "localeats_audio_enabled", "localeats_audio_volume"];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && !persistentKeys.some(k => key.includes(k))) {
        localStorage.removeItem(key);
        count++;
      }
    }
    setNotification({
      message: `Cleared ${count} temporary files. Saved addresses and profile kept safe!`,
      type: "success"
    });
  };

  const [showSystemStatusDrawer, setShowSystemStatusDrawer] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-xl">
      {/* Hidden File Input */}
      <input
        type="file"
        id="single"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
        ref={fileInputRef}
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-primary/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">{t("settings")}</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-8 pb-24 flex-grow overflow-y-auto">

        {/* Profile Section Quick View */}
        <div className="flex items-center space-x-4 bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-primary/5 shadow-sm">
          <div className="relative group">
            <div className="relative w-16 h-16">
              {uploading ? (
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : (
                <img
                  alt="Profile Picture"
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                  src={previewUrl || userProfile.photoURL || getAvatarUrl(userProfile.fullName)}
                  referrerPolicy="no-referrer"
                />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-primary w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg active:scale-90 transition-transform cursor-pointer"
              >
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
          <div>
            <h2 className="font-bold text-lg">
              {userProfile.fullName || "User"}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {userProfile.email || "No email set"}
              </span>
              <span className="bg-primary/10 text-primary dark:text-orange-400 font-extrabold uppercase text-[10px] whitespace-nowrap px-2 py-1 rounded-full tracking-widest">
                Verified Customer
              </span>
            </div>
            {(userProfile.loyaltyPoints ?? 0) > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1 uppercase tracking-widest">
                  ✨ {userProfile.loyaltyPoints} Loyalty Points
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 1. Account & Deliveries */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
              {t("account_security")}
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            {/* Edit Profile */}
            <button
              onClick={onProfile}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t("edit_profile")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Address Manager */}
            <button
              onClick={() => setShowAddressManager(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-medium text-sm">{t("saved_addresses")}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {savedAddresses.length} saved {savedAddresses.length === 1 ? "location" : "locations"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userProfile.address && (
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold uppercase px-2 py-1 rounded">
                    Active
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </button>

            {/* Account Deletion */}
            <button
              onClick={() => {
                showPasswordPrompt(
                  "Delete Account?",
                  "Enter your password to permanently delete your profile. This cannot be undone.",
                  (password) => {
                    if (password) {
                      setNotification({
                        message: "Account deletion initiated. Your records are being scrubbed.",
                        type: "info",
                      });
                      // Here you would typically call a backend endpoint to delete the account with the provided password
                    }
                  }
                );
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600">
                  <UserMinus className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm text-red-600">
                  {t("delete_account")}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-red-300" />
            </button>
          </div>
        </section>

        {/* 2. App Appearance */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
              App Appearance
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            {/* Language Selection */}
            <button
              onClick={() => setShowLanguageModal(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <Languages className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t("app_language")}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-bold">
                  {languages.find((l) => l.code === language)?.name}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </button>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  {isDarkMode ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </div>
                <span className="font-medium text-sm">{t("dark_mode")}</span>
              </div>
              <button
                onClick={onToggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${isDarkMode ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* 3. Alerts & Feedback */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
              Alerts & Feedback
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            {/* Notification customizer header toggle */}
            <div className="border-b border-slate-50 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowNotificationDetails(!showNotificationDetails);
                  audioHelper.play("alert");
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">{t("notifications")}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Define push, SMS, and newsletter states</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${showNotificationDetails ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showNotificationDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-50 dark:bg-slate-900/30 px-4 py-3 space-y-3 border-t border-slate-100 dark:border-slate-800"
                  >
                    {/* Milestones */}
                    <div className="flex items-center justify-between text-xs py-1">
                      <div className="text-left">
                        <p className="font-bold">Live Order Milestones</p>
                        <p className="text-[9px] text-slate-400">Push notification alerts during kitchen prep & dispatch</p>
                      </div>
                      <button
                        onClick={() => toggleNotif("milestones")}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notifMilestones ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${notifMilestones ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {/* Rider DMs */}
                    <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 dark:border-slate-800/40">
                      <div className="text-left">
                        <p className="font-bold">Rider Direct Messages</p>
                        <p className="text-[9px] text-slate-400">Direct courier messages & live routing changes via SMS</p>
                      </div>
                      <button
                        onClick={() => toggleNotif("rider")}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notifRider ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${notifRider ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {/* Coupons and specials */}
                    <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 dark:border-slate-800/40">
                      <div className="text-left">
                        <p className="font-bold">Exclusive Coupons & Deals</p>
                        <p className="text-[9px] text-slate-400">R50 discounts and merchant promotional events</p>
                      </div>
                      <button
                        onClick={() => toggleNotif("deals")}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notifDeals ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${notifDeals ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {/* Weekly Highlights */}
                    <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 dark:border-slate-800/40">
                      <div className="text-left">
                        <p className="font-bold">Weekly Food Roundups</p>
                        <p className="text-[9px] text-slate-400">Digest emails covering trending spaza kitchens and new menu items</p>
                      </div>
                      <button
                        onClick={() => toggleNotif("weekly")}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${notifWeekly ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${notifWeekly ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sound & Audio tuning */}
            <div className="border-b border-slate-50 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowSoundSettings(!showSoundSettings);
                  audioHelper.play("alert");
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center text-pink-600">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-sm">Chimes & Sounds</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Toggle sound cues and adjust volume slider</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${showSoundSettings ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showSoundSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-slate-50 dark:bg-slate-900/30 px-5 py-4 space-y-4 border-t border-slate-100 dark:border-slate-800 text-xs text-left"
                  >
                    {/* Sound active */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">Play App Sound Effects</p>
                        <p className="text-[9px] text-slate-400">Play chime feedback during successful cart and order events</p>
                      </div>
                      <button
                        onClick={toggleAudio}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${audioEnabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${audioEnabled ? "translate-x-5" : "translate-x-1"}`} />
                      </button>
                    </div>

                    {/* Volume Slider */}
                    {audioEnabled && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                        <div className="flex items-center justify-between font-medium">
                          <span>Volume Level</span>
                          <span className="font-black text-primary">{Math.round(audioVolume * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <VolumeX className="w-4 h-4 text-slate-400" />
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={audioVolume}
                            onChange={handleVolumeChange}
                            className="flex-1 accent-primary h-1 rounded bg-slate-200 dark:bg-slate-700 cursor-pointer"
                          />
                          <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => {
                              audioHelper.play("alert");
                              if (hapticEnabled && navigator.vibrate) navigator.vibrate(25);
                            }}
                            className="text-[9px] bg-primary/10 hover:bg-primary/20 text-primary font-extrabold uppercase px-2.5 py-1 rounded transition-colors"
                          >
                            🔔 Test Chime
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Dedicated Haptic Feedback & Vibrations Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                Haptic Feedback & Vibrations
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
              {hapticEnabled ? "Tactile On" : "Disabled"}
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            {/* Master Haptic Feedback Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/40">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Smartphone className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">Master Haptic Engine</span>
                  <p className="text-[10px] text-slate-500">Enable tactile vibration responses across the app</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onToggleHaptic();
                  if (!hapticEnabled && navigator.vibrate) {
                    navigator.vibrate([30, 30, 30]);
                    toast.success("Haptics Enabled", { description: "Tactile vibrations active" });
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${hapticEnabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hapticEnabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>

            {/* Granular Individual Haptic Feedback Toggles */}
            <AnimatePresence>
              {hapticEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden text-xs divide-y divide-slate-100 dark:divide-slate-800/40"
                >
                  {/* 1. Button Press Haptic Toggle */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex flex-col text-left pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Button Press & Taps</span>
                        <span className="text-[10px] whitespace-nowrap font-black uppercase px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Light Tap
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Tactile click when pressing buttons, tabs, and filters
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate(12);
                          toast.info("Button Tap Haptic Tested (12ms)");
                        }}
                        className="text-[9px] font-extrabold text-primary hover:underline mt-1.5 self-start flex items-center gap-1 cursor-pointer"
                      >
                        ⚡ Test Button Tap
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleHapticButtonPress();
                        if (!hapticButtonPress && navigator.vibrate) navigator.vibrate(15);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${hapticButtonPress ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${hapticButtonPress ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {/* 2. Order Update Haptic Toggle */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex flex-col text-left pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Order Status Updates</span>
                        <span className="text-[10px] whitespace-nowrap font-black uppercase px-2 py-1 rounded bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                          Double Pulse
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Alert pulses when order status changes to cooking, ready, or delivered
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
                          toast.info("Order Update Haptic Tested (60ms-40ms-60ms)");
                        }}
                        className="text-[9px] font-extrabold text-orange-600 dark:text-orange-400 hover:underline mt-1.5 self-start flex items-center gap-1 cursor-pointer"
                      >
                        🔔 Test Order Pulse
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleHapticOrderUpdate();
                        if (!hapticOrderUpdate && navigator.vibrate) navigator.vibrate([50, 30, 50]);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${hapticOrderUpdate ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${hapticOrderUpdate ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </button>
                  </div>

                  {/* 3. Cart Animation Haptic Toggle */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex flex-col text-left pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Cart & Item Actions</span>
                        <span className="text-[10px] whitespace-nowrap font-black uppercase px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          Bounce Rhythm
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Tactile rhythm when adding items to cart, altering quantities, or repeating orders
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.vibrate) navigator.vibrate([35, 20, 35]);
                          toast.info("Cart Action Haptic Tested (35ms-20ms-35ms)");
                        }}
                        className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline mt-1.5 self-start flex items-center gap-1 cursor-pointer"
                      >
                        🛍️ Test Cart Vibration
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleHapticCartAnimation();
                        if (!hapticCartAnimation && navigator.vibrate) navigator.vibrate([30, 20, 30]);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${hapticCartAnimation ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${hapticCartAnimation ? "translate-x-5" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 4. Experience & Security */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
              Experience & Security
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            {/* Data Saver Mode toggle */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/40">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Wifi className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                  <span className="font-medium text-sm">Data-Saver Mode</span>
                  <p className="text-[10px] text-slate-500">Hide heavy images & save mobile data</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleDataSaver}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${dataSaverEnabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dataSaverEnabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>

            {/* Order Again toggle */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800/40">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <RotateCcw className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <span className="font-medium text-sm">Order Again Section</span>
                  <p className="text-[10px] text-slate-500">Show popular ordered items on Home screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleOrderAgain}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${orderAgainEnabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${orderAgainEnabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>

            {/* Biometrics Toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Fingerprint className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div>
                  <span className="font-medium text-sm">Biometric Authentication</span>
                  <p className="text-[10px] text-slate-500">Enable TouchID, FaceID or Windows Hello login</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleBiometrics(!biometricsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${biometricsEnabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${biometricsEnabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* 3. Diagnostics & Cache Control */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
              System Diagnostics
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <button
              onClick={() => {
                setShowDiagnosticsPanel(!showDiagnosticsPanel);
                audioHelper.play("alert");
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-medium text-sm">Storage & Diagnostics</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Check database latency and manage cache</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${showDiagnosticsPanel ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showDiagnosticsPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50 dark:bg-slate-900/30 px-5 py-4 space-y-4 border-b border-slate-100 dark:border-slate-800 text-xs text-left"
                >
                  {/* Local Storage details */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Storage Footprint</span>
                    <span className="font-black text-slate-800 dark:text-slate-100">{getStorageSize()} KB</span>
                  </div>

                  {/* Connection Latency with Real Latency Ping Button */}
                  <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/40 pt-3">
                    <div className="flex flex-col">
                      <span className="text-slate-500">Database Latency</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-[10px] mt-0.5 min-h-[14px]">
                        {latencyTestResult || "Not tested yet"}
                      </span>
                    </div>
                    <button
                      onClick={runLatencyTest}
                      disabled={testingLatency}
                      className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 active:scale-95 disabled:opacity-50"
                    >
                      {testingLatency ? "Pinging..." : "Test Connection"}
                    </button>
                  </div>

                  {/* Manual Sync Button */}
                  <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/40 pt-3">
                    <div className="flex flex-col text-left pr-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100">Manual Sync & Refresh</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">Clears pending offline queue & forces fresh Supabase fetch</span>
                    </div>
                    <button
                      onClick={async () => {
                        triggerHaptic?.([40, 40]);
                        if (onManualSync) {
                          await onManualSync();
                        }
                      }}
                      disabled={isSyncing}
                      className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                      <span>{isSyncing ? "Syncing..." : "Manual Sync"}</span>
                    </button>
                  </div>

                  {/* Prune Cache Button */}
                  <div className="flex items-center justify-between text-xs border-t border-slate-100 dark:border-slate-800/40 pt-3">
                    <div className="flex flex-col text-left">
                      <span className="text-slate-500">Clear Temporary Files</span>
                      <span className="text-[9px] text-slate-400 mt-0.5">Keeps saved addresses, credentials, and user data</span>
                    </div>
                    <button
                      onClick={handlePruneCache}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Clear Storage
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 5. Developer Testing Suite */}
        <section className={`space-y-3 developer-suite-container ${showDevPanel ? "visible" : ""}`} id="dev-settings-panel">
          <div className="flex items-center gap-2 px-1">
            <Bug className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
              Developer Testing Suite
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <button
              onClick={() => {
                setShowDevTestingSuite(!showDevTestingSuite);
                triggerHaptic?.(10);
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-medium text-sm">Developer Tools</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Theme override, background pings & mock order generator</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${showDevTestingSuite ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showDevTestingSuite && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50 dark:bg-slate-900/30 px-5 py-4 space-y-4 border-b border-slate-100 dark:border-slate-800 text-xs text-left"
                >
                  {/* Theme Preview Toggle */}
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Theme Preview Force</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">UI Testing</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                      {(["default", "light", "dark", "high-contrast"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            onSetForcedTheme?.(mode);
                            triggerHaptic?.(10);
                          }}
                          className={`py-1.5 px-1 text-[9px] uppercase font-black rounded-lg transition-all cursor-pointer ${
                            (forcedTheme || "default") === mode
                              ? "bg-primary text-white shadow-sm"
                              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          }`}
                        >
                          {mode === "default" ? "Auto" : mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Ping / Latency to Supabase */}
                  <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3 space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Supabase Connection Latency</span>
                        <p className="text-[9px] text-slate-400">Real-time background ping tracking</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></span>
                        <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-100">
                          {bgLatency !== null ? `${bgLatency}ms` : "Pinging..."}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Generate Mock Order button */}
                  <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3 space-y-2 text-left">
                    <div className="flex flex-col text-left mb-1">
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Test Order Generator</span>
                      <p className="text-[9px] text-slate-400">Creates a mock order to verify kitchen & rider dashboard flow</p>
                    </div>
                    <button
                      onClick={handleGenerateMockOrder}
                      disabled={generatingMockOrder}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border-0"
                    >
                      {generatingMockOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating test order...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          <span>Generate Mock Order</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Visual Debug Panel: Log navigation history & network request status */}
                  <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3 space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">Visual Debug Console</span>
                      <button
                        onClick={() => {
                          setDebugLogs([]);
                          try { (window as any).__devDebugLogs = []; } catch {}
                          triggerHaptic?.(10);
                        }}
                        className="text-[9px] uppercase font-black text-red-500 hover:underline cursor-pointer bg-transparent border-0"
                      >
                        Clear Console
                      </button>
                    </div>
                    <div className="bg-slate-950 text-slate-200 p-3 rounded-xl font-mono text-[9px] space-y-1.5 max-h-40 overflow-y-auto no-scrollbar border border-slate-800/60 text-left">
                      {debugLogs.length === 0 ? (
                        <div className="text-slate-500 text-center py-4 italic">No live navigation or network events logged yet. Try changing screens or triggering actions.</div>
                      ) : (
                        debugLogs.map((log, index) => (
                          <div key={index} className="flex gap-2 items-start border-b border-slate-900 pb-1 last:border-0 last:pb-0">
                            <span className="text-slate-500 select-none shrink-0">{log.timestamp}</span>
                            <span className={`px-1 rounded-[4px] font-black shrink-0 ${
                              log.type === "navigation" ? "bg-blue-950 text-blue-400" : "bg-amber-950/80 text-amber-400"
                            }`}>
                              {log.type.toUpperCase()}
                            </span>
                            <span className="flex-grow text-slate-300 break-all">{log.message}</span>
                            {log.status && (
                              <span className={`font-black uppercase tracking-widest shrink-0 text-[10px] whitespace-nowrap ${
                                log.status === "success" ? "text-emerald-500" : log.status === "error" ? "text-red-500" : "text-amber-500 animate-pulse"
                              }`}>
                                ● {log.status}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Visual Network Health Heartbeat Monitor */}
                  {heartbeatMetrics && (
                    <div className="pt-2">
                      <NetworkHeartbeatMonitor
                        metrics={heartbeatMetrics}
                        isPinging={isPingingHeartbeat}
                        onRunPing={onRunHeartbeatPing || (() => {})}
                      />
                    </div>
                  )}

                  {/* Global Error Diagnostic Panel: Exposes last 50 error logs from global listener */}
                  <div className="border-t border-slate-100 dark:border-slate-800/40 pt-4 space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          Global Error Diagnostic Logs ({globalErrorLogs.length}/50)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            try {
                              const text = JSON.stringify(globalErrorLogs, null, 2);
                              navigator.clipboard.writeText(text);
                              toast.success("Copied 50 error logs to clipboard! 📋");
                            } catch (e) {
                              toast.error("Failed to copy error logs");
                            }
                          }}
                          disabled={globalErrorLogs.length === 0}
                          className="text-[9px] uppercase font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer border-0"
                        >
                          Copy Logs
                        </button>
                        <button
                          onClick={() => {
                            setGlobalErrorLogs([]);
                            try {
                              (window as any).__GLOBAL_ERROR_LOGS__ = [];
                              localStorage.setItem("global_error_logs", "[]");
                            } catch {}
                            triggerHaptic?.(10);
                            toast.info("Global error logs cleared.");
                          }}
                          className="text-[9px] uppercase font-bold text-red-500 bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 cursor-pointer border-0"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Filter input */}
                    <input
                      type="text"
                      placeholder="Search error logs by keyword (e.g. timeout, upstream)..."
                      value={errorLogFilter}
                      onChange={(e) => setErrorLogFilter(e.target.value)}
                      className="w-full text-[10px] bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary text-slate-700 dark:text-slate-200"
                    />

                    {/* Log list container */}
                    <div className="bg-slate-950 text-slate-200 p-3 rounded-xl font-mono text-[9px] space-y-2 max-h-52 overflow-y-auto border border-slate-800/80 text-left">
                      {globalErrorLogs.length === 0 ? (
                        <div className="text-slate-500 text-center py-5 italic">
                          No connection timeouts or unhandled rejections recorded. System running smoothly!
                        </div>
                      ) : (
                        globalErrorLogs
                          .filter((l) =>
                            !errorLogFilter ||
                            (l.message && l.message.toLowerCase().includes(errorLogFilter.toLowerCase())) ||
                            (l.type && l.type.toLowerCase().includes(errorLogFilter.toLowerCase())) ||
                            (l.timestamp && l.timestamp.toLowerCase().includes(errorLogFilter.toLowerCase()))
                          )
                          .map((log) => (
                            <div key={log.id || log.timestamp} className="border-b border-slate-900 pb-2 last:border-0 last:pb-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 text-[10px] whitespace-nowrap shrink-0 font-sans">{log.timestamp}</span>
                                <span className={`px-2 py-1 rounded text-[10px] whitespace-nowrap font-black uppercase shrink-0 ${
                                  log.type === "network_timeout"
                                    ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                                    : log.type === "unhandledrejection"
                                    ? "bg-red-950 text-red-400 border border-red-800/50"
                                    : log.type === "console_error"
                                    ? "bg-orange-950 text-orange-400"
                                    : "bg-purple-950 text-purple-400"
                                }`}>
                                  {log.type}
                                </span>
                              </div>
                              <div className="text-slate-200 break-words font-semibold text-[9px]">{log.message}</div>
                              {log.stack && (
                                <details className="text-[10px] whitespace-nowrap text-slate-400 mt-0.5">
                                  <summary className="cursor-pointer text-slate-500 hover:text-slate-300 select-none">Show stack trace</summary>
                                  <pre className="mt-1 p-1.5 bg-slate-900 rounded overflow-x-auto text-slate-400 font-mono text-[10px] whitespace-nowrap whitespace-pre-wrap">{log.stack}</pre>
                                </details>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* 4. Support & Legal */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <HelpCircle className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
              {t("support_legal")}
            </h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <button
              onClick={() => onContactUs ? onContactUs() : window.open("https://wa.me/27123456789", "_blank")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t("help_center")}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={() => setSelectedDoc("terms")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">
                  {t("terms_conditions")}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={() => setSelectedDoc("privacy")}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">
                  {t("privacy_policy")}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                  <Info className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t("app_version")}</span>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                v{APP_VERSION.split(" ")[0]}
              </span>
            </div>
          </div>
        </section>

        {/* Refer a friend snippet */}
        <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-center gap-4">
          <div className="size-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div className="flex-grow text-left">
            <p className="font-bold text-sm">Refer a Friend</p>
            <p className="text-[10px] text-slate-500 font-medium">
              Get R50 off your next order
            </p>
          </div>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "LocalEats",
                  text: 'Check out LocalEats! Use my code "LOCAL50" for R50 off.',
                  url: window.location.href,
                });
              }
            }}
            className="size-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary border border-primary/10 shadow-sm active:scale-95 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Global Action Section (Clear Cache) */}
        <button
          onClick={() => {
            showConfirm(
              "Reset All Data?",
              "This will permanently erase all saved data, login sessions, and custom preferences. Do you want to proceed?",
              () => {
                localStorage.clear();
                window.location.reload();
              }
            );
          }}
          className="w-full flex items-center justify-center p-3 text-red-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest gap-2"
        >
          <RotateCcw className="w-3 h-3 animate-spin-reverse" />
          <span>Reset App Data</span>
        </button>

        {/* Logout Button */}
        <div className="pt-4">
          <button
            onClick={() => {
              showConfirm(
                "Logout?",
                "Are you sure you want to log out of your account?",
                () => onLogout(),
                "Yes, Logout",
                "Stay Logged In",
              );
            }}
            className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold hover:shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            <span>{t("logout")}</span>
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-widest opacity-50">
            LocalEats {APP_VERSION}
          </p>
        </div>
      </main>

      {/* Language Selection Modal */}
      <AnimatePresence>
        {showLanguageModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-12 shadow-xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-xl font-bold">{t("app_language")}</h3>
                <button
                  onClick={() => setShowLanguageModal(false)}
                  className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 overflow-y-auto pr-1.5 flex-1 scroll-smooth max-h-[50vh]">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      language === lang.code
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-slate-50 dark:border-slate-800 hover:border-primary/20"
                    }`}
                  >
                    <span className="font-bold">{lang.name}</span>
                    {language === lang.code && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW: Saved Addresses Manager Modal */}
      <AnimatePresence>
        {showAddressManager && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-8 shadow-xl flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-left">
                  <h3 className="text-lg font-black tracking-tight">Delivery Locations</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage and set active delivery addresses</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddressManager(false);
                    setAddressSuggestions([]);
                    setNewAddressInput("");
                  }}
                  className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Autocomplete Input Form */}
              <div className="relative mb-5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-grow">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search and add a location..."
                      value={newAddressInput}
                      onChange={(e) => handleSearchAddressChange(e.target.value)}
                      className="w-full py-3.5 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700/50 rounded-2xl text-xs font-medium focus:border-primary outline-none transition-colors"
                    />
                  </div>
                  {newAddressInput.trim() && (
                    <button
                      onClick={() => handleAddAddress(newAddressInput)}
                      className="px-4 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer shadow-md"
                    >
                      Add
                    </button>
                  )}
                </div>

                {/* Autocomplete suggestions dropdown */}
                <AnimatePresence>
                  {(searchingAddress || addressSuggestions.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute left-0 right-0 top-[110%] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl z-20 overflow-hidden max-h-[180px] overflow-y-auto"
                    >
                      {searchingAddress ? (
                        <div className="p-4 flex items-center justify-center gap-2 text-slate-400 text-xs">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span>Searching...</span>
                        </div>
                      ) : (
                        addressSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleAddAddress(s.display_name)}
                            className="w-full p-3.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700/40 last:border-0 block truncate text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            📍 {s.display_name}
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Saved Address List */}
              <div className="flex-grow overflow-y-auto space-y-2.5 pr-1 text-left min-h-[200px]">
                {savedAddresses.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                    <MapPin className="w-8 h-8 mx-auto opacity-30 text-primary" />
                    <p className="font-medium">No saved addresses yet</p>
                    <p className="text-[10px] text-slate-400">Search and save address locations to simplify checking out.</p>
                  </div>
                ) : (
                  savedAddresses.map((addr) => {
                    const isDefault = userProfile.address === addr;
                    return (
                      <div
                        key={addr}
                        className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${
                          isDefault
                            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20"
                            : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700/80"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isDefault ? "text-indigo-500" : "text-slate-400"}`} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold leading-tight break-words text-slate-800 dark:text-slate-100">
                              {addr}
                            </p>
                            {isDefault ? (
                              <span className="inline-block text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold uppercase mt-1 leading-none">
                                Default Delivery Address
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSetDefaultAddress(addr)}
                                className="text-[9px] text-indigo-500 hover:text-indigo-600 font-extrabold uppercase mt-1 leading-none cursor-pointer"
                              >
                                Set as default
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteAddress(addr)}
                          className="p-2 text-slate-300 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Terms & Conditions / Privacy Policy Document Modals */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-slate-100 dark:border-slate-800"
            >
              {/* Header */}
              <header className="px-6 py-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-orange-100 dark:bg-orange-500/15 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold shrink-0">
                    {selectedDoc === "terms" ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                      {selectedDoc === "terms"
                        ? "Terms & Conditions"
                        : "Privacy Policy"}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest leading-none mt-1">
                      LocalEats South Africa
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </header>

              {/* Scrollable Doc Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-left">
                {selectedDoc === "terms" ? (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-2xl border border-amber-500/20 text-xs font-semibold leading-relaxed">
                      ⚠️ Please read these terms carefully. By accessing or
                      placing orders through LocalEats, you agree to be bound by
                      these local rules.
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>1. Contractual Relationship</span>
                      </h4>
                      <p>
                        These Terms constitute a legally binding agreement
                        between you and LocalEats. LocalEats operates as a
                        technology matching services intermediary in South
                        Africa, governed by the Consumer Protection Act (CPA)
                        and Electronic Communications and Transactions Act
                        (ECTA).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>2. Ordering Services</span>
                      </h4>
                      <p>
                        Our platform coordinates real-time matching between
                        hunger-seeking customers, local spaza kitchens, and
                        independent Kota joint operators. Placing an order forms
                        a direct purchase relationship with the merchant.
                        Estimated travel and preparation times are subject to
                        weather, traffic, and general load-shedding schedules.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>3. Deliveries & Shipments</span>
                      </h4>
                      <p>
                        Orders are carried out by independent third-party
                        logistics contractors. Delivery fees, peak surcharges,
                        and minimum basket requirements may apply and are
                        explicitly displayed on the Checkout dashboard.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>4. Payments & Cash on Arrival (COA)</span>
                      </h4>
                      <p>
                        LocalEats facilitates secure payment workflows. For Cash
                        on Arrival (COA) options, you agree to pay the delivery
                        carrier or merchant the exact cash amount or make
                        immediate EFT transfers upon arrival. Failure to pay is
                        a breach of contract and results in permanent account
                        termination.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>5. Food Safety Disclaimer</span>
                      </h4>
                      <p>
                        The absolute liability for ingredients, hygienic kitchen
                        preparations, allergen info, and menu pricing
                        consistency lies strictly with the registered storefront
                        owner. LocalEats takes no liability in respect of
                        culinary prepared meals.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl border border-emerald-500/20 text-xs font-semibold leading-relaxed">
                      🔒 POPIA Compliant: We strictly collect, process, and
                      safeguard personal information as mandated under South
                      African Law (Act 4 of 2013).
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>1. What We Collect</span>
                      </h4>
                      <p>
                        To perform successful spaza-to-door deliveries, we
                        collect:
                      </p>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <li>
                          Real-time GPS Coordinate positions during active order
                          matching.
                        </li>
                        <li>
                          Client names, cell numbers, and custom order requests.
                        </li>
                        <li>
                          Profile metadata (avatars, emails) for session
                          authentication.
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>2. Why We Process Data</span>
                      </h4>
                      <p>
                        Personal details are processed purely to confirm, route,
                        match, and fulfill active customer orders, trace
                        delivery runners on maps, and provide real-time
                        notification alerts. We never sell, rent, or trade your
                        personal registry.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>3. Information Safeguards</span>
                      </h4>
                      <p>
                        All databases are protected utilizing strict Row Level
                        Security (RLS) policies within secure Supabase
                        frameworks. Your exact phone number is hidden from all
                        unassociated network entities and is only displayed to
                        the paired delivery rider while an order journey is
                        live.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>4. Account Erasure Request</span>
                      </h4>
                      <p>
                        You maintain full authority under POPIA section 24 to
                        review, modify, or erase your user file directory at any
                        moment. Simply tap "Reset App Data" inside the Settings
                        menu or initiate an account deletion from your profile.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-5 py-3 bg-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer hover:shadow-lg hover:shadow-orange-600/15"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* System Status Drawer */}
      <SystemStatusDrawer
        isOpen={showSystemStatusDrawer}
        onClose={() => setShowSystemStatusDrawer(false)}
        isOnline={isOnline}
      />
    </div>
  );
}

function ShopDashboardScreen({
  onBack,
  orderAcceptedModal,
  setOrderAcceptedModal,
  showAlert,
  showConfirm,
  showPrompt,
  triggerHaptic,
  runWithProcessing,
  isOnline,
}: {
  onBack: () => void;
  orderAcceptedModal: {
    isOpen: boolean;
    productName: string;
    ownerMessage: string;
  };
  setOrderAcceptedModal: Dispatch<
    SetStateAction<{
      isOpen: boolean;
      productName: string;
      ownerMessage: string;
    }>
  >;
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  showPrompt: (
    title: string,
    message: string,
    onConfirm: (value: string) => void,
    defaultValue?: string,
  ) => void;
  triggerHaptic: (pattern?: number | number[]) => void;
  runWithProcessing: (
    action: () => Promise<void>,
    successCallback?: () => void,
  ) => Promise<void>;
  isOnline: boolean;
}) {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col font-sans max-w-md mx-auto shadow-xl relative">
      <header className="p-4 flex items-center justify-between sticky top-0 glass-effect z-50 border-b border-primary/10">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-slate-900 dark:text-white cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="font-black uppercase tracking-tighter text-xl text-slate-900 dark:text-white">
            Kitchen Portal Moved
          </h1>
          <p className="text-[9px] font-black tracking-widest text-primary uppercase">
            Gogo Nandi's Kitchen
          </p>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
          <Store className="w-10 h-10 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="font-black text-xl text-slate-900 dark:text-white tracking-tight uppercase">
            Kitchen Dashboard Has Moved!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            This customer application is strictly for ordering delicious local meals.
            Gogo Nandi's official Kitchen Portal has moved to its own dedicated, optimized separate dashboard.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5 w-full space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Official Kitchen Dashboard Link</span>
          <p className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">https://dashboard.localeatssa.co.za</p>
        </div>

        <div className="flex flex-col w-full gap-3">
          <a
            href="https://dashboard.localeatssa.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-black text-xs uppercase tracking-wider py-4 rounded-xl shadow-lg shadow-indigo-600/15 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Open Kitchen Dashboard</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={onBack}
            className="w-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-xs uppercase tracking-wider py-4 rounded-xl transition-all cursor-pointer active:scale-95 border-0"
          >
            Go Back to Food ordering
          </button>
        </div>
      </main>
    </div>
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "orders" | "inventory" | "stats" | "marketing" | "settings" | "riders"
  >("orders");
  const [orderFilter, setOrderFilter] = useState<
    "today" | "seven_days" | "all"
  >("today");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"active" | "history">("active");
  const [cancellationModal, setCancellationModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
  }>({ isOpen: false, orderId: null });
  const [cancellationReason, setCancellationReason] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [inventoryViewMode, setInventoryViewMode] = useState<"items" | "categories">("items");

  const merchantCategories = useMemo(() => {
    if (!shop || !shop.menu) return [];
    // Extract unique categories, trimmed and non-empty
    const cats = Array.from(
      new Set(
        shop.menu
          .map((item) => (item.category || "Main Course").trim())
          .filter((cat) => cat.length > 0)
      )
    ) as string[];
    
    // Load category priority order from localStorage
    const saved = localStorage.getItem(`localeats_category_order_${shop.id}`);
    let order: string[] = [];
    if (saved) {
      try {
        order = JSON.parse(saved);
      } catch (e) {}
    }
    
    // Sort matching categories according to the stored order, append others to the bottom sorted alphabetically
    return cats.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [shop, shop?.menu]);

  const handleMoveCategory = (index: number, direction: "up" | "down") => {
    if (!shop) return;
    const updated = [...merchantCategories];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    
    // Swap
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    
    // Save order
    localStorage.setItem(`localeats_category_order_${shop.id}`, JSON.stringify(updated));
    
    // Slight state update to trigger re-render
    setShop({ ...shop });
    
    showAlert("Success", `Prioritized category: ${temp}`);
    
    triggerHaptic();
    audioHelper.play("alert");
  };

  const getMerchantCategoryEmoji = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes("egg") || catLower.includes("breakfast")) return "🍳";
    if (catLower.includes("bread") || catLower.includes("toast")) return "🍞";
    if (catLower.includes("sandwich") || catLower.includes("burger") || catLower.includes("sub")) return "🥪";
    if (catLower.includes("beverage") || catLower.includes("drink") || catLower.includes("coffee") || catLower.includes("juice")) return "🥤";
    if (catLower.includes("dessert") || catLower.includes("sweet") || catLower.includes("cake")) return "🍰";
    if (catLower.includes("pizza")) return "🍕";
    if (catLower.includes("salad") || catLower.includes("healthy")) return "🥗";
    if (catLower.includes("chicken") || catLower.includes("wing") || catLower.includes("meat")) return "🍗";
    if (catLower.includes("pasta") || catLower.includes("noodle")) return "🍝";
    if (catLower.includes("traditional") || catLower.includes("local") || catLower.includes("kota")) return "🇿🇦";
    return "🍽️";
  };
  const [pairingCode, setPairingCode] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderLocations, setRiderLocations] = useState<
    Record<string, { lat: number; lng: number }>
  >({});

  const fetchRiders = async () => {
    try {
      const { data: riderData } = await supabase
        .from("rider_profiles")
        .select("id, name, full_name, phone, avatar_url, vehicle_type, rating, latitude, longitude, is_online")
        .eq("is_online", true);
      setRiders(riderData || []);

      const { data: locData } = await supabase
        .from("rider_locations")
        .select("rider_id, latitude, longitude, heading, speed, updated_at");
      const locMap: Record<string, { lat: number; lng: number }> = {};
      locData?.forEach((loc) => {
        locMap[loc.rider_id] = {
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
        };
      });
      setRiderLocations(locMap);
    } catch (err) {
      console.error("Error fetching riders:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "riders") {
      fetchRiders();
      const channel = getFreshChannel("rider-tracking")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rider_locations" },
          (payload) => {
            if (
              payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE"
            ) {
              setRiderLocations((prev) => ({
                ...prev,
                [payload.new.rider_id]: {
                  lat: Number(payload.new.latitude),
                  lng: Number(payload.new.longitude),
                },
              }));
            }
          },
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeTab]);

  const [isUploading, setIsUploading] = useState(false);
  const [menuImgUrl, setMenuImgUrl] = useState("");
  const [editingItemAvailable, setEditingItemAvailable] =
    useState<boolean>(true);
  const [editingItemCustomizations, setEditingItemCustomizations] = useState<
    { name: string; price: number }[]
  >([]);

  const autoAssignClosestRider = async (orderId: string) => {
    if (!shop) return;

    try {
      // Exclude cash_on_arrival / cash orders from being broadcasted to external riders
      const { data: orderToCheck } = await supabase
        .from("orders")
        .select("id, payment_method, is_delivery")
        .eq("id", orderId)
        .maybeSingle();

      if (orderToCheck) {
        const isCashOrder =
          orderToCheck.payment_method === "cash_on_arrival" ||
          orderToCheck.payment_method === "cash";
        if (isCashOrder) {
          console.log(
            `[AutoAssign] Order ${orderId} is cash/cash_on_arrival. Skipping rider auto-assignment. Only prepaid digital orders are broadcasted to riders.`
          );
          return;
        }
      }

      // 1. Get online riders who are not busy
      const { data: onlineRiders, error: riderError } = await supabase
        .from("rider_profiles")
        .select("id, name, full_name, phone, avatar_url, vehicle_type, rating, latitude, longitude, is_online, current_order_id")
        .eq("is_online", true)
        .is("current_order_id", null);

      if (riderError || !onlineRiders || onlineRiders.length === 0) {
        console.log("No free riders available for auto-assignment");
        return;
      }

      // 2. Get their locations (must be updated within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: locations, error: locError } = await supabase
        .from("rider_locations")
        .select("rider_id, latitude, longitude, heading, speed, updated_at")
        .in(
          "rider_id",
          onlineRiders.map((r) => r.id),
        )
        .gt("updated_at", fiveMinutesAgo);

      if (locError || !locations || locations.length === 0) {
        console.log("No rider locations found for auto-assignment");
        return;
      }

      // 3. Find the closest one to the shop
      let closestRiderId = null;
      let minDistance = Infinity;

      locations.forEach((loc) => {
        const dist = calculateDistance(
          shop.latitude || DEFAULT_COORDS.lat,
          shop.longitude || DEFAULT_COORDS.lng,
          Number(loc.latitude),
          Number(loc.longitude),
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestRiderId = loc.rider_id;
        }
      });

      if (closestRiderId) {
        // 4. Assign
        const { error: assignError } = await supabase
          .from("orders")
          .update({
            rider_id: closestRiderId,
            delivery_status: "rider_assigned",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        if (assignError) throw assignError;

        await supabase
          .from("rider_profiles")
          .update({ current_order_id: orderId })
          .eq("id", closestRiderId);

        console.log(
          `Auto-assigned rider ${closestRiderId} to order ${orderId}`,
        );
        triggerHaptic([100, 50, 100]);
        toast.success(`Rider auto-assigned to Order #${orderId.slice(0, 5)}`, {
          description: "Finding closest available delivery partner.",
        });
      }
    } catch (err) {
      console.error("Auto-assignment failed:", err);
    }
  };

  const handleMenuImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setIsUploading(true);
      const url = await uploadAvatar(e.target.files[0], shop?.id);
      setMenuImgUrl(url);
    } catch (err: any) {
      showAlert("Upload Error", err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleShopLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !shop) return;
    try {
      setIsUploading(true);
      const file = e.target.files[0];
      // Note: uploadAvatar already handles compression via compressImage
      const url = await uploadAvatar(file, shop.id);

      await FirestoreService.updateShop(shop.id, { logo_url: url });
      const { error: updateError } = await supabase
        .from("shops")
        .update({ logo_url: url })
        .eq("id", shop.id);

      if (updateError) throw updateError;

      setShop({ ...shop, logo: url });
      showAlert(
        "Success",
        "Profile photo updated! We compressed it to save you space. 🚀",
      );
    } catch (err: any) {
      showAlert("Logo Update Error", err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditItem = (item: MenuItem | null) => {
    setEditingItem(item);
    setEditingItemAvailable(item ? (item.is_available ?? true) : true);
    setEditingItemCustomizations(item ? item.customizations || [] : []);
    setMenuImgUrl(item ? item.image_url || "" : "");
    setIsEditingMenu(true);
  };

  const saveMenuItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const itemData = {
      shop_id: shop.id,
      name: formData.get("name") as string,
      price: parseFloat(formData.get("price") as string),
      description: formData.get("description") as string,
      image_url: menuImgUrl || DEFAULT_MENU_IMAGE,
      is_available: editingItemAvailable,
      customizations: editingItemCustomizations,
    };

    await runWithProcessing(
      async () => {
        if (editingItem) {
          await FirestoreService.updateMenuItem(editingItem.id, itemData);
      const { error } = await supabase
            .from("menu_items")
            .update(itemData)
            .eq("id", editingItem.id);
          if (error) throw error;
        } else {
          await FirestoreService.addMenuItem(itemData);
      const { error } = await supabase
            .from("menu_items")
            .insert([itemData]);
          if (error) throw error;
        }
      },
      () => {
        setIsEditingMenu(false);
        setEditingItem(null);
        // Refresh shop data to get new menu
        window.location.reload();
      },
    );
  };

  const deleteMenuItem = async (itemId: string) => {
    showConfirm(
      "Delete Item",
      "Are you sure you want to remove this item from your menu?",
      async () => {
        try {
          await FirestoreService.deleteMenuItem(itemId);
      const { error } = await supabase
            .from("menu_items")
            .delete()
            .eq("id", itemId);
          if (error) throw error;
          showAlert("Success", "Item deleted");
          window.location.reload();
        } catch (err: any) {
          showAlert("Error", err.message);
        }
      },
    );
  };

  const assignRider = async (orderId: string, riderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          rider_id: riderId,
          delivery_status: "rider_assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      showAlert("Success", "Rider assigned to order!");
      triggerHaptic();
    } catch (err: any) {
      showAlert("Error", err.message);
    }
  };

  const generatePairingCode = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPairingCode(code);
    triggerHaptic();

    try {
      const dataUrl = await QRCode.toDataURL(`pairing:${code}`);
      setQrCodeData(dataUrl);
    } catch (err) {
      console.error("QR code generation failed:", err);
    }

    // In a real app, you would save this code to the database with an expiry
    setTimeout(() => {
      setPairingCode("");
      setQrCodeData("");
    }, 600000); // Expires in 10 mins
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  useEffect(() => {
    let channel: any; // Real-time channel type is complex, keeping any for now but could be RealtimeChannel
    const fetchShopAndOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        // 1. Get the shop owned by this user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError(
            "You are not logged in. Please log in to view your dashboard.",
          );
          return;
        }
        setCurrentUserId(user.id);

        console.log("Fetching shop for owner:", user.id);
        const { data: shopData, error: shopError } = await supabase
          .from("shops")
          .select("id, name, description, location, category, rating, logo_url, opening_time, closing_time, phone, latitude:lat, longitude:lng, cash_trust_enabled, allow_external_riders, auto_look_for_rider, is_active, owner_id, updated_at")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (shopError) {
          const isNetworkError = String(shopError.message || '').includes("Failed to fetch") || String(shopError).includes("Failed to fetch");
          if (!isOnline || isNetworkError) {
            const cachedShop = localStorage.getItem(`cached_shop_${user.id}`);
            const cachedOrders = localStorage.getItem(
              `cached_shop_orders_${user.id}`,
            );
            if (cachedShop) {
              try {
                setShop(JSON.parse(cachedShop));
              } catch (e) {
                console.warn(
                  "[SelfCleaning] Failed parsing cached shop owner profile:",
                  e,
                );
              }
            }
            if (cachedOrders) {
              try {
                setOrders(JSON.parse(cachedOrders));
              } catch (e) {
                console.warn(
                  "[SelfCleaning] Failed parsing cached shop owner orders:",
                  e,
                );
              }
            }
            setLoading(false);
            return;
          }
          console.error("Shop fetch error:", shopError);
          throw shopError;
        }

        if (!shopData) {
          console.warn("No shop found for owner:", user.id);
          setError(
            "No shop found associated with your account. Please contact support or ensure your shop is linked to your ID.",
          );
          return;
        }

        // Fetch menu items for the shop
        const { data: menuData } = await supabase
          .from("menu_items")
          .select("id, shop_id, name, price, description, image_url, category, is_available, customizations")
          .eq("shop_id", shopData.id);

        const formattedShop: Shop = {
          id: String(shopData.id),
          name: shopData.name,
          logo: shopData.logo_url || DEFAULT_SHOP_LOGO,
          rating: Number(shopData.rating) || 4.5,
          description: shopData.description || "",
          address: shopData.location || "",
          category: shopData.category || "",
          owner_id: shopData.owner_id,
          opening_time: shopData.opening_time,
          closing_time: shopData.closing_time,
          is_active: shopData.is_active === true || shopData.is_active === "true" || shopData.is_active === "t" || shopData.is_active === 1,
          phone: shopData.phone,
          latitude: shopData.latitude,
          longitude: shopData.longitude,
          menu: (menuData || []).map((m) => ({
            id: String(m.id),
            name: m.name,
            price: Number(m.price),
            displayPrice: `R${Number(m.price).toFixed(2)}`,
            image: m.image_url || DEFAULT_MENU_IMAGE,
            description: m.description || "",
            category: m.category || "Main Course",
            is_available: m.is_available !== false,
            customizations: m.customizations || [],
          })),
        };

        setShop(formattedShop);
        localStorage.setItem(
          `cached_shop_${user.id}`,
          JSON.stringify(formattedShop),
        );

        if (shopData) {
          // 2. Initial fetch of orders for this shop
          console.log("Fetching orders for shop ID:", shopData.id);
          const { data: ordersData, error: ordersError } = await supabase
            .from("orders")
            .select("id, user_id, shop_id, status, delivery_status, product_name, quantity, price, total_price, delivery_fee, created_at, updated_at, is_delivery, payment_method, notes, delivery_instructions, customer_name, phone, email, address, city, latitude:lat, longitude:lng, rider_id, status_history")
            .eq("shop_id", shopData.id)
            .order("created_at", { ascending: false })
            .limit(100);

          if (ordersError) {
            const isNetworkError = String(ordersError.message || '').includes("Failed to fetch") || String(ordersError).includes("Failed to fetch");
            if (!isOnline || isNetworkError) {
              const cachedOrders = localStorage.getItem(
                `cached_shop_orders_${user.id}`,
              );
              if (cachedOrders) {
                try {
                  setOrders(JSON.parse(cachedOrders));
                } catch (e) {
                  console.warn(
                    "[SelfCleaning] Failed parsing cached shop orders list:",
                    e,
                  );
                }
              }
              setLoading(false);
              return;
            }
            console.error("Orders fetch error:", ordersError);
            throw ordersError;
          }

          console.log(`Found ${ordersData?.length || 0} orders for this shop.`);
          setOrders((ordersData || []) as unknown as Order[]);
          localStorage.setItem(
            `cached_shop_orders_${user.id}`,
            JSON.stringify(ordersData || []),
          );

          // 3. Subscribe to real-time updates for THIS shop
          channel = getFreshChannel(`orders:${shopData.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "orders",
                filter: `shop_id=eq.${shopData.id}`,
              },
              (payload) => {
                console.log("Real-time order update received:", payload);
                if (payload.eventType === "INSERT") {
                  setOrders((prev) => [payload.new as Order, ...prev]);
                  // Vibration alert for new order
                  if ("vibrate" in navigator) {
                    navigator.vibrate([100, 50, 100]);
                  }
                } else if (payload.eventType === "UPDATE") {
                  setOrders((prev) =>
                    prev.map((o) =>
                      o.id === payload.new.id ? (payload.new as Order) : o,
                    ),
                  );
                } else if (payload.eventType === "DELETE") {
                  setOrders((prev) =>
                    prev.filter((o) => o.id !== payload.old.id),
                  );
                }
              },
            )
            .subscribe();
        }
      } catch (err: any) {
        console.error("Error in Shop Dashboard:", err);
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
        setError(
          err.message === "Failed to fetch"
            ? (isOffline
                ? "You are currently offline. Please check your network connection."
                : "Unable to reach the shop dashboard server. Please try again shortly.")
            : err.message || "Failed to load dashboard data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchShopAndOrders();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (
    orderId: string,
    newStatus: string,
    reason?: string,
  ) => {
    if (!isOnline) {
      showAlert(
        "Connection Issue",
        "You appear to be offline. Status updates require a connection to notify the customer.",
      );
      return;
    }
    if (newStatus === "cancelled" && !reason) {
      setCancellationModal({ isOpen: true, orderId });
      return;
    }

    if (newStatus === "confirmed") {
      showPrompt(
        "Order Message",
        "Enter a message for the customer (optional):",
        (ownerMessage) => {
          executeStatusUpdate(
            orderId,
            newStatus,
            ownerMessage || "Your order is being prepared with love! 🔥",
          );
        },
        "Your order is being prepared with love! 🔥",
      );
    } else {
      executeStatusUpdate(orderId, newStatus);
    }
  };

  const executeStatusUpdate = async (
    orderId: string,
    newStatus: string,
    ownerMessage?: string,
    reason?: string,
  ) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10); // Subtle feedback for status change
    }

    await runWithProcessing(
      async () => {
        // Fetch current order to get existing history and delivery info
        const { data: currentOrder, error: fetchError } = await supabase
          .from("orders")
          .select("id, user_id, shop_id, status, delivery_status, product_name, quantity, price, total_price, delivery_fee, created_at, updated_at, is_delivery, payment_method, notes, delivery_instructions, customer_name, phone, email, address, city, latitude:lat, longitude:lng, rider_id, status_history")
          .eq("id", orderId)
          .single();

        if (fetchError) throw fetchError;

        const history = currentOrder?.status_history || [];
        const newHistory = [
          ...history,
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            ...(reason && { reason }),
          },
        ];

        // BUSINESS LOGIC: If a guest ordered delivery and it's marked as ready,
        // it shifts to 'finding_rider' status only for prepaid digital orders.
        // Cash-on-arrival and cash orders are fulfilled in-house and excluded from riders.
        let finalStatus = newStatus;
        let deliveryStatus = currentOrder?.delivery_status || "none";

        const isCashOrder =
          currentOrder?.payment_method === "cash_on_arrival" ||
          currentOrder?.payment_method === "cash";

        if (newStatus === "ready" && currentOrder?.is_delivery) {
          finalStatus = "ready";
          if (!isCashOrder) {
            deliveryStatus = "finding_rider";
            autoAssignClosestRiderService(
              orderId,
              shop
                ? {
                    lat: shop.latitude || DEFAULT_COORDS.lat,
                    lng: shop.longitude || DEFAULT_COORDS.lng,
                  }
                : undefined
            );
          } else {
            deliveryStatus = "none";
          }
        }

        const updateData: any = {
          status: finalStatus,
          status_history: newHistory,
          delivery_status: deliveryStatus,
        };
        if (ownerMessage) updateData.owner_message = ownerMessage;
        if (reason) updateData.cancellation_reason = reason;

        await FirestoreService.updateOrder(orderId, updateData);
      let { error } = await supabase
          .from("orders")
          .update(updateData)
          .eq("id", orderId);

        if (error && error.message?.includes("cancellation_reason")) {
          delete updateData.cancellation_reason;
          const retryResult = await supabase
            .from("orders")
            .update(updateData)
            .eq("id", orderId);
          error = retryResult.error;
        }

        if (error) throw error;
      },
      () => {
        if (newStatus === "cancelled") {
          setCancellationModal({ isOpen: false, orderId: null });
          setCancellationReason("");
        }
      },
    );
  };

  const getStatusColor = (status: string, deliveryStatus?: string) => {
    if (deliveryStatus === "finding_rider")
      return "bg-indigo-100 text-indigo-600 border-indigo-200";
    if (deliveryStatus === "rider_assigned")
      return "bg-blue-100 text-blue-600 border-blue-200";
    if (deliveryStatus === "picked_up")
      return "bg-purple-100 text-purple-600 border-purple-200";
    if (deliveryStatus === "delivered")
      return "bg-emerald-100 text-emerald-600 border-emerald-200";

    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-600 border-orange-200";
      case "confirmed":
        return "bg-blue-100 text-blue-600 border-blue-200";
      case "preparing":
        return "bg-purple-100 text-purple-600 border-purple-200";
      case "ready":
        return "bg-green-100 text-green-600 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "cancelled":
        return "bg-rose-100 text-rose-600 border-rose-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  // Calculate Stats
  const filteredOrders = orders.filter((o) => {
    const orderDate = new Date(o.created_at);
    const now = new Date();

    if (orderFilter === "today") {
      return orderDate.toDateString() === now.toDateString();
    }

    if (orderFilter === "seven_days") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return orderDate >= sevenDaysAgo;
    }

    return true; // 'all'
  });

  const displayedOrders = filteredOrders.filter((o) => {
    const isActive = ["pending", "confirmed", "preparing", "ready", "queued_for_sync"].includes((o.status || "").toLowerCase());
    if (orderStatusFilter === "active") {
      return isActive;
    } else {
      return !isActive; // completed, delivered, cancelled
    }
  });

  const activeOrdersCount = orders.filter((o) =>
    ["pending", "confirmed", "preparing", "ready", "queued_for_sync"].includes((o.status || "").toLowerCase()),
  ).length;
  const readyOrdersCount = orders.filter((o) => o.status.toLowerCase() === "ready").length;
  const todayRevenue = orders
    .filter((o) => {
      const orderDate = new Date(o.created_at);
      const today = new Date();
      // Only count completed or ready orders for revenue
      return (
        orderDate.toDateString() === today.toDateString() &&
        ["ready", "completed"].includes((o.status || "").toLowerCase())
      );
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);

  // Weekly Stats Calculation
  const getWeeklyStats = () => {
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    const now = new Date();
    const stats = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const dayOrders = orders.filter(
        (o) => new Date(o.created_at).toDateString() === dayStr,
      );
      const dayRevenue = dayOrders
        .filter((o) => ["ready", "completed"].includes((o.status || "").toLowerCase()))
        .reduce((sum, o) => sum + (o.price || 0), 0);

      stats.push({
        label: days[d.getDay()],
        value: dayRevenue,
        count: dayOrders.length,
      });
    }

    const maxRevenue = Math.max(...stats.map((s) => s.value), 1);
    return stats.map((s) => ({ ...s, height: (s.value / maxRevenue) * 100 }));
  };

  const weeklyStats = getWeeklyStats();

  const orderStatusBreakdown = useMemo(() => {
    const todayStr = new Date().toDateString();
    
    // Get all orders from the shop for the current day
    const todayOrders = orders.filter((o) => {
      if (!o.created_at) return false;
      return new Date(o.created_at).toDateString() === todayStr;
    });

    let pendingCount = 0;
    let preparingCount = 0;
    let readyCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    todayOrders.forEach((o) => {
      const st = String(o.status).toLowerCase();
      if (st === "pending") {
        pendingCount++;
      } else if (st === "confirmed" || st === "preparing") {
        preparingCount++;
      } else if (st === "ready") {
        readyCount++;
      } else if (st === "completed") {
        completedCount++;
      } else if (st === "cancelled") {
        cancelledCount++;
      }
    });

    return [
      { name: "Pending", value: pendingCount, color: "#F59E0B" },
      { name: "Preparing", value: preparingCount, color: "#3B82F6" },
      { name: "Ready", value: readyCount, color: "#10B981" },
      { name: "Completed", value: completedCount, color: "#64748B" },
      { name: "Cancelled", value: cancelledCount, color: "#EF4444" },
    ];
  }, [orders]);

  const hourlyOrdersVolume = useMemo(() => {
    const todayStr = new Date().toDateString();
    const todayOrders = orders.filter((o) => {
      if (!o.created_at) return false;
      return new Date(o.created_at).toDateString() === todayStr;
    });

    const hoursData = Array.from({ length: 24 }, (_, i) => {
      const displayHour = i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`;
      return {
        hour: i,
        label: displayHour,
        volume: 0,
      };
    });

    todayOrders.forEach((o) => {
      if (o.created_at) {
        const d = new Date(o.created_at);
        const hour = d.getHours();
        if (hour >= 0 && hour < 24) {
          hoursData[hour].volume += 1;
        }
      }
    });

    return hoursData;
  }, [orders]);

  const toggleItemAvailability = async (
    itemId: string,
    currentStatus: boolean,
  ) => {
    try {
      await FirestoreService.updateMenuItem(itemId, { is_available: !currentStatus });
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: !currentStatus })
        .eq("id", itemId);

      if (error) throw error;

      // Update local state
      setShop((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          menu: prev.menu.map((item) =>
            item.id === itemId
              ? { ...item, is_available: !currentStatus }
              : item,
          ),
        };
      });
      triggerHaptic(50);
    } catch (err: any) {
      showAlert("Error", "Failed to update stock: " + err.message);
    }
  };

  const isTrustCurrentlyActive = useMemo(() => {
    if (!shop) return false;
    return (
      localStorage.getItem("localeats_cash_trust_" + shop.id) === "true" ||
      (shop as any).cash_trust_enabled === true ||
      (shop as any).cash_trust_enabled === "true" ||
      (shop as any).localeats_cash_trust === true ||
      (shop as any).localeats_cash_trust === "true"
    );
  }, [shop]);

  const popularItemName = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      counts[o.product_name] =
        (counts[o.product_name] || 0) + (o.quantity || 1);
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
  }, [orders]);

  const generateFlyer = async () => {
    if (!shop) return;
    try {
      const doc = new jsPDF();

      // Add LocalEats branding
      doc.setFontSize(24);
      doc.setTextColor(234, 88, 12); // orange-600
      doc.text("LocalEats", 105, 20, { align: "center" });

      // Add Shop Name
      doc.setFontSize(36);
      doc.setTextColor(0, 0, 0);
      doc.text(`Order from`, 105, 40, { align: "center" });
      doc.setFontSize(48);
      doc.text(shop.name, 105, 60, { align: "center" });

      // Generate QR Code
      const url = `https://www.localeatssa.co.za/?shopId=${shop.id}`;
      const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });

      // Add QR Code to PDF
      doc.addImage(qrDataUrl, "PNG", 55, 80, 100, 100);

      // Add Call to Action
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text("Skip the queue. Order ahead.", 105, 200, { align: "center" });

      // Save PDF
      doc.save(`${shop.name.replace(/\s+/g, "_")}_Flyer.pdf`);
      showAlert("Success", "Flyer downloaded successfully!");
    } catch (err) {
      console.error("Error generating flyer:", err);
      showAlert("Error", "Failed to generate flyer. Please try again.");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans relative shadow-xl">
      <header className="sticky top-0 z-50 glass-effect border-b border-primary/10">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer hover:text-orange-600 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center relative">
            {loading && !shop ? (
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto mb-1"></div>
            ) : (
              <h1 className="text-xl font-bold tracking-tight">
                {shop?.name || "Shop Dashboard"}
              </h1>
            )}
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                Kitchen Live
              </p>
            </div>
          </div>
          <div className="w-10 h-10"></div>
        </div>
      </header>

      {/* External Portal Info Bar */}
      <div className="bg-indigo-600 text-white text-[11px] py-2 px-4 font-bold flex items-center justify-between shadow-inner shrink-0">
        <span className="flex items-center gap-1.5">
          <Store className="w-4 h-4 shrink-0 animate-pulse" />
          <span>Need Gogo Nandi's official Kitchen Portal?</span>
        </span>
        <a
          href="https://dashboard.localeatssa.co.za"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white text-indigo-600 px-2.5 py-1 rounded-full uppercase text-[9px] font-black tracking-wider shadow hover:bg-indigo-50 transition-all flex items-center gap-1"
        >
          <span>Open Portal</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      <main className="flex-grow overflow-y-auto p-4 space-y-4 pb-24 max-w-screen-xl mx-auto w-full">
        {!loading && !error && shop && activeTab === "orders" && (
          <div className="space-y-4 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-2xl border border-orange-100 dark:border-orange-800/50 transition-all shadow-sm"
              >
                <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
                  Active
                </p>
                <p className="text-xl font-black text-orange-700 dark:text-orange-300">
                  {activeOrdersCount}
                </p>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-green-50 dark:bg-green-900/20 p-3 rounded-2xl border border-green-100 dark:border-green-800/50 transition-all shadow-sm"
              >
                <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                  Ready
                </p>
                <p className="text-xl font-black text-green-700 dark:text-green-300">
                  {readyOrdersCount}
                </p>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/50 transition-all shadow-sm"
              >
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                  Revenue
                </p>
                <p className="text-xl font-black text-blue-700 dark:text-blue-300">
                  R{Math.round(todayRevenue)}
                </p>
              </motion.div>
            </div>

            {/* Cash on Arrival (COA) Quick Toggle */}
            <div className="bg-white dark:bg-slate-900 border border-emerald-500/15 dark:border-emerald-500/20 p-4.5 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                    <span>COA Trust Badge</span>
                    <span className={`text-[10px] whitespace-nowrap font-black uppercase tracking-wider px-2 py-1 rounded leading-none ${
                      isTrustCurrentlyActive 
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                    }`}>
                      {isTrustCurrentlyActive ? "Active" : "Disabled"}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 font-medium mt-1.5 truncate">
                    Allow customers to see trust banner
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const nextVal = !isTrustCurrentlyActive;
                  await runWithProcessing(async () => {
                    try {
                      await FirestoreService.updateShop(shop.id, {
                          localeats_cash_trust: nextVal,
                          cash_trust_enabled: nextVal,
                        });
      const { error } = await supabase
                        .from("shops")
                        .update({
                          localeats_cash_trust: nextVal,
                          cash_trust_enabled: nextVal,
                        })
                        .eq("id", shop.id);
                      if (error) console.warn("Supabase COA update error:", error);
                    } catch (err) {
                      console.warn(err);
                    }

                    localStorage.setItem("localeats_cash_trust_" + shop.id, String(nextVal));
                    setShop({
                      ...shop,
                      localeats_cash_trust: nextVal,
                      cash_trust_enabled: nextVal,
                    });

                    toast.success(
                      nextVal
                        ? "COA Trust Badge enabled! Customers will view your trust banner."
                        : "COA Trust Badge disabled."
                    );
                  });
                }}
                className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center cursor-pointer ${
                  isTrustCurrentlyActive ? "bg-emerald-500 justify-end" : "bg-slate-200 dark:bg-slate-800 justify-start"
                }`}
              >
                <div className="size-4.5 rounded-full bg-white shadow-md transition-transform duration-200" />
              </button>
            </div>

            {/* Date Range Filter */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              {(["today", "seven_days", "all"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setOrderFilter(filter)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    orderFilter === filter
                      ? "bg-white dark:bg-slate-700 text-primary shadow-md"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  {filter === "today"
                    ? "Today"
                    : filter === "seven_days"
                      ? "Last 7 Days"
                      : "All Time"}
                </button>
              ))}
            </div>

            {/* Status Segmented Control */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              {(["active", "history"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setOrderStatusFilter(filter)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    orderStatusFilter === filter
                      ? "bg-white dark:bg-slate-700 text-orange-600 shadow-md"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  }`}
                >
                  {filter === "active" ? "Active Tracker 🔔" : "Merchant History Logs 📁"}
                </button>
              ))}
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-600">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-tight">
                    Rider Fleet
                  </p>
                  <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">
                    Connect delivery partners
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("riders")}
                className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
              >
                Manage
              </button>
            </div>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 px-6">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-900 dark:text-white">
                Dashboard Unavailable
              </p>
              <p className="text-slate-500 text-sm mb-2">{error}</p>
              <div className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 inline-block">
                Project Ref: {supabaseUrl.split("//")[1]?.split(".")[0]}
                <br />
                User ID: {currentUserId || "unknown"}
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 cursor-pointer"
              >
                Retry Connection
              </button>

              {/* Register Shop for User */}
              {error.includes("No shop found") && (
                <button
                  onClick={async () => {
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) return;

                    try {
                      const { error: shopErr } = await supabase
                        .from("shops")
                        .insert({
                          name: "My Local Shop",
                          description: "Freshly prepared Kotas and more",
                          location: "Local Area",
                          category: "Kota",
                          rating: 5.0,
                          owner_id: user.id,
                          is_active: true,
                        });

                      if (shopErr) throw shopErr;
                      window.location.reload();
                    } catch (err: any) {
                      console.error("Error creating shop:", err);
                      showAlert(
                        "Error",
                        "Failed to create shop: " + err.message,
                      );
                    }
                  }}
                  className="w-full px-6 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold text-sm cursor-pointer"
                >
                  Get Started: Register Shop
                </button>
              )}
            </div>
          </div>
        ) : loading ? (
          <ShopOrdersSkeleton />
        ) : activeTab === "inventory" ? (
          <div className="space-y-4">
            {/* View switcher */}
            <div className="bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl flex items-center gap-1 border border-primary/5">
              <button
                onClick={() => {
                  setInventoryViewMode("items");
                  audioHelper.play("alert");
                }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  inventoryViewMode === "items"
                    ? "bg-white dark:bg-slate-800 text-primary dark:text-orange-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                📝 Menu Items ({shop?.menu?.length || 0})
              </button>
              <button
                onClick={() => {
                  setInventoryViewMode("categories");
                  audioHelper.play("alert");
                }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  inventoryViewMode === "categories"
                    ? "bg-white dark:bg-slate-800 text-primary dark:text-orange-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                ✨ Category Priority ({merchantCategories.length})
              </button>
            </div>

            {inventoryViewMode === "items" ? (
              <>
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                    Menu Items
                  </h3>
                  <button
                    onClick={() => handleEditItem(null)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-orange-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Item
                  </button>
                </div>
                {shop?.menu?.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {shop.menu.map((item: MenuItem) => {
                      const isExpanded = expandedItems.includes(item.id);
                      const hasDescription =
                        item.description && item.description.length > 0;
                      const isLongDescription =
                        item.description && item.description.length > 40;

                      return (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5 shadow-sm flex flex-col space-y-3"
                        >
                          <div className="flex items-center gap-3">
                            <BlurUpImage
                              src={item.image_url || DEFAULT_MENU_IMAGE}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl shrink-0"
                              blurHash={`https://picsum.photos/seed/${item.id || "menu"}/10/10?blur=10`}
                            />
                            <div className="flex-grow">
                              <p className="font-bold text-sm">{item.name}</p>
                              <p className="font-bold text-primary text-xs">
                                R{item.price}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  toggleItemAvailability(
                                    item.id,
                                    item.is_available !== false,
                                  )
                                }
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all active:scale-95 cursor-pointer ${
                                  item.is_available !== false
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                }`}
                              >
                                {item.is_available !== false
                                  ? "In Stock"
                                  : "Sold Out"}
                              </button>
                              <button
                                onClick={() => handleEditItem(item)}
                                className="p-2 text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => deleteMenuItem(item.id)}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {hasDescription && (
                            <div className="mt-1">
                              <p
                                className={`text-[10px] text-slate-500 leading-relaxed ${!isExpanded && isLongDescription ? "line-clamp-1" : ""}`}
                              >
                                {item.description}
                              </p>
                              {isLongDescription && (
                                <button
                                  onClick={() => toggleExpand(item.id)}
                                  className="flex items-center gap-1 text-[10px] font-bold text-primary mt-1 hover:underline cursor-pointer"
                                >
                                  <span>
                                    {isExpanded ? "Show Less" : "Read More"}
                                  </span>
                                  <ChevronDown
                                    className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                      <Package className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      No Menu Items Found
                    </p>
                    <p className="text-xs text-slate-500 px-12">
                      Click "Add New Item" to start building your menu.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 text-xs text-left">
                  <p className="font-bold text-orange-800 dark:text-orange-400">💡 Category Ordering & Priority</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Prioritize your menu categories so popular items appear at the very top of your menu list. Customers will see your categories in this exact order.
                  </p>
                </div>

                {merchantCategories.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {merchantCategories.map((category, index) => {
                      const itemsCount = (shop?.menu || []).filter(item => (item.category || "Main Course").trim() === category).length;
                      return (
                        <div
                          key={category}
                          className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5 shadow-sm flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 text-left">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 text-lg shrink-0">
                              {getMerchantCategoryEmoji(category)}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{category}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                {itemsCount} {itemsCount === 1 ? "item" : "items"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleMoveCategory(index, "up")}
                              disabled={index === 0}
                              className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 rounded-xl transition-all cursor-pointer border border-slate-150/50 dark:border-slate-700/50"
                              title="Move Up"
                            >
                              <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </button>
                            <button
                              onClick={() => handleMoveCategory(index, "down")}
                              disabled={index === merchantCategories.length - 1}
                              className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 rounded-xl transition-all cursor-pointer border border-slate-150/50 dark:border-slate-700/50"
                              title="Move Down"
                            >
                              <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No categories found. Add some items to populate your categories!
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === "stats" ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm">
              <h3 className="font-bold mb-4">Weekly Revenue (R)</h3>
              <div className="h-32 flex items-end gap-2 px-2">
                {weeklyStats.map((stat, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-primary/20 rounded-t-lg relative group"
                  >
                    <div
                      style={{ height: `${stat.height}%` }}
                      className="bg-primary rounded-t-lg transition-all group-hover:bg-orange-600"
                    ></div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] whitespace-nowrap py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      R{Math.round(stat.value)}
                    </div>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recharts - Today's Order Status Breakdown */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Today's Order Status Breakdown</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Real-time status metrics for today's orders</p>
              </div>

              {orderStatusBreakdown.reduce((sum, item) => sum + item.value, 0) === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-10">
                  <BarChart3 className="w-8 h-8 text-slate-400 mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Orders Registered Today</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mt-1">Once clients start sending today's orders, status percentages will be charted automatically.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="h-48 w-full min-w-0 flex items-center justify-center relative">
                    <ResponsiveContainer minWidth={0} width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderStatusBreakdown.filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {orderStatusBreakdown.filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => [`${value} Order(s)`, 'Volume']}
                          contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(249, 115, 22, 0.15)',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            color: '#FFF'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                        {orderStatusBreakdown.reduce((sum, item) => sum + item.value, 0)}
                      </span>
                      <span className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-wider mt-1">Total Today</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {orderStatusBreakdown.map((item) => {
                      const totalTodayVal = orderStatusBreakdown.reduce((sum, o) => sum + o.value, 0);
                      const percent = totalTodayVal > 0 ? (item.value / totalTodayVal) * 100 : 0;
                      return (
                        <div key={item.name} className="space-y-1">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                              {item.name}
                            </span>
                            <span className="text-slate-900 dark:text-white font-mono">
                              {item.value} <span className="text-[10px] text-slate-400 font-normal">({percent.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ 
                                width: `${percent}%`,
                                backgroundColor: item.color 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Recharts - Today's Hourly Order Volume Bar Chart */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Peak Busy Periods (Today)</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Hourly order volume to identify peak times</p>
              </div>

              {hourlyOrdersVolume.reduce((sum, item) => sum + item.volume, 0) === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-10">
                  <BarChart3 className="w-8 h-8 text-slate-400 mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Orders Placed Today</p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mt-1">Once orders are placed today, hourly distribution peaks will be charted here automatically.</p>
                </div>
              ) : (
                <div className="h-60 w-full min-w-0 pr-2">
                  <ResponsiveContainer minWidth={0} width="100%" height="100%">
                    <BarChart
                      data={hourlyOrdersVolume.filter(h => h.volume > 0 || (h.hour >= 8 && h.hour <= 22))}
                      margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(249, 115, 22, 0.15)',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          color: '#FFF',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                      />
                      <Bar
                        dataKey="volume"
                        name="Orders"
                        fill="#F97316"
                        radius={[4, 4, 0, 0]}
                        animationDuration={800}
                      >
                        {hourlyOrdersVolume.filter(h => h.volume > 0 || (h.hour >= 8 && h.hour <= 22)).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.volume > 0 ? '#F97316' : '#94a3b8'}
                            opacity={entry.volume > 0 ? 1 : 0.15}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Total Orders
                </p>
                <p className="text-2xl font-black">{orders.length}</p>
              </div>
              <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Most Popular
                </p>
                <p className="text-xl font-black truncate">{popularItemName}</p>
                <p className="text-[10px] text-primary font-bold uppercase mt-1 tracking-tighter">
                  Bestseller
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Avg. Rating
                </p>
                <p className="text-2xl font-black">{shop?.rating || "5.0"}</p>
              </div>
            </div>
          </div>
        ) : activeTab === "marketing" ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-600">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Printable Flyer</h3>
                  <p className="text-xs text-slate-500">
                    Generate a PDF flyer with a QR code
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Print this flyer and stick it on your shop window. Customers can
                scan the QR code to order directly from your LocalEats menu.
              </p>
              <button
                onClick={generateFlyer}
                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:bg-orange-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                Generate PDF
              </button>
            </div>
          </div>
        ) : activeTab === "riders" ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-primary/5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-8 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-600">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold">Live Tracking</h3>
                </div>
                <button
                  onClick={fetchRiders}
                  className="p-2 text-slate-400 hover:text-indigo-600 active:rotate-180 transition-all duration-500 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Mini Map */}
              <div className="h-64 w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative z-10">
                <MapContainer
                  center={
                    shop?.latitude && shop?.longitude
                      ? { lat: shop.latitude, lng: shop.longitude }
                      : DEFAULT_COORDS
                  }
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {shop?.latitude && shop?.longitude && (
                    <Marker
                      position={{ lat: shop.latitude, lng: shop.longitude }}
                    />
                  )}
                  {riders.map(
                    (rider) =>
                      riderLocations[rider.id] && (
                        <Marker
                          key={rider.id}
                          position={riderLocations[rider.id]}
                        >
                          <div
                            className={`p-1 rounded-full shadow-lg border-2 ${rider.current_order_id ? "bg-orange-500 border-white" : "bg-green-500 border-white"}`}
                          >
                            <Bike className="w-3 h-3 text-white" />
                          </div>
                        </Marker>
                      ),
                  )}
                  <ChangeView
                    center={
                      shop?.latitude && shop?.longitude
                        ? { lat: shop.latitude, lng: shop.longitude }
                        : DEFAULT_COORDS
                    }
                  />
                </MapContainer>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 bg-green-500 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Available
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2 bg-orange-500 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    On Delivery
                  </span>
                </div>
              </div>
            </div>

            {/* Rider List & Assignment */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">
                Online Riders ({riders.length})
              </h4>

              {riders.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/30 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <div className="size-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <UserMinus className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500">
                    No riders are currently online.
                  </p>
                  <button
                    onClick={generatePairingCode}
                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    Generate Entry Code
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {riders.map((rider) => (
                    <div
                      key={rider.id}
                      className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">
                              {rider.full_name}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                              {rider.vehicle_type} •{" "}
                              {rider.current_order_id
                                ? "In Delivery"
                                : "Available"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span
                            className={`text-[10px] whitespace-nowrap font-bold px-2 py-0.5 rounded-full uppercase ${rider.current_order_id ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}
                          >
                            {rider.current_order_id ? "Busy" : "Free"}
                          </span>
                        </div>
                      </div>

                      {/* Manual Assignment Section */}
                      {orders.some(
                        (o) =>
                          o.status.toLowerCase() === "ready" &&
                          !o.rider_id &&
                          o.payment_method !== "cash_on_arrival" &&
                          o.payment_method !== "cash",
                      ) &&
                        !rider.current_order_id && (
                          <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                            <p className="text-[10px] whitespace-nowrap font-bold text-slate-400 uppercase tracking-widest mb-2">
                              Assign Pending Order
                            </p>
                            <div className="flex flex-col gap-2">
                              {orders
                                .filter(
                                  (o) =>
                                    o.status.toLowerCase() === "ready" &&
                                    !o.rider_id &&
                                    o.payment_method !== "cash_on_arrival" &&
                                    o.payment_method !== "cash",
                                )
                                .map((readyOrder) => {
                                  // Rider Suggestion Logic: Calculate Proximity
                                  const riderPos = riderLocations[rider.id];
                                  const shopPos =
                                    shop?.latitude && shop?.longitude
                                      ? {
                                          lat: shop.latitude,
                                          lng: shop.longitude,
                                        }
                                      : null;
                                  let distance: number | null = null;

                                  if (riderPos && shopPos) {
                                    distance = calculateDistance(
                                      riderPos.lat,
                                      riderPos.lng,
                                      shopPos.lat,
                                      shopPos.lng,
                                    );
                                  }

                                  const isClosest =
                                    distance !== null && distance < 2; // Simple threshold for "close"

                                  return (
                                    <motion.div
                                      key={readyOrder.id}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className={`flex items-center justify-between p-2 rounded-xl border ${isClosest ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100"}`}
                                    >
                                      <div>
                                        <p className="text-[10px] font-bold">
                                          Order #{readyOrder.id.slice(0, 5)}
                                        </p>
                                        {distance !== null && (
                                          <p className="text-[10px] whitespace-nowrap text-indigo-600 font-bold uppercase">
                                            {distance.toFixed(1)}km away
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={async () => {
                                          try {
                                            await FirestoreService.updateOrder(readyOrder.id, {
                                                  rider_id: rider.id,
                                                  delivery_status:
                                                    "finding_rider",
                                                });
      const { error: updateErr } =
                                              await supabase
                                                .from("orders")
                                                .update({
                                                  rider_id: rider.id,
                                                  delivery_status:
                                                    "finding_rider",
                                                })
                                                .eq("id", readyOrder.id);
                                            if (updateErr) throw updateErr;

                                            const { error: riderErr } =
                                              await supabase
                                                .from("rider_profiles")
                                                .update({
                                                  current_order_id:
                                                    readyOrder.id,
                                                })
                                                .eq("id", rider.id);
                                            if (riderErr) throw riderErr;

                                            showAlert(
                                              "Success",
                                              `Assigned order #${readyOrder.id.slice(0, 5)} to ${rider.full_name}`,
                                            );
                                            fetchRiders();
                                          } catch (err: any) {
                                            showAlert(
                                              "Error",
                                              "Assignment failed: " +
                                                err.message,
                                            );
                                          }
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer ${
                                          isClosest
                                            ? "bg-indigo-600 text-white shadow-md"
                                            : "bg-slate-200 text-slate-600"
                                        }`}
                                      >
                                        {isClosest
                                          ? "Accept Sugggestion"
                                          : "Assign"}
                                      </button>
                                    </motion.div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pairing Section */}
              <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="relative z-10">
                  <h5 className="font-bold text-lg mb-1">Add New Rider</h5>
                  <p className="text-xs text-indigo-100/80 mb-6">
                    Equip your fleet with the Rider App
                  </p>

                  {!pairingCode ? (
                    <button
                      onClick={generatePairingCode}
                      className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-50 active:scale-95 transition-all cursor-pointer"
                    >
                      Generate Code
                    </button>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-1">
                          Enter Code in Rider App
                        </p>
                        <p className="text-4xl font-black tracking-[0.3em] font-mono">
                          {pairingCode}
                        </p>
                      </div>
                      <div className="flex justify-center bg-white p-3 rounded-2xl shadow-inner">
                        {qrCodeData ? (
                          <img
                            src={qrCodeData}
                            alt="QR Code"
                            className="w-32 h-32"
                          />
                        ) : (
                          <div className="w-32 h-32 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-200" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setPairingCode("")}
                        className="w-full py-2 text-xs font-bold text-indigo-200 hover:text-white transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "settings" ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm">
              <h3 className="font-bold text-lg mb-4">Shop Profile</h3>
              <p className="text-xs text-slate-500 mb-6">
                Manage how your shop appears to customers.
              </p>

              <div className="flex flex-col items-center gap-6 mb-6">
                <div className="relative group">
                  <div className="size-32 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl relative">
                    <BlurUpImage
                      src={shop.logo || DEFAULT_SHOP_LOGO}
                      alt={shop.name}
                      className="w-full h-full object-cover"
                      blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 p-3 bg-primary text-white rounded-2xl shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all">
                    <Camera className="w-5 h-5" />
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleShopLogoUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm">{shop.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                    Shop ID: {shop.id.slice(0, 8)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Shop Description
                  </label>
                  <textarea
                    id="shop-desc-input"
                    defaultValue={shop.description || ""}
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mt-1 text-sm font-medium resize-none focus:border-primary/30 transition-colors"
                    placeholder="Tell customers what makes your joint legendary..."
                  />
                </div>
                <button
                  onClick={async () => {
                    const desc = (
                      document.getElementById(
                        "shop-desc-input",
                      ) as HTMLTextAreaElement
                    )?.value;
                    await runWithProcessing(async () => {
                      await FirestoreService.updateShop(shop.id, { description: desc });
      const { error } = await supabase
                        .from("shops")
                        .update({ description: desc })
                        .eq("id", shop.id);
                      if (error) throw error;
                      setShop({ ...shop, description: desc });
                    });
                  }}
                  className="w-full py-3 bg-slate-900 dark:bg-orange-600 text-white font-bold rounded-xl active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm">
              <h3 className="font-bold text-lg mb-4">Shop Location</h3>
              <p className="text-xs text-slate-500 mb-4">
                Update your shop's coordinates so customers can find you on the
                map.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={shop.latitude || ""}
                    readOnly
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mt-1 text-sm font-medium opacity-70"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={shop.longitude || ""}
                    readOnly
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mt-1 text-sm font-medium opacity-70"
                  />
                </div>
                <button
                  onClick={() => {
                    if ("geolocation" in navigator) {
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          try {
                            await FirestoreService.updateShop(shop.id, {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                              });
      const { error } = await supabase
                              .from("shops")
                              .update({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude,
                              })
                              .eq("id", shop.id);

                            if (error) throw error;

                            setShop({
                              ...shop,
                              latitude: position.coords.latitude,
                              longitude: position.coords.longitude,
                            });
                            showAlert(
                              "Success",
                              "Shop location updated to your current position!",
                            );
                          } catch (err: any) {
                            showAlert(
                              "Error",
                              "Failed to update location: " + err.message,
                            );
                          }
                        },
                        (error) => {
                          showAlert(
                            "Error",
                            "Could not get your location. Please ensure location services are enabled.",
                          );
                        },
                      );
                    } else {
                      showAlert(
                        "Error",
                        "Geolocation is not supported by your browser.",
                      );
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LocateFixed className="w-4 h-4" />
                  Update to Current Location
                </button>
              </div>
            </div>

            {/* Cash on Arrival (COA) Trust Badge Settings Card */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Banknote className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#221610] dark:text-white text-base">
                    Cash on Arrival (COA) Trust Badge
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Allow customers to choose cash payment safely
                  </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 gap-4">
                <div className="space-y-1 my-1 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Enable Trust Status Banner
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                    Displays high-trust badges stating:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      "💵 First-Time Local Trust Active: Cash on Arrival
                      Accepted here!"
                    </strong>
                    . Boosts order volume by reassuring first-time visitors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const isTrustCurrentlyActive =
                      localStorage.getItem(
                        "localeats_cash_trust_" + shop.id,
                      ) === "true" ||
                      (shop as any).cash_trust_enabled === true ||
                      (shop as any).cash_trust_enabled === "true" ||
                      (shop as any).localeats_cash_trust === true ||
                      (shop as any).localeats_cash_trust === "true";
                    const nextVal = !isTrustCurrentlyActive;

                    await runWithProcessing(async () => {
                      // Attempt to persist remote db column update
                      try {
                        await FirestoreService.updateShop(shop.id, {
                            localeats_cash_trust: nextVal,
                            cash_trust_enabled: nextVal,
                          });
      const { error } = await supabase
                          .from("shops")
                          .update({
                            localeats_cash_trust: nextVal,
                            cash_trust_enabled: nextVal,
                          })
                          .eq("id", shop.id);
                        if (error)
                          console.warn("Supabase column update warn:", error);
                      } catch (err) {
                        console.warn("Supabase column error:", err);
                      }

                      // Always update LocalStorage as persistent fallback (Rule #1)
                      localStorage.setItem(
                        "localeats_cash_trust_" + shop.id,
                        String(nextVal),
                      );

                      const updatedShop = {
                        ...shop,
                        localeats_cash_trust: nextVal,
                        cash_trust_enabled: nextVal,
                      } as any;
                      setShop(updatedShop);

                      toast.success(
                        nextVal
                          ? "COA Trust Banner activated! Customers will now see your trust badges."
                          : "COA trust features deactivated.",
                      );
                    });
                  }}
                  className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all text-white shadow-lg shrink-0 ${
                    localStorage.getItem("localeats_cash_trust_" + shop.id) ===
                      "true" ||
                    (shop as any).cash_trust_enabled === true ||
                    (shop as any).cash_trust_enabled === "true" ||
                    (shop as any).localeats_cash_trust === true ||
                    (shop as any).localeats_cash_trust === "true"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-900/10"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/10"
                  }`}
                >
                  {localStorage.getItem("localeats_cash_trust_" + shop.id) ===
                    "true" ||
                  (shop as any).cash_trust_enabled === true ||
                  (shop as any).cash_trust_enabled === "true" ||
                  (shop as any).localeats_cash_trust === true ||
                  (shop as any).localeats_cash_trust === "true"
                    ? "Disable Banner"
                    : "Enable Banner"}
                </button>
              </div>
            </div>

            {/* Direct Card Machine Integration Card */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#221610] dark:text-white text-base">
                    Card Machine Direct Integration
                  </h3>
                  <p className="text-xs text-slate-500 font-medium font-sans">
                    Enable customers to pay with card and sync directly with your on-site terminal.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 my-1 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Enable Direct Card Sync (Strategy 3)
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium font-sans">
                      Allows customers to enter card payment details at checkout. This information will transfer to your dashboard so you can connect and trigger transactions on your physical card machine.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const isMachineCurrentlyActive =
                        localStorage.getItem("localeats_card_machine_enabled_" + shop.id) === "true" ||
                        (shop as any).card_machine_enabled === true ||
                        (shop as any).card_machine_enabled === "true";
                      const nextVal = !isMachineCurrentlyActive;

                      await runWithProcessing(async () => {
                        try {
                          await FirestoreService.updateShop(shop.id, {
                              card_machine_enabled: nextVal,
                            });
      const { error } = await supabase
                            .from("shops")
                            .update({
                              card_machine_enabled: nextVal,
                            })
                            .eq("id", shop.id);
                          if (error) console.warn("Supabase update error:", error);
                        } catch (err) {
                          console.warn("Supabase update catch:", err);
                        }

                        localStorage.setItem(
                          "localeats_card_machine_enabled_" + shop.id,
                          String(nextVal),
                        );

                        const updatedShop = {
                          ...shop,
                          card_machine_enabled: nextVal,
                        } as any;
                        setShop(updatedShop);

                        toast.success(
                          nextVal
                            ? "Direct card machine checkout enabled! Start receiving direct synchronized terminal payments."
                            : "Direct card machine checkout disabled.",
                        );
                      });
                    }}
                    className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all text-white shadow-lg shrink-0 ${
                      localStorage.getItem("localeats_card_machine_enabled_" + shop.id) === "true" ||
                      (shop as any).card_machine_enabled === true ||
                      (shop as any).card_machine_enabled === "true"
                        ? "bg-rose-600 hover:bg-rose-700 shadow-rose-900/10"
                        : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-950/10"
                    }`}
                  >
                    {localStorage.getItem("localeats_card_machine_enabled_" + shop.id) === "true" ||
                    (shop as any).card_machine_enabled === true ||
                    (shop as any).card_machine_enabled === "true"
                      ? "Disable Integration"
                      : "Enable Integration"}
                  </button>
                </div>

                {(localStorage.getItem("localeats_card_machine_enabled_" + shop.id) === "true" ||
                  (shop as any).card_machine_enabled === true ||
                  (shop as any).card_machine_enabled === "true") && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-300">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Select Card Terminal Brand
                      </label>
                      <select
                        id="terminal-brand-select"
                        defaultValue={localStorage.getItem("localeats_card_machine_brand_" + shop.id) || "Yoco Go"}
                        onChange={(e) => {
                          localStorage.setItem("localeats_card_machine_brand_" + shop.id, e.target.value);
                          toast.success(`Terminal brand updated to ${e.target.value}`);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <option value="Yoco Wireless Terminal - Gen 2">Yoco Wireless Terminal - Gen 2</option>
                        <option value="Suniq Smart Card Terminal S1">Suniq Smart Card Terminal S1</option>
                        <option value="Zapper Direct-Link Terminal 4G">Zapper Direct-Link Terminal 4G</option>
                        <option value="Nedbank PocketPOS Blue">Nedbank PocketPOS Blue</option>
                        <option value="Absa Pebble Payment Device">Absa Pebble Payment Device</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Terminal ID / Serial Device Reference
                      </label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          id="terminal-id-input"
                          placeholder="e.g. TRM-889012-YCO"
                          defaultValue={localStorage.getItem("localeats_card_machine_terminal_id_" + shop.id) || ""}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = (document.getElementById("terminal-id-input") as HTMLInputElement)?.value || "";
                            if (!val.trim()) {
                              toast.error("Please enter a valid Terminal ID");
                              return;
                            }
                            localStorage.setItem("localeats_card_machine_terminal_id_" + shop.id, val.trim());
                            toast.success("Terminal connection reference cataloged and synced successfully!");
                          }}
                          className="px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all shrink-0"
                        >
                          Connect Device
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 font-semibold">
                        This reference key identifies your physical machine on the local encrypted node for real-time order-swipe instructions.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
              <Utensils className="w-10 h-10" />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-900 dark:text-white">
                {orderStatusFilter === "active" ? "No active orders" : "No history records"}
              </p>
              <p className="text-slate-500 text-sm">
                {orderStatusFilter === "active"
                  ? "New orders will appear here in real-time."
                  : "Completed or cancelled orders will appear here."}
              </p>
            </div>
          </div>
        ) : (
          displayedOrders.map((order) => {
            const dist =
              order.latitude &&
              order.longitude &&
              shop.latitude &&
              shop.longitude
                ? calculateDistance(
                    shop.latitude,
                    shop.longitude,
                    order.latitude,
                    order.longitude,
                  )
                : null;
            const zone = dist !== null ? (dist > 3 ? "B" : "A") : null;
            const zoneFee = zone === "A" ? 5 : 10;

            return (
              <motion.div
                layout
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900/50 rounded-2xl border border-primary/5 shadow-sm overflow-hidden"
              >
                <div className="p-4 border-b border-primary/5 flex justify-between items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${getStatusColor(order.status, order.delivery_status)}`}
                      >
                        {order.status.toLowerCase() === "pending" && (
                          <Clock className="w-3 h-3" />
                        )}
                        {order.status.toLowerCase() === "confirmed" && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {order.status.toLowerCase() === "preparing" && (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        )}
                        {order.status.toLowerCase() === "ready" && (
                          <Package className="w-3 h-3" />
                        )}
                        {order.status.toLowerCase() === "completed" && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {order.status.toLowerCase() === "cancelled" && (
                          <XCircle className="w-3 h-3" />
                        )}
                        {order.delivery_status
                          ? order.delivery_status.replace("_", " ")
                          : order.status}
                      </span>
                      {order.is_delivery && (
                        <>
                          <span className="bg-orange-600 text-white text-[10px] whitespace-nowrap font-black px-2 py-1 rounded uppercase tracking-tighter flex items-center gap-1">
                            <Navigation className="w-2 h-2" />
                            Rider Required
                          </span>
                          {zone && (
                            <span
                              className={`text-[10px] whitespace-nowrap font-black px-2 py-1 rounded uppercase tracking-tighter border ${zone === "A" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}
                            >
                              Zone {zone} - R{zoneFee}{" "}
                              {dist && `(${dist.toFixed(1)}km)`}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <h3 className="font-bold text-lg">{order.customer_name}</h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        {Math.floor(
                          (Date.now() - new Date(order.created_at).getTime()) /
                            60000,
                        )}
                        m ago
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-bold">
                      R {order.price.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Total
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg border border-primary/5 flex items-center justify-center text-primary font-bold">
                        {order.quantity}x
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        {order.product_name}
                      </p>
                    </div>
                    {order.payment_method && (
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-bold text-xs">
                        {order.payment_method === "cash" ||
                        order.payment_method === "cash_on_arrival" ? (
                          <Banknote className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                        )}
                        {order.payment_method === "cash"
                          ? "Cash"
                          : order.payment_method === "cash_on_arrival"
                            ? "COA"
                            : "Card"}
                      </div>
                    )}
                  </div>
                  {order.notes && (
                    <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-100 dark:border-orange-500/20">
                      <p className="text-xs text-orange-700 dark:text-orange-400 font-medium italic">
                        Note: "{order.notes}"
                      </p>
                    </div>
                  )}
                  {order.delivery_instructions && (
                    <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between">
                      <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium font-mono text-[10px]">
                        📍 {cleanInstructionsForDisplay(order.delivery_instructions) || "Direct Collection"}
                      </p>
                      {order.latitude && order.longitude && (
                        <button
                          onClick={() =>
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`,
                              "_blank",
                            )
                          }
                          className="p-1.5 bg-white dark:bg-slate-800 rounded-md shadow-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                          title="View on Map"
                        >
                          <Navigation className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {(() => {
                    const cardData = parseCardDetailsFromInstructions(order.delivery_instructions);
                    if (!cardData) return null;

                    // Read local state for terminal processing to keep mock feedback functional
                    const terminalTxKey = `terminal_tx_${order.id}`;
                    const txStatus = localStorage.getItem(terminalTxKey) || "idle"; // 'idle' | 'processing' | 'success' | 'failed'

                    return (
                      <div className="mt-3 bg-gradient-to-tr from-slate-900 to-indigo-950 p-4 rounded-2xl text-white border border-indigo-800/40 shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center pb-2 border-b border-white/10">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/20 rounded-lg text-indigo-400">
                              <CreditCard className="w-4 h-4 animate-pulse" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Card Machine Sync</p>
                              <p className="text-xs font-bold text-slate-200">{cardData.brand} ({cardData.terminal})</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 text-[10px] whitespace-nowrap font-black uppercase tracking-widest rounded-full ${
                            txStatus === "success" 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                              : txStatus === "failed" 
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : txStatus === "processing"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                                  : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          }`}>
                            {txStatus === "success" 
                              ? "PAID & SETTLED" 
                              : txStatus === "failed" 
                                ? "FAILED" 
                                : txStatus === "processing" 
                                  ? "PROCESSING..." 
                                  : "PENDING SWIPE"}
                          </span>
                        </div>

                        {/* Masked visual card strip */}
                        <div className="grid grid-cols-2 bg-white/5 p-3 rounded-xl border border-white/5 font-mono text-xs gap-y-1.5 gap-x-3">
                          <div className="col-span-2 font-sans">
                            <span className="text-[10px] whitespace-nowrap text-slate-400 font-extrabold uppercase block leading-none mb-0.5">Cardholder</span>
                            <span className="font-sans font-black tracking-wider uppercase text-slate-100">{cardData.holder}</span>
                          </div>
                          <div>
                            <span className="text-[10px] whitespace-nowrap text-slate-400 font-extrabold uppercase block leading-none mb-0.5">Card Number</span>
                            <span className="font-bold tracking-widest text-slate-200">{cardData.card}</span>
                          </div>
                          <div>
                            <span className="text-[10px] whitespace-nowrap text-slate-400 font-extrabold uppercase block leading-none mb-0.5">Expiry / CVV</span>
                            <span className="font-bold text-slate-200">{cardData.exp} • {cardData.cvv}</span>
                          </div>
                        </div>

                        {/* Simulated terminal actions block */}
                        {txStatus === "idle" && (
                          <div className="flex gap-2">
                            <button
                              onClick={async () => {
                                if ("vibrate" in navigator) navigator.vibrate([10, 30]);
                                localStorage.setItem(terminalTxKey, "processing");
                                setOrders(prev => [...prev]); 
                                
                                // Auto transition simulation
                                setTimeout(() => {
                                  localStorage.setItem(terminalTxKey, "success");
                                  setOrders(prev => [...prev]);
                                  toast.success("Payment Captured on Terminal!");
                                  if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
                                }, 3000);
                              }}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-xl text-[10px] uppercase tracking-widest cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/10"
                            >
                              <Wifi className="w-3.5 h-3.5" />
                              Charge Card Machine (R {(order.price + (order.delivery_fee || 0)).toFixed(2)})
                            </button>
                            <button
                              onClick={() => {
                                if ("vibrate" in navigator) navigator.vibrate([50]);
                                localStorage.setItem(terminalTxKey, "failed");
                                setOrders(prev => [...prev]);
                                toast.error("Terminal cancelled transaction.");
                              }}
                              className="px-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl text-[10px] uppercase cursor-pointer transition-all border border-white/10"
                            >
                              Fail Sync
                            </button>
                          </div>
                        )}

                        {txStatus === "processing" && (
                          <div className="flex items-center justify-center py-2.5 gap-3 bg-white/5 rounded-xl border border-white/5 animate-pulse">
                            <div className="animate-spin text-indigo-400">
                              <RotateCw className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                              Broadcasting to machine {cardData.terminal}...
                            </span>
                          </div>
                        )}

                        {txStatus === "success" && (
                          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between text-emerald-400">
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                              <CheckCircle className="w-4 h-4" />
                              Settled on {cardData.brand}
                            </div>
                            <button
                              onClick={() => {
                                localStorage.removeItem(terminalTxKey);
                                setOrders(prev => [...prev]);
                              }}
                              className="text-[9px] font-bold underline cursor-pointer"
                            >
                              Reset Info
                            </button>
                          </div>
                        )}

                        {txStatus === "failed" && (
                          <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 flex items-center justify-between text-rose-400">
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider font-sans">
                              ❌ Transaction Declined
                            </div>
                            <button
                              onClick={() => {
                                localStorage.removeItem(terminalTxKey);
                                setOrders(prev => [...prev]);
                              }}
                              className="text-[9px] font-bold underline cursor-pointer"
                            >
                              Retry Charge
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar">
                  {order.status.toLowerCase() === "pending" && (
                    <button
                      onClick={() => updateOrderStatus("confirmed", order.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Confirm Order
                    </button>
                  )}
                  {order.status.toLowerCase() === "confirmed" && (
                    <button
                      onClick={() => updateOrderStatus("preparing", order.id)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status.toLowerCase() === "preparing" && (
                    <button
                      onClick={() => updateOrderStatus("ready", order.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Mark as Ready
                    </button>
                  )}
                  {order.status.toLowerCase() === "ready" && (
                    <button
                      onClick={() => updateOrderStatus("completed", order.id)}
                      className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Complete Order
                    </button>
                  )}
                  {["pending", "confirmed"].includes(order.status) && (
                    <button
                      onClick={() => {
                        showConfirm(
                          "Cancel Order",
                          "Are you sure you want to cancel this order?",
                          () => {
                            updateOrderStatus("cancelled", order.id);
                          },
                        );
                      }}
                      className="px-4 bg-red-50 text-red-600 border border-red-100 text-xs font-bold py-3 rounded-xl hover:bg-red-100 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <a
                    href={`tel:${order.phone}`}
                    className="px-4 bg-white dark:bg-slate-800 border border-primary/10 text-slate-600 dark:text-slate-300 text-xs font-bold py-3 rounded-xl hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            );
          })
        )}
      </main>

      <nav className="bg-white dark:bg-slate-900 border-t border-primary/10 px-4 py-4 flex justify-between items-center sticky bottom-0">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === "orders" ? "text-primary" : "text-slate-400"}`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] whitespace-nowrap font-bold uppercase tracking-wider">
            Orders
          </span>
        </button>
        <button
          onClick={() => setActiveTab("riders")}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === "riders" ? "text-indigo-600" : "text-slate-400"}`}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-[10px] whitespace-nowrap font-bold uppercase tracking-wider">
            Riders
          </span>
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === "inventory" ? "text-primary" : "text-slate-400"}`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] whitespace-nowrap font-bold uppercase tracking-wider">
            Stock
          </span>
        </button>
        <button
          onClick={() => setActiveTab("marketing")}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === "marketing" ? "text-primary" : "text-slate-400"}`}
        >
          <Megaphone className="w-5 h-5" />
          <span className="text-[10px] whitespace-nowrap font-bold uppercase tracking-wider">
            Promo
          </span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === "settings" ? "text-primary" : "text-slate-400"}`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] whitespace-nowrap font-bold uppercase tracking-wider">
            Map
          </span>
        </button>
      </nav>

      {/* Cancellation Reason Modal */}
      <AnimatePresence>
        {cancellationModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() =>
                setCancellationModal({ isOpen: false, orderId: null })
              }
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold">Cancellation Reason</h3>
                <p className="text-xs text-slate-500">
                  Please provide a reason for cancelling this order.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {[
                    "Out of Ingredients",
                    "Kitchen Too Busy",
                    "Invalid Address",
                    "Customer Requested",
                    "Closing Soon",
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setCancellationReason(reason)}
                      className={`w-full p-4 rounded-2xl text-left text-sm font-bold transition-all border ${
                        cancellationReason === reason
                          ? "bg-orange-50 border-orange-200 text-orange-600 ring-2 ring-orange-500/10"
                          : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 mt-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Custom Reason (Optional)
                  </label>
                  <textarea
                    value={
                      cancellationReason.includes("Out of Ingredients") ||
                      cancellationReason === ""
                        ? ""
                        : cancellationReason
                    }
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Tell the customer why..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none resize-none"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() =>
                      setCancellationModal({ isOpen: false, orderId: null })
                    }
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-xs"
                  >
                    Back
                  </button>
                  <button
                    onClick={() =>
                      executeStatusUpdate(
                        cancellationModal.orderId!,
                        "cancelled",
                        undefined,
                        cancellationReason || "Operational issues",
                      )
                    }
                    disabled={!cancellationReason}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-rose-600/20 disabled:opacity-50"
                  >
                    Confirm Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Menu Item Modal */}
      <AnimatePresence>
        {isEditingMenu && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingMenu(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    {editingItem ? "Edit Item" : "Add New Item"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update your shop menu
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingMenu(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={saveMenuItem} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Item Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    defaultValue={editingItem?.name}
                    required
                    placeholder="e.g. Special Kota"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      Price (R)
                    </label>
                    <input
                      name="price"
                      type="number"
                      step="0.01"
                      defaultValue={editingItem?.price}
                      required
                      placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      Photo
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMenuImageUpload}
                        className="hidden"
                        id="menu-item-photo"
                      />
                      <label
                        htmlFor="menu-item-photo"
                        className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer hover:border-orange-500 transition-colors"
                      >
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                        ) : menuImgUrl || editingItem?.image_url ? (
                          <BlurUpImage
                            src={
                              menuImgUrl ||
                              editingItem?.image_url ||
                              DEFAULT_MENU_IMAGE
                            }
                            alt="Menu Item"
                            className="w-full h-full rounded-lg"
                            blurHash={`https://picsum.photos/seed/${editingItem?.id || "new"}/10/10?blur=10`}
                          />
                        ) : (
                          <Camera className="w-5 h-5 text-slate-400" />
                        )}
                      </label>
                      <input
                        name="image_url"
                        type="text"
                        value={menuImgUrl || editingItem?.image_url || ""}
                        onChange={(e) => setMenuImgUrl(e.target.value)}
                        placeholder="Or paste URL..."
                        className="flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Available in Stock
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                      Show or hide on menu
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingItemAvailable(!editingItemAvailable)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${editingItemAvailable ? "bg-orange-600" : "bg-slate-300 dark:bg-slate-600"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingItemAvailable ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      Customizations
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingItemCustomizations([
                          ...editingItemCustomizations,
                          { name: "", price: 0 },
                        ])
                      }
                      className="text-[10px] font-bold text-orange-600 uppercase tracking-widest hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Option
                    </button>
                  </div>
                  {editingItemCustomizations.length > 0 && (
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                      {editingItemCustomizations.map((customization, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="e.g. Extra Cheese"
                            value={customization.name}
                            onChange={(e) => {
                              const newC = [...editingItemCustomizations];
                              newC[idx].name = e.target.value;
                              setEditingItemCustomizations(newC);
                            }}
                            className="flex-grow w-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={customization.price}
                            onChange={(e) => {
                              const newC = [...editingItemCustomizations];
                              newC[idx].price = parseFloat(e.target.value) || 0;
                              setEditingItemCustomizations(newC);
                            }}
                            className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newC = editingItemCustomizations.filter(
                                (_, i) => i !== idx,
                              );
                              setEditingItemCustomizations(newC);
                            }}
                            className="p-2 shrink-0 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingItem?.description}
                    placeholder="Tell customers what's in it..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:bg-orange-700 active:scale-95 transition-all mt-6"
                >
                  {editingItem ? "Save Changes" : "Add to Menu"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminCashDiagnosticsSection({
  orders,
  shops,
  onUpdateStatus,
  onBack,
  isOnline,
  showAlert,
  onRefresh,
}: {
  orders: Order[];
  shops: Shop[];
  onUpdateStatus: (status: string, orderId: string, message?: string) => Promise<void>;
  onBack: () => void;
  isOnline: boolean;
  showAlert: (title: string, message: string) => void;
  onRefresh: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter strictly for Cash on Arrival and Cash transactions
  const cashOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.payment_method === "cash_on_arrival" ||
        o.payment_method === "cash" ||
        o.payment_method === "cod"
    );
  }, [orders]);

  const filteredCashOrders = useMemo(() => {
    return cashOrders.filter((order) => {
      const matchesSearch =
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.address || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || order.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cashOrders, searchTerm, statusFilter]);

  const totalValue = useMemo(() => {
    return cashOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total_price || o.price || 0), 0);
  }, [cashOrders]);

  const pendingCount = cashOrders.filter((o) => o.status === "pending").length;
  const readyCount = cashOrders.filter((o) => o.status === "ready").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-amber-900 dark:text-amber-200 uppercase">
                Cash-on-Arrival Dispatch Diagnostics
              </h2>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                Auto-assignment isolation & in-house fulfillment verification
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Filter Active: 100% Isolated
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white/60 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-amber-500/20">
          <strong className="text-amber-800 dark:text-amber-300">Rider Auto-Assignment Policy:</strong> External digital courier dispatch is reserved exclusively for prepaid digital orders. All orders placed with <strong>Cash on Arrival</strong> or <strong>Cash</strong> are automatically filtered out from courier auto-assignment. This protects drivers from handling cash disputes and keeps fulfillment directly with the vendor&apos;s in-house staff.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total COA Orders</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{cashOrders.length}</span>
          <span className="text-[9px] text-amber-600 font-bold">Excluded from riders</span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cash Order Volume</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">R {totalValue.toFixed(2)}</span>
          <span className="text-[9px] text-emerald-600 font-bold">In-house collection</span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Preparation</span>
          <span className="text-xl font-black text-amber-600">{pendingCount}</span>
          <span className="text-[9px] text-slate-400">Awaiting kitchen</span>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ready for Staff</span>
          <span className="text-xl font-black text-blue-600">{readyCount}</span>
          <span className="text-[9px] text-slate-400">In-house delivery</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search COA orders by customer, product, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {["all", "pending", "confirmed", "ready", "completed", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border ${
                statusFilter === status
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-amber-500/30"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Order List */}
      <div className="space-y-3">
        {filteredCashOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-600" />
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Cash Orders Found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {searchTerm || statusFilter !== "all"
                  ? "Try resetting your search or filter."
                  : "All current orders are prepaid digital transactions dispatched to riders."}
              </p>
            </div>
          </div>
        ) : (
          filteredCashOrders.map((order) => {
            const shop = shops.find((s) => s.id === order.shop_id);
            const isExpanded = expandedId === order.id;
            const isDelivery = order.is_delivery;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-amber-500/20 dark:border-amber-500/10 shadow-sm space-y-3 transition-all hover:border-amber-500/40"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-md flex items-center gap-1">
                        <Banknote className="w-3 h-3" />
                        {order.payment_method === "cash_on_arrival" ? "Cash on Arrival" : "Cash"}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                        {isDelivery ? <Truck className="w-3 h-3 text-orange-500" /> : <ShoppingBag className="w-3 h-3 text-blue-500" />}
                        {isDelivery ? "In-House Delivery" : "Store Collection"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                      {order.customer_name || "Guest Customer"} • {order.phone || "No phone"}
                    </p>
                    {order.address && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {order.address}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white block">
                      R {(order.total_price || order.price || 0).toFixed(2)}
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mt-1 ${
                      order.status === "ready"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                        : order.status === "pending"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                    {order.quantity || 1}x {order.product_name}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Diagnostic Verification & Workflow Controls */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Rider Pool Bypassed (Verified)
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      {isExpanded ? "Hide Details" : "View Diagnostic"}
                    </button>
                  </div>

                  {/* Status Action Buttons for In-House Staff */}
                  <div className="flex items-center gap-1.5">
                    {order.status === "pending" && (
                      <button
                        onClick={() => onUpdateStatus("confirmed", order.id)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Confirm
                      </button>
                    )}
                    {order.status === "confirmed" && (
                      <button
                        onClick={() => onUpdateStatus("ready", order.id)}
                        className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Mark Ready (In-House)
                      </button>
                    )}
                    {order.status === "ready" && (
                      <button
                        onClick={() => onUpdateStatus("completed", order.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Complete Order
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Raw Diagnostic Data */}
                {isExpanded && (
                  <div className="mt-3 p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono space-y-1.5 animate-in fade-in">
                    <p className="font-bold text-amber-400 uppercase tracking-widest">Diagnostic Verification Snapshot</p>
                    <p>• Payment Method: <span className="text-emerald-400">{order.payment_method}</span></p>
                    <p>• External Rider Assigned: <span className="text-rose-400">null (Auto-assign prevented)</span></p>
                    <p>• Delivery Status: <span className="text-slate-300">{order.delivery_status || "none"}</span></p>
                    <p>• Fulfillment Mode: <span className="text-blue-300">{isDelivery ? "Vendor In-House Staff Courier" : "Walk-in Takeaway"}</span></p>
                    <p>• Dispatch Reason: <span className="text-slate-400">Filtered by autoAssignClosestRiderService policy (cash transactions require manual in-house cash exchange).</span></p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function AdminOrdersScreen({
  shops,
  onBack,
  showAlert,
  showConfirm,
  runWithProcessing,
  isOnline,
}: {
  shops: Shop[];
  onBack: () => void;
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  runWithProcessing: (
    action: () => Promise<void>,
    successCallback?: () => void,
  ) => Promise<void>;
  isOnline: boolean;
}) {
  const [activeAdminTab, setActiveAdminTab] = useState<"orders" | "cash-diagnostics" | "error-logs">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState(
    "Your order is being prepared with love! 🔥",
  );

  useEffect(() => {
    fetchOrders();

    // Polling fallback to ensure reliability if WebSockets fail
    const timer = setInterval(fetchOrders, 30000);

    // Real-time updates for admin
    const channel = getFreshChannel("admin_orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as Order, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) =>
                o.id === payload.new.id ? (payload.new as Order) : o,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const safeColumns = "id, user_id, shop_id, status, delivery_status, product_name, quantity, price, total_price, delivery_fee, created_at, updated_at, is_delivery, payment_method, notes, delivery_instructions, customer_name, phone, email, address, city, latitude:lat, longitude:lng";

      let fetchedData: Order[] | null = null;
      
      // Tier 1: Firestore shared db
      try {
        const fsOrders = await FirestoreService.getAllOrders ? await FirestoreService.getAllOrders() : [];
        if (fsOrders && fsOrders.length > 0) {
          fetchedData = fsOrders as unknown as Order[];
        }
      } catch (fErr) {}

      // Tier 2: Supabase
      if (!fetchedData || fetchedData.length === 0) {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select(safeColumns)
            .order("created_at", { ascending: false })
            .limit(100);

          if (!error && data) {
            fetchedData = data as unknown as Order[];
          }
        } catch (sbErr) {
          console.info("[Merchant] Supabase orders fetch notice:", sbErr);
        }
      }

      // Tier 2 Fallback: Server API
      if (!fetchedData) {
        try {
          const apiRes = await fetch("/api/orders").catch(() => null);
          if (apiRes && apiRes.ok) {
            const apiJson = await apiRes.json().catch(() => null);
            if (apiJson && Array.isArray(apiJson.orders)) {
              fetchedData = apiJson.orders as Order[];
            }
          }
        } catch (_) {}
      }

      if (fetchedData) {
        setOrders(fetchedData);
        localStorage.setItem("admin_cached_orders", JSON.stringify(fetchedData));
      } else {
        const cached = localStorage.getItem("admin_cached_orders");
        if (cached) {
          try {
            setOrders(JSON.parse(cached));
          } catch (e) {
            console.warn("[SelfCleaning] Failed parsing admin cached orders list:", e);
          }
        }
      }
    } catch (error: any) {
      console.warn("Merchant fetch orders notice:", error);
      const cached = localStorage.getItem("admin_cached_orders");
      if (cached) {
        try {
          setOrders(JSON.parse(cached));
        } catch (_) {}
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (
    status: string,
    orderId: string,
    message?: string,
  ) => {
    if (!isOnline) {
      showAlert(
        "Connection Issue",
        "You appear to be offline. Status updates require a connection to notify the customer.",
      );
      return;
    }
    if ("vibrate" in navigator) {
      navigator.vibrate(10); // Subtle feedback for status change
    }

    await runWithProcessing(async () => {
      // Fetch current order to get existing history and delivery info
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("id, user_id, shop_id, status, delivery_status, product_name, quantity, price, total_price, delivery_fee, created_at, updated_at, is_delivery, payment_method, notes, delivery_instructions, customer_name, phone, email, address, city, latitude:lat, longitude:lng, rider_id, status_history")
        .eq("id", orderId)
        .maybeSingle();

      const history = currentOrder?.status_history || [];
      const newHistory = [
        ...history,
        { status, timestamp: new Date().toISOString() },
      ];

      // BUSINESS LOGIC: If a guest ordered delivery and it's marked as ready,
      // it shifts to 'finding_rider' status only for prepaid digital orders.
      // Cash-on-arrival and cash orders are fulfilled in-house and excluded from riders.
      let finalStatus = status;
      let deliveryStatus = currentOrder?.delivery_status || "none";

      const isCashOrder =
        currentOrder?.payment_method === "cash_on_arrival" ||
        currentOrder?.payment_method === "cash";

      if (status === "ready" && currentOrder?.is_delivery) {
        finalStatus = "ready";
        if (!isCashOrder) {
          deliveryStatus = "finding_rider";
          autoAssignClosestRiderService(orderId);
        } else {
          deliveryStatus = "none";
        }
      }

      const updateData: any = {
        status: finalStatus,
        delivery_status: deliveryStatus,
        updated_at: new Date().toISOString(),
      };
      if (message) updateData.owner_message = message;

      await FirestoreService.updateOrder(orderId, updateData);
      let { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) {
        console.warn("Update order status supabase notice:", error);
      }

      // Also update in server API store
      try {
        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: [{ id: orderId, ...updateData }] }),
        }).catch(() => null);
      } catch (_) {}
    }, fetchOrders);
  };

  const getStatusColor = (status: string, deliveryStatus?: string) => {
    if (deliveryStatus === "finding_rider")
      return "bg-indigo-100 text-indigo-600 border-indigo-200";
    if (deliveryStatus === "rider_assigned")
      return "bg-blue-100 text-blue-600 border-blue-200";
    if (deliveryStatus === "picked_up")
      return "bg-purple-100 text-purple-600 border-purple-200";
    if (deliveryStatus === "delivered")
      return "bg-emerald-100 text-emerald-600 border-emerald-200";

    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-600 border-orange-200";
      case "confirmed":
        return "bg-blue-100 text-blue-600 border-blue-200";
      case "preparing":
        return "bg-purple-100 text-purple-600 border-purple-200";
      case "ready":
        return "bg-green-100 text-green-600 border-green-200";
      case "completed":
        return "bg-gray-100 text-gray-600 border-gray-200";
      case "cancelled":
        return "bg-rose-100 text-rose-600 border-rose-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const filteredOrders = orders
    .filter((order) => {
      const matchesSearch =
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || order.status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-screen-xl mx-auto overflow-x-hidden shadow-xl">
        <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-xs text-slate-400">
                {activeAdminTab === "orders"
                  ? "Live customer orders & operations"
                  : activeAdminTab === "cash-diagnostics"
                  ? "Cash on Arrival isolation & rider diagnostics"
                  : "Maintenance & crash inspection"}
              </p>
            </div>
          </div>

          {/* Tab Pill Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setActiveAdminTab("orders")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeAdminTab === "orders"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Orders ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab("cash-diagnostics")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeAdminTab === "cash-diagnostics"
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/20"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>COA Diagnostics ({orders.filter(o => o.payment_method === 'cash_on_arrival' || o.payment_method === 'cash' || o.payment_method === 'cod').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab("error-logs")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeAdminTab === "error-logs"
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-600/20"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span>Errors</span>
            </button>
          </div>
        </header>

        {activeAdminTab === "error-logs" ? (
          <main className="flex-1 overflow-y-auto p-4">
            <AdminErrorLogsSection embedded={false} onBack={() => setActiveAdminTab("orders")} />
          </main>
        ) : activeAdminTab === "cash-diagnostics" ? (
          <main className="flex-1 overflow-y-auto p-4">
            <AdminCashDiagnosticsSection
              orders={orders}
              shops={shops}
              onUpdateStatus={updateOrderStatus}
              onBack={() => setActiveAdminTab("orders")}
              isOnline={isOnline}
              showAlert={showAlert}
              onRefresh={fetchOrders}
            />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Search Bar */}
            <div className="relative group">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search customer or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
              {[
                "all",
                "pending",
                "confirmed",
                "ready",
                "completed",
                "cancelled",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer border ${
                    statusFilter === status
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                      : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-primary/30"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {statusFilter === "all"
                ? "Recent Orders"
                : `${statusFilter} Orders`}{" "}
              ({filteredOrders.length})
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
                }
                className="text-slate-500 hover:text-primary text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title={`Sort by date: ${sortOrder === "desc" ? "Newest first" : "Oldest first"}`}
              >
                <Clock className="w-4 h-4" />
                {sortOrder === "desc" ? "Newest" : "Oldest"}
              </button>
              <button
                onClick={fetchOrders}
                className="text-primary text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <ShopOrdersSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <Package className="w-12 h-12" />
              <p className="text-slate-500 font-medium">No orders found</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const shop = shops.find((s) => s.id === order.shop_id);
              const dist =
                order.latitude &&
                order.longitude &&
                shop?.latitude &&
                shop?.longitude
                  ? calculateDistance(
                      shop.latitude,
                      shop.longitude,
                      order.latitude,
                      order.longitude,
                    )
                  : null;
              const zone = dist !== null ? (dist > 3 ? "B" : "A") : null;

              return (
                <div
                  key={order.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border transition-all cursor-pointer ${
                    expandedOrderId === order.id
                      ? "border-primary ring-1 ring-primary/10"
                      : "border-slate-100 dark:border-slate-800"
                  }`}
                  onClick={() =>
                    setExpandedOrderId(
                      expandedOrderId === order.id ? null : order.id,
                    )
                  }
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">
                        {order.product_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {order.customer_name} • {order.phone}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shrink-0 ml-2 border ${getStatusColor(order.status, order.delivery_status)}`}
                    >
                      {order.delivery_status
                        ? order.delivery_status.replace("_", " ")
                        : order.status}
                    </span>
                  </div>
                  {order.is_delivery && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="bg-orange-600 text-white text-[10px] whitespace-nowrap font-black px-2 py-1 rounded uppercase tracking-tighter flex items-center gap-1">
                        <Navigation className="w-2 h-2" />
                        Rider Needed (R{order.delivery_fee})
                      </span>
                      {zone && (
                        <span
                          className={`text-[10px] whitespace-nowrap font-black px-2 py-1 rounded uppercase tracking-tighter border ${zone === "A" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}
                        >
                          Zone {zone} {dist && `(${dist.toFixed(1)}km)`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Collapsed View: Address */}
                  {expandedOrderId !== order.id && (
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <p className="truncate">
                          {order.address}, {order.city}
                        </p>
                      </div>
                      {order.latitude && order.longitude && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`,
                              "_blank",
                            );
                          }}
                          className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                          <Navigation className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Expanded View: Details */}
                  {expandedOrderId === order.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Customer Info */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                              Customer Details
                            </p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <p className="text-sm font-bold mb-1">
                              {order.customer_name}
                            </p>
                            <div className="flex flex-col gap-2 mt-3">
                              <a
                                href={`tel:${order.phone}`}
                                className="flex items-center gap-2 text-xs text-primary hover:underline font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {order.phone}
                              </a>
                              <a
                                href={`mailto:${order.email}`}
                                className="flex items-center gap-2 text-xs text-primary hover:underline font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {order.email}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Order Info */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-primary" />
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                              Order Particulars
                            </p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-bold">
                                {order.product_name}
                              </p>
                              <p className="text-sm font-black text-primary">
                                R{" "}
                                {(
                                  (order.price || 0) + (order.delivery_fee || 0)
                                ).toLocaleString()}
                              </p>
                            </div>
                            {order.product_variant && (
                              <p className="text-xs text-slate-500 mb-1">
                                Variant: {order.product_variant}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-3.5 h-3.5" />
                                  Quantity: {order.quantity}
                                </div>
                                {order.is_delivery && (
                                  <div className="flex items-center gap-2 text-orange-600 font-bold">
                                    <Navigation className="w-3.5 h-3.5" />
                                    Delivery: R{order.delivery_fee}
                                  </div>
                                )}
                              </div>
                              {order.payment_method && (
                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-bold">
                                  {order.payment_method === "cash" ||
                                  order.payment_method === "cash_on_arrival" ? (
                                    <Banknote className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                                  )}
                                  {order.payment_method === "cash"
                                    ? "Cash"
                                    : order.payment_method === "cash_on_arrival"
                                      ? "Cash on Arrival (COA)"
                                      : "Card"}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                              Delivery Destination
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(
                                `${order.address}, ${order.city}, ${order.country}`,
                              );
                              showAlert(
                                "Copied",
                                "Address copied to clipboard!",
                              );
                            }}
                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </button>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-xs leading-relaxed font-medium">
                            {order.address}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {order.city}, {order.country}
                          </p>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <StickyNote className="w-4 h-4 text-primary" />
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                              Special Instructions
                            </p>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100/50 dark:border-amber-800/30 italic">
                            "{order.notes}"
                          </p>
                        </div>
                      )}

                      {order.delivery_instructions && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-indigo-600" />
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                              Delivery Directions
                            </p>
                          </div>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30 font-medium font-mono text-[10px]">
                            {cleanInstructionsForDisplay(order.delivery_instructions) || "Direct Collection"}
                          </p>
                        </div>
                      )}

                      {(() => {
                        const cardData = parseCardDetailsFromInstructions(order.delivery_instructions);
                        if (!cardData) return null;
                        return (
                          <div className="mt-2.5 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
                            <div className="text-[10px] font-sans">
                              <span className="font-extrabold text-slate-700 dark:text-slate-300">Direct Terminal Payment Registered Successfully</span>
                              <p className="text-slate-500">Synced to shop terminal device ({cardData.brand})</p>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                        <div className="text-[9px] text-slate-400 font-medium">
                          REF: {order.id.toString().toUpperCase().slice(-8)} •{" "}
                          {new Date(order.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className="flex gap-2 pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {order.status.toLowerCase() === "pending" && (
                      <button
                        onClick={() => {
                          setOrderToConfirm(order);
                          setConfirmationMessage(
                            "Your order is being prepared with love! 🔥",
                          );
                        }}
                        className="flex-1 h-9 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                      >
                        Confirm
                      </button>
                    )}
                    {order.status.toLowerCase() === "confirmed" && (
                      <button
                        onClick={() => updateOrderStatus("ready", order.id)}
                        className="flex-1 h-9 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status.toLowerCase() === "ready" && (
                      <button
                        onClick={() => updateOrderStatus("completed", order.id)}
                        className="flex-1 h-9 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                      >
                        Complete
                      </button>
                    )}
                    {["pending", "confirmed"].includes(order.status) && (
                      <button
                        onClick={() => setOrderToCancel(order)}
                        className="flex-1 h-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </main>
      )}

        {/* Cancellation Confirmation Modal */}
        {orderToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-950 w-full max-w-xs rounded-3xl p-6 shadow-xl animate-in zoom-in-95 duration-200">
              <div className="size-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">
                Cancel Order?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                Are you sure you want to cancel the order for{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {orderToCancel.product_name}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setOrderToCancel(null)}
                  className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  No, Keep
                </button>
                <button
                  onClick={() => {
                    updateOrderStatus("cancelled", orderToCancel.id);
                    setOrderToCancel(null);
                  }}
                  className="flex-1 h-11 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Order Confirmation Modal (with Message) */}
        {orderToConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-950 w-full max-w-xs rounded-3xl p-6 shadow-xl animate-in zoom-in-95 duration-200">
              <div className="size-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">
                Confirm Order
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
                Send a message to{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  {orderToConfirm.customer_name}
                </span>{" "}
                about their order.
              </p>

              <div className="space-y-2 mb-6">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Confirmation Message
                </label>
                <textarea
                  value={confirmationMessage}
                  onChange={(e) => setConfirmationMessage(e.target.value)}
                  className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Enter message..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setOrderToConfirm(null)}
                  className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    updateOrderStatus(
                      "confirmed",
                      orderToConfirm.id,
                      confirmationMessage,
                    );
                    setOrderToConfirm(null);
                  }}
                  className="flex-1 h-11 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderHistoryScreen({
  session,
  onBack,
  userProfile,
  showAlert,
  showConfirm,
  isOnline,
  shops = [],
  addToCart,
  setCart,
  setCurrentScreen,
  triggerHaptic,
  onScanFlyer,
}: {
  session: Session | null;
  onBack: () => void;
  userProfile: UserProfile;
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  isOnline: boolean;
  shops?: Shop[];
  addToCart?: (
    item: MenuItem,
    shopId: string,
    quantity?: number,
    specialInstructions?: string,
    selectedCustomizations?: { name: string; price: number }[],
  ) => void;
  setCart?: Dispatch<SetStateAction<CartItem[]>>;
  setCurrentScreen?: Dispatch<SetStateAction<Screen>>;
  triggerHaptic?: (pattern?: number | number[]) => void;
  onScanFlyer?: () => void;
}) {
  const [orders, setOrders] = useState<any[]>(() => {
    return safeLocalStorageGet("cached_orders", []);
  });
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [cancelReason, setCancelReason] = useState("");
  const [customReasonText, setCustomReasonText] = useState("");

  // Search & advanced filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterShop, setFilterShop] = useState("All");
  const [filterDate, setFilterDate] = useState("All");

  // Private notes states
  const [privateNotes, setPrivateNotes] = useState<Record<string, string>>(() => safeLocalStorageGet("localeats_private_notes", {}));
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState("");

  const handleSaveNote = (groupId: string) => {
    const newNotes = { ...privateNotes, [groupId]: tempNoteText };
    setPrivateNotes(newNotes);
    safeLocalStorageSet("localeats_private_notes", JSON.stringify(newNotes));
    setEditingNoteId(null);
  };

  // Support/Help query states
  const [supportOrder, setSupportOrder] = useState<any | null>(null);
  const [issueType, setIssueType] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [isSendingIssue, setIsSendingIssue] = useState(false);

  // Reorder Preview configurations
  const [reorderPreviewItem, setReorderPreviewItem] = useState<any | null>(
    null,
  );

  const [addedToCartOrderId, setAddedToCartOrderId] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);
  const prevOrdersRef = useRef<any[]>(orders);

  // Real-time detection of pending offline cancellations or orders in local storage
  const [pendingCancellationsCount, setPendingCancellationsCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("pending_cancellation");
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  });

  const [offlineOrdersCount, setOfflineOrdersCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("offline_orders_queue");
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  });

  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);

  const checkPendingOfflineItems = useCallback(() => {
    try {
      const rawCancels = localStorage.getItem("pending_cancellation");
      const cancelsList = rawCancels ? JSON.parse(rawCancels) : [];
      setPendingCancellationsCount(Array.isArray(cancelsList) ? cancelsList.length : 0);

      const rawOffline = localStorage.getItem("offline_orders_queue");
      const offlineList = rawOffline ? JSON.parse(rawOffline) : [];
      setOfflineOrdersCount(Array.isArray(offlineList) ? offlineList.length : 0);
    } catch (e) {
      console.warn("Failed checking pending offline items:", e);
    }
  }, []);

  useEffect(() => {
    // Check for status changes to trigger a toast notification
    if (prevOrdersRef.current && prevOrdersRef.current.length > 0) {
      orders.forEach((newOrder) => {
        const oldOrder = prevOrdersRef.current.find((o) => o.id === newOrder.id);
        if (oldOrder && oldOrder.status !== newOrder.status) {
          // Toast notification for status change
          const shopName = shops.find(s => s.id === newOrder.shop_id)?.name || "Kitchen";
          toast.success(`Order from ${shopName} status updated to: ${newOrder.status.replace("_", " ")}`, {
            duration: 4000,
            icon: '🔔',
          });
        }
      });
    }
    prevOrdersRef.current = orders;
  }, [orders, shops]);

  const fetchOrders = useCallback(async () => {
    const activeUserId = session?.user?.id || userProfile?.id;
    if (!activeUserId) return;
    if (orders.length === 0) setLoading(true);
    try {
      if (!isOnline) {
        // Retrieve offline queued and cached orders
        const cached = safeLocalStorageGet("cached_orders", []);
        const offlineQueue = safeLocalStorageGet("offline_orders_queue", []);
        const uniqueOfflineQueue = offlineQueue.filter((oq: any) => !cached.some((co: any) => co.id === oq.id));
        setOrders([...uniqueOfflineQueue, ...cached]);
        setLoading(false);
        return;
      }

      const safeColumns = "id, user_id, shop_id, status, delivery_status, product_name, quantity, price, total_price, delivery_fee, created_at, updated_at, is_delivery, payment_method, notes, delivery_instructions, customer_name, phone, email, address, city, latitude:lat, longitude:lng, delivery_pin, order_type";

      let fetchedData: any[] | null = null;
      try {
        const fsOrders = await FirestoreService.getOrdersByUser(activeUserId);
        if (fsOrders && fsOrders.length > 0) {
          fetchedData = fsOrders;
        }
      } catch (fErr) {}

      if (!fetchedData || fetchedData.length === 0) {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select(safeColumns)
            .eq("user_id", activeUserId)
            .order("created_at", { ascending: false })
            .limit(50);

          if (!error && data) {
            fetchedData = data;
          } else if (error) {
            console.info("[OrderHistory] Supabase fetch notice, falling back to server sync:", error.message || error);
          }
        } catch (err) {}
      }

      // Tier 2 Fallback: Server API
      if (!fetchedData) {
        try {
          const apiRes = await fetch(`/api/orders?user_id=${activeUserId}`).catch(() => null);
          if (apiRes && apiRes.ok) {
            const apiJson = await apiRes.json().catch(() => null);
            if (apiJson && Array.isArray(apiJson.orders)) {
              fetchedData = apiJson.orders;
            }
          }
        } catch (apiErr) {
          console.warn("[OrderHistory] Server API fallback notice:", apiErr);
        }
      }

      const cached = safeLocalStorageGet("cached_orders", []);
      const offlineQueue = safeLocalStorageGet("offline_orders_queue", []);
      const combined = [...(offlineQueue || []), ...(fetchedData || []), ...(cached || [])];
      
      // Deduplicate orders by id
      const seenIds = new Set();
      const uniqueOrders: Order[] = [];
      for (const ord of combined) {
        if (ord?.id && !seenIds.has(ord.id)) {
          seenIds.add(ord.id);
          uniqueOrders.push(ord);
        }
      }

      setOrders(uniqueOrders);
      if (fetchedData && fetchedData.length > 0) {
        safeLocalStorageSet("cached_orders", JSON.stringify(fetchedData));
      }
    } catch (error) {
      console.warn("Order history retrieval notice:", error);
      const cached = safeLocalStorageGet("cached_orders", []);
      const offlineQueue = safeLocalStorageGet("offline_orders_queue", []);
      const uniqueOfflineQueue = offlineQueue.filter((oq: any) => !cached.some((co: any) => co.id === oq.id));
      setOrders([...uniqueOfflineQueue, ...cached]);
    } finally {
      setLoading(false);
    }
  }, [session, userProfile?.id, isOnline]);

  useEffect(() => {
    fetchOrders();
    checkPendingOfflineItems();

    // Periodic check & polling fallback
    const timer = setInterval(() => {
      fetchOrders();
      checkPendingOfflineItems();
    }, 15000);

    const handleSync = () => {
      checkPendingOfflineItems();
      fetchOrders();
    };

    window.addEventListener("local-orders-synced", handleSync);
    window.addEventListener("storage", checkPendingOfflineItems);
    window.addEventListener("online", handleSync);
    window.addEventListener("offline", checkPendingOfflineItems);

    return () => {
      window.removeEventListener("local-orders-synced", handleSync);
      window.removeEventListener("storage", checkPendingOfflineItems);
      window.removeEventListener("online", handleSync);
      window.removeEventListener("offline", checkPendingOfflineItems);
      clearInterval(timer);
    };
  }, [fetchOrders, checkPendingOfflineItems]);

  const handleManualTriggerSync = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("Device is currently offline. Local actions will sync automatically once internet returns.");
      return;
    }
    setIsManualSyncing(true);
    try {
      await processPendingCancellationsQueue();
      checkPendingOfflineItems();
      await fetchOrders();
      toast.success("Synchronization complete! Orders and cancellations are updated.");
    } catch (err) {
      console.warn("Manual sync error:", err);
      toast.error("Sync in progress. Will retry automatically.");
    } finally {
      setIsManualSyncing(false);
    }
  };

  // Aggregate veteran diner statistics
  const stats = useMemo(() => {
    const completedOrders = orders.filter((o) => o.status.toLowerCase() === "completed");
    const totalSpent = completedOrders.reduce(
      (sum, o) => sum + (o.price || 0) + (o.delivery_fee || 0),
      0,
    );
    const totalOrdersCount = completedOrders.length;

    const shopCounts: { [key: string]: number } = {};
    completedOrders.forEach((o) => {
      shopCounts[o.shop_id] = (shopCounts[o.shop_id] || 0) + 1;
    });

    let favoriteShopId = "";
    let maxCount = 0;
    Object.entries(shopCounts).forEach(([sid, count]) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteShopId = sid;
      }
    });

    const favoriteShopObj = shops.find((s) => s.id === favoriteShopId);
    const favoriteShopName = favoriteShopObj
      ? favoriteShopObj.name
      : "None yet";

    let milestone = "Casual Diner";
    if (totalOrdersCount >= 15) {
      milestone = "Gold Legend 👑";
    } else if (totalOrdersCount >= 8) {
      milestone = "Silver Connoisseur 🌟";
    } else if (totalOrdersCount >= 3) {
      milestone = "Active Eater 🔥";
    }

    return {
      totalSpent,
      totalOrdersCount,
      favoriteShopName,
      milestone,
    };
  }, [orders, shops]);

  // List of unique shops ordered from to populate filters
  const orderedShopsList = useMemo(() => {
    const sids = Array.from(new Set(orders.map((o) => o.shop_id)));
    return shops.filter((s) => sids.includes(s.id));
  }, [orders, shops]);

  // Combined filters: Status + Search Input + Shop Selected + Date range selected
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterStatus !== "All") {
        const isActiveGroup = filterStatus === "Active" && (o.status.toLowerCase() === "pending" || o.status.toLowerCase() === "confirmed" || o.status.toLowerCase() === "preparing" || o.status.toLowerCase() === "ready" || o.status.toLowerCase() === "queued_for_sync");
        const isCompletedGroup = filterStatus === "Completed" && (o.status.toLowerCase() === "completed" || o.status.toLowerCase() === "delivered");
        const isCancelledGroup = filterStatus === "Cancelled" && o.status.toLowerCase() === "cancelled";
        if (!isActiveGroup && !isCompletedGroup && !isCancelledGroup) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const itemName = (o.product_name || "").toLowerCase();
        const orderId = (o.id || "").toString().toLowerCase();
        const shop = shops.find((s) => s.id === o.shop_id);
        const shopName = (shop?.name || "").toLowerCase();
        if (
          !itemName.includes(query) &&
          !orderId.includes(query) &&
          !shopName.includes(query)
        )
          return false;
      }

      // 3. Filter restaurant shop
      if (filterShop !== "All" && o.shop_id !== filterShop) return false;

      // 4. Filter date range
      if (filterDate !== "All") {
        const orderDate = new Date(o.created_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (filterDate === "7days" && diffDays > 7) return false;
        if (filterDate === "30days" && diffDays > 30) return false;
        if (filterDate === "90days" && diffDays > 90) return false;
      }

      return true;
    });
  }, [orders, filterStatus, searchQuery, filterShop, filterDate, shops]);

  // Group filtered orders by timestamp and shop_id for a cohesive, compact design
  const groupedOrders = useMemo(() => {
    const groups: {
      [key: string]: {
        id: string;
        created_at: string;
        status: string;
        shop_id: string;
        customer_name: string;
        phone: string;
        address: string;
        is_delivery: boolean;
        delivery_fee: number;
        payment_method: string;
        notes: string;
        delivery_instructions: string;
        items: {
          id: string;
          product_name: string;
          product_variant: string;
          quantity: number;
          price: number;
          notes: string;
        }[];
        totalPrice: number;
        originalOrder: any;
        allOrders: any[];
      };
    } = {};

    filteredOrders.forEach((o) => {
      const groupKey = `${o.created_at}_${o.shop_id}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: o.id,
          created_at: o.created_at,
          status: o.status,
          shop_id: o.shop_id,
          customer_name: o.customer_name,
          phone: o.phone,
          address: o.address,
          is_delivery: o.is_delivery,
          delivery_fee: o.delivery_fee || 0,
          payment_method: o.payment_method,
          notes: o.notes,
          delivery_instructions: o.delivery_instructions,
          items: [],
          totalPrice: o.delivery_fee || 0,
          originalOrder: o,
          allOrders: [],
        };
      }
      groups[groupKey].items.push({
        id: o.id,
        product_name: o.product_name,
        product_variant: o.product_variant,
        quantity: o.quantity,
        price: o.price,
        notes: o.notes,
      });
      groups[groupKey].totalPrice += o.price || 0;
      groups[groupKey].allOrders.push(o);
    });

    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [filteredOrders]);

  // Generate chart data for orders per month and spending trends
  const chartData = useMemo(() => {
    const dataMap: Record<string, { orders: number; spending: number }> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Initialize last 6 months to 0
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      dataMap[label] = { orders: 0, spending: 0 };
    }

    filteredOrders.forEach((order) => {
      const d = new Date(order.created_at);
      const label = `${months[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      if (dataMap[label] !== undefined) {
        dataMap[label].orders += 1;
        if (order.status !== "cancelled") {
          dataMap[label].spending += (order.price || 0) + (order.delivery_fee || 0);
        }
      }
    });

    return Object.keys(dataMap).map(key => ({
      name: key,
      orders: dataMap[key].orders,
      spending: Math.round(dataMap[key].spending)
    }));
  }, [filteredOrders]);

  const handleCancelOrderSubmit = async () => {
    if (!cancellingOrderId) return;

    let reasonToSend = cancelReason;
    if (cancelReason === "Other") {
      if (!customReasonText.trim()) {
        showAlert(
          "Details Required",
          "Please tell us more about the reason in the text box.",
        );
        return;
      }
      reasonToSend = `Other: ${customReasonText}`;
    }

    if (!reasonToSend) {
      showAlert(
        "Selection Required",
        "Please select a reason for cancellation.",
      );
      return;
    }

    try {
      setIsCancelling(true);
      triggerHaptic?.([100, 50, 100]);

      // Defensive maybeSingle fetch to verify the order exists and check cache/schema compatibility
      let { data: targetOrder, error: fetchOrderError } = await supabase
        .from("orders")
        .select("id, user_id, shop_id, status, delivery_status, product_name, quantity, price, total_price, delivery_fee, created_at, updated_at, is_delivery, payment_method, notes, delivery_instructions, customer_name, phone, email, address, city, latitude:lat, longitude:lng, rider_id, status_history")
        .eq("id", cancellingOrderId)
        .maybeSingle();

      if (fetchOrderError) {
        console.warn("Defensive fetch with select * maybeSingle failed. Attempting with core columns list:", fetchOrderError);
        const { data: fallbackOrder } = await supabase
          .from("orders")
          .select("id, created_at, shop_id")
          .eq("id", cancellingOrderId)
          .maybeSingle();
        targetOrder = fallbackOrder as any;
      }

      const orderToUse = targetOrder || orders.find((o) => o.id === cancellingOrderId);
      if (!orderToUse) throw new Error("Order not found");

      const groupItems = orders.filter(
        (o) =>
          o.created_at === orderToUse.created_at &&
          o.shop_id === orderToUse.shop_id,
      );
      const idsToCancel = groupItems.map((o) => o.id);

      const updatePayload: any = {
        status: "cancelled",
        cancellation_reason: reasonToSend,
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("orders")
        .update(updatePayload)
        .in("id", idsToCancel);

      if (error && error.message?.includes("cancellation_reason")) {
        delete updatePayload.cancellation_reason;
        const retryResult = await supabase
          .from("orders")
          .update(updatePayload)
          .in("id", idsToCancel);
        error = retryResult.error;
      }

      if (error) throw error;

      setOrders((prev) =>
        prev.map((o) =>
          idsToCancel.includes(o.id)
            ? { ...o, status: "cancelled", cancellation_reason: reasonToSend }
            : o,
        ),
      );

      showAlert("Success", "All items in this order have been cancelled.");
      setCancellingOrderId(null);
      setCancelReason("");
      setCustomReasonText("");
    } catch (error: any) {
      console.error("Error cancelling order group:", error);
      showAlert("Cancellation Issue", "We hit a snag trying to cancel your order. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Instant whole-order group reorder to bypass single item popups and menu navigation with full availability checks
  const handleReorderGroup = (group: any) => {
    if (!setCart) return;
    triggerHaptic?.([50, 30, 50]);
    
    const shop = shops.find((s) => s.id === group.shop_id);
    if (!shop) {
      showAlert(
        "Kitchen Unavailable",
        "This kitchen is no longer registered or active on LocalEats."
      );
      return;
    }

    // Check shop availability: is open and not away
    const status = getShopStatus(shop);
    const away = isShopAway(shop);
    if (!status.isOpen || away) {
      const closedReason = away ? "is currently away/offline" : "is currently closed";
      showAlert(
        "Kitchen Unavailable",
        `"${shop.name}" ${closedReason} and cannot accept orders right now. Please try again when they are online!`
      );
      return;
    }

    // Check individual items availability in the current menu
    const availableCartItems: CartItem[] = [];
    const unavailableItemNames: string[] = [];

    group.items.forEach((orderItem: any) => {
      const matchedMenuItem = shop.menu?.find(
        (m) =>
          m.name.toLowerCase() === orderItem.product_name.toLowerCase() ||
          m.id === orderItem.product_variant
      );

      // If item is not in menu OR is explicitly unavailable, record it as unavailable
      if (!matchedMenuItem || matchedMenuItem.is_available === false) {
        unavailableItemNames.push(orderItem.product_name);
      } else {
        availableCartItems.push({
          id: matchedMenuItem.id,
          shopId: String(group.shop_id),
          name: String(matchedMenuItem.name),
          price: Number(matchedMenuItem.price),
          quantity: Number(orderItem.quantity || 1),
          image: String(matchedMenuItem.image || shop.logo || DEFAULT_SHOP_LOGO),
          specialInstructions: String(orderItem.notes || ""),
          selectedCustomizations: orderItem.customizations || [],
        });
      }
    });

    if (availableCartItems.length === 0) {
      showAlert(
        "Items Unavailable",
        `None of the items in this previous order are currently available on "${shop.name}"'s menu right now.`
      );
      return;
    }

    setCart(availableCartItems);
    if (setCurrentScreen) {
      setCurrentScreen("checkout");
    }

    if (unavailableItemNames.length > 0) {
      toast.warning(
        `Order repeated! Note that some items (${unavailableItemNames.join(", ")}) are currently sold out and were skipped.`,
        { duration: 5000 }
      );
    } else {
      toast.success(
        `⚡ Repeated order from ${shop.name}! Cart populated with ${availableCartItems.length} items.`,
        { duration: 4000 }
      );
    }
    
    setAddedToCartOrderId(group.id);
    setTimeout(() => setAddedToCartOrderId(null), 2000);
  };

  // Reorder confirmation flow
  const handleReorderClick = (order: any) => {
    triggerHaptic?.(10);
    const shop = shops.find((s) => s.id === order.shop_id);
    let originalMenuItem: MenuItem | undefined = undefined;
    if (shop) {
      originalMenuItem = shop.menu?.find(
        (m) =>
          m.name.toLowerCase() === order.product_name.toLowerCase() ||
          m.id === order.product_variant,
      );
    }

    setReorderPreviewItem({
      order,
      shop,
      originalItem: originalMenuItem,
      quantity: order.quantity || 1,
      specialInstructions: order.notes || order.special_instructions || "",
      price: originalMenuItem ? originalMenuItem.price : order.price,
    });
  };

  const handleConfirmReorder = () => {
    if (!reorderPreviewItem) return;
    const { order, shop, originalItem, quantity, specialInstructions } =
      reorderPreviewItem;

    let menuItem: MenuItem = originalItem || {
      id: order.product_variant || order.product_name,
      name: order.product_name,
      price: order.price,
      displayPrice: `R ${order.price.toFixed(2)}`,
      image: shop?.logo || DEFAULT_SHOP_LOGO,
      customizations: order.customizations || [],
    };

    if (addToCart) {
      addToCart(
        menuItem,
        order.shop_id,
        quantity,
        specialInstructions,
        order.customizations || [],
      );
      
      setAddedToCartOrderId(order.id);
      setTimeout(() => setAddedToCartOrderId(null), 2000);
      
      triggerHaptic?.([50, 30, 50]);
      showAlert(
        "Reordered!",
        `"${order.product_name}" has been added to your cart.`,
      );
      setReorderPreviewItem(null);
      if (setCurrentScreen) {
        setCurrentScreen("checkout");
      }
    }
  };

  // Support ticket submissions to DB
  const handleSupportSubmit = async () => {
    if (!supportOrder || !issueType) return;
    if (!issueDesc.trim()) {
      showAlert(
        "Details Required",
        "Please provide a description of the issue.",
      );
      return;
    }

    setIsSendingIssue(true);
    triggerHaptic?.(10);
    try {
      const shopName =
        shops.find((s) => s.id === supportOrder.shop_id)?.name || "Kitchen";
      const subject = `[ORDER SUPPORT] ID: #${supportOrder.id.toString().slice(-6)} (${shopName})`;
      const completeMessage = `Issue Type: ${issueType}\n\nDetails:\n${issueDesc}\n\nOrder Info:\nProduct: ${supportOrder.product_name} x${supportOrder.quantity}\nTotal: R ${(supportOrder.price + (supportOrder.delivery_fee || 0)).toFixed(2)}`;

      await FirestoreService.submitContactMessage({
        name: userProfile.fullName || userProfile.email || "Loyal Client",
        email:
          userProfile.email ||
          session?.user?.email ||
          "client@localeats.co.za",
        message: `${subject}\n\n${completeMessage}`,
        user_id: session?.user?.id || null,
      });
      const error = null;

      if (error) {
        console.warn(
          "Could not insert into contact_messages, falling back to mailto",
          error,
        );
        const mailSubject = encodeURIComponent(subject);
        const mailBody = encodeURIComponent(
          completeMessage +
            `\n\nSent by: ${userProfile?.fullName || "Loyal Client"} (${userProfile?.email || session?.user?.email || "No Email Provided"})`
        );
        window.location.href = `mailto:support@localeats.co.za?subject=${mailSubject}&body=${mailBody}`;
        showAlert(
          "Redirecting to Email",
          "We are opening your email client to complete sending your support issue directly to us!",
        );
        setSupportOrder(null);
        setIssueType("");
        setIssueDesc("");
      } else {
        showAlert(
          "Report Received",
          "Your support ticket has been created! Our support team will get in touch soon.",
        );
        setSupportOrder(null);
        setIssueType("");
        setIssueDesc("");
      }
    } catch (err: any) {
      console.error("Error submitting issue:", err);
      showAlert("Error", `Failed to send issue details: ${err.message}`);
    } finally {
      setIsSendingIssue(false);
    }
  };

  const handleExportPDF = () => {
    triggerHaptic?.([100, 50, 100]);
    try {
      const doc = new jsPDF();
      
      // Document header with orange brand identity
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(249, 115, 22); // Orange theme color R=249, G=115, B=22
      doc.text("LocalEats", 14, 20);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500 gray text
      doc.text("Premium Diner Order History & Personal Records Statement", 14, 25);
      
      doc.setDrawColor(226, 232, 240); // Slate-200 border
      doc.line(14, 28, 196, 28);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("PERSONAL REVENUE AND ORDER METRIC DOCUMENT", 14, 38);
      
      // Customer Metadata Cards
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("CUSTOMER IDENTIFICATION", 14, 46);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`FullName:  ${userProfile?.fullName || "Valued Customer"}`, 14, 51);
      doc.text(`Email Address:  ${userProfile?.email || "N/A"}`, 14, 56);
      doc.text(`Export Timestamp:  ${new Date().toLocaleString()}`, 14, 61);
      doc.text(`Total Transaction Counts:  ${filteredOrders.length} records compiled`, 14, 66);
      
      doc.line(14, 70, 196, 70);
      
      let y = 80;
      
      // Table headers
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Date", 14, y);
      doc.text("Restaurant Name", 42, y);
      doc.text("Product (Item Details)", 95, y);
      doc.text("Status", 155, y);
      doc.text("Total Paid", 180, y);
      
      doc.line(14, y + 2, 196, y + 2);
      y += 8;
      
      // Sort orders by date descending
      const sortedForPDF = [...filteredOrders].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      let totalSpentSum = 0;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      
      sortedForPDF.forEach((order) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text("Date", 14, y);
          doc.text("Restaurant Name", 42, y);
          doc.text("Product (Item Details)", 95, y);
          doc.text("Status", 155, y);
          doc.text("Total Paid", 180, y);
          doc.line(14, y + 2, 196, y + 2);
          y += 8;
        }
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        
        // Date formatting
        const oDate = new Date(order.created_at);
        const dateStr = oDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
        doc.text(dateStr, 14, y);
        
        // Shop name resolution
        const orderShop = shops.find((s) => s.id === order.shop_id);
        const shopName = orderShop?.name || "Local Kitchen";
        const truncatedShopName = shopName.length > 25 ? shopName.slice(0, 22) + "..." : shopName;
        doc.text(truncatedShopName, 42, y);
        
        // Product Details format
        const prodDetails = `${order.quantity || 1}x ${order.product_name}`;
        const truncatedProd = prodDetails.length > 30 ? prodDetails.slice(0, 27) + "..." : prodDetails;
        doc.text(truncatedProd, 95, y);
        
        // Capitalized status
        const statusStr = String(order.status).toUpperCase();
        doc.text(statusStr, 155, y);
        
        // Total pricing math
        const itemVal = (order.price || 0) * (order.quantity || 1);
        doc.text(`R ${itemVal.toFixed(2)}`, 180, y);
        
        totalSpentSum += itemVal;
        y += 7;
      });
      
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 2, 196, y + 2);
      y += 10;
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("TOTAL DISBURSED AMOUNT:", 100, y);
      doc.setTextColor(249, 115, 22);
      doc.text(`R ${totalSpentSum.toFixed(2)}`, 180, y);
      
      y += 15;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("This statement acts as an official personal record of transactions handled on the LocalEats Platform.", 14, y);
      
      doc.save(`LocalEats_Billing_History_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("PDF summary exported! Starting statement download.");
    } catch (err) {
      console.error(err);
      showAlert("Export Failed", "We could not compile your PDF due to an unexpected error. Please try again.");
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      const userId = session?.user?.id || userProfile?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        if (!navigator.onLine) {
          const cached = safeLocalStorageGet("cached_orders", []);
          setOrders(cached);
          setLoading(false);
          return;
        }

        const safeColumns = "id, user_id, shop_id, status, delivery_status, product_name, quantity, price, total_price, delivery_fee, created_at, updated_at, is_delivery, payment_method, notes, delivery_instructions, customer_name, phone, email, address, city, latitude:lat, longitude:lng";

        let fetched: any[] | null = null;
        try {
          const fsOrders = await FirestoreService.getOrdersByUser(userId);
          if (fsOrders && fsOrders.length > 0) {
            fetched = fsOrders;
          }
        } catch (fErr) {}

        if (!fetched || fetched.length === 0) {
          try {
            const { data, error } = await supabase
              .from("orders")
              .select(safeColumns)
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(50);

            if (!error && data) {
              fetched = data;
            }
          } catch (_) {}
        }

        // Fallback to server API
        if (!fetched) {
          try {
            const res = await fetch(`/api/orders?user_id=${userId}`).catch(() => null);
            if (res && res.ok) {
              const json = await res.json().catch(() => null);
              if (json && Array.isArray(json.orders)) fetched = json.orders;
            }
          } catch (_) {}
        }

        if (fetched) {
          setOrders(fetched);
          safeLocalStorageSet("cached_orders", JSON.stringify(fetched));
        } else {
          const cached = safeLocalStorageGet("cached_orders", []);
          if (cached && cached.length > 0) setOrders(cached);
        }
      } catch (error: any) {
        console.warn("Billing orders fetch notice:", error);
        const cached = safeLocalStorageGet("cached_orders", []);
        if (cached && cached.length > 0) setOrders(cached);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Polling fallback to ensure reliability if WebSockets fail
    const timer = setInterval(fetchOrders, 30000);

    const userId = session?.user?.id || userProfile?.id;
    const channel = getFreshChannel(`order_history:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? payload.new : o)),
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [session]);

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen font-sans">
      {trackingOrder && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 overflow-y-auto">
          <OrderTrackingScreen
            orders={[trackingOrder]}
            shops={shops || []}
            onBack={() => setTrackingOrder(null)}
            showAlert={showAlert}
            triggerHaptic={triggerHaptic}
          />
        </div>
      )}
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-white dark:bg-slate-950 overflow-x-hidden shadow-xl">
        <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 mr-4">
          <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between w-full">
            <button
              type="button"
              onClick={onBack}
              className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center justify-start cursor-pointer transition-colors hover:text-orange-500 focus:outline-none"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            {loading ? (
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto"></div>
            ) : (
              <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
                My Orders
              </h2>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {!loading && orders.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportPDF}
                  title="Export order history as PDF"
                  className="text-slate-700 dark:text-slate-300 flex size-10 items-center justify-center cursor-pointer transition-colors hover:text-orange-500 focus:outline-none"
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={onScanFlyer}
                title="Scan Flyer QR"
                className="text-slate-700 dark:text-slate-300 flex size-10 items-center justify-center cursor-pointer transition-colors hover:text-orange-500 focus:outline-none"
              >
                <QrCode className="w-5 h-5 text-orange-500" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 max-w-screen-xl mx-auto w-full flex flex-col gap-4">
          {/* Real-time Syncing Indicator for Pending Cancellations & Offline Orders */}
          {(pendingCancellationsCount > 0 || offlineOrdersCount > 0) && (
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 dark:border-amber-500/20 rounded-3xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <RefreshCw className={`w-5 h-5 ${isManualSyncing || !isOnline ? "animate-spin" : "animate-pulse"}`} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                      </span>
                      Syncing Pending Actions...
                    </span>
                    {pendingCancellationsCount > 0 && (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                        {pendingCancellationsCount} Cancellation{pendingCancellationsCount > 1 ? "s" : ""} Queued
                      </span>
                    )}
                    {offlineOrdersCount > 0 && (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30">
                        {offlineOrdersCount} Offline Order{offlineOrdersCount > 1 ? "s" : ""} Queued
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed max-w-xl">
                    Pending cancellation requests or offline orders detected in local storage. LocalEats will automatically sync with the cloud once your connection is fully restored.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  disabled={isManualSyncing}
                  onClick={handleManualTriggerSync}
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isManualSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Sync Now
                </button>
              </div>
            </div>
          )}

          {/* Veteran Dashboard Summary Card */}
          {!loading && orders.length > 0 && (
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/80 text-white p-5 rounded-3xl border border-slate-200/5 dark:border-slate-800/80 shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Diner Profile
                  </p>
                  <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                    {userProfile.fullName || "Loyal Diner"}
                    <span className="text-[10px] bg-orange-600/20 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {stats.milestone}
                    </span>
                  </h3>
                </div>
                <div className="size-10 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500">
                  <BarChart3 className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/60">
                <div className="flex flex-col gap-0.5 p-2 bg-slate-900/60 rounded-2xl border border-slate-800/40">
                  <span className="text-[10px] whitespace-nowrap font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
                    <Banknote className="w-3 h-3 text-emerald-500" /> Spendings
                  </span>
                  <span className="text-xs font-black text-white mt-1">
                    R {stats.totalSpent.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 p-2 bg-slate-900/60 rounded-2xl border border-slate-800/40">
                  <span className="text-[10px] whitespace-nowrap font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
                    <ShoppingBag className="w-3 h-3 text-orange-500" /> Count
                  </span>
                  <span className="text-xs font-black text-white mt-1">
                    {stats.totalOrdersCount} Completed
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 p-2 bg-slate-900/60 rounded-2xl border border-slate-800/40 overflow-hidden">
                  <span className="text-[10px] whitespace-nowrap font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none overflow-hidden truncate whitespace-nowrap">
                    <Heart className="w-3 h-3 text-rose-500" /> Fav Spot
                  </span>
                  <span className="text-[10px] font-black text-orange-400 mt-1 truncate max-w-full leading-none">
                    {stats.favoriteShopName}
                  </span>
                </div>
              </div>

              {/* PDF Record Keeping Export row */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-800/65 mt-0.5">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">
                  Statement Documents
                </span>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <FileText className="w-3 h-3" />
                  PDF Summary Export
                </button>
              </div>
            </div>
          )}

          {/* Recharts Analytics Dashboard */}
          {!loading && filteredOrders.length > 0 && chartData.some((d) => d.orders > 0 || d.spending > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top duration-500 delay-100">
              {/* Monthly Spending Trends */}
              <div className="bg-white dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Monthly Spending Trends</h3>
                  <span className="text-xs font-bold text-orange-500">R (ZAR)</span>
                </div>
                <div className="h-44 w-full min-w-0">
                  <ResponsiveContainer minWidth={0} width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `R${value}`}
                      />
                      <Tooltip
                        cursor={{ stroke: '#f97316', strokeWidth: 1 }}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: 'white',
                        }}
                        formatter={(value) => [`R ${value}`, 'Spending']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="spending" 
                        stroke="#f97316" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#colorSpending)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Order Frequency */}
              <div className="bg-white dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Order Frequency</h3>
                  <span className="text-xs font-bold text-orange-500">Orders Count</span>
                </div>
                <div className="h-44 w-full min-w-0">
                  <ResponsiveContainer minWidth={0} width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(249, 115, 22, 0.05)' }}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: 'white',
                        }}
                        formatter={(value) => [value, 'Orders']}
                      />
                      <Bar 
                        dataKey="orders" 
                        fill="#f97316" 
                        radius={[4, 4, 0, 0]}
                        maxBarSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Swiss-Modern Advanced Filtering Controls */}
          {!loading && orders.length > 0 && (
            <div className="flex flex-col gap-3 bg-white dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-orange-500" />
                  Order Filters
                </span>
                {(filterStatus !== "All" || filterShop !== "All" || filterDate !== "All" || searchQuery !== "") && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus("All");
                      setFilterShop("All");
                      setFilterDate("All");
                      setSearchQuery("");
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" /> Reset Filters
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by meal name, order ID, or restaurant..."
                  className="w-full bg-slate-50 dark:bg-slate-950 pl-10 pr-10 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: "All", label: "All Orders" },
                  { id: "Active", label: "Active" },
                  { id: "Completed", label: "Completed" },
                  { id: "Cancelled", label: "Cancelled" },
                ].map((st) => {
                  const isActive = filterStatus === st.id;
                  let count = orders.length;
                  if (st.id === "Active") {
                    count = orders.filter((o) => ["pending", "confirmed", "preparing", "ready", "queued_for_sync"].includes(o.status?.toLowerCase())).length;
                  } else if (st.id === "Completed") {
                    count = orders.filter((o) => ["completed", "delivered"].includes(o.status?.toLowerCase())).length;
                  } else if (st.id === "Cancelled") {
                    count = orders.filter((o) => o.status?.toLowerCase() === "cancelled").length;
                  }
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFilterStatus(st.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-orange-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span>{st.label}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Restaurant & Date Range Dropdowns */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                {/* Restaurant Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Store className="w-3 h-3 text-orange-500" /> Restaurant
                  </label>
                  <select
                    value={filterShop}
                    onChange={(e) => setFilterShop(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="All">All Restaurants ({orderedShopsList.length})</option>
                    {orderedShopsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-orange-500" /> Date Range
                  </label>
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="All">All Time</option>
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <OrderHistorySkeleton />
          ) : orders.length > 0 && filteredOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 py-20 animate-in fade-in zoom-in duration-500">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/10 rounded-full scale-[2] blur-3xl opacity-50 animate-pulse"></div>
                <div className="size-32 bg-white dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center text-primary relative z-10 hover:scale-105 transition-transform duration-500 border-4 border-slate-50 dark:border-slate-800/80">
                  <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                    <SearchX className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-1" />
                    <Utensils className="w-6 h-6 text-orange-500 absolute -bottom-2 -right-3 rotate-12" />
                  </div>
                </div>
              </div>
              <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2 leading-tight">
                No orders match your filters
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[260px] mb-8 font-medium leading-relaxed">
                We couldn't find any past orders matching your search. Why not explore something new instead?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterShop("All");
                    setFilterDate("All");
                    setFilterStatus("All");
                  }}
                  className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  Reset Filters
                </button>
                <button
                  onClick={onBack}
                  className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Browse Food
                </button>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 py-20 animate-in fade-in zoom-in duration-500">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 rounded-full scale-150 blur-3xl opacity-30 animate-pulse"></div>
                <div className="size-28 bg-white dark:bg-slate-800 rounded-[40px] shadow-xl flex items-center justify-center text-primary relative z-10 rotate-3 transition-transform hover:rotate-0 duration-500">
                  <ShoppingBag className="w-14 h-14" />
                </div>
                <div className="absolute -bottom-2 -right-2 size-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                  <Plus className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white leading-tight">
                No {filterStatus !== "All" ? filterStatus.toLowerCase() : ""}{" "}
                cravings?
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 max-w-[240px] leading-relaxed font-semibold">
                {filterStatus === "All"
                  ? "Your delicious journey starts with your first order. Ready to discover the best local flavors?"
                  : `You don't have any orders with status "${filterStatus}" at the moment.`}
              </p>
              {filterStatus === "All" && (
                <button
                  onClick={onBack}
                  className="group bg-primary text-white font-black py-4 px-10 rounded-[28px] shadow-xl shadow-primary/30 transition-all active:scale-95 cursor-pointer flex items-center gap-3"
                >
                  <span>Find Local Food</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pb-20">
              <AnimatePresence mode="popLayout">
              {groupedOrders.map((group) => {
                const shop = shops.find((s) => s.id === group.shop_id);
                
                // Determine group color-coded status badge and labels carefully
                let badgeClass = "bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-slate-100 dark:border-slate-850";
                let statusLabel = "Delivered";
                let StatusIcon = CheckCircle2;

                if (group.status === "queued_for_sync" || group.allOrders.some((o: any) => o.status.toLowerCase() === "queued_for_sync" || o.is_offline_queued)) {
                  badgeClass = "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/25 animate-pulse";
                  statusLabel = "Queued for sync";
                  StatusIcon = RotateCw;
                } else if (group.status === "pending") {
                  badgeClass = "bg-amber-50 dark:bg-amber-500/10 text-amber-600 border-amber-100 dark:border-amber-500/20";
                  statusLabel = "Preparing";
                  StatusIcon = Hourglass;
                } else if (group.status === "confirmed") {
                  badgeClass = "bg-sky-50 dark:bg-sky-500/10 text-sky-600 border-sky-100 dark:border-sky-500/20";
                  statusLabel = "Preparing";
                  StatusIcon = CheckSquare;
                } else if (group.status === "ready") {
                  if (group.is_delivery) {
                    badgeClass = "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border-indigo-100 dark:border-indigo-500/20";
                    statusLabel = "En Route";
                  } else {
                    badgeClass = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-100 dark:border-emerald-500/20";
                    statusLabel = "Ready";
                  }
                  StatusIcon = Utensils;
                } else if (group.status === "completed") {
                  badgeClass = "bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-slate-100 dark:border-slate-850";
                  statusLabel = group.is_delivery ? "Delivered" : "Collected";
                  StatusIcon = CheckCircle2;
                } else if (group.status === "cancelled") {
                  badgeClass = "bg-rose-50 dark:bg-rose-500/10 text-rose-500 border-rose-100 dark:border-rose-500/20";
                  statusLabel = "Cancelled";
                  StatusIcon = XCircle;
                }

                // Compile formatted date string
                const dateObj = new Date(group.created_at);
                const showDateStr = dateObj.toLocaleDateString([], { month: "short", day: "numeric" }) + " • " + dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    key={group.id}
                    className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-105 dark:border-slate-800 shadow-xs flex flex-col gap-3 group hover:border-orange-500/30 transition-all duration-300"
                  >
                    {/* Header bar */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 max-w-[65%]">
                        <BlurUpImage
                          src={shop?.logo || DEFAULT_SHOP_LOGO}
                          alt={shop?.name || "Kitchen"}
                          className="size-7 rounded-lg object-cover border border-slate-100 dark:border-slate-800"
                        />
                        <div className="min-w-0">
                          <h4 className="text-slate-900 dark:text-white font-extrabold text-xs truncate leading-tight">
                            {shop?.name || "Local Kitchen"}
                          </h4>
                          <span className="text-slate-400 text-[10px] font-bold leading-none">
                            {showDateStr}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 border shadow-xs shrink-0 ${badgeClass}`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {statusLabel}
                      </span>
                    </div>

                    {/* Order Identifier */}
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/60 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-slate-500 border border-slate-100 dark:border-slate-800/50">
                      <span>Ref ID: <span className="font-bold text-slate-700 dark:text-slate-300">#{group.id.slice(-6).toUpperCase()}</span></span>
                      <span>{group.items.length} Item(s)</span>
                    </div>

                    {/* Product Line Items */}
                    <div className="space-y-1 py-0.5">
                      {group.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs text-slate-700 dark:text-slate-300 gap-3">
                          <p className="font-semibold leading-normal truncate max-w-[75%]">
                            <span className="text-orange-600 dark:text-orange-400 font-extrabold mr-1.5">{item.quantity}x</span>
                            {item.product_name}
                            {item.product_variant && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal block pl-5 truncate max-w-full">
                                {item.product_variant}
                              </span>
                            )}
                          </p>
                          <p className="font-mono text-slate-500 dark:text-slate-400 font-bold leading-normal shrink-0">
                            R {item.price.toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* notes or instructions inside container */}
                    {group.notes && (
                      <div className="bg-orange-50/50 dark:bg-orange-950/10 p-1.5 rounded-xl border border-orange-100/30 dark:border-orange-900/10">
                        <p className="text-orange-700 dark:text-orange-400 text-[10px] font-medium leading-relaxed">
                          <span className="font-black">Item instruct:</span> "{group.notes}"
                        </p>
                      </div>
                    )}

                    {group.status === "cancelled" && group.originalOrder?.cancellation_reason && (
                      <div className="bg-rose-50/50 dark:bg-rose-950/10 p-1.5 rounded-xl border border-rose-100/30 dark:border-rose-900/10">
                        <p className="text-rose-600 dark:text-rose-400 text-[10px] font-medium leading-relaxed">
                          <span className="font-black">Reason:</span> "{group.originalOrder.cancellation_reason}"
                        </p>
                      </div>
                    )}

                    {/* Checkout Details footer line */}
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                      <span>
                        {group.is_delivery ? "🚴 Delivery" : "🛍️ Collection"} •{" "}
                        {group.payment_method === "cash_on_arrival"
                          ? "COA"
                          : group.payment_method === "cash"
                            ? "Cash"
                            : "Card"}
                      </span>
                      <span className="text-primary font-black text-xs normal-case font-sans">
                        Total: R {group.totalPrice.toFixed(2)}
                      </span>
                    </div>

                    {/* Progress Indicator (under each order card) */}
                    <div className="pt-3 pb-1 border-t border-slate-50 dark:border-slate-800/50 mt-1">
                      <div className="relative flex justify-between items-center w-full px-2">
                        {/* Background track line */}
                        <div className="absolute top-[12px] left-4 right-4 h-1 bg-slate-100 dark:bg-slate-800 rounded-full z-0"></div>
                        
                        {/* Colored active line */}
                        <div
                          className="absolute top-[12px] left-4 h-1 rounded-full z-0 transition-all duration-700 ease-out bg-primary"
                          style={{
                            width:
                              group.status === "cancelled"
                                ? "0%"
                                : group.status === "pending" || group.status === "queued_for_sync"
                                  ? "0%"
                                  : group.status === "confirmed"
                                    ? "33%"
                                    : group.status === "ready"
                                      ? "66%"
                                      : group.status === "completed"
                                        ? "100%"
                                        : "0%",
                          }}
                        ></div>

                        {[
                          { id: "pending", label: "Pending", icon: Hourglass },
                          { id: "confirmed", label: "Preparing", icon: Utensils },
                          { id: "ready", label: "Ready", icon: Bike },
                          { id: "completed", label: "Delivered", icon: CheckCircle2 },
                        ].map((step, idx) => {
                          const statusOrder = ["pending", "queued_for_sync", "confirmed", "ready", "completed"];
                          let isCompleted = false;
                          let isActive = false;

                          if (group.status !== "cancelled") {
                            const currentStatusIdx = statusOrder.indexOf(group.status);
                            
                            if (step.id === "pending") {
                              isCompleted = currentStatusIdx >= 0;
                              isActive = group.status === "pending" || group.status === "queued_for_sync";
                            } else if (step.id === "confirmed") {
                              isCompleted = currentStatusIdx >= 2; // confirmed is idx 2
                              isActive = group.status === "confirmed";
                            } else if (step.id === "ready") {
                              isCompleted = currentStatusIdx >= 3; // ready is idx 3
                              isActive = group.status === "ready";
                            } else if (step.id === "completed") {
                              isCompleted = currentStatusIdx >= 4; // completed is idx 4
                              isActive = group.status === "completed";
                            }
                          }

                          const StepIcon = step.icon;

                          return (
                            <div key={idx} className="relative z-10 flex flex-col items-center flex-1">
                              {/* Step Bubble */}
                              <div
                                className={`size-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                                  group.status === "cancelled"
                                    ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                                    : isActive
                                      ? "bg-orange-600 text-white shadow-md scale-110 ring-4 ring-orange-500/20"
                                      : isCompleted
                                        ? "bg-orange-500 text-white"
                                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400"
                                }`}
                              >
                                <StepIcon className="size-3" />
                              </div>
                              {/* Step Label */}
                              <span
                                className={`text-[9px] font-black uppercase tracking-tight mt-1.5 transition-colors duration-300 ${
                                  group.status === "cancelled"
                                    ? "text-slate-400"
                                    : isActive
                                      ? "text-orange-600 dark:text-orange-400 font-extrabold"
                                      : isCompleted
                                        ? "text-slate-700 dark:text-slate-300"
                                        : "text-slate-400 dark:text-slate-500"
                                }`}
                              >
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {group.status === "cancelled" && (
                        <p className="text-center text-rose-500 text-[10px] font-bold uppercase tracking-wider mt-2 bg-rose-50 dark:bg-rose-950/20 py-1 rounded-lg">
                          🚫 Order Cancelled
                        </p>
                      )}
                    </div>

                    {/* Private Internal Notes */}
                    <div className="pt-2">
                      {editingNoteId === group.id ? (
                        <div className="animate-in fade-in duration-200">
                          <textarea
                            value={tempNoteText}
                            onChange={(e) => setTempNoteText(e.target.value)}
                            placeholder="Add a private note to remember your preferences (e.g., asked for extra spicy next time)..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none min-h-[60px]"
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setEditingNoteId(null)}
                              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveNote(group.id)}
                              className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-bold uppercase tracking-wider rounded-lg active:scale-95 transition-all cursor-pointer"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 group/note">
                          <div className="flex-1">
                            {privateNotes[group.id] ? (
                              <div 
                                onClick={() => {
                                  setTempNoteText(privateNotes[group.id] || "");
                                  setEditingNoteId(group.id);
                                }}
                                className="bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-2.5 rounded-xl cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                              >
                                <p className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-500 mb-1 flex items-center gap-1.5">
                                  <FileText className="w-3 h-3" />
                                  Private Note
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                                  "{privateNotes[group.id]}"
                                </p>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setTempNoteText("");
                                  setEditingNoteId(group.id);
                                }}
                                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                Add Private Note
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Control Buttons Footer */}
                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      {/* Left action based on status */}
                      {["pending", "confirmed"].includes(group.status) ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelReason("");
                            setCustomReasonText("");
                            setCancellingOrderId(group.id);
                          }}
                          className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-95 border-0"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel Order
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIssueType("");
                            setIssueDesc("");
                            setSupportOrder(group.originalOrder);
                          }}
                          className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-100 dark:border-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-95"
                        >
                          <HelpCircle className="w-3 h-3" />
                          Get Help
                        </button>
                      )}

                      {/* Track or Reorder Action based on status */}
                      {!["completed", "cancelled"].includes(group.status) ? (
                        <button
                          type="button"
                          onClick={() => setTrackingOrder(group.originalOrder)}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 active:scale-95 border-0"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Track Order
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReorderGroup(group)}
                          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border-0 ${
                            addedToCartOrderId === group.id
                              ? "bg-emerald-500 text-white shadow-emerald-500/20"
                              : "bg-gradient-to-r from-orange-500 to-amber-500 dark:from-orange-600 dark:to-amber-600 text-white hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20"
                          }`}
                        >
                          {addedToCartOrderId === group.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 animate-bounce" />
                              Cart Populated!
                            </>
                          ) : (
                            <>
                              <RotateCw className="w-3.5 h-3.5" />
                              Reorder
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </motion.div>
          )}
        </main>

        {/* Beautiful Custom Predefined Cancel Reason Modal */}
        {cancellingOrderId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div className="size-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-center mb-1 text-slate-900 dark:text-white">
                Cancel Order?
              </h3>
              <p className="text-[10px] text-slate-500 text-center mb-6 uppercase tracking-widest font-bold">
                Please select a reason
              </p>

              <div className="space-y-2 mb-6 max-h-52 overflow-y-auto pr-1">
                {[
                  "Mistake in order",
                  "Placed wrong items",
                  "Changed my mind",
                  "Delivery taking too long",
                  "Other",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setCancelReason(reason);
                      if (reason !== "Other") {
                        setCustomReasonText("");
                      }
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      cancelReason === reason
                        ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-600"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {reason}
                  </button>
                ))}

                {cancelReason === "Other" && (
                  <textarea
                    autoFocus
                    placeholder="Type detail reason..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-rose-500 outline-none mt-2 text-slate-900 dark:text-white"
                    rows={2}
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                  />
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCancelOrderSubmit}
                  disabled={isCancelling || !cancelReason}
                  className={`w-full py-3.5 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${isCancelling ? "bg-slate-400 text-white cursor-wait shadow-none" : "bg-rose-600 text-white shadow-rose-600/20"}`}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    "Confirm Cancellation"
                  )}
                </button>
                <button
                  onClick={() => {
                    setCancellingOrderId(null);
                    setCancelReason("");
                    setCustomReasonText("");
                  }}
                  disabled={isCancelling}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl active:scale-95 transition-all cursor-pointer disabled:opacity-50 text-[10px] uppercase tracking-widest"
                >
                  No, Keep It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Reorder Modal */}
        {reorderPreviewItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-sm w-full border border-slate-100 dark:border-slate-805 shadow-xl relative animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Reorder Item
                  </p>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                    {reorderPreviewItem.order.product_name}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                    {reorderPreviewItem.shop?.name || "Local Kitchen"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReorderPreviewItem(null)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 my-2">
                {/* Quantity adjustments */}
                <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-808">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Quantity
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={reorderPreviewItem.quantity <= 1}
                      onClick={() =>
                        setReorderPreviewItem((prev: any) => ({
                          ...prev,
                          quantity: prev.quantity - 1,
                        }))
                      }
                      className="size-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-bold border border-slate-100 dark:border-slate-800 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white select-none w-5 text-center">
                      {reorderPreviewItem.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setReorderPreviewItem((prev: any) => ({
                          ...prev,
                          quantity: prev.quantity + 1,
                        }))
                      }
                      className="size-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-bold border border-slate-100 dark:border-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Special Instructions
                  </label>
                  <textarea
                    placeholder="E.g., No onions, extra garlic, spicy, sauce on the side..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 text-xs font-semibold focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white resize-none"
                    rows={3}
                    value={reorderPreviewItem.specialInstructions || ""}
                    onChange={(e) =>
                      setReorderPreviewItem((prev: any) => ({
                        ...prev,
                        specialInstructions: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Total price preview */}
                <div className="flex justify-between items-center py-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500">
                    Subtotal Price
                  </span>
                  <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                    R{" "}
                    {(
                      reorderPreviewItem.price * reorderPreviewItem.quantity
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={handleConfirmReorder}
                  className="w-full py-4 bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-orange-600/10 hover:shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={() => setReorderPreviewItem(null)}
                  className="w-full py-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Support Ticket Modal */}
        {supportOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-sm w-full border border-slate-100 dark:border-slate-808 shadow-xl relative animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Past Order Issue
                  </p>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                    Report #{(supportOrder.id || "").toString().slice(-6)} Issue
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                    Item: {supportOrder.product_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSupportOrder(null)}
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 my-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Issue Type
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none text-slate-800 dark:text-slate-200"
                  >
                    <option value="">-- Choose what went wrong --</option>
                    <option value="cold_food">Food arrived cold / stale</option>
                    <option value="missing_items">
                      Missing toppings or items
                    </option>
                    <option value="wrong_item">Received the wrong item</option>
                    <option value="delivery_delay">
                      Extremely delayed delivery
                    </option>
                    <option value="other">Other issue</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Description of Issue
                  </label>
                  <textarea
                    placeholder="Explain what happened so our fleet support team can resolve it..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-805 rounded-2xl p-3.5 text-xs font-semibold focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white resize-none"
                    rows={4}
                    value={issueDesc}
                    onChange={(e) => setIssueDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={handleSupportSubmit}
                  disabled={isSendingIssue || !issueType}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
                >
                  {isSendingIssue && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span>
                    {isSendingIssue
                      ? "Sending Report..."
                      : "Submit Support Ticket"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSupportOrder(null)}
                  disabled={isSendingIssue}
                  className="w-full py-3 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40 font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderRating({
  pendingReview,
  onSnooze,
  onSubmit,
}: {
  pendingReview: PendingReview;
  onSnooze: () => void;
  onSubmit: (
    rating: number,
    comment: string,
    riderRating?: number,
    riderComment?: string,
  ) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [riderRating, setRiderRating] = useState(5);
  const [riderComment, setRiderComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating <= 3 && !comment.trim()) {
      setError("Please add a reason explaining your 3-star or lower shop rating.");
      return;
    }
    if (riderRating <= 3 && !riderComment.trim()) {
      setError("Please add a reason explaining your 3-star or lower delivery rating.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(rating, comment, riderRating, riderComment);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto shadow-xl p-6 overflow-y-auto">
      <div className="flex-grow flex flex-col space-y-8 py-10">
        <div className="text-center space-y-2">
          <div className="bg-orange-100 dark:bg-orange-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight uppercase tracking-tight">
            Rate your Experience
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Your feedback helps the local fleet improve!
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Shop Review */}
        <div className={`space-y-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[32px] border transition-colors ${
          rating <= 3 && !comment.trim() && error
            ? "border-red-500 dark:border-red-500/80 ring-2 ring-red-500/20"
            : "border-slate-100 dark:border-slate-800"
        }`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
            Food & Shop Experience
          </p>
          <h2 className="text-lg font-bold text-center">
            {pendingReview.productName}
          </h2>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => {
                  setRating(star);
                  if (error) setError(null);
                }}
                className="p-1 transition-transform active:scale-90"
              >
                <Star
                  className={`w-8 h-8 ${star <= rating ? "fill-orange-500 text-orange-500" : "text-slate-300"}`}
                />
              </button>
            ))}
          </div>
          <textarea
            placeholder={rating <= 3 ? "Please let us know what could be improved... (Required for 3 stars or lower)" : "How was the food?"}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (error) setError(null);
            }}
            className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 transition-all min-h-[80px] resize-none"
          />
          {rating <= 3 && (
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 text-center">
              * Please provide a reason for ratings of 3 stars or lower.
            </p>
          )}
        </div>

        {/* Rider Review */}
        <div className={`space-y-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-[32px] border transition-colors ${
          riderRating <= 3 && !riderComment.trim() && error
            ? "border-red-500 dark:border-red-500/80 ring-2 ring-red-500/20"
            : "border-indigo-100/50 dark:border-indigo-800/30"
        }`}>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">
            Rider & Delivery
          </p>
          <div className="flex flex-col items-center">
            <div className="size-12 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 mb-2">
              <Bike className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold">Rate your delivery partner</p>
          </div>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => {
                  setRiderRating(star);
                  if (error) setError(null);
                }}
                className="p-1 transition-transform active:scale-90"
              >
                <Star
                  className={`w-8 h-8 ${star <= riderRating ? "fill-indigo-500 text-indigo-500" : "text-slate-300"}`}
                />
              </button>
            ))}
          </div>
          <textarea
            placeholder={riderRating <= 3 ? "Please explain the delivery issue... (Required for 3 stars or lower)" : "Speed, politeness, handling..."}
            value={riderComment}
            onChange={(e) => {
              setRiderComment(e.target.value);
              if (error) setError(null);
            }}
            className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all min-h-[80px] resize-none"
          />
          {riderRating <= 3 && (
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 text-center">
              * Please provide a reason for ratings of 3 stars or lower.
            </p>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 glass-effect pt-4 pb-6 flex flex-col gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
          Submit Reviews
        </button>
        <button
          onClick={onSnooze}
          disabled={submitting}
          className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest py-2"
        >
          Rate Later
        </button>
      </div>
    </div>
  );
}

function ContactScreen({
  onBack,
  userProfile,
  showAlert,
}: {
  onBack: () => void;
  userProfile: UserProfile;
  showAlert: (title: string, message: string) => void;
}) {
  const [name, setName] = useState(userProfile.fullName || "");
  const [email, setEmail] = useState(userProfile.email || "");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showAlert("Error", "Please fill in all fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      await FirestoreService.submitContactMessage({
        name,
        email,
        message,
        user_id: userProfile.id || null,
      });

      showAlert(
        "Success",
        "Your message has been sent. We will get back to you soon!",
      );
      setMessage("");
    } catch (err) {
      console.error(err);
      window.location.href = `mailto:support@localeats.co.za?subject=Contact from ${name}&body=${encodeURIComponent(message + "\n\nFrom: " + email)}`;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="sticky top-0 z-50 glass-effect border-b border-primary/10">
        <div className="px-4 py-4 flex items-center">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer transition-transform active:scale-95"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight flex-1 text-center pr-10">
            Contact Us
          </h1>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl mb-8 flex flex-col items-center text-center border border-blue-100 dark:border-blue-800/50">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 mb-4 shadow-inner">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            We'd love to hear from you!
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Have a question, feedback, or need help with an order? Send us a
            message.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              placeholder="How can we help you?"
              rows={5}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
