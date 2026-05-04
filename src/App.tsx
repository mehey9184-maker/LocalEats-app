/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction, useEffect, useCallback, useRef, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
import { 
  Home, 
  Store, 
  Compass, 
  Bell, 
  X, 
  CheckCircle, 
  Info, 
  Utensils, 
  User, 
  Mail, 
  Lock, 
  Flag, 
  ArrowRight, 
  ArrowLeft, 
  Trash2, 
  RefreshCw, 
  Settings, 
  History, 
  MapPin, 
  MoreVertical, 
  UserMinus, 
  AlertCircle, 
  Star, 
  Minus, 
  Plus, 
  ChevronDown, 
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
  MessageSquare, 
  Navigation, 
  PhoneCall, 
  Layers, 
  Heart, 
  Share2,
  BookOpen, 
  Camera, 
  Moon, 
  Sun, 
  RotateCcw, 
  ClipboardList, 
  BarChart3, 
  Copy, 
  StickyNote, 
  AlertTriangle,
  Check,
  Smartphone,
  Map,
  List,
  Tag,
  ShoppingBasket,
  Ban,
  Delete,
  Send,
  CheckCircle2,
  CheckSquare,
  XCircle,
  Hourglass,
  LogIn,
  Locate,
  LocateFixed,
  Banknote,
  ChevronLeft,
  Bug,
  Package,
  Eye,
  EyeOff,
  MessageCircle,
  FileText,
  Shield,
  QrCode,
  Download,
  Megaphone,
  WifiOff,
  Bike
} from 'lucide-react';
import { supabase, supabaseUrl, APP_URL } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { LocalEatsLogo } from './components/LocalEatsLogo';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

type Screen = 'splash' | 'signup' | 'login' | 'verify' | 'setup-pin' | 'setup-password' | 'success' | 'complete-profile' | 'login-success' | 'home' | 'settings' | 'profile' | 'checkout' | 'order-success' | 'discover' | 'explore' | 'store-info' | 'admin-orders' | 'order-history' | 'shop-dashboard' | 'review' | 'order-tracking' | 'notifications' | 'contact';

type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system' | 'follow';
  timestamp: number;
  read: boolean;
  orderId?: string;
  data?: any;
};

type StatusHistoryItem = {
  status: string;
  timestamp: string;
};

type Order = {
  id: string;
  user_id: string;
  shop_id: string;
  customer_name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  country: string;
  product_name: string;
  product_variant: string;
  quantity: number;
  price: number;
  notes: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  is_delivery?: boolean;
  delivery_fee?: number;
  rider_id?: string;
  delivery_status?: 'none' | 'finding_rider' | 'rider_assigned' | 'picked_up' | 'delivered' | 'cancelled';
  created_at: string;
  status_history?: StatusHistoryItem[];
  owner_message?: string;
  payment_method?: 'cash' | 'card_machine';
  special_instructions?: string;
  customizations?: { name: string, price: number }[];
};

type PendingReview = {
  orderId: string;
  shopId: string;
  productName: string;
  snoozeCount: number;
  nextReminder?: number;
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  displayPrice: string;
  image: string;
  description?: string;
  customizations?: { name: string, price: number }[];
};

type CartItem = {
  id: string;
  shopId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  specialInstructions?: string;
  selectedCustomizations?: { name: string, price: number }[];
};

type Review = {
  id: string;
  shop_id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type Shop = {
  id: string;
  name: string;
  logo: string;
  rating: number;
  description: string;
  address: string;
  menu: MenuItem[];
  category: string;
  distance?: number;
  owner_id?: string;
  opening_time?: string;
  closing_time?: string;
  latitude?: number;
  longitude?: number;
  delivery_eta?: string;
  is_special?: boolean;
  phone?: string;
  reviewCount?: number;
  prepTime?: string;
  isOpen?: boolean;
};

const APP_VERSION = "2.4.1 (1024)";
const TEMBISA_COORDS = { lat: -25.9964, lng: 28.2268 };

const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

const getShopStatus = (shop: Shop) => {
  if (!shop.opening_time || !shop.closing_time) return { isOpen: true, message: 'Open Now', nextOpeningTime: undefined };
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [openHours, openMinutes] = shop.opening_time.split(':').map(Number);
  const [closeHours, closeMinutes] = shop.closing_time.split(':').map(Number);
  
  const openTime = openHours * 60 + openMinutes;
  const closeTime = closeHours * 60 + closeMinutes;
  
  let isOpen = false;
  if (closeTime > openTime) {
    isOpen = currentTime >= openTime && currentTime <= closeTime;
  } else {
    isOpen = currentTime >= openTime || currentTime <= closeTime;
  }

  if (!isOpen) return { isOpen: false, message: 'Closed', nextOpeningTime: shop.opening_time };

  // Calculate time until closing
  let minutesUntilClose = 0;
  if (closeTime > currentTime) {
    minutesUntilClose = closeTime - currentTime;
  } else if (closeTime < openTime) {
    // Overnight case
    minutesUntilClose = (1440 - currentTime) + closeTime;
  }

  if (minutesUntilClose > 0 && minutesUntilClose <= 60) {
    return { isOpen: true, message: `Closing in ${minutesUntilClose}m`, warning: true, nextOpeningTime: undefined };
  }

  return { isOpen: true, message: 'Open Now', nextOpeningTime: undefined };
};

const BlurUpImage = ({ src, alt, className, blurHash = "https://picsum.photos/seed/blur/10/10" }: { src: string, alt: string, className?: string, blurHash?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  // Proxy through weserv for WebP conversion and optimization
  const webpSrc = src.startsWith('data:') || error
    ? src 
    : `https://images.weserv.nl/?url=${encodeURIComponent(src)}&output=webp&q=80&w=800`;
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && (
        <img 
          src={blurHash} 
          alt={alt} 
          className={`w-full h-full object-cover transition-opacity duration-500 opacity-100`}
          referrerPolicy="no-referrer"
        />
      )}
      <img 
        src={webpSrc} 
        alt={alt} 
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!error) setError(true);
        }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

const TrustBadge = ({ shop }: { shop: Shop }) => {
  const status = getShopStatus(shop);
  const eta = shop.delivery_eta || "25-35 min";
  
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      <div className={`px-2 py-0.5 rounded-md flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${status.isOpen ? (status.warning ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600') : 'bg-gray-100 text-gray-500'}`}>
        <div className={`w-1 h-1 rounded-full ${status.isOpen ? (status.warning ? 'bg-orange-500 animate-pulse' : 'bg-green-500') : 'bg-gray-400'}`}></div>
        {status.message}
      </div>
      <div className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
        <Clock className="w-2.5 h-2.5" />
        {eta}
      </div>
      <div className="px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
        <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
        {shop.rating} Verified
      </div>
    </div>
  );
};

type UserProfile = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  country: string;
  role: 'user' | 'admin' | 'shop_owner';
  photoURL?: string;
};

const DEFAULT_AVATAR_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuDQ_oJXmkvF6zCsi-MN_DEL7mLVwaHWe2bdg5-LNmA7uJ3Eh_HnDZN7G9qMWP52xq3HmN4FA-PdBK56usW1gusmE0gAOzJVnznRSqmcUdQYi1V2B39MYizUktww0MHeemCIHeQCnyi31PLj36ie-F5J15C-R7hzeqltPBxVN6rYZGUSxaiOi6PNaXlFxpdnPYSm8wS2_CnI_4p6sdx_ulKdOTfyas-fwJ116yUHLmytLnZvv3oAUffPd_-POY2O7d5Hyv1PvYD-dw";

const uploadAvatar = async (file: File, userId?: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = userId ? `${userId}/${fileName}` : `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return publicUrl;
};

type ModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'alert' | 'confirm' | 'prompt';
  onConfirm?: (value?: string) => void;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
};

const ModalContent = ({ modal, onClose }: { modal: ModalState, onClose: () => void }) => {
  const [value, setValue] = useState(modal.defaultValue || '');
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden"
      >
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">{modal.title}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{modal.message}</p>
        
        {modal.type === 'prompt' && (
          <div className="mb-6">
            <input 
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              if (modal.onConfirm) {
                modal.onConfirm(modal.type === 'prompt' ? value : undefined);
              }
              onClose();
            }}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 dark:shadow-none transition-all active:scale-95 cursor-pointer"
          >
            {modal.confirmLabel || (modal.type === 'alert' ? 'OK' : 'Confirm')}
          </button>
          
          {(modal.type === 'confirm' || modal.type === 'prompt') && (
            <button
              onClick={onClose}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95 cursor-pointer"
            >
              {modal.cancelLabel || 'Cancel'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

type NotificationState = { 
  message: string, 
  type: 'success' | 'info' | 'ready' | 'error', 
  actions?: { label: string, onClick: () => void }[],
  persistent?: boolean
} | null;

type SignUpData = {
  email: string;
  phone: string;
  fullName: string;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [appVersion, setAppVersion] = useState("4.0"); // Initialize with 4.0
  const [isOnline, setIsOnline] = useState(true);

  // Connectivity monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Heartbeat check for Supabase connectivity
    const checkSupabase = async () => {
      try {
        const { error } = await supabase.from('shops').select('id').limit(1);
        if (error) {
          // If it's a network error specifically, mark as offline
          if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            setIsOnline(false);
          }
        } else {
          setIsOnline(true);
        }
      } catch (err) {
        setIsOnline(false);
      }
    };

    const interval = setInterval(checkSupabase, 30000); // Check every 30s
    checkSupabase();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>(() => {
    const saved = localStorage.getItem('cached_shops');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingShops, setLoadingShops] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showAlert = (title: string, message: string) => {
    setModal({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmLabel = "Confirm", cancelLabel = "Cancel") => {
    setModal({ isOpen: true, title, message, type: 'confirm', onConfirm: () => onConfirm(), confirmLabel, cancelLabel });
  };

  const showPrompt = (title: string, message: string, onConfirm: (value: string) => void, defaultValue = "") => {
    setModal({ isOpen: true, title, message, type: 'prompt', onConfirm: (val) => onConfirm(val || ""), defaultValue });
  };

  const [orderAcceptedModal, setOrderAcceptedModal] = useState<{
    isOpen: boolean;
    productName: string;
    ownerMessage: string;
  }>({
    isOpen: false,
    productName: '',
    ownerMessage: ''
  });

  const [notification, setNotification] = useState<NotificationState>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('app_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState<Order[]>([]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const fetchShopsData = useCallback(async (retries = 3) => {
    setLoadingShops(true);
    setFetchError(null);
    try {
      console.log('Fetching shops data...');
      
      // Fetch all shops (removed strict is_active filter for demo stability)
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*');

      if (shopsError) {
        console.error('Shops fetch error:', shopsError);
        // If table doesn't exist, we'll handle it gracefully
        if (shopsError.code === '42P01') {
          setFetchError("Database tables not found. Please run the SQL setup script.");
        } else {
          setFetchError(shopsError.message);
        }
        setLoadingShops(false);
        return;
      }

      console.log(`Total shops found: ${shopsData?.length || 0}`);

      console.log('Fetching menu items...');
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true);

      if (menuError) {
        console.error('Menu items fetch error:', menuError);
        throw menuError;
      }

      const formattedShops: Shop[] = (shopsData || []).map(s => {
        // Generate deterministic mock coordinates if missing for Tembisa area
        const shopHash = hashString(String(s.id));
        const deterministicLat = -25.9964 + (shopHash % 100) * 0.0002 - 0.01;
        const deterministicLng = 28.2268 + (shopHash % 100) * 0.0003 - 0.015;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        
        let isOpen = true;
        if (s.opening_time && s.closing_time) {
          isOpen = currentTimeStr >= s.opening_time && currentTimeStr <= s.closing_time;
        }

        return {
          id: String(s.id),
          name: s.name,
          logo: s.logo_url || `https://picsum.photos/seed/${s.id}/200/200`,
          rating: Number(s.rating) || 4.5,
          reviewCount: 12 + (shopHash % 88), // Mock review count
          prepTime: "15-20 min", // Mock prep time
          isOpen: isOpen,
          description: s.description || "Local Tembisa Flavours",
          address: s.location || "Tembisa",
          category: s.category || "Kota",
          owner_id: s.owner_id,
          opening_time: s.opening_time,
          closing_time: s.closing_time,
          phone: s.phone || "+27 12 345 6789",
          latitude: s.latitude || deterministicLat,
          longitude: s.longitude || deterministicLng,
          menu: (menuData || [])
            .filter(m => String(m.shop_id) === String(s.id))
            .map(m => ({
              id: String(m.id),
              name: m.name,
              price: Number(m.price),
              displayPrice: `R${Number(m.price).toFixed(2)}`,
              image: m.image_url || `https://picsum.photos/seed/${m.id}/200/200`
            }))
        };
      }).sort((a, b) => (b.rating || 0) - (a.rating || 0)); // Smart Ranking: Best rated first

      console.log(`Successfully fetched ${formattedShops.length} shops.`);
      setShops(formattedShops);
      localStorage.setItem('cached_shops', JSON.stringify(formattedShops)); // Instant-Load Caching
      setLoadingShops(false);
    } catch (err: any) {
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('network'));
      
      // Only log errors that are not network-related, or log them only on final failure
      if (!isNetworkError || retries === 0) {
        console.error('Error fetching shops:', err);
      }
      
      let errorMessage = err.message || 'Failed to connect to the server';
      
      if (isNetworkError) {
        errorMessage = 'Network Error: We couldn\'t connect to the server. Please check your internet connection or disable ad-blockers.';
      } else if (err.status === 401 || err.status === 403) {
        errorMessage = 'Authentication Error: Please log in again.';
      } else if (err.status === 404) {
        errorMessage = 'Configuration Error: We couldn\'t find what you were looking for.';
      } else if (err.code === 'PGRST301') {
        errorMessage = 'Database Error: JWT expired or invalid. Try refreshing the page.';
      }
      
      if (retries > 0) {
        console.log(`Retrying fetchShopsData... (${retries} retries left)`);
        // We don't stop loading spinner during retries to prevent flickering
        setTimeout(() => fetchShopsData(retries - 1), 2500);
      } else {
        setFetchError(errorMessage);
        setLoadingShops(false);
        
        // Show a more friendly notification for network issues
        if (isNetworkError) {
          setNotification({ 
            message: "Connection lost. Please check if your ad-blocker is blocking Supabase.", 
            type: 'error' 
          });
        }
      }
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setNotification({ message: "Geolocation is not supported by your browser", type: 'info' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        // Notification removed to keep it in the background as requested
      },
      (error) => {
        console.warn("Error getting location:", error);
        let errorMsg = "Could not get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location access denied. Using default location.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Using default location.";
        }
        setNotification({ message: errorMsg, type: 'info' });
      },
      { timeout: 15000, enableHighAccuracy: false }
    );
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("Notification permission granted.");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('app_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const fetchUserProfile = useCallback(async (userId: string, retries = 2) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setUserProfile({
          id: data.user_id,
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          city: data.city || '',
          address: data.address || '',
          country: data.country || 'South Africa',
          role: data.role || 'user',
          photoURL: data.photo_url || ''
        });
        if (data.favorites) {
          setFavorites(data.favorites);
        }
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      // Specifically catch network errors
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';
      
      if (isNetworkError && retries > 0) {
        console.log(`Retrying fetchUserProfile... (${retries} retries left)`);
        setTimeout(() => fetchUserProfile(userId, retries - 1), 3000);
      } else if (isNetworkError) {
        console.warn('Network Error: Could not reach Supabase for profile fetch.');
        setIsOnline(false);
      }
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
        setCurrentScreen('home');
        requestNotificationPermission();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
        setCurrentScreen('home');
        requestNotificationPermission();
      }
      else setCurrentScreen('splash');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [requestNotificationPermission, fetchUserProfile]);

  useEffect(() => {
    // Consolidated update check logic
    const checkVersion = async () => {
      try {
        // Try version.json first
        const vResponse = await fetch('/version.json?t=' + Date.now());
        if (vResponse.ok) {
          const vData = await vResponse.json();
          if (vData && vData.version) {
            setAppVersion(vData.version);
            if (vData.version !== '4.0') {
              setIsUpdateAvailable(true);
            }
            return; // Success
          }
        }

        // Fallback to metadata.json as backup version source
        const mResponse = await fetch('/metadata.json');
        if (mResponse.ok) {
          const mData = await mResponse.json();
          if (mData && mData.version) {
            setAppVersion(mData.version);
            const lastKnownVersion = localStorage.getItem('last_known_version');
            if (lastKnownVersion && lastKnownVersion !== mData.version) {
              setIsUpdateAvailable(true);
            }
            localStorage.setItem('last_known_version', mData.version);
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
    const channel = supabase
      .channel(`user_notifications:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Real-time order update received:', payload);
          
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
            return;
          }

          if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
            
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;
            
            if (oldStatus !== newStatus) {
              const shop = shops.find(s => s.id === payload.new.shop_id);
              const title = `Order ${newStatus.toUpperCase()}`;
              let message = `Your order from ${shop?.name || 'Local Shop'} is now ${newStatus}.`;
              
              if (newStatus === 'preparing') message = `Chef at ${shop?.name} is preparing your food! 🍳`;
              if (newStatus === 'ready') message = `🔥 Your order from ${shop?.name} is READY for collection!`;
              if (newStatus === 'confirmed') message = `${shop?.name} has confirmed your order!`;
              if (newStatus === 'completed') message = `Legendary! You've collected your order from ${shop?.name}. Enjoy! 😋`;
              
              // Trigger browser notification if permission granted
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(title, { body: message, icon: shop?.logo });
              }

              const newNotif: AppNotification = {
                id: Math.random().toString(36).substr(2, 9),
                title,
                message,
                type: 'order',
                timestamp: Date.now(),
                read: false,
                orderId: payload.new.id
              };

              setNotifications(prev => [newNotif, ...prev]);

              if (newStatus === 'ready') {
                // Add vibration for confirmation
                if ("vibrate" in navigator) {
                  navigator.vibrate([100, 50, 100]);
                }
                // Add sound effect
                try {
                  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                  audio.volume = 0.4;
                  audio.play().catch(e => console.log('Audio play failed:', e));
                } catch (e) {}
              }

              setNotification({
                message: `✅ ${message}`,
                type: 'success',
                actions: [
                  { label: 'Track Order', onClick: () => setCurrentScreen('order-tracking') }
                ]
              });

              if (newStatus === 'picked_up') {
                setPendingReview({
                  orderId: payload.new.id,
                  shopId: payload.new.shop_id,
                  productName: payload.new.product_name,
                  snoozeCount: 0
                });
                setCurrentScreen('review');
              }
            }
          }
        }
      )
      .subscribe();

    // Initial orders fetch
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (data) setOrders(data);
    };
    fetchOrders();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, shops]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNotification({ message: "You're back online!", type: 'success' });
      fetchShopsData();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNotification({ message: "You're offline. Browsing cached menu.", type: 'info' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial fetch and location request
    fetchShopsData();
    if (currentScreen === 'home' || currentScreen === 'explore') {
      requestLocation();
    }

    // Subscribe to changes in shops and menu_items
    const shopsChannel = supabase.channel('public:shops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, () => fetchShopsData())
      .subscribe();
    
    const menuChannel = supabase.channel('public:menu_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchShopsData())
      .subscribe();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(shopsChannel);
      supabase.removeChannel(menuChannel);
    };
  }, [fetchShopsData, requestLocation, currentScreen]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopId = urlParams.get('shopId');
    if (shopId) {
      setSelectedStoreId(shopId);
      setCurrentScreen('store-info');
      // Remove shopId from URL to prevent re-triggering on refresh if user navigates away
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [shops]); // Re-run when shops are loaded to ensure we have the shop data


  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('dark_mode');
    // Default to false (light mode) if nothing is saved
    if (saved === null) return false;
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
    
    // Sync favorites to profiles table if session exists
    if (session?.user?.id) {
      const syncFavorites = async () => {
        try {
          await supabase
            .from('profiles')
            .update({ favorites })
            .eq('user_id', session.user.id);
        } catch (err) {
          console.error('Error syncing favorites:', err);
        }
      };
      syncFavorites();
    }
  }, [favorites, session]);

  useEffect(() => {
    console.log('Applying theme. Dark mode:', isDarkMode);
    localStorage.setItem('dark_mode', isDarkMode.toString());
    
    const root = window.document.documentElement;
    const body = window.document.body;
    
    if (isDarkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleFavorite = async (shopId: string) => {
    if (!session) {
      showAlert('Login Required', 'Please sign in or create an account to follow stores.');
      setPreviousScreen(currentScreen);
      setCurrentScreen('login');
      return;
    }

    const isFollowing = favorites.includes(shopId);
    setFavorites(prev => 
      isFollowing 
        ? prev.filter(id => id !== shopId) 
        : [...prev, shopId]
    );
    triggerHaptic();

    if (!isFollowing && session?.user?.id) {
      // Send notification to shop owner
      const shop = shops.find(s => s.id === shopId);
      if (shop && (shop as any).owner_id) {
        try {
          await supabase.from('notifications').insert({
            user_id: (shop as any).owner_id,
            title: 'New Follower!',
            message: `${userProfile.fullName || 'Someone'} started following your shop ${shop.name}!`,
            type: 'follow',
            data: { follower_id: session.user.id, shop_id: shopId }
          });
        } catch (err) {
          console.error('Error sending follow notification:', err);
        }
      }
    }
  };
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(() => {
    const saved = localStorage.getItem('pending_review');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (pendingReview) {
      localStorage.setItem('pending_review', JSON.stringify(pendingReview));
      
      if (pendingReview.nextReminder) {
        const now = Date.now();
        const delay = Math.max(0, pendingReview.nextReminder - now);
        
        if (delay === 0) {
          setCurrentScreen('review');
        } else {
          const timer = setTimeout(() => {
            setCurrentScreen('review');
          }, delay);
          return () => clearTimeout(timer);
        }
      }
    } else {
      localStorage.removeItem('pending_review');
    }
  }, [pendingReview]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);
    
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          // Only warn if it's not a permission issue to keep console clean
          if (error.code !== error.PERMISSION_DENIED) {
            console.warn('Geolocation error, using Tembisa fallback:', error.message);
          }
          setUserLocation(TEMBISA_COORDS);
        },
        { timeout: 15000, enableHighAccuracy: false }
      );
    } else {
      setUserLocation(TEMBISA_COORDS);
    }
  }, []);

  const addToCart = (item: MenuItem, shopId: string, quantity: number = 1, specialInstructions: string = '') => {
    triggerHaptic([50, 30, 50]); // Premium double-pulse haptic
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.shopId === shopId && i.specialInstructions === specialInstructions);
      if (existing) {
        return prev.map(i => i.id === item.id && i.shopId === shopId && i.specialInstructions === specialInstructions ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, shopId, quantity, specialInstructions }];
    });
    setNotification({ message: `Added ${quantity}x ${item.name} to cart`, type: 'success' });
    setTimeout(() => setNotification(null), 2000);
  };

  const removeFromCart = (itemId: string, shopId: string) => {
    triggerHaptic();
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId && i.shopId === shopId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId && i.shopId === shopId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => !(i.id === itemId && i.shopId === shopId));
    });
  };

  const clearCart = () => {
    showConfirm(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      () => {
        triggerHaptic();
        setCart([]);
        setNotification({ message: 'Cart cleared', type: 'info' });
        setTimeout(() => setNotification(null), 2000);
      }
    );
  };
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('userProfile');
    return saved ? JSON.parse(saved) : {
      fullName: '',
      email: '',
      phone: '',
      city: '',
      address: '',
      country: 'South Africa',
      role: 'user'
    };
  });

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    
    // Sync with Supabase if session exists
    if (session?.user?.id) {
      const timer = setTimeout(async () => {
        if (!navigator.onLine) return;
        try {
          const { error } = await supabase
            .from('profiles')
            .upsert({
              user_id: session.user.id,
              fullName: userProfile.fullName,
              email: userProfile.email,
              phone: userProfile.phone,
              city: userProfile.city,
              address: userProfile.address,
              country: userProfile.country,
              role: userProfile.role,
              photo_url: userProfile.photoURL,
              favorites: favorites,
              updated_at: new Date().toISOString()
            });
          if (error) {
            console.error('Error syncing profile to Supabase:', error);
            if (error.message === 'Failed to fetch') {
              setNotification({ 
                message: "⚠️ Connection lost. Profile sync failed.", 
                type: 'info' 
              });
            }
          }
        } catch (err) {
          console.error('Sync error:', err);
        }
      }, 2000); 
      return () => clearTimeout(timer);
    }
  }, [userProfile, session, favorites]);

  return (
    <div className="relative">
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-[10px] font-bold py-1 text-center z-[100] animate-in slide-in-from-top duration-300">
          OFFLINE MODE • CHECK CONNECTION
        </div>
      )}
      <AnimatePresence mode="wait">
      <div className="relative">
        {/* Global Notification Toast */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -100 }}
              animate={{ opacity: 1, y: notification.persistent ? 0 : 20 }}
              exit={{ opacity: 0, y: -100 }}
              className={`fixed ${notification.persistent ? 'inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm' : 'top-0 left-0 right-0'} z-[100] px-4 pointer-events-none`}
            >
              <div className={`${notification.persistent ? 'w-full max-w-xs' : 'max-w-md mx-auto'} bg-white dark:bg-slate-800 text-gray-900 dark:text-white p-6 rounded-3xl shadow-2xl flex flex-col gap-4 border border-gray-100 dark:border-slate-700 pointer-events-auto`}>
                <div className="flex items-start gap-3">
                  <div className={`${notification.type === 'ready' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'} p-3 rounded-2xl shrink-0`}>
                    {notification.type === 'ready' ? <Utensils className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg leading-tight truncate">
                      {notification.type === 'ready' ? 'Order Ready!' : 'Notification'}
                    </h3>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">{notification.message}</p>
                  </div>
                  {!notification.persistent && (
                    <button onClick={() => setNotification(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg shrink-0">
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
                            ? 'bg-orange-600 text-white shadow-lg shadow-orange-200 dark:shadow-none' 
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

        {/* Connectivity Banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-slate-900 dark:bg-red-600 text-white text-[10px] py-2 px-4 text-center font-bold flex items-center justify-center gap-2 z-[250] sticky top-0 shadow-lg border-b border-white/10"
            >
              <div className="flex items-center gap-2">
                <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                <span className="uppercase tracking-widest">Connective Problem Detected</span>
              </div>
              <button 
                onClick={() => {
                  triggerHaptic();
                  fetchShopsData();
                }} 
                className="ml-3 bg-white/20 px-3 py-1 rounded-full text-[9px] hover:bg-white/30 transition-colors uppercase font-black"
              >
                Retry Reconnect
              </button>
            </motion.div>
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
                className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                
                <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-12 h-12" />
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">Order Accepted!</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                  Your order for <span className="font-bold text-slate-900 dark:text-slate-200">{orderAcceptedModal.productName}</span> has been received.
                </p>
                
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-8 italic text-slate-600 dark:text-slate-300 text-sm border border-slate-100 dark:border-slate-800">
                  "{orderAcceptedModal.ownerMessage}"
                </div>
                
                <button
                  onClick={() => setOrderAcceptedModal({ ...orderAcceptedModal, isOpen: false })}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 cursor-pointer"
                >
                  Awesome!
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
        key={currentScreen}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="h-full w-full"
      >
        {currentScreen === 'splash' && (
          <SplashScreen onNext={() => setCurrentScreen('signup')} onLogin={() => setCurrentScreen('login')} onGuestBrowse={() => setCurrentScreen('home')} />
        )}
        {currentScreen === 'signup' && (
          <SignUpScreen 
            onNext={(data) => {
              setUserProfile(prev => ({ ...prev, ...data }));
              setCurrentScreen('setup-password');
            }} 
            onLogin={() => setCurrentScreen('login')} 
            setNotification={setNotification}
          />
        )}
        {currentScreen === 'login' && (
          <LoginScreen 
            onLogin={() => setCurrentScreen('login-success')} 
            onSignUp={() => setCurrentScreen('signup')} 
            setNotification={setNotification}
          />
        )}
        {/* Verify screen skipped for now */}
        {currentScreen === 'setup-password' && (
          <SetupPasswordScreen 
            signupData={userProfile}
            onNext={() => setCurrentScreen('success')} 
            onBack={() => setCurrentScreen('signup')} 
            setNotification={setNotification}
          />
        )}
        {currentScreen === 'success' && (
          <SuccessScreen onCompleteProfile={() => setCurrentScreen('complete-profile')} onExplore={() => setCurrentScreen('home')} />
        )}
        {currentScreen === 'complete-profile' && (
          <CompleteProfileScreen 
            userProfile={userProfile}
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            onSave={(data) => {
              setUserProfile(prev => ({ ...prev, ...data }));
              setCurrentScreen(previousScreen || 'home');
            }} 
            setNotification={setNotification}
          />
        )}
        {currentScreen === 'login-success' && (
          <LoginSuccessScreen onHome={() => setCurrentScreen('home')} onViewProfile={() => setCurrentScreen('profile')} onBack={() => setCurrentScreen('login')} />
        )}
        {currentScreen === 'home' && (
          <HomeScreen 
            userProfile={userProfile}
            session={session}
            shops={shops}
            loadingShops={loadingShops}
            fetchError={fetchError}
            onSettings={() => { setPreviousScreen(currentScreen); setCurrentScreen('settings'); }} 
            onProfile={() => { setPreviousScreen(currentScreen); setCurrentScreen('profile'); }} 
            onCheckout={() => { setPreviousScreen(currentScreen); setCurrentScreen('checkout'); }} 
            onDiscover={() => { setPreviousScreen(currentScreen); setCurrentScreen('discover'); }} 
            onExplore={() => { setPreviousScreen(currentScreen); setCurrentScreen('explore'); }} 
            onOrderHistory={() => { setPreviousScreen(currentScreen); setCurrentScreen('order-history'); }}
            onNotifications={() => { setPreviousScreen(currentScreen); setCurrentScreen('notifications'); }}
            unreadCount={notifications.filter(n => !n.read).length}
            onStoreInfo={(id) => { 
              setPreviousScreen(currentScreen);
              setSelectedStoreId(id); 
              setCurrentScreen('store-info'); 
            }} 
            onRetry={() => fetchShopsData()}
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            clearCart={clearCart}
            setNotification={setNotification}
            setPendingReview={setPendingReview}
            setCurrentScreen={setCurrentScreen}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            userLocation={userLocation}
            onRequestLocation={requestLocation}
            orders={orders}
            showAlert={showAlert}
            appVersion={appVersion}
          />
        )}
        {currentScreen === 'notifications' && (
          <NotificationsScreen 
            notifications={notifications}
            onBack={() => setCurrentScreen(previousScreen || 'home')}
            onRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
            onDelete={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
          />
        )}
        {currentScreen === 'order-tracking' && (
          <OrderTrackingScreen 
            orders={orders}
            shops={shops}
            onBack={() => setCurrentScreen(previousScreen || 'home')}
          />
        )}
        {currentScreen === 'review' && pendingReview && (
          <ReviewScreen 
            pendingReview={pendingReview}
            onSnooze={() => {
              if (pendingReview.snoozeCount < 2) {
                setPendingReview({
                  ...pendingReview,
                  snoozeCount: pendingReview.snoozeCount + 1,
                  nextReminder: Date.now() + (30 * 60 * 1000) // 30 minutes
                });
                setCurrentScreen('home');
                setNotification({
                  message: 'No problem! We\'ll remind you in 30 minutes.',
                  type: 'info'
                });
              } else {
                setPendingReview(null);
                setCurrentScreen('home');
              }
            }}
            onSubmit={async (rating, comment) => {
              // Fix Issue 19: Save review to Supabase
              try {
                const { error } = await supabase.from('reviews').insert({
                  shop_id: pendingReview.shopId,
                  user_name: userProfile.fullName || 'Anonymous',
                  rating,
                  comment,
                  created_at: new Date().toISOString()
                });
                
                if (error) throw error;
                
                showAlert('Review Submitted', 'Thank you for your review! 🔥');
              } catch (err) {
                console.error('Error saving review:', err);
                setNotification({
                  message: 'Review saved locally, but failed to sync with server.',
                  type: 'info'
                });
              }
              
              setPendingReview(null);
              setCurrentScreen('home');
            }}
          />
        )}
        {currentScreen === 'discover' && (
          <DiscoverScreen 
            shops={shops} 
            onHome={() => setCurrentScreen('home')} 
            onExplore={() => { setPreviousScreen('discover'); setCurrentScreen('explore'); }}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onSelectShop={(shopId) => {
              setPreviousScreen('discover');
              setSelectedStoreId(shopId);
              setCurrentScreen('store-info');
            }}
            userLocation={userLocation}
            showAlert={showAlert}
          />
        )}
        {currentScreen === 'explore' && (
          <ExploreScreen 
            shops={shops} 
            onHome={() => setCurrentScreen('home')} 
            onDiscover={() => { setPreviousScreen('explore'); setCurrentScreen('discover'); }} 
            userLocation={userLocation}
            onRequestLocation={requestLocation}
            onStoreInfo={(shopId) => {
              setPreviousScreen('explore');
              setSelectedStoreId(shopId);
              setCurrentScreen('store-info');
            }}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            showAlert={showAlert}
          />
        )}
        {currentScreen === 'store-info' && (
          <StoreInfoScreen 
            onBack={() => {
              if ("vibrate" in navigator) navigator.vibrate(5);
              setCurrentScreen(previousScreen || 'home');
            }} 
            shop={shops.find(s => s.id === selectedStoreId) || shops[0]} 
            isFavorite={favorites.includes(selectedStoreId || '')}
            onToggleFavorite={() => {
              if (!session) {
                setNotification({ 
                  message: "Please sign up to follow your favorite shops!", 
                  type: 'info',
                  actions: [{ label: 'Sign Up', onClick: () => setCurrentScreen('signup') }]
                });
                return;
              }
              toggleFavorite(selectedStoreId || '');
            }}
            userProfile={userProfile}
            session={session}
            onSignUp={() => setCurrentScreen('signup')}
            addToCart={(item, shopId) => {
              if (!session) {
                setCurrentScreen('signup');
                return;
              }
              addToCart(item, shopId);
            }}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}
        {currentScreen === 'settings' && (
          <SettingsScreen 
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            onLogout={() => setCurrentScreen('splash')} 
            onProfile={() => { setPreviousScreen('settings'); setCurrentScreen('profile'); }} 
            onOrderHistory={() => { setPreviousScreen('settings'); setCurrentScreen('order-history'); }}
            onAdminOrders={() => { setPreviousScreen('settings'); setCurrentScreen('admin-orders'); }}
            onShopDashboard={() => { setPreviousScreen('settings'); setCurrentScreen('shop-dashboard'); }}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            setNotification={setNotification}
          />
        )}
        {currentScreen === 'admin-orders' && (
          <AdminOrdersScreen 
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}
        {currentScreen === 'shop-dashboard' && (
          <ShopDashboardScreen 
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            orderAcceptedModal={orderAcceptedModal}
            setOrderAcceptedModal={setOrderAcceptedModal}
            showAlert={showAlert}
            showConfirm={showConfirm}
            showPrompt={showPrompt}
          />
        )}
        {currentScreen === 'profile' && (
          <ProfileScreen 
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            onSave={(data) => {
              setUserProfile(prev => ({ ...prev, ...data }));
              setCurrentScreen(previousScreen || 'home');
            }} 
            onOrderHistory={() => { setPreviousScreen('profile'); setCurrentScreen('order-history'); }}
            onAdminOrders={() => { setPreviousScreen('profile'); setCurrentScreen('admin-orders'); }}
            onShopDashboard={() => { setPreviousScreen('profile'); setCurrentScreen('shop-dashboard'); }}
            onContactUs={() => { setPreviousScreen('profile'); setCurrentScreen('contact'); }}
            userProfile={userProfile}
            onLogout={async () => {
              await supabase.auth.signOut();
              // Clear sensitive data on logout
              localStorage.removeItem('cart');
              localStorage.removeItem('userProfile');
              localStorage.removeItem('favorites');
              localStorage.removeItem('pending_review');
              setCart([]);
              setFavorites([]);
              setUserProfile({
                fullName: '',
                email: '',
                phone: '',
                city: '',
                address: '',
                country: 'South Africa',
                role: 'user'
              });
              setCurrentScreen('splash');
            }}
            setNotification={setNotification}
          />
        )}
        {currentScreen === 'contact' && (
          <ContactScreen
            onBack={() => setCurrentScreen(previousScreen || 'profile')}
            userProfile={userProfile}
            showAlert={showAlert}
          />
        )}
        {currentScreen === 'checkout' && (
          <CheckoutScreen 
            userProfile={userProfile}
            session={session}
            shops={shops}
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            onConfirm={() => setCurrentScreen('order-success')} 
            onIncompleteProfile={() => {
              setPreviousScreen('checkout');
              setCurrentScreen('complete-profile');
            }}
            cart={cart}
            setCart={setCart}
            setNotification={setNotification}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}
        {currentScreen === 'order-success' && (
          <OrderSuccessScreen onHome={() => { setCart([]); setCurrentScreen('home'); }} cart={cart} shops={shops} />
        )}
        {currentScreen === 'order-history' && (
          <OrderHistoryScreen 
            session={session}
            onBack={() => setCurrentScreen(previousScreen || 'profile')} 
            userProfile={userProfile} 
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}
      </motion.div>

      {/* Global Floating Checkout Button */}
      <AnimatePresence>
        {cartCount > 0 && currentScreen !== 'checkout' && currentScreen !== 'order-success' && (
          <motion.button
            initial={{ scale: 0, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0, y: 20, opacity: 0 }}
            onClick={() => {
              if (!session) {
                showAlert('Login Required', 'Please sign in or create an account to place your order.');
                setPreviousScreen(currentScreen);
                setCurrentScreen('login');
                return;
              }
              setPreviousScreen(currentScreen);
              setCurrentScreen('checkout');
            }}
            className="fixed bottom-24 right-6 z-50 bg-slate-900 dark:bg-orange-600 text-white p-5 rounded-[32px] shadow-2xl flex items-center gap-4 active:scale-95 transition-all cursor-pointer group"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center shadow-sm border-2 border-slate-900 dark:border-orange-600">
                {cartCount}
              </span>
            </div>
            <div className="text-left pr-2">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Checkout</p>
              <p className="text-lg font-black">R{cartTotal.toFixed(2)}</p>
            </div>
            <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -ml-2 group-hover:ml-0 transition-all" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
    </AnimatePresence>
    </div>
  );
}

function SplashScreen({ onNext, onLogin, onGuestBrowse }: { onNext: () => void, onLogin: () => void, onGuestBrowse: () => void }) {
  useEffect(() => {
    // Professional welcome chime on launch
    const jingle = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    jingle.volume = 0.3;
    jingle.play().catch(e => console.log("Autoplay prevented:", e));
  }, []);

  const playClick = () => {
    // Professional crisp click sound
    const click = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    click.volume = 0.4;
    click.play().catch(e => console.log("Click sound failed:", e));
  };

  const handleGetStarted = () => {
    playClick();
    onNext();
  };

  const handleSignIn = () => {
    playClick();
    onLogin();
  };

  return (
    <main className="relative h-screen w-full flex flex-col overflow-hidden font-sans antialiased text-brand-dark bg-white dark:bg-[#221610] dark:text-white">
      {/* Background Image Section */}
      <section className="absolute inset-0 z-0">
        <img
          alt="Delicious South African Kota with chips and toppings"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuALAhJY_048XGlh8sNMGuww7VeuS2h3Og31s-hbNNwHFmTDaxjk8N-NQXrl-aJtTh6qzRJ1a08acjgvkI46WVBuMtsPK4Wb4uvAPENlBULnMLPADN_q4yUJxmWbpJBTvuNUsyCwdim2YO8lT-LWsvOU599-LeSw4NBONUWlIIlCdqU8rAq86Kz8L_9gOUyop73K2Uu4yq_46NeYWOUTqYJ6nS7GFVWqREEiIeSXyxXGJdwVOZwg2y7-MUGLlVI4HTtsM3_a6kMNbA"
          referrerPolicy="no-referrer"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 hero-gradient"></div>
      </section>

      {/* Header Content */}
      <header className="relative z-10 w-full px-6 pt-12 flex flex-col items-center">
        <div className="status-bar-spacer"></div>
        <LocalEatsLogo width={220} height={60} showBackground={true} />
      </header>

      {/* Bottom Action Section */}
      <section className="mt-auto relative z-10 w-full px-6 pb-12 bottom-inset">
        {/* Value Proposition */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white leading-tight">
            Find the legendary <br />
            <span className="text-brand-orange underline decoration-2 underline-offset-4">
              Kota joints
            </span>{" "}
            near you.
          </h2>
          <p className="text-gray-200 mt-2 text-sm font-medium">
            Fresh ingredients, street-style, delivered fast.
          </p>
        </div>

        {/* Primary Action */}
        <div className="w-full">
          <button 
            onClick={handleGetStarted}
            className="w-full bg-brand-orange text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-xl active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Get Started</span>
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13 7l5 5m0 0l-5 5m5-5H6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              ></path>
            </svg>
          </button>
        </div>

        {/* Footer Links / Secondary Action */}
        <div className="mt-6 flex justify-between items-center px-2">
          <button
            className="text-white/80 text-sm font-semibold hover:text-white transition-colors cursor-pointer"
            onClick={handleSignIn}
          >
            Sign In
          </button>
          <button
            className="text-white/80 text-sm font-semibold hover:text-white transition-colors cursor-pointer"
            onClick={() => {
              playClick();
              onGuestBrowse();
            }}
          >
            Browse as Guest
          </button>
        </div>
      </section>
    </main>
  );
}

function SignUpScreen({ onNext, onLogin, setNotification }: { onNext: (data: SignUpData) => void, onLogin: () => void, setNotification: (n: NotificationState) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !phone) {
      setNotification({ message: 'Please fill in all fields', type: 'error' });
      return;
    }
    onNext({ fullName, email, phone });
  };

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden">
        <div className="flex items-center p-4 pb-2 justify-center mt-8">
          <LocalEatsLogo width={160} height={42} />
        </div>
        <div className="px-6">
          <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-[32px] font-bold leading-tight text-center pb-2 pt-6">Welcome</h1>
          <p className="text-slate-600 dark:text-slate-400 text-center text-sm mb-6">Discover the best local flavors near you.</p>
        </div>
        <div className="pb-6 px-6">
          <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between">
            <button onClick={onLogin} className="flex flex-col items-center justify-center border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 pb-[13px] pt-4 flex-1 cursor-pointer">
              <p className="text-sm font-bold leading-normal tracking-[0.015em]">Login</p>
            </button>
            <button className="flex flex-col items-center justify-center border-b-[3px] border-primary text-primary pb-[13px] pt-4 flex-1 cursor-pointer">
              <p className="text-sm font-bold leading-normal tracking-[0.015em]">Sign Up</p>
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-6 py-2">
          <label className="flex flex-col w-full">
            <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">Full Name</p>
            <div className="relative">
              <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                placeholder="Enter your full name" 
                type="text"
              />
            </div>
          </label>
          <label className="flex flex-col w-full">
            <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">Email</p>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                placeholder="Enter your email" 
                type="email"
              />
            </div>
          </label>
          <label className="flex flex-col w-full">
            <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">Phone Number</p>
            <div className="flex w-full items-stretch">
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 rounded-l-xl border-r-0">
                <Flag className="w-5 h-5 text-primary" />
                <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">+27</span>
              </div>
              <input 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input flex w-full min-w-0 flex-1 rounded-r-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 p-[15px] text-base font-normal leading-normal transition-all" 
                placeholder="081 234 5678" 
                type="tel"
              />
            </div>
          </label>
        </div>
        <div className="px-6 py-6">
          <button 
            onClick={handleSignUp}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold h-14 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Processing...' : 'Continue'}</span>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
        <div className="px-6 pb-6">
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-medium uppercase tracking-widest">Or continue with</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: APP_URL
                    }
                  });
                  if (error) throw error;
                } catch (error: any) {
                  setNotification({ message: error.message, type: 'error' });
                }
              }}
              className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <img alt="Google Logo" className="h-5 w-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5uYjQizkp0NzZOJp6gAxVIoom_EY70LzkakkWsAQaYO29sik9xD6rSvJFnoztFAIzTeXZX17vg94A_hZuYmV2_Va3hBYvZoEXVuzb6Uypat-btNCXq2M3UdT8jllg-feqnW8CKzK5T5EB9l6GU-uqjg_oOpWia8T2AYqmOudM6LiS5I7wofQv0QG0MZc_KJNHHx60c_02idR-68zHoEMZwxAGOW33qn0nylojD9egOorA99Q5_UD2H8L0LMgVA9aAoGK-TF--TQ" referrerPolicy="no-referrer"/>
              <span className="text-sm font-semibold">Google</span>
            </button>
            <button 
              onClick={() => setNotification({ message: "Apple login coming soon!", type: 'info' })}
              className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-sm font-semibold">Apple</span>
            </button>
          </div>
        </div>
        <div className="mt-auto pb-10 px-6 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Already have an account? 
            <button onClick={onLogin} className="text-primary font-bold hover:underline ml-1 cursor-pointer">Log in</button>
          </p>
        </div>
      </div>
    </div>
  );
}

function VerifyScreen({ phone, onNext, onBack }: { phone: string, onNext: () => void, onBack: () => void }) {
  const [timer, setTimer] = useState(30);
  const [code, setCode] = useState(['', '', '', '']);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResend = () => {
    if (timer === 0) {
      setTimer(30);
      // Logic to resend code would go here
    }
  };

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`verify-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="font-display bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <header className="flex items-center p-4">
          <button onClick={onBack} className="size-10 flex items-center justify-center rounded-full hover:bg-primary/10 transition-colors cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </header>
        <main className="flex-1 px-6 pt-4 pb-12 flex flex-col">
          <div className="mb-10">
            <h1 className="text-3xl font-bold mb-3">Verification Code</h1>
            <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
              Please enter the 4-digit code sent to <span className="font-semibold text-slate-900 dark:text-slate-100">+27 {phone || '82 123 4567'}</span>
            </p>
          </div>
          <div className="flex justify-between gap-4 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`verify-input-${index}`}
                className="w-16 h-16 text-center text-2xl font-bold bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-primary focus:ring-0 transition-colors"
                maxLength={1}
                type="text"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                autoFocus={index === 0}
              />
            ))}
          </div>
          <div className="text-center mb-10">
            <p className="text-slate-500 text-sm">Didn't receive the code?</p>
            <button 
              onClick={handleResend}
              disabled={timer > 0}
              className={`font-semibold text-sm mt-1 cursor-pointer ${timer > 0 ? 'text-slate-400' : 'text-primary hover:underline'}`}
            >
              Resend Code {timer > 0 ? `(00:${timer.toString().padStart(2, '0')})` : ''}
            </button>
          </div>
          <button 
            onClick={onNext} 
            disabled={code.some(d => !d)}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all mb-12 cursor-pointer"
          >
            Verify & Continue
          </button>
          <div className="mt-auto grid grid-cols-3 gap-2 max-w-sm mx-auto w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num} 
                onClick={() => {
                  const emptyIndex = code.findIndex(d => !d);
                  if (emptyIndex !== -1) handleInputChange(emptyIndex, num.toString());
                }}
                className="h-14 flex items-center justify-center text-2xl font-semibold rounded-lg hover:bg-primary/10 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <div className="h-14"></div>
            <button 
              onClick={() => {
                const emptyIndex = code.findIndex(d => !d);
                if (emptyIndex !== -1) handleInputChange(emptyIndex, '0');
              }}
              className="h-14 flex items-center justify-center text-2xl font-semibold rounded-lg hover:bg-primary/10 cursor-pointer"
            >
              0
            </button>
            <button 
              onClick={() => {
                const lastFilledIndex = [...code].reverse().findIndex(d => d);
                if (lastFilledIndex !== -1) {
                  const index = 3 - lastFilledIndex;
                  handleInputChange(index, '');
                }
              }}
              className="h-14 flex items-center justify-center rounded-lg hover:bg-primary/10 cursor-pointer"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>
        </main>
        <div className="flex items-center justify-center pb-4">
          <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

function SetupPasswordScreen({ onNext, onBack, signupData, setNotification }: { onNext: () => void, onBack: () => void, signupData: SignUpData, setNotification: (n: NotificationState) => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!password || !confirmPassword) {
      setNotification({ message: 'Please fill in both password fields', type: 'error' });
      return;
    }
    if (password !== confirmPassword) {
      setNotification({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    if (password.length < 6) {
      setNotification({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password,
        options: {
          emailRedirectTo: APP_URL,
          data: {
            full_name: signupData.fullName,
            phone: signupData.phone
          }
        }
      });
      if (error) throw error;

      // Manually sync to profiles table in case trigger isn't set up
      if (data.user) {
        await supabase.from('profiles').upsert({
          user_id: data.user.id,
          fullName: signupData.fullName,
          email: signupData.email,
          phone: signupData.phone,
          updated_at: new Date().toISOString()
        });
      }

      onNext();
    } catch (error: any) {
      setNotification({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-display bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <header className="flex items-center p-4 bg-white dark:bg-[#221610] border-b border-primary/10">
          <button onClick={onBack} className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 ml-2 text-center mr-10">Set Password</h1>
        </header>
        <main className="flex-1 flex flex-col px-6 py-12 space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Create a password</h2>
            <p className="text-slate-600 dark:text-slate-400 text-base">This will be your main login credential along with your email.</p>
          </div>
          
          <div className="space-y-6">
            <label className="flex flex-col w-full">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">Password</p>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-12 text-base font-normal leading-normal transition-all" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </label>

            <label className="flex flex-col w-full">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">Confirm Password</p>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-12 text-base font-normal leading-normal transition-all" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                />
              </div>
            </label>
          </div>

          <button 
            onClick={handleSignUp}
            disabled={loading || !password || !confirmPassword}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold h-14 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-8"
          >
            <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          </button>
        </main>
      </div>
    </div>
  );
}

function SuccessScreen({ onCompleteProfile, onExplore }: { onCompleteProfile: () => void, onExplore: () => void }) {
  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 antialiased">
      <div className="relative flex h-screen w-full flex-col overflow-x-hidden">
        {/* Top Navigation */}
        <header className="flex items-center justify-between p-4 bg-white dark:bg-[#221610]">
          <button onClick={onExplore} className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">Success</h2>
          <div className="w-10"></div> {/* Spacer for symmetry */}
        </header>
        {/* Main Content Section */}
        <main className="flex flex-col flex-1 items-center justify-center px-6 text-center max-w-md mx-auto">
          {/* Success Graphic Container */}
          <div className="relative mb-8 flex items-center justify-center">
            {/* Decorative Background Circles */}
            <div className="absolute inset-0 bg-primary/10 rounded-full scale-150 blur-3xl"></div>
            <div className="relative h-48 w-48 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="h-32 w-32 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Check className="w-16 h-16 text-white" />
              </div>
            </div>
          </div>
          {/* Illustration */}
          <div className="hidden @[480px]:block w-full mb-8 overflow-hidden rounded-xl aspect-[16/9]">
            <div className="w-full h-full bg-center bg-no-repeat bg-cover" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAUYFgGn2Kz3oiU_brl-DSXLYhl2ZEurVBLwZESukS4NArW7PCETskF4RqPDCpclnxYsa7FGjKGF9xjOPbxoumHoC-wQtIfB6QsdS93Qa4wQ5u60nwzs6Quy1tFQasG3iEytSPZwHPy0K1spYF275XLZikA_fxM8_b7Q6AFJOK_JHAcFjVe0ai3F8FiZN44w9dYNGJIRzvzTpXoL0pOMIfgF2TveDvo3VvZpzFk_u0i4lM21Tnmd1KfKSSnJtMKy3bXH2KTqV6dTA")' }}>
            </div>
          </div>
          {/* Message */}
          <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-bold leading-tight pb-4">
            Account Created Successfully!
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-normal leading-relaxed mb-10 px-2">
            Welcome to <span className="text-primary font-semibold">LocalEats</span>! You are now ready to order the best Kotas in Tembisa.
          </p>
          {/* Action Area */}
          <div className="w-full flex flex-col gap-4">
            <button onClick={onExplore} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-primary text-white text-lg font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              <span className="truncate">Explore Stores</span>
            </button>
            <button onClick={onCompleteProfile} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-lg font-semibold leading-normal hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
              <span className="truncate">Complete Profile</span>
            </button>
          </div>
        </main>
        {/* Footer Decoration */}
        <footer className="py-8 flex justify-center items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/40"></div>
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <div className="w-2 h-2 rounded-full bg-primary/40"></div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function CompleteProfileScreen({ userProfile, onBack, onSave, setNotification }: { userProfile: UserProfile, onBack: () => void, onSave: (data: Partial<UserProfile>) => void, setNotification: (n: NotificationState) => void }) {
  const [email, setEmail] = useState(userProfile.email);
  const [address, setAddress] = useState(userProfile.address);
  const [phone, setPhone] = useState(userProfile.phone);
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [city, setCity] = useState(userProfile.city);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!fullName || !phone || !city || !address) {
      setNotification({ message: 'Please fill in all required fields to proceed.', type: 'error' });
      return;
    }
    onSave({ fullName, phone, city, address });
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      const publicUrl = await uploadAvatar(event.target.files[0], userProfile.id);
      onSave({ photoURL: publicUrl });
      setNotification({ message: 'Profile picture updated!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      let errorMsg = error.message;
      if (errorMsg === 'Bucket not found') {
        errorMsg = "We couldn't upload your photo right now. Please try again later.";
      }
      setNotification({ message: `Error uploading avatar: ${errorMsg}`, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a110c] font-sans text-slate-900 dark:text-slate-100 min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col w-full overflow-x-hidden pb-24">
        {/* Top App Bar */}
        <div className="flex items-center bg-white dark:bg-[#1a110c] p-4 pb-2 sticky top-0 z-10 border-b border-primary/10">
          <button onClick={onBack} className="text-primary flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-primary/5 transition-colors cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Complete Your Profile</h2>
        </div>

        {/* Profile Photo Section */}
        <div className="flex p-8">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            ref={fileInputRef}
            className="hidden"
          />
          <div className="flex w-full flex-col gap-6 items-center">
            <div className="flex gap-4 flex-col items-center group">
              <div className="relative">
                <div 
                  className="bg-primary/5 dark:bg-primary/10 bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/60" 
                  style={{ backgroundImage: userProfile.photoURL ? `url("${userProfile.photoURL}")` : `url("${DEFAULT_AVATAR_URL}")` }}
                >
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {!userProfile.photoURL && !uploading && <User className="w-12 h-12 text-slate-300 dark:text-slate-700" />}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-2.5 border-4 border-white dark:border-[#1a110c] shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="text-center space-y-1">
                <p className="text-slate-900 dark:text-slate-100 text-xl font-bold tracking-tight">{fullName || 'Your Name'}</p>
                <p className="text-slate-500 dark:text-slate-400 text-[13px] max-w-[240px]">Improve your profile by adding a clear photo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="px-6 space-y-6 max-w-md mx-auto w-full">
          <div className="space-y-4">
            <label className="block">
              <span className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">Full Name</span>
              <div className="relative group">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none" 
                  placeholder="e.g. John Doe" 
                  type="text"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">Phone Number</span>
              <div className="relative group">
                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none" 
                  placeholder="081 234 5678" 
                  type="tel"
                />
              </div>
            </label>

            <label className="block opacity-60">
              <span className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">Email (Read Only)</span>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  value={email}
                  disabled
                  className="w-full rounded-2xl text-slate-400 border-2 border-slate-100 dark:border-slate-900 bg-slate-100 dark:bg-slate-950 h-14 pl-12 pr-4 text-base font-medium cursor-not-allowed" 
                  type="email"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">City</span>
              <div className="relative group">
                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none" 
                  placeholder="e.g. Tembisa" 
                  type="text"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">Home Address</span>
              <div className="relative group">
                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none" 
                  placeholder="Section / Street / Number" 
                  type="text"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-4">
          <input className="rounded text-primary focus:ring-primary border-slate-300 dark:bg-slate-900" id="terms" type="checkbox" defaultChecked/>
          <label className="text-sm text-slate-500 dark:text-slate-400" htmlFor="terms">I agree to the <span className="text-primary font-medium">Terms of Service</span></label>
        </div>
        </div>
        
        {/* Sticky Save Button Container */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#1a110c]/80 backdrop-blur-lg border-t border-primary/10 max-w-md mx-auto">
          <button 
            onClick={handleSave}
            className="w-full bg-primary hover:bg-primary text-white font-black h-16 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-lg"
          >
            Save Profile Info
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
  );
}

function LoginScreen({ onLogin, onSignUp, setNotification }: { onLogin: () => void, onSignUp: () => void, setNotification: (n: NotificationState) => void }) {
  const [identifier, setIdentifier] = useState(() => localStorage.getItem('remembered_identifier') || '');
  const [password, setPassword] = useState('');
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('remembered_identifier'));
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setNotification({ message: `Please enter both ${loginType} and password`, type: 'error' });
      return;
    }
    setLoading(true);
    try {
      let loginEmail = identifier;
      if (loginType === 'phone') {
        // Look up email by phone in profiles table
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('phone', identifier)
          .maybeSingle();
        
        if (profileError) throw profileError;
        if (profile) {
          loginEmail = profile.email;
        } else {
          // Fallback: try to see if identifier itself is an email even if type is phone
          if (!identifier.includes('@')) {
            throw new Error('No account found with this phone number. Please use email.');
          }
        }
      }
      
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;
      
      if (rememberMe) {
        localStorage.setItem('remembered_identifier', identifier);
      } else {
        localStorage.removeItem('remembered_identifier');
      }
      
      onLogin();
    } catch (error: any) {
      let msg = error.message;
      if (msg === 'Failed to fetch') {
        msg = "Oops! We couldn't connect to the internet. Please check your connection and try again.";
      }
      setNotification({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden">
        {/* Logo Section */}
        <div className="flex items-center p-4 pb-2 justify-center mt-8">
          <LocalEatsLogo width={160} height={42} />
        </div>
        {/* Welcome Header */}
        <div className="px-6">
          <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-[32px] font-bold leading-tight text-center pb-2 pt-6">Welcome Back</h1>
          <p className="text-slate-600 dark:text-slate-400 text-center text-sm mb-6">Log in to order your favorite local meals.</p>
        </div>
        {/* Tabs */}
        <div className="pb-6 px-6">
          <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between">
            <button className="flex flex-col items-center justify-center border-b-[3px] border-primary text-primary pb-[13px] pt-4 flex-1 cursor-pointer">
              <p className="text-sm font-bold leading-normal tracking-[0.015em]">Login</p>
            </button>
            <button onClick={onSignUp} className="flex flex-col items-center justify-center border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 pb-[13px] pt-4 flex-1 cursor-pointer">
              <p className="text-sm font-bold leading-normal tracking-[0.015em]">Sign Up</p>
            </button>
          </div>
        </div>
        {/* Login Type Toggle */}
        <div className="px-6 py-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setLoginType('email')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginType === 'email' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
            >
              Email
            </button>
            <button 
              onClick={() => setLoginType('phone')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${loginType === 'phone' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}
            >
              Phone
            </button>
          </div>
        </div>
        {/* Form Fields */}
        <div className="flex flex-col gap-4 px-6 py-2">
          <label className="flex flex-col w-full">
            <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">{loginType === 'email' ? 'Email' : 'Phone Number'}</p>
            <div className="relative">
              {loginType === 'email' ? (
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              ) : (
                <Smartphone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              )}
              <input 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                placeholder={loginType === 'email' ? "Enter your email" : "Enter your phone number"} 
                type={loginType === 'email' ? "email" : "tel"}
              />
            </div>
          </label>
          <label className="flex flex-col w-full">
            <div className="flex justify-between items-center pb-2">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal">Password</p>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-12 text-base font-normal leading-normal transition-all" 
                placeholder="••••••••" 
                type={showPassword ? "text" : "password"}
              />
              <button 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </label>
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-700'}`}>
                {rememberMe && <Check className="w-3 h-3 text-white" />}
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">Remember Me</span>
            </label>
            <button className="text-xs text-primary font-semibold hover:underline cursor-pointer">Forgot Password?</button>
          </div>
        </div>
        {/* Login Button */}
        <div className="px-6 py-6">
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold h-14 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{loading ? 'Logging in...' : 'Login'}</span>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
          </button>
        </div>
        {/* Social Login Section */}
        <div className="px-6 pb-6">
          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs font-medium uppercase tracking-widest">Or continue with</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={async () => {
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: APP_URL
                    }
                  });
                  if (error) throw error;
                } catch (error: any) {
                  setNotification({ message: error.message, type: 'error' });
                }
              }}
              className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <img alt="Google Logo" className="h-5 w-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5uYjQizkp0NzZOJp6gAxVIoom_EY70LzkakkWsAQaYO29sik9xD6rSvJFnoztFAIzTeXZX17vg94A_hZuYmV2_Va3hBYvZoEXVuzb6Uypat-btNCXq2M3UdT8jllg-feqnW8CKzK5T5EB9l6GU-uqjg_oOpWia8T2AYqmOudM6LiS5I7wofQv0QG0MZc_KJNHHx60c_02idR-68zHoEMZwxAGOW33qn0nylojD9egOorA99Q5_UD2H8L0LMgVA9aAoGK-TF--TQ" referrerPolicy="no-referrer"/>
              <span className="text-sm font-semibold">Google</span>
            </button>
            <button 
              onClick={() => setNotification({ message: "Apple signup coming soon!", type: 'info' })}
              className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Smartphone className="w-5 h-5" />
              <span className="text-sm font-semibold">Apple</span>
            </button>
          </div>
        </div>
        {/* Footer Redirect */}
        <div className="mt-auto pb-10 px-6 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Don't have an account?
            <button onClick={onSignUp} className="text-primary font-bold hover:underline ml-1 cursor-pointer">Sign up</button>
          </p>
        </div>
        {/* Progress Indicator */}
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-primary/10">
          <div className="h-full bg-primary w-1/3"></div>
        </div>
      </div>
    </div>
  );
}

function LoginSuccessScreen({ onHome, onViewProfile, onBack }: { onHome: () => void, onViewProfile: () => void, onBack: () => void }) {
  return (
    <div className="bg-white dark:bg-[#221610] font-display antialiased min-h-screen">
      <div className="relative flex h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden">
        <div className="flex items-center p-4 justify-between">
          <button onClick={onBack} className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-primary/10 transition-colors cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Login Success</h2>
        </div>
        <div className="flex flex-col items-center justify-center grow p-6 space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl transform scale-150"></div>
            <div className="relative bg-white dark:bg-slate-800 p-8 rounded-full shadow-xl border-4 border-primary/10">
              <CheckCircle className="w-[120px] h-[120px] text-primary" />
            </div>
          </div>
          <div className="text-center space-y-4 max-w-sm">
            <h1 className="text-slate-900 dark:text-slate-100 text-4xl font-extrabold tracking-tight">Welcome Back!</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
              You have successfully logged into your account. Ready to explore local eats?
            </p>
          </div>
          <div className="w-full max-w-sm pt-4 space-y-4">
            <button onClick={onHome} className="flex items-center justify-center w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-[0.98] cursor-pointer">
              Go to Home
            </button>
            <button onClick={onViewProfile} className="flex items-center justify-center w-full bg-primary/10 hover:bg-primary/20 text-primary font-semibold py-4 px-6 rounded-xl transition-all cursor-pointer">
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShopCardProps {
  key?: string | number;
  shop: Shop;
  onClick: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const ShopCard = ({ shop, onClick, userLocation }: ShopCardProps) => {
  return (
    <div 
      onClick={shop.isOpen !== false ? onClick : undefined}
      className={`flex flex-col gap-2 shrink-0 w-64 bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-all group ${shop.isOpen !== false ? 'cursor-pointer hover:shadow-xl active:scale-[0.98]' : 'opacity-60 grayscale-[0.5]'}`}
    >
      <div className="h-36 w-full rounded-2xl overflow-hidden relative">
        <BlurUpImage 
          src={shop.logo} 
          alt={shop.name} 
          className="w-full h-full"
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
          <span className="text-xs font-black text-slate-900 dark:text-white">{shop.rating}</span>
          <span className="text-[9px] text-slate-500">({shop.reviewCount || 0})</span>
        </div>
      </div>
      <div className="px-1">
        <div className="flex justify-between items-start">
          <h4 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-orange-600 transition-colors">{shop.name}</h4>
        </div>
        <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-1">{shop.description}</p>
        
        <TrustBadge shop={shop} />
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-slate-800/50">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 truncate">{shop.distance ? `${shop.distance.toFixed(1)} km` : (shop.address || 'Tembisa')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-bold text-orange-600">{shop.prepTime || '15-20 min'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function HomeScreen({ userProfile, session, shops, loadingShops, fetchError, onSettings, onProfile, onCheckout, onDiscover, onExplore, onOrderHistory, onStoreInfo, onRetry, cart, addToCart, removeFromCart, clearCart, setNotification, setPendingReview, setCurrentScreen, favorites, toggleFavorite, userLocation, onRequestLocation, onNotifications, unreadCount, orders, showAlert, appVersion }: { userProfile: UserProfile, session: Session | null, shops: Shop[], loadingShops: boolean, fetchError: string | null, onSettings: () => void, onProfile: () => void, onCheckout: () => void, onDiscover: () => void, onExplore: () => void, onOrderHistory: () => void, onStoreInfo: (shopId: string) => void, onRetry: () => void, cart: CartItem[], addToCart: (item: MenuItem, shopId: string, quantity?: number, specialInstructions?: string) => void, removeFromCart: (itemId: string, shopId: string) => void, clearCart: () => void, setNotification: Dispatch<SetStateAction<any>>, setPendingReview: Dispatch<SetStateAction<PendingReview | null>>, setCurrentScreen: Dispatch<SetStateAction<Screen>>, favorites: string[], toggleFavorite: (shopId: string) => void, userLocation: { lat: number, lng: number } | null, onRequestLocation: () => void, onNotifications: () => void, unreadCount: number, orders: Order[], showAlert: (title: string, message: string) => void, appVersion: string }) {
  const isUpdateAvailable = false; // Added as a temporary fix
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedItemForQuantity, setSelectedItemForQuantity] = useState<MenuItem | null>(null);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const categories = ['All', 'Favorites', 'Nearby', ...new Set(shops.map(s => s.category))];

  const filteredShops = shops.filter(shop => {
    const query = searchQuery.trim().toLowerCase();
    const shopText = `${shop.name} ${shop.description} ${shop.category}`.toLowerCase();
    const matchesSearch = query === '' || query.split(/\s+/).every(term => shopText.includes(term));
    
    let matchesCategory = false;
    if (selectedCategory === 'All') {
      matchesCategory = true;
    } else if (selectedCategory === 'Favorites') {
      matchesCategory = favorites.includes(shop.id.toString());
    } else if (selectedCategory === 'Nearby') {
      matchesCategory = true; // We'll sort these
    } else {
      matchesCategory = shop.category === selectedCategory;
    }
    
    const matchesRating = shop.rating >= minRating;
    const matchesOpen = !showOnlyOpen || getShopStatus(shop).isOpen;
    
    return matchesSearch && matchesCategory && matchesRating && matchesOpen && favorites.includes(shop.id.toString());
  });

  const sortedShops = [...filteredShops].sort((a, b) => {
    // Smart Sort Logic: Prioritize Open -> Specials -> Distance -> Rating
    const statusA = getShopStatus(a);
    const statusB = getShopStatus(b);

    // 1. Prioritize Open shops
    if (statusA.isOpen && !statusB.isOpen) return -1;
    if (!statusA.isOpen && statusB.isOpen) return 1;

    // 2. Prioritize "Local Eats Special"
    if (a.is_special && !b.is_special) return -1;
    if (!a.is_special && b.is_special) return 1;

    // 3. Distance Sort (Nearby Priority)
    if (userLocation) {
      const aLat = (a as any).latitude || -25.9964 + (hashString(a.id) % 10) * 0.005;
      const aLng = (a as any).longitude || 28.2268 + (hashString(a.id) % 10) * 0.005;
      const bLat = (b as any).latitude || -25.9964 + (hashString(b.id) % 10) * 0.005;
      const bLng = (b as any).longitude || 28.2268 + (hashString(b.id) % 10) * 0.005;
      
      const distA = Math.sqrt(Math.pow(aLat - userLocation.lat, 2) + Math.pow(aLng - userLocation.lng, 2));
      const distB = Math.sqrt(Math.pow(bLat - userLocation.lat, 2) + Math.pow(bLng - userLocation.lng, 2));
      if (Math.abs(distA - distB) > 0.001) return distA - distB;
    }

    // 4. Rating Sort
    return b.rating - a.rating;
  });

  const recentShopIds = [...new Set(orders.map(o => o.shop_id))].slice(0, 5);
  const recentShops = recentShopIds.map(id => shops.find(s => s.id === id)).filter(Boolean) as Shop[];

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (fetchError && shops.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen flex flex-col items-center justify-center p-8 max-w-md mx-auto shadow-2xl">
        <div className="bg-red-50 dark:bg-red-500/10 p-6 rounded-[32px] border border-red-100 dark:border-red-900/30 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 mb-4">
            <WifiOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight tracking-tight">Backend Timeout</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-[240px]">
            {fetchError.includes('Network Error') 
              ? "We couldn't reach South Africa's servers. Check your ad-blocker or internet." 
              : fetchError}
          </p>
          <button 
            onClick={onRetry} 
            className="w-full py-4 bg-slate-900 dark:bg-orange-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer hover:shadow-2xl"
          >
            Reconnect & Retry
          </button>
        </div>
      </div>
    );
  }

  if (loadingShops && shops.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-[#221610] min-h-screen flex flex-col max-w-md mx-auto shadow-2xl">
        <header className="bg-white dark:bg-slate-900/80 px-4 py-3 flex items-center justify-between shadow-sm border-b border-gray-100 dark:border-slate-800">
          <div className="h-8 w-32 bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse"></div>
          <div className="h-10 w-10 bg-gray-200 dark:bg-slate-800 rounded-full animate-pulse"></div>
        </header>
        <main className="p-4 space-y-6">
          <div className="h-12 w-full bg-gray-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          <div className="flex gap-2 overflow-x-hidden">
            {[1,2,3,4].map(i => <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-slate-800 rounded-full animate-pulse shrink-0"></div>)}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl shadow-sm space-y-3 border border-gray-100 dark:border-slate-800">
                <div className="h-40 w-full bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse"></div>
                <div className="h-6 w-3/4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse"></div>
                <div className="h-4 w-1/2 bg-gray-100 dark:bg-slate-800 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (shops.length === 0 && !loadingShops) {
    return (
      <div className="bg-white dark:bg-[#221610] h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-orange-50 dark:bg-orange-900/20 rounded-full scale-150 blur-3xl opacity-50"></div>
          <Store className="w-24 h-24 text-orange-500 relative z-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No Shops Found</h2>
        <p className="text-gray-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
          {fetchError ? fetchError : "It looks like there are no active shops in your area yet."}
        </p>
        
        {fetchError && (fetchError.includes('Network Error') || fetchError.includes('Failed to fetch')) && (
          <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl mb-6 text-left max-w-xs border border-orange-100 dark:border-orange-900/30">
            <h4 className="text-[10px] font-bold text-orange-800 dark:text-orange-400 uppercase mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Network Diagnosis
            </h4>
            <ul className="text-[10px] text-orange-700 dark:text-orange-300 space-y-1.5 list-disc pl-3">
              <li>**Ad-Blockers:** Disable uBlock, AdBlock, or Brave Shields for this site.</li>
              <li>**VPN/Firewall:** Some corporate networks block Supabase domains.</li>
              <li>**Project Status:** Check if your Supabase project is active (not paused).</li>
              <li>**Config:** Ensure **VITE_SUPABASE_URL** is correct in your secrets.</li>
            </ul>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-6 text-[10px] font-mono text-slate-400 border border-slate-100 dark:border-slate-700 w-full max-w-xs overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span>Supabase Endpoint</span>
            <span className="text-[8px] bg-slate-200 dark:bg-slate-700 px-1 rounded uppercase">Active</span>
          </div>
          <div className="truncate text-slate-500 dark:text-slate-300">Connected to Supabase Cloud</div>
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={onRetry} 
            className="w-full bg-orange-600 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Retry Loading
          </button>

          {/* Demo Seeder for Presentation */}
          <details className="w-full mt-4">
            <summary className="text-xs text-slate-400 cursor-pointer text-center mb-4">Developer Options</summary>
            <button 
              id="seed-button"
              onClick={async () => {
                const btn = document.getElementById('seed-button');
                if (btn) btn.innerText = 'Seeding...';
                try {
                  console.log('Starting demo data seeding...');
                  const { data: newShops, error: seedError } = await supabase
                    .from('shops')
                    .insert([
                      { name: 'Tembisa Kota King', description: 'The best Khas-Khas in Tembisa', location: 'Winnie Mandela Zone 1', category: 'Kota', rating: 4.8, is_active: true },
                      { name: 'Mama\'s Kitchen', description: 'Home-style African cuisine', location: 'Oakmoor', category: 'Traditional', rating: 4.6, is_active: true },
                      { name: 'The Grill Master', description: 'Flame-grilled chicken and steaks', location: 'Hospital View', category: 'Grill', rating: 4.7, is_active: true }
                    ])
                    .select();
                  
                  if (seedError) {
                    console.error('Shops seeding failed:', seedError);
                    throw seedError;
                  }
                  
                  console.log('Shops seeded successfully:', newShops);
                  
                  // Add some menu items for the first shop
                  if (newShops && newShops[0]) {
                    const { error: menuSeedError } = await supabase.from('menu_items').insert([
                      { shop_id: newShops[0].id, name: "The King Kota", price: 45, description: "Chips, Polony, Cheese, Russian, Steak" },
                      { shop_id: newShops[0].id, name: "Special Combo", price: 35, description: "Chips, Russian, Egg" }
                    ]);
                    
                    if (menuSeedError) {
                      console.error('Menu items seeding failed:', menuSeedError);
                    }
                  }
                  
                  onRetry();
                } catch (err: any) {
                  console.error('Seeding error detail:', err);
                  const isFetchError = err.message === 'Failed to fetch';
                  const msg = isFetchError 
                    ? 'Network Blocked: Your browser or an ad-blocker is preventing the data from being saved.'
                    : (err.message || 'Unknown error during seeding');
                  
                  if (isFetchError) {
                    const sqlDiv = document.getElementById('manual-sql-area');
                    if (sqlDiv) sqlDiv.classList.remove('hidden');
                  }
                  
                  showAlert('Seeding Error', msg);
                } finally {
                  if (btn) btn.innerText = 'Seed Demo Shops';
                }
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl cursor-pointer active:scale-95 transition-transform"
            >
              Seed Demo Shops
            </button>

            <div id="manual-sql-area" className="hidden mt-4 text-left">
              <p className="text-[10px] font-bold text-red-500 mb-2 uppercase tracking-tight">Manual Setup Required</p>
              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">Your browser blocked the automatic setup. Please copy this SQL and run it in your Supabase SQL Editor:</p>
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 overflow-x-auto mb-4">
                <pre className="text-[8px] font-mono text-slate-700 whitespace-pre-wrap leading-tight">
{`-- 1. Create shops table
CREATE TABLE IF NOT EXISTS shops (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  location text,
  category text,
  rating numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  logo_url text DEFAULT 'https://picsum.photos/seed/shop/200/200',
  owner_id uuid
);

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  data jsonb
);

-- 3. Ensure profiles table has necessary columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorites text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fullName text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 4. Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL,
  description text,
  image_url text DEFAULT 'https://picsum.photos/seed/food/200/200',
  is_available boolean DEFAULT true
);

-- 5. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  userName text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  createdAt timestamptz DEFAULT now()
);

-- 6. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  shop_id uuid REFERENCES shops(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  city text,
  address text NOT NULL,
  country text DEFAULT 'South Africa',
  product_name text NOT NULL,
  product_variant text,
  quantity integer DEFAULT 1,
  price numeric NOT NULL,
  notes text,
  status text DEFAULT 'pending',
  payment_method text DEFAULT 'Cash on Delivery',
  is_delivery boolean DEFAULT false,
  delivery_fee numeric DEFAULT 0,
  rider_id uuid,
  delivery_status text DEFAULT 'none' CHECK (delivery_status IN ('none', 'finding_rider', 'rider_assigned', 'picked_up', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- 7. Create rider_profiles table
CREATE TABLE IF NOT EXISTS rider_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  vehicle_type text DEFAULT 'bicycle',
  is_online boolean DEFAULT false,
  total_earnings numeric DEFAULT 0,
  current_lat numeric,
  current_lng numeric,
  rating numeric DEFAULT 5.0,
  created_at timestamptz DEFAULT now()
);

-- 8. Insert demo data
INSERT INTO shops (name, description, location, category, rating, is_active)
VALUES 
('Tembisa Kota King', 'The best Khas-Khas in Tembisa', 'Winnie Mandela Zone 1', 'Kota', 4.8, true),
('Mama''s Kitchen', 'Home-style African cuisine', 'Oakmoor', 'Traditional', 4.6, true),
('The Grill Master', 'Flame-grilled chicken and steaks', 'Hospital View', 'Grill', 4.7, true);`}
              </pre>
            </div>
            
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
              <p className="text-[8px] font-bold text-slate-400 uppercase mb-1">Debug Info</p>
              <p className="text-[8px] text-slate-400 break-all font-mono">URL: {import.meta.env.VITE_SUPABASE_URL || 'https://qnwjkwlhmreenqotufvw.supabase.co'}</p>
            </div>
            
            <p className="text-[9px] text-slate-400 mt-4 italic text-center">Then click "Retry Loading" above.</p>
          </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans max-w-md mx-auto relative shadow-2xl">
      {isUpdateAvailable && (
        <button
          onClick={() => window.location.reload()}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl z-[9999] font-bold flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Update Available!
        </button>
      )}
      {/* TopBar */}
      <header className="bg-white dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-primary/5">
        <div className="flex items-center gap-1">
          <LocalEatsLogo width={140} height={36} />
          <span className="text-[8px] text-slate-400 opacity-50 ml-1">v{appVersion}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onNotifications}
            className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-gray-700 dark:text-slate-300"
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              aria-label="Settings" 
              className={`p-2 rounded-full transition-colors cursor-pointer ${isSettingsOpen ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
            >
              <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </button>
            
            {isSettingsOpen && (
              <>
                <div className="fixed inset-0 z-[50]" onClick={() => setIsSettingsOpen(false)}></div>
                <div className="absolute top-12 right-0 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-[60] py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button onClick={() => { setIsSettingsOpen(false); onSettings(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group cursor-pointer">
                    <Settings className="w-5 h-5 text-gray-500 dark:text-slate-400 group-hover:text-orange-600" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Settings</span>
                  </button>
                  <button onClick={() => { setIsSettingsOpen(false); onProfile(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group cursor-pointer">
                    <User className="w-5 h-5 text-gray-500 dark:text-slate-400 group-hover:text-orange-600" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Profile</span>
                  </button>
                  <button onClick={() => { setIsSettingsOpen(false); onOrderHistory(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group cursor-pointer">
                    <History className="w-5 h-5 text-gray-500 dark:text-slate-400 group-hover:text-orange-600" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Order History</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col p-4 overflow-y-auto">
        {/* SearchSection */}
        <section className="mb-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <input 
                  className="block w-full pl-10 pr-3 py-3 border-none bg-white dark:bg-slate-800 rounded-2xl shadow-md ring-1 ring-black/5 dark:ring-white/5 focus:ring-2 focus:ring-orange-500 transition-all text-sm outline-none dark:text-white dark:placeholder:text-slate-500" 
                  placeholder="Search for the best Tembisa Kotas..." 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </section>

            {/* Category Filters */}
            <section className="mb-4 overflow-x-auto no-scrollbar flex flex-col gap-4 pb-2">
              <div className="flex gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${selectedCategory === cat ? 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowOnlyOpen(!showOnlyOpen)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 border ${
                    showOnlyOpen 
                      ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <Clock className={`w-2.5 h-2.5 ${showOnlyOpen ? 'fill-current' : ''}`} />
                  Open Now
                </button>
                {[0, 3, 4, 4.5].map(rating => (
                  <button 
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 border ${
                      minRating === rating 
                        ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' 
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <Star className={`w-2.5 h-2.5 ${minRating === rating ? 'fill-current' : ''}`} />
                    {rating === 0 ? 'All Ratings' : `${rating}+ Stars`}
                  </button>
                ))}
              </div>
            </section>

            {/* Recent Orders Carousel - Prioritized at top */}
            {recentShops.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Order Again</h3>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
                  {recentShops.map(shop => (
                    <div 
                      key={shop.id}
                      onClick={() => onStoreInfo(shop.id)}
                      className="flex flex-col items-center gap-2 shrink-0 w-24 group cursor-pointer"
                    >
                      <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-orange-500 to-yellow-400 shadow-lg group-active:scale-95 transition-transform">
                        <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 overflow-hidden">
                          <BlurUpImage src={shop.logo} alt={shop.name} className="w-full h-full" blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`} />
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-900 dark:text-white truncate w-full text-center">{shop.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Quick Start Guide for New Users / Discover */}
            {favorites.length === 0 && (
              <section className="mb-6 px-1 animate-in fade-in slide-in-from-left-4 duration-700">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-[32px] shadow-xl shadow-orange-200 dark:shadow-none relative overflow-hidden group">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="relative z-10">
                    <h3 className="text-white text-xl font-black tracking-tight mb-2">Discover Tembisa's Best! 🇿🇦</h3>
                    <p className="text-white/90 text-xs font-medium leading-relaxed mb-4">
                      You haven't followed any shops yet. Start your journey by exploring local favorites!
                    </p>
                    <button 
                      onClick={onDiscover}
                      className="bg-white text-orange-600 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all cursor-pointer"
                    >
                      Discover Shops
                    </button>
                  </div>
                  <div className="absolute bottom-0 right-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
                    <Store className="w-24 h-24 text-white" />
                  </div>
                </div>
              </section>
            )}

            {/* Favorites Carousel */}
            {favorites.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Your Favorites</h3>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
                  {shops.filter(s => favorites.includes(s.id)).map(shop => (
                    <div 
                      key={shop.id}
                      onClick={() => onStoreInfo(shop.id)}
                      className="flex flex-col items-center gap-2 shrink-0 w-24 group cursor-pointer"
                    >
                      <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-red-500 to-pink-400 shadow-lg group-active:scale-95 transition-transform">
                        <div className="w-full h-full rounded-full border-2 border-white dark:border-slate-900 overflow-hidden">
                          <BlurUpImage src={shop.logo} alt={shop.name} className="w-full h-full" blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`} />
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-900 dark:text-white truncate w-full text-center">{shop.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Followed Stores */}
            <section className="mb-24">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4 ml-1">All Local Shops</h3>
              <div className="grid grid-cols-1 gap-4">
                {sortedShops.map((shop) => {
                  const isFollowed = favorites.includes(shop.id);
                  return (
                    <div 
                      key={shop.id}
                      onClick={() => onStoreInfo(shop.id)}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-4 flex items-center gap-4 border border-gray-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all relative group"
                    >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                        <BlurUpImage src={shop.logo} alt={shop.name} className="w-full h-full" blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">{shop.name}</h4>
                            {isFollowed && (
                              <div className="bg-red-50 dark:bg-red-500/10 p-1 rounded-full">
                                <Heart className="w-2.5 h-2.5 text-red-500 fill-current" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-black text-slate-900 dark:text-white">{shop.rating}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 line-clamp-1 mt-0.5">{shop.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <TrustBadge shop={shop} />
                          {isFollowed && (
                            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Following</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {sortedShops.length === 0 && (
              <section className="py-20 text-center">
                <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Store className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">No Shops Found</h3>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query.</p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setMinRating(0);
                    setShowOnlyOpen(false);
                  }}
                  className="mt-6 px-6 py-3 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              </section>
            )}
      </main>

      {/* BottomNavigation */}
      <nav className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-6 py-2 pb-6 flex justify-around items-center sticky bottom-0 z-40">
        <button className="flex flex-col items-center gap-1 text-orange-600 cursor-pointer">
          <div className="p-1 rounded-xl bg-orange-50 dark:bg-orange-500/10">
            <Home className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold">Home</span>
        </button>
        <button onClick={onDiscover} className="flex flex-col items-center gap-1 text-gray-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <Store className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold">Discover</span>
        </button>
        <button onClick={onExplore} className="flex flex-col items-center gap-1 text-gray-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <Compass className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold">Explore</span>
        </button>
      </nav>
    </div>
  );
}

function CheckoutScreen({ userProfile, session, shops, onBack, onConfirm, onIncompleteProfile, cart, setCart, setNotification, showAlert, showConfirm }: { 
  userProfile: UserProfile, 
  session: Session | null, 
  shops: Shop[], 
  onBack: () => void, 
  onConfirm: () => void, 
  onIncompleteProfile: () => void,
  cart: CartItem[], 
  setCart: Dispatch<SetStateAction<CartItem[]>>, 
  setNotification: Dispatch<SetStateAction<any>>,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_machine'>('cash');
  const [deliveryType, setDeliveryType] = useState<'collection' | 'delivery'>('collection');
  const DELIVERY_FEE = 5.00;
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalAmount = deliveryType === 'delivery' ? subtotal + DELIVERY_FEE : subtotal;
  
  const primaryShopId = cart.length > 0 ? cart[0].shopId : (shops[0]?.id || '');
  const primaryShop = shops.find(s => s.id === primaryShopId) || shops[0];

  const handleConfirm = async () => {
    if (!userProfile.fullName || !userProfile.phone) {
      onIncompleteProfile();
      return;
    }

    if (deliveryType === 'delivery' && (!userProfile.address || !userProfile.city)) {
      showAlert('Delivery Info Needed', 'Please complete your profile with an address for delivery.');
      onIncompleteProfile();
      return;
    }
    
    const status = getShopStatus(primaryShop);
    const isClosed = !status.isOpen;
    
    if (isClosed) {
      showConfirm(
        'Shop Closed',
        `${primaryShop.name} is currently closed. Your order will be attended to when they open at ${status.nextOpeningTime || 'their next opening hour'}. Do you want to proceed?`,
        () => {
          // Proceed with checkout
          processCheckout(isClosed);
        }
      );
      return;
    }
    processCheckout(false);
  };

  const processCheckout = async (isClosed: boolean) => {
    setLoading(true);
    if ("vibrate" in navigator) {
      navigator.vibrate([10, 30, 10]); // Premium double-tap feel for confirmation
    }
    try {
      const orderData = cart.map(item => ({
        user_id: session?.user?.id,
        shop_id: item.shopId,
        customer_name: userProfile.fullName,
        phone: userProfile.phone,
        email: userProfile.email,
        city: userProfile.city,
        address: userProfile.address,
        country: userProfile.country,
        product_name: item.name,
        product_variant: '',
        quantity: item.quantity,
        price: item.price * item.quantity,
        notes: item.specialInstructions || '',
        status: 'pending',
        payment_method: paymentMethod,
        is_delivery: deliveryType === 'delivery',
        delivery_fee: deliveryType === 'delivery' ? DELIVERY_FEE : 0,
        delivery_status: deliveryType === 'delivery' ? 'finding_rider' : 'none'
      }));

      console.log('Submitting order with delivery info:', orderData);
      const { data, error } = await supabase.from('orders').insert(orderData).select();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }
      
      if (isClosed) {
        setNotification({ 
          message: `Order submitted! Note: ${primaryShop.name} is currently closed.`, 
          type: 'info' 
        });
      } else {
        setNotification({ message: 'Order successfully placed!', type: 'success' });
      }
      
      onConfirm();
    } catch (error: any) {
      console.error('Error submitting order:', error);
      showAlert('Order Error', `Failed to place order: ${error.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto w-full max-w-md mx-auto flex-col bg-white dark:bg-[#221610] overflow-x-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center bg-white dark:bg-[#221610] p-4 pb-2 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
          <div onClick={onBack} className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center justify-start cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1">Checkout</h2>
          <button 
            onClick={() => {
              showConfirm('Clear Cart', 'Clear all items from your cart?', () => {
                setCart([]);
                localStorage.setItem('cart', JSON.stringify([]));
                onBack();
              });
            }}
            className="text-red-500 text-xs font-bold flex items-center gap-1 p-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        </div>
        
        <div className="flex flex-col gap-6 p-4">
          {/* Order Summary Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-3 pt-2">Order Summary</h3>
            <div className="flex flex-col gap-4">
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-16 shrink-0" style={{ backgroundImage: `url("${item.image}")` }}>
                  </div>
                  <div className="flex flex-col justify-center flex-1">
                    <p className="text-slate-900 dark:text-slate-100 text-base font-semibold leading-normal line-clamp-1">{item.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-normal">Quantity: {item.quantity}</p>
                    {item.specialInstructions && (
                      <p className="text-orange-600 text-[10px] font-medium leading-normal mt-1 italic line-clamp-2">Note: {item.specialInstructions}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <p className="text-primary text-base font-bold leading-normal">R {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Delivery Options */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-3">Fulfillment Type</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeliveryType('collection')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${deliveryType === 'collection' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 ring-4 ring-orange-500/10' : 'border-slate-100 dark:border-slate-800'}`}
              >
                <ShoppingBasket className={`w-8 h-8 ${deliveryType === 'collection' ? 'text-orange-600' : 'text-slate-400'}`} />
                <div className="text-center">
                  <p className={`text-sm font-bold ${deliveryType === 'collection' ? 'text-orange-700 dark:text-orange-400' : 'text-slate-600'}`}>Collection</p>
                  <p className="text-[10px] text-slate-500">Free</p>
                </div>
              </button>

              <button 
                onClick={() => setDeliveryType('delivery')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${deliveryType === 'delivery' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 ring-4 ring-orange-500/10' : 'border-slate-100 dark:border-slate-800'}`}
              >
                <div className="relative">
                  <Navigation className={`w-8 h-8 ${deliveryType === 'delivery' ? 'text-orange-600' : 'text-slate-400'}`} />
                  <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">R5</span>
                </div>
                <div className="text-center">
                  <p className={`text-sm font-bold ${deliveryType === 'delivery' ? 'text-orange-700 dark:text-orange-400' : 'text-slate-600'}`}>Bicycle Delivery</p>
                  <p className="text-[10px] text-slate-500">+R{DELIVERY_FEE.toFixed(2)}</p>
                </div>
              </button>
            </div>
          </section>
          
          {/* Pickup/Address Details Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-3">
              {deliveryType === 'delivery' ? 'Delivery Address' : 'Pickup Details'}
            </h3>
            <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
              {deliveryType === 'delivery' ? (
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight">
                      {userProfile.address || 'No Address Set'}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal mt-1 leading-tight">
                      {userProfile.city || 'Tembisa'}, {userProfile.country}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-stretch justify-between gap-4">
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <p className="text-primary text-sm font-bold uppercase tracking-wider">Ready in {primaryShop.prepTime || '15-20 min'}</p>
                    </div>
                    <p className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">{primaryShop.name}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-tight">{primaryShop.address}</p>
                  </div>
                  <div className="w-24 bg-center bg-no-repeat aspect-square bg-cover rounded-xl border border-slate-200 dark:border-slate-700" style={{ backgroundImage: `url("${primaryShop.logo}")` }}></div>
                </div>
              )}
            </div>
          </section>
          
          {/* Payment Info Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-3">Payment Method</h3>
            <div className="flex flex-col gap-3">
              <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-full flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-slate-100 text-base font-bold">Cash on {deliveryType === 'delivery' ? 'Delivery' : 'Collection'}</p>
                    <p className="text-slate-500 text-xs">Pay when the order arrives</p>
                  </div>
                </div>
                <div className={`size-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cash' ? 'border-orange-600' : 'border-slate-300'}`}>
                  {paymentMethod === 'cash' && <div className="size-3 bg-orange-600 rounded-full" />}
                </div>
                <input type="radio" name="payment" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="hidden" />
              </label>

              <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'card_machine' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-full flex items-center justify-center ${paymentMethod === 'card_machine' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-slate-900 dark:text-slate-100 text-base font-bold">Card Machine</p>
                    <p className="text-slate-500 text-xs">Swipe or tap when order arrives</p>
                  </div>
                </div>
                <div className={`size-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'card_machine' ? 'border-orange-600' : 'border-slate-300'}`}>
                  {paymentMethod === 'card_machine' && <div className="size-3 bg-orange-600 rounded-full" />}
                </div>
                <input type="radio" name="payment" value="card_machine" checked={paymentMethod === 'card_machine'} onChange={() => setPaymentMethod('card_machine')} className="hidden" />
              </label>
            </div>
          </section>
          
          {/* Total Amount Section */}
          <section className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex flex-col gap-2 px-2">
              <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 font-medium">
                <span>Subtotal</span>
                <span>R {subtotal.toFixed(2)}</span>
              </div>
              {deliveryType === 'delivery' && (
                <div className="flex justify-between items-center text-sm text-orange-600 font-bold">
                  <span>Delivery Fee (Bicycle)</span>
                  <span>R {DELIVERY_FEE.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className="text-slate-900 dark:text-slate-100 text-lg font-bold">Total Amount</span>
                <span className="text-slate-900 dark:text-slate-100 text-3xl font-black">R {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </section>
          
          <div className="mt-4 mb-10">
            <button 
              onClick={handleConfirm}
              disabled={loading || cart.length === 0}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Place Order</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderSuccessScreen({ onHome, cart, shops }: { onHome: () => void, cart: CartItem[], shops: Shop[] }) {
  useEffect(() => {
    if ("vibrate" in navigator) {
      navigator.vibrate([20, 50, 20, 50, 30]); // Success fanfare haptic
    }
  }, []);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shopIds = Array.from(new Set(cart.map(item => item.shopId)));
  const shopNames = shopIds.map(id => shops.find(s => s.id === id)?.name).filter(Boolean);
  const shopDisplay = shopNames.length > 1 ? "multiple stores" : (shopNames[0] || "the store");

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-10 flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/10 rounded-full scale-150 blur-3xl"></div>
        <div className="relative h-48 w-48 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="h-32 w-32 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Check className="w-16 h-16 text-white" />
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-4">Order Placed!</h1>
      <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 max-w-xs mx-auto">
        Your order for <span className="text-primary font-bold">R {totalAmount.toFixed(2)}</span> has been sent to {shopDisplay}.
      </p>

      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-primary uppercase tracking-wider">Ready in 15-20 mins</p>
            <p className="text-slate-500 text-xs">Please head to the store for collection</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Banknote className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Pay at Store</p>
            <p className="text-slate-500 text-xs">Cash or Card accepted on arrival</p>
          </div>
        </div>
      </div>

      <button 
        onClick={onHome}
        className="w-full max-w-sm bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 cursor-pointer"
      >
        Back to Home
      </button>
    </div>
  );
}

function DiscoverScreen({ shops, onHome, onExplore, favorites, toggleFavorite, onSelectShop, userLocation, showAlert }: { 
  shops: Shop[], 
  onHome: () => void, 
  onExplore: () => void, 
  favorites: string[], 
  toggleFavorite: (shopId: string) => void, 
  onSelectShop: (shopId: string) => void, 
  userLocation: { lat: number, lng: number } | null,
  showAlert: (title: string, message: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  const categories = ['All', 'Nearby', ...new Set(shops.map(s => s.category))];
  
  const filteredShops = shops.filter(shop => {
    const query = searchQuery.trim().toLowerCase();
    const shopText = `${shop.name} ${shop.description} ${shop.category}`.toLowerCase();
    const matchesSearch = query === '' || query.split(/\s+/).every(term => shopText.includes(term));
    const matchesCategory = selectedCategory === 'All' || selectedCategory === 'Nearby' || shop.category === selectedCategory;
    const matchesRating = shop.rating >= minRating;
    const matchesOpen = !showOnlyOpen || getShopStatus(shop).isOpen;
    return matchesSearch && matchesCategory && matchesRating && matchesOpen;
  });

  const sortedShops = [...filteredShops].sort((a, b) => {
    if (selectedCategory === 'Nearby' && userLocation) {
      const aLat = (a as any).latitude || -25.9964 + (hashString(a.id) % 10) * 0.005;
      const aLng = (a as any).longitude || 28.2268 + (hashString(a.id) % 10) * 0.005;
      const bLat = (b as any).latitude || -25.9964 + (hashString(b.id) % 10) * 0.005;
      const bLng = (b as any).longitude || 28.2268 + (hashString(b.id) % 10) * 0.005;
      
      const distA = Math.sqrt(Math.pow(aLat - userLocation.lat, 2) + Math.pow(aLng - userLocation.lng, 2));
      const distB = Math.sqrt(Math.pow(bLat - userLocation.lat, 2) + Math.pow(bLng - userLocation.lng, 2));
      return distA - distB;
    }
    return 0;
  });

  return (
    <div className="bg-[#f6f6f9] dark:bg-slate-950 text-[#2d2f31] dark:text-slate-100 min-h-screen flex flex-col font-sans max-w-md mx-auto relative shadow-2xl">
      {/* TopAppBar */}
      <header className="bg-[#f6f6f9] dark:bg-slate-900 w-full top-0 sticky z-40 transition-opacity duration-200">
        <div className="flex justify-between items-center px-6 py-4 w-full">
          <div className="flex items-center gap-4">
            <button onClick={onHome} className="text-[#FF6B00] dark:text-[#ff7a2f] hover:opacity-80 transition-opacity cursor-pointer">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-xl text-[#FF6B00]">DISCOVER</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-600 dark:text-slate-300 hover:text-orange-600 transition-colors cursor-pointer"
            >
              {viewMode === 'list' ? <Map className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#ff7a2f] shadow-sm">
              <img className="w-full h-full object-cover" alt="User profile photo avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjDviWscgS5U3EHdflVMH2lw438ZIVTcAGpl49HTuhtYnGnSfmj-j2T7UXu5rn0URgx6WUnkNAvuzKIgfhWSpQOch5ABihBoWNM3z-RPXHqaA24O9y0NFMKiMIoU9TFnGbS4tbMulbBnjouRLsmXb3kMzUopz3ng_f-1m3X7yAo1Fb3Hebd-UF2Y7b8ZpwTWzv38qWzFP3dBBKbJr5gf6vK6XlqxSL_RJLfyxvBFqEHeF6XjLFdIGLeqWj_gft_DIt4zi87H4PEQ" referrerPolicy="no-referrer"/>
            </div>
          </div>
        </div>
      </header>
      
      <main className="pb-32 flex-grow overflow-y-auto">
        {/* Search & Hero */}
        <section className="px-6 pt-4 pb-8 bg-[#f6f6f9] dark:bg-slate-950">
          <div className="mb-6">
            <h2 className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight text-[#2d2f31] dark:text-white mb-2">Tembisa Flavor</h2>
            <p className="text-[#5a5c5e] dark:text-slate-400 text-lg">Discover the finest local Kota spots.</p>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#5a5c5e] dark:text-slate-500">
              <Search className="w-5 h-5" />
            </div>
            <input 
              className="w-full h-14 pl-12 pr-4 bg-[#ffffff] dark:bg-slate-900 rounded-lg border-none focus:ring-2 focus:ring-[#9c3f00] shadow-[0_8px_32px_rgba(45,47,49,0.06)] text-[#2d2f31] dark:text-white placeholder:text-[#757779] dark:placeholder:text-slate-500 outline-none" 
              placeholder="Search stores in Tembisa..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>
        
        {/* Category Chips */}
        <section className="mb-10">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map(category => (
                <button 
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap px-6 py-3 rounded-full font-semibold text-sm transition-all cursor-pointer ${
                    selectedCategory === category 
                      ? 'bg-[#9c3f00] text-[#fff0ea] shadow-md' 
                      : 'bg-[#e1e2e6] dark:bg-slate-800 text-[#2d2f31] dark:text-slate-300 hover:bg-[#dbdde0] dark:hover:bg-slate-700'
                  }`}
                >
                  {category === 'Nearby' && <Navigation className="w-3.5 h-3.5 mr-1 inline-block align-middle" />}
                  {category}
                </button>
              ))}
            </div>
            
            <div className="flex gap-3 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button 
                onClick={() => setShowOnlyOpen(!showOnlyOpen)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                  showOnlyOpen 
                    ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                <Clock className={`w-3 h-3 ${showOnlyOpen ? 'fill-current' : ''}`} />
                Open Now
              </button>
              {[0, 3, 4, 4.5].map(rating => (
                <button 
                  key={rating}
                  onClick={() => setMinRating(rating)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${
                    minRating === rating 
                      ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' 
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Star className={`w-3 h-3 ${minRating === rating ? 'fill-current' : ''}`} />
                  {rating === 0 ? 'All Ratings' : `${rating}+ Stars`}
                </button>
              ))}
            </div>
          </div>
        </section>
        
        {/* Store Grid or Map */}
        {viewMode === 'list' ? (
          <section className="px-6 grid grid-cols-1 gap-8">
            {sortedShops.map(shop => {
              const isFollowing = favorites.includes(shop.id);
              return (
                <div 
                  key={shop.id} 
                  onClick={() => onSelectShop(shop.id)}
                  className="group bg-[#ffffff] dark:bg-slate-900 rounded-lg overflow-hidden shadow-[0_8px_32px_rgba(45,47,49,0.06)] transition-all duration-300 hover:-translate-y-1 border border-transparent dark:border-slate-800 cursor-pointer"
                >
                  <div className="h-48 relative">
                    <BlurUpImage 
                      src={shop.logo} 
                      alt={shop.name} 
                      className="w-full h-full"
                      blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`}
                    />
                    <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-bold text-[#2d2f31] dark:text-white">{shop.rating}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#ffc69f] dark:bg-orange-500/20 flex items-center justify-center text-[#904800] dark:text-orange-400 font-bold text-xl overflow-hidden">
                          <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#2d2f31] dark:text-white">{shop.name}</h3>
                          <p className="text-[#5a5c5e] dark:text-slate-400 text-sm">{shop.address}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <TrustBadge shop={shop} />
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(shop.id);
                      }}
                      className={`w-full py-3 font-bold rounded-full shadow-lg transition-all active:scale-95 cursor-pointer ${
                        isFollowing 
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300' 
                          : 'bg-gradient-to-br from-[#9c3f00] to-[#ff7a2f] text-white hover:shadow-[#9c3f00]/20'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow Store'}
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredShops.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 dark:text-slate-400">No shops found matching your search.</p>
              </div>
            )}
          </section>
        ) : (
          <section className="px-6 h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/search?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyA-fake-key'}&q=Kota+shops+in+Tembisa+South+Africa&center=${userLocation?.lat || -25.9964},${userLocation?.lng || 28.2268}&zoom=14`}
            ></iframe>
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20">
              <p className="text-xs font-bold text-slate-900 dark:text-white mb-1">Interactive Map</p>
              <p className="text-[10px] text-slate-500">Showing top rated Kota spots near you in Tembisa.</p>
            </div>
          </section>
        )}
        
        {/* Chef's Selection Carousel */}
        <section className="mt-16 overflow-hidden">
          <div className="px-6 mb-6">
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#2d2f31] dark:text-white">Chef's Selection</h2>
            <p className="text-[#5a5c5e] dark:text-slate-400">Handpicked local favorites</p>
          </div>
          <div className="flex gap-6 overflow-x-auto px-6 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
            {shops.slice(0, 2).map(shop => (
              <div key={shop.id} className="flex-none w-[85vw] max-w-[320px] snap-center bg-[#dbdde0] dark:bg-slate-800 rounded-lg p-6 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-white dark:border-slate-700 shadow-lg">
                  <img className="w-full h-full object-cover" alt={shop.name} src={shop.logo} referrerPolicy="no-referrer"/>
                </div>
                <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#2d2f31] dark:text-white">{shop.name}</h4>
                <p className="text-[#5a5c5e] dark:text-slate-400 text-sm mb-4 italic">"{shop.description}"</p>
                <button className="px-6 py-2 bg-[#2d2f31] dark:bg-slate-700 text-[#f6f6f9] dark:text-white rounded-full text-sm font-bold cursor-pointer">View Menu</button>
              </div>
            ))}
          </div>
        </section>
      </main>
      
      {/* BottomNavBar */}
      <nav className="fixed bottom-0 w-full max-w-md rounded-t-[2rem] z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-[0_-8px_32px_rgba(45,47,49,0.06)]">
        <div className="flex justify-around items-center px-6 pb-8 pt-4">
          <button onClick={onHome} className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-5 py-2 hover:text-[#FF6B00] transition-colors cursor-pointer">
            <Home className="w-6 h-6 mb-1" />
            <span className="font-['Inter'] text-[11px] font-semibold tracking-wide">Home</span>
          </button>
          <button className="flex flex-col items-center justify-center text-[#FF6B00] dark:text-[#ff7a2f] bg-[#FF6B00]/10 rounded-full px-5 py-2 transition-transform duration-150 active:scale-96 cursor-pointer">
            <Store className="w-6 h-6 mb-1" />
            <span className="font-['Inter'] text-[11px] font-semibold tracking-wide">Discover</span>
          </button>
          <button onClick={onExplore} className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-5 py-2 hover:text-[#FF6B00] transition-colors cursor-pointer">
            <Compass className="w-6 h-6 mb-1" />
            <span className="font-['Inter'] text-[11px] font-semibold tracking-wide">Explore</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function ProfileScreen({ onBack, onSave, onOrderHistory, onAdminOrders, onShopDashboard, onContactUs, userProfile, onLogout, setNotification }: { onBack: () => void, onSave: (data: Partial<UserProfile>) => void, onOrderHistory: () => void, onAdminOrders: () => void, onShopDashboard: () => void, onContactUs: () => void, userProfile: UserProfile, onLogout: () => void, setNotification: (n: NotificationState) => void }) {
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [phone, setPhone] = useState(userProfile.phone);
  const [address, setAddress] = useState(userProfile.address);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      const publicUrl = await uploadAvatar(event.target.files[0], userProfile.id);
      onSave({ photoURL: publicUrl });
      setNotification({ message: 'Profile picture updated!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      let errorMsg = error.message;
      if (errorMsg === 'Bucket not found') {
        errorMsg = "We couldn't upload your photo right now. Please try again later.";
      }
      setNotification({ message: `Error uploading avatar: ${errorMsg}`, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-background-dark font-sans text-slate-900 dark:text-slate-100 min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto overflow-x-hidden">
        {/* Top App Bar */}
        <div className="flex items-center bg-white dark:bg-background-dark p-4 pb-2 sticky top-0 z-10 border-b border-primary/10">
          <button onClick={onBack} className="text-primary flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-primary/5 transition-colors cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Profile Settings</h2>
        </div>
        
        {/* Profile Picture Section */}
        <div className="flex p-8">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            ref={fileInputRef}
            className="hidden"
          />
          <div className="flex w-full flex-col gap-6 items-center">
            <div className="relative">
              <div 
                className="bg-primary/5 dark:bg-primary/10 bg-center bg-no-repeat aspect-square bg-cover rounded-full h-32 w-32 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden transition-all" 
                style={{ backgroundImage: userProfile.photoURL ? `url("${userProfile.photoURL}")` : `url("${DEFAULT_AVATAR_URL}")` }}
              >
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                {!userProfile.photoURL && !uploading && <User className="w-12 h-12 text-slate-300 dark:text-slate-700" />}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-2.5 border-4 border-white dark:border-background-dark shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="text-center space-y-1">
              <p className="text-slate-900 dark:text-slate-100 text-xl font-bold tracking-tight">{userProfile.fullName || 'User'}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[13px]">{userProfile.email}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="px-6 pb-24 space-y-1">
          <div className="py-2">
             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Activities</p>
             <div className="space-y-1">
               <button onClick={onOrderHistory} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all group">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                     <ShoppingBag className="w-6 h-6" />
                   </div>
                   <div className="text-left">
                     <p className="font-bold text-[15px]">My Orders</p>
                     <p className="text-xs text-slate-500">Track your current and past orders</p>
                   </div>
                 </div>
                 <ChevronRight className="w-5 h-5 text-slate-300" />
               </button>
             </div>
          </div>

          <div className="py-2">
             <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Support & Feedback</p>
             <div className="space-y-1">
               <button onClick={onContactUs} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-all group">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                     <MessageSquare className="w-6 h-6" />
                   </div>
                   <div className="text-left">
                     <p className="font-bold text-[15px]">Contact Us</p>
                     <p className="text-xs text-slate-500">Need help? We're here for you</p>
                   </div>
                 </div>
                 <ChevronRight className="w-5 h-5 text-slate-300" />
               </button>
             </div>
          </div>

          {userProfile.role === 'admin' && (
            <div className="py-2">
               <p className="text-[11px] font-bold text-orange-400 uppercase tracking-widest px-2 mb-2">Admin Dashboard</p>
               <div className="space-y-1">
                 <button onClick={onAdminOrders} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all group">
                   <div className="flex items-center gap-4">
                     <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
                       <LayoutDashboard className="w-6 h-6" />
                     </div>
                     <div className="text-left">
                       <p className="font-bold text-[15px]">Admin Orders</p>
                       <p className="text-xs text-slate-500">Manage all system orders</p>
                     </div>
                   </div>
                   <ChevronRight className="w-5 h-5 text-orange-300" />
                 </button>
               </div>
            </div>
          )}

          {userProfile.role === 'shop_owner' && (
            <div className="py-2">
               <p className="text-[11px] font-bold text-orange-400 uppercase tracking-widest px-2 mb-2">Shop Dashboard</p>
               <div className="space-y-1">
                 <button onClick={onShopDashboard} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all group">
                   <div className="flex items-center gap-4">
                     <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-xl text-orange-600 group-hover:scale-110 transition-transform">
                       <Store className="w-6 h-6" />
                     </div>
                     <div className="text-left">
                       <p className="font-bold text-[15px]">Shop Dashboard</p>
                       <p className="text-xs text-slate-500">Manage your store and menu</p>
                     </div>
                   </div>
                   <ChevronRight className="w-5 h-5 text-orange-300" />
                 </button>
               </div>
            </div>
          )}

          <div className="py-8">
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-red-500 font-bold border-2 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const QuantityModal = ({ item, isOpen, onClose, onConfirm }: { item: MenuItem | null, isOpen: boolean, onClose: () => void, onConfirm: (quantity: number, specialInstructions: string) => void }) => {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  if (!item || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{item.name}</h3>
            <p className="text-orange-600 font-black text-lg mt-1">{item.displayPrice}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-full">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Special Instructions</label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="E.g. No atchar, toast the bun..."
              className="w-full h-20 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-600/20 transition-all resize-none"
            />
          </div>

          <div className="w-full flex flex-col items-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Select Quantity</p>
            <div className="flex items-center gap-8">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-90 transition-all border border-slate-200 dark:border-slate-700"
              >
                <Minus className="w-8 h-8" />
              </button>
              <span className="text-5xl font-black text-slate-900 dark:text-white min-w-[60px] text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="size-16 rounded-3xl bg-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-600/20 active:scale-90 transition-all"
              >
                <Plus className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button 
            onClick={() => onConfirm(quantity, specialInstructions)}
            className="flex-1 h-16 bg-slate-900 dark:bg-orange-600 text-white font-black rounded-3xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <ShoppingBag className="w-6 h-6" />
            <span>Add to Basket • R{(item.price * quantity).toFixed(2)}</span>
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
    "name": shop.name,
    "image": shop.logo,
    "servesCuisine": shop.category,
    "description": shop.description,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": shop.address,
      "addressLocality": "Tembisa",
      "addressRegion": "Gauteng",
      "addressCountry": "ZA"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": shop.rating,
      "reviewCount": shop.reviewCount || 120
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "opens": shop.opening_time || "08:00",
        "closes": shop.closing_time || "20:00"
      }
    ]
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}

function StoreInfoScreen({ onBack, shop, isFavorite, onToggleFavorite, userProfile, session, onSignUp, addToCart, showAlert, showConfirm }: { 
  onBack: () => void, 
  shop: Shop, 
  isFavorite: boolean, 
  onToggleFavorite: () => void, 
  userProfile: UserProfile | null, 
  session: Session | null, 
  onSignUp: () => void, 
  addToCart: (item: MenuItem, shopId: string, quantity?: number, specialInstructions?: string) => void,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}) {
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [selectedItemForQuantity, setSelectedItemForQuantity] = useState<MenuItem | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    setTableMissing(false);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('shop_id', shop.id)
        .order('createdAt', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          setTableMissing(true);
          return;
        }
        throw error;
      }
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  }, [shop.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filteredMenu = shop.menu.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmitReview = async () => {
    if (!newComment.trim() || !userProfile) return;
    setIsSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert([{
          shop_id: shop.id,
          userName: userProfile.fullName || 'Anonymous',
          rating: newRating,
          comment: newComment,
          createdAt: new Date().toISOString()
        }]);

      if (error) {
        if (error.code === 'PGRST205') {
          setTableMissing(true);
          showAlert('Database Error', 'The reviews table is missing from the database. Please run the SQL setup in the Home screen.');
          return;
        }
        throw error;
      }
      
      setShowReviewForm(false);
      setNewComment('');
      setNewRating(5);
      fetchReviews();
      showAlert('Success', 'Thank you for your review!');
    } catch (error) {
      console.error('Error submitting review:', error);
      showAlert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] text-gray-900 dark:text-white antialiased min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
      <RestaurantSchema shop={shop} />
      {/* TopAppBar */}
      <header className="sticky top-0 z-50 flex items-center px-4 h-16 bg-white dark:bg-[#221610] w-full border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center w-full">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBack();
            }} 
            className="mr-4 p-2 -ml-2 active:scale-95 duration-200 ease-in-out transition-all hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full text-orange-600 cursor-pointer z-50"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg tracking-tight text-gray-900 dark:text-white flex-grow">Store Info</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={onToggleFavorite}
              className={`cursor-pointer transition-all active:scale-90 ${isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={() => {
                const shareUrl = `${window.location.origin}${window.location.pathname}?shopId=${shop.id}`;
                if (navigator.share) {
                  navigator.share({
                    title: shop.name,
                    text: `Check out ${shop.name} on LocalEats!`,
                    url: shareUrl,
                  }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  showAlert('Link Copied', 'Link copied to clipboard! You can now share this with others.');
                }
              }}
              className="text-gray-700 dark:text-slate-300 cursor-pointer hover:text-orange-600 transition-colors"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="pb-12 px-4 flex-grow overflow-y-auto">
        {/* Hero Section: Logo and Rating */}
        <section className="mb-8 flex flex-col items-center">
          {!session && (
            <div className="w-full mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800/50 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center text-orange-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">New here?</p>
                  <p className="text-[10px] text-slate-500">Sign up to follow {shop.name}</p>
                </div>
              </div>
              <button 
                onClick={onSignUp}
                className="px-4 py-2 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-orange-600/10 active:scale-95 transition-all cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center p-2 border-4 border-orange-100 dark:border-orange-500/20">
              <img alt={shop.name} className="w-full h-full rounded-full object-cover" src={shop.logo} loading="lazy" referrerPolicy="no-referrer"/>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-4 py-1 rounded-full shadow-md flex items-center space-x-1 border border-gray-100 dark:border-slate-700">
              <Star className="w-4 h-4 text-orange-500 fill-current" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">{shop.rating}</span>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{shop.name}</h2>
            <p className="text-slate-500 text-sm font-medium mb-4">{shop.address}</p>
            
            <button 
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`;
                window.open(url, '_blank');
              }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all cursor-pointer mb-6"
            >
              <Navigation className="w-4 h-4" />
              Get Directions
            </button>
            <p className="text-gray-500 dark:text-slate-400 font-medium mt-1">{shop.category} • Tembisa</p>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex bg-gray-100 dark:bg-slate-900/50 p-1 rounded-2xl mb-8">
          {(['menu', 'reviews', 'info'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                activeTab === tab 
                  ? 'bg-white dark:bg-slate-800 text-orange-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'menu' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Menu Search Bar */}
              <div className="relative group px-1">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder={`Search in ${shop.name}'s menu...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-600/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredMenu.length > 0 ? (
                  filteredMenu.map((item) => (
                    <div key={item.id} className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-50 dark:border-slate-800 flex gap-4 group hover:border-orange-600/20 transition-all">
                      <div className="size-20 rounded-xl overflow-hidden shrink-0 shadow-sm">
                        <BlurUpImage src={item.image} alt={item.name} className="w-full h-full" blurHash={`https://picsum.photos/seed/${item.id}/10/10?blur=10`} />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">Freshly prepared local favourite</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-black text-orange-600 text-sm">{item.displayPrice}</p>
                          <button 
                            onClick={() => {
                              if (shop.isOpen === false) return;
                              setSelectedItemForQuantity(item);
                            }}
                            disabled={shop.isOpen === false}
                            className={`px-4 py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-[10px] font-black uppercase tracking-widest ${shop.isOpen === false ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-orange-600 text-white shadow-orange-600/20 active:scale-95 cursor-pointer'}`}
                          >
                            <span>{shop.isOpen === false ? 'Closed' : 'Buy'}</span>
                            {shop.isOpen !== false && <Plus className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <SearchX className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No items found</p>
                    <p className="text-xs text-slate-500 mt-1">Try searching for something else</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Reviews Summary */}
              <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="text-center">
                  <p className="text-4xl font-black text-slate-900 dark:text-white">{shop.rating}</p>
                  <div className="flex text-orange-500 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < Math.floor(shop.rating) ? 'fill-current' : ''}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">{reviews.length} Reviews</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviews.filter(r => r.rating === rating).length;
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-500 w-2">{rating}</span>
                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Submission Form */}
              {showReviewForm ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-orange-600/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Write a Review</h4>
                    <button onClick={() => setShowReviewForm(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex justify-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className={`transition-transform active:scale-90 ${newRating >= star ? 'text-orange-600' : 'text-slate-300'}`}
                      >
                        <Star className={`w-8 h-8 ${newRating >= star ? 'fill-current' : ''}`} />
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
                    {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-orange-600/5 p-4 rounded-2xl border border-orange-600/10">
                  <div>
                    <p className="text-xs font-bold text-orange-600">Enjoyed your food?</p>
                    <p className="text-[10px] text-slate-500">Share your thoughts with the community</p>
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
                    <p className="text-sm font-bold text-red-900 dark:text-red-400">Reviews Table Missing</p>
                    <p className="text-xs text-red-700 dark:text-red-500 mt-2 leading-relaxed">
                      The database table for reviews hasn't been created yet. Please run the SQL setup in the Home screen's "Manual Setup" section.
                    </p>
                  </div>
                ) : loadingReviews ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin size-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-xs text-slate-500">Loading reviews...</p>
                  </div>
                ) : reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-50 dark:border-slate-800">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs">
                            {review.userName[0]}
                          </div>
                          <div>
                            <p className="text-xs font-bold">{review.userName}</p>
                            <div className="flex text-orange-600">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-2 h-2 ${i < review.rating ? 'fill-current' : ''}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{review.comment}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">No reviews yet</p>
                    <p className="text-xs text-slate-500 mt-1">Be the first to review this store!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 gap-6">
                {/* Location Card */}
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">Location</h3>
                      <p className="text-gray-500 dark:text-slate-400 mt-1">{shop.address}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`, '_blank')}
                    className="w-full mt-2 py-4 px-6 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-900 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Navigation className="w-5 h-5" />
                    <span>Get Directions</span>
                  </button>
                </div>

                {/* Hours & Contact */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Opening Hours</h3>
                        <div className="mt-3 space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 dark:text-slate-400">Monday - Sunday</span>
                            <span className="font-semibold text-gray-900 dark:text-white">08:00 - 20:00</span>
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
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Contact</h3>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">{shop.phone || '+27 12 345 6789'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.open(`tel:${shop.phone || '+27123456789'}`)}
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
      </main>

      <QuantityModal 
        item={selectedItemForQuantity}
        isOpen={!!selectedItemForQuantity}
        onClose={() => setSelectedItemForQuantity(null)}
        onConfirm={(quantity, specialInstructions) => {
          if (selectedItemForQuantity) {
            addToCart(selectedItemForQuantity, shop.id, quantity, specialInstructions);
            setSelectedItemForQuantity(null);
          }
        }}
      />
    </div>
  );
}

const shopIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function ExploreScreen({ shops, onHome, onDiscover, userLocation, onRequestLocation, onStoreInfo, favorites, toggleFavorite, showAlert }: { 
  shops: Shop[], 
  onHome: () => void, 
  onDiscover: () => void, 
  userLocation: { lat: number, lng: number } | null, 
  onRequestLocation: () => void, 
  onStoreInfo: (shopId: string) => void, 
  favorites: string[], 
  toggleFavorite: (id: string) => void,
  showAlert: (title: string, message: string) => void
}) {
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShops = shops.filter(shop => {
    const query = searchQuery.trim().toLowerCase();
    const shopText = `${shop.name} ${shop.description} ${shop.category}`.toLowerCase();
    return query === '' || query.split(/\s+/).every(term => shopText.includes(term));
  });

  const activeShop = shops.find(s => s.id === selectedShopId);
  const mapCenter: [number, number] = activeShop && activeShop.latitude && activeShop.longitude 
    ? [activeShop.latitude, activeShop.longitude] 
    : userLocation 
      ? [userLocation.lat, userLocation.lng] 
      : [-25.9964, 28.2268];

  return (
    <div className="bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 h-screen flex flex-col font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {/* Search Overlay */}
      <div className="absolute top-6 left-4 right-4 z-[1000]">
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-full shadow-xl flex items-center px-4 py-3 border border-gray-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search for food spots..." 
            className="flex-grow outline-none text-sm font-medium bg-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-3"></div>
          <button className="text-orange-500" onClick={onRequestLocation}>
            {userLocation ? <LocateFixed className="w-5 h-5" /> : <Locate className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-grow relative z-10">
        <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={mapCenter} />
          
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>You are here</Popup>
            </Marker>
          )}

          {filteredShops.map((shop) => {
            const isFollowed = favorites.includes(shop.id);
            return (
              <Marker 
                key={shop.id} 
                position={[shop.latitude || -25.9964, shop.longitude || 28.2268]} 
                icon={shopIcon}
                eventHandlers={{
                  click: () => setSelectedShopId(shop.id),
                }}
              >
                <Popup>
                  <div className="p-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-bold text-sm">{shop.name}</p>
                      {isFollowed && <Heart className="w-2.5 h-2.5 text-red-500 fill-current" />}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs">{shop.rating}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Floating Action Buttons */}
        <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-3">
          <button onClick={onHome} className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg text-gray-600 dark:text-slate-300 hover:text-orange-500 transition-colors cursor-pointer">
            <Home className="w-6 h-6" />
          </button>
          <button onClick={onRequestLocation} className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg text-gray-600 dark:text-slate-300 hover:text-orange-500 transition-colors cursor-pointer">
            <LocateFixed className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {selectedShopId && activeShop && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-[#221610] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-24"
          >
            <div className="relative">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-6 cursor-pointer" onClick={() => setSelectedShopId(null)}></div>
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
                  <img src={activeShop.logo} alt={activeShop.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{activeShop.name}</h3>
                    {favorites.includes(activeShop.id) && <Heart className="w-4 h-4 text-red-500 fill-current" />}
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">{activeShop.category} • {activeShop.address}</p>
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    <span className="text-sm font-bold ml-1 dark:text-white">{activeShop.rating}</span>
                    <span className="text-gray-400 dark:text-slate-500 text-xs ml-1">(120+ reviews)</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => toggleFavorite(activeShop.id)}
                className={`p-2 rounded-full transition-all active:scale-90 cursor-pointer ${favorites.includes(activeShop.id) ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500'}`}
              >
                <Heart className={`w-5 h-5 ${favorites.includes(activeShop.id) ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => onStoreInfo(activeShop.id)}
                className="bg-orange-500 text-white py-3 rounded-2xl font-bold shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <BookOpen className="w-5 h-5" />
                View Menu
              </button>
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeShop.address)}`, '_blank')}
                className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Navigation className="w-5 h-5" />
                Directions
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-around items-center max-w-md mx-auto z-50">
        <button onClick={onHome} className="flex flex-col items-center gap-1 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <Home className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold">Home</span>
        </button>
        <button onClick={onDiscover} className="flex flex-col items-center gap-1 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <Store className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold">Discover</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <Compass className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold">Explore</span>
        </button>
      </div>
    </div>
  );
}

function NotificationsScreen({ notifications, onBack, onRead, onDelete }: { notifications: AppNotification[], onBack: () => void, onRead: (id: string) => void, onDelete: (id: string) => void }) {
  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#221610]/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto px-4 py-6 space-y-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
              <Bell className="w-8 h-8" />
            </div>
            <p className="text-slate-500">No notifications yet</p>
          </div>
        ) : (
          notifications.sort((a, b) => b.timestamp - a.timestamp).map(notif => (
            <div 
              key={notif.id} 
              onClick={() => onRead(notif.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${notif.read ? 'bg-white dark:bg-slate-900/30 border-slate-100 dark:border-slate-800' : 'bg-primary/5 border-primary/20 shadow-sm'}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.type === 'order' ? 'bg-orange-100 text-orange-600' : 
                  notif.type === 'promo' ? 'bg-indigo-100 text-indigo-600' : 
                  notif.type === 'follow' ? 'bg-pink-100 text-pink-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {notif.type === 'order' ? <Package className="w-5 h-5" /> : 
                   notif.type === 'promo' ? <Tag className="w-5 h-5" /> : 
                   notif.type === 'follow' ? <Heart className="w-5 h-5" /> :
                   <Info className="w-5 h-5" />}
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-bold text-sm ${notif.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{notif.title}</h3>
                    <span className="text-[10px] text-slate-400">{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{notif.message}</p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

function RiderTrackingSimulation() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev < 100 ? prev + 0.1 : 0));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-5 bg-orange-50 dark:bg-orange-950/20 rounded-3xl border border-orange-100 dark:border-orange-900/30 overflow-hidden relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-orange-600">Live Rider Tracking</h3>
        <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold animate-pulse">ON THE WAY</span>
      </div>
      
      <div className="relative h-12 flex items-center">
        {/* Track Line */}
        <div className="absolute left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        
        {/* Animated Rider */}
        <motion.div 
          style={{ left: `${progress}%` }}
          className="absolute -translate-x-1/2 z-10"
        >
          <div className="relative">
            <div className="p-2 bg-orange-600 text-white rounded-full shadow-lg shadow-orange-600/30">
              <Bike className="w-5 h-5" />
            </div>
            {/* Pulsing indicator */}
            <div className="absolute -inset-1 bg-orange-600/20 rounded-full animate-ping"></div>
          </div>
        </motion.div>
        
        {/* Destination Marker */}
        <div className="absolute right-0 p-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full">
          <MapPin className="w-3 h-3" />
        </div>
      </div>
      
      <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
        <span>Kitchen</span>
        <span>Your Home</span>
      </div>
      
      <div className="mt-4 pt-4 border-t border-orange-100 dark:border-orange-900/20 flex items-center gap-3">
        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
          <User className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <p className="text-[10px] font-bold">Rider: Themba M.</p>
          <p className="text-[9px] text-slate-400">Arriving in approx. 8 mins</p>
        </div>
      </div>
    </div>
  );
}

function OrderTrackingScreen({ orders, shops, onBack }: { orders: Order[], shops: Shop[], onBack: () => void }) {
  const getStatusStep = (status: string) => {
    switch(status) {
      case 'pending': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'completed': return 4;
      default: return 1;
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#221610]/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Track Orders</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto px-4 py-6 space-y-6">
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
              <Package className="w-8 h-8" />
            </div>
            <p className="text-slate-500">No active orders to track</p>
            <button onClick={onBack} className="text-primary font-bold">Order something legendary!</button>
          </div>
        ) : (
          activeOrders.map(order => {
            const shop = shops.find(s => s.id === order.shop_id);
            const step = getStatusStep(order.status);
            
            return (
              <div key={order.id} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-primary/10 p-5 shadow-sm space-y-6">
                {order.status !== 'pending' && order.is_delivery && <RiderTrackingSimulation />}
                
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
                      <img src={shop?.logo || 'https://picsum.photos/seed/shop/100/100'} alt={shop?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{shop?.name || 'Local Shop'}</h3>
                      <p className="text-xs text-slate-500">{order.product_name} x{order.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Order ID</p>
                    <p className="text-xs font-mono font-bold text-primary">#{order.id.slice(0, 8)}</p>
                  </div>
                </div>

                {/* Tracking Steps */}
                <div className="relative pt-2">
                  <div className="absolute top-5 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out rounded-full" 
                      style={{ width: `${((step - 1) / 3) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="relative flex justify-between">
                    {[
                      { s: 'pending', icon: <Hourglass className="w-4 h-4" />, label: 'Placed' },
                      { s: 'preparing', icon: <Utensils className="w-4 h-4" />, label: 'Preparing' },
                      { s: 'ready', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Ready' },
                      { s: 'completed', icon: <CheckSquare className="w-4 h-4" />, label: 'Collected' }
                    ].map((item, index) => {
                      const isActive = step > index;
                      const isCurrent = step === index + 1;
                      
                      return (
                        <div key={item.s} className="flex flex-col items-center space-y-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 z-10 ${isActive ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300'} ${isCurrent ? 'scale-110 shadow-lg shadow-primary/30' : ''}`}>
                            {item.icon}
                          </div>
                          <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-slate-400'}`}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-primary/5 rounded-xl p-4 flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {order.status === 'pending' && "Waiting for shop to accept..."}
                      {order.status === 'preparing' && "Chef is working their magic!"}
                      {order.status === 'ready' && "Your food is ready for collection!"}
                    </p>
                    <p className="text-[10px] text-slate-500">Estimated time: 15-20 mins</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
function SettingsScreen({ userProfile, setUserProfile, onBack, onLogout, onProfile, onOrderHistory, onAdminOrders, onShopDashboard, isDarkMode, onToggleDarkMode, setNotification }: { userProfile: UserProfile, setUserProfile: Dispatch<SetStateAction<UserProfile>>, onBack: () => void, onLogout: () => void, onProfile: () => void, onOrderHistory: () => void, onAdminOrders: () => void, onShopDashboard: () => void, isDarkMode: boolean, onToggleDarkMode: () => void, setNotification: (n: NotificationState) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const publicUrl = await uploadAvatar(event.target.files[0], userProfile.id);

      // Update Profile
      setUserProfile(prev => ({ ...prev, photoURL: publicUrl }));
      setNotification({ message: 'Profile picture updated!', type: 'success' });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      let errorMsg = error.message;
      if (errorMsg === 'Bucket not found') {
        errorMsg = "We couldn't upload your photo right now. Please try again later.";
      }
      setNotification({ message: `Error uploading avatar: ${errorMsg}`, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
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
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#221610]/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Settings</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
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
                  src={userProfile.photoURL || DEFAULT_AVATAR_URL}
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
            <h2 className="font-bold text-lg">{userProfile.fullName || 'User'}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{userProfile.email || 'No email set'}</p>
          </div>
        </div>

        {/* Appearance Section */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 px-1">Appearance</h3>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <span className="font-medium">Dark Mode</span>
              </div>
              <button 
                onClick={() => {
                  onToggleDarkMode();
                  setNotification({ 
                    message: `Switched to ${!isDarkMode ? 'Dark' : 'Light'} Mode`, 
                    type: 'info' 
                  });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDarkMode ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="px-4 pb-4">
              <button 
                onClick={() => {
                  localStorage.removeItem('dark_mode');
                  window.location.reload();
                }}
                className="text-[10px] text-slate-400 hover:text-primary transition-colors flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Theme Preference</span>
              </button>
            </div>
          </div>
        </section>

        {/* Support & Legal Section */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 px-1">Support & Legal</h3>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <button 
              onClick={() => window.open('https://wa.me/27123456789', '_blank')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="font-medium">WhatsApp Support</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
            <button 
              onClick={() => setNotification({ message: "Terms of Service coming soon!", type: 'info' })}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-medium">Terms of Service</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
            <button 
              onClick={() => setNotification({ message: "Privacy Policy coming soon!", type: 'info' })}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="font-medium">Privacy Policy</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
          </div>
        </section>

        {/* Admin Section */}
        {userProfile.role === 'admin' && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 px-1">Admin Panel</h3>
            <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
              <button onClick={onAdminOrders} className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors border-b border-primary/5 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Manage Orders</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </section>
        )}

        {/* Shop Owner Section */}
        {userProfile.role === 'shop_owner' && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 px-1">Shop Management</h3>
            <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
              <button onClick={onShopDashboard} className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors border-b border-primary/5 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                    <Store className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Shop Dashboard</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </section>
        )}

        {/* Account Section */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 px-1">Account</h3>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <button onClick={onProfile} className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors border-b border-primary/5 cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-medium">Profile Information</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
            <button onClick={onOrderHistory} className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <History className="w-5 h-5" />
                </div>
                <span className="font-medium">Order History</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 px-1">Notifications</h3>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-primary/5">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-xs text-slate-500">Order updates and alerts</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input defaultChecked className="sr-only peer" type="checkbox"/>
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Promotions</p>
                  <p className="text-xs text-slate-500">Discounts and special offers</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input className="sr-only peer" type="checkbox"/>
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </section>

        {/* App Settings Section */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3 px-1">App Settings</h3>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <button 
              onClick={() => setNotification({ message: "Language selection coming soon!", type: 'info' })}
              className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors border-b border-primary/5 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Map className="w-5 h-5" />
                </div>
                <span className="font-medium">Language</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-500">
                <span className="text-sm">English</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Info className="w-5 h-5" />
                </div>
                <span className="font-medium">About App</span>
              </div>
              <span className="text-xs text-slate-400">v{APP_VERSION.split(' ')[0]}</span>
            </div>
          </div>
        </section>

        {/* Logout Button */}
        <div className="pt-4">
          <button onClick={onLogout} className="w-full py-4 rounded-xl border-2 border-primary/20 text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center space-x-2 cursor-pointer">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
          <p className="text-center text-xs text-slate-400 mt-6">LocalEats Version {APP_VERSION}</p>
        </div>
      </main>
    </div>
  );
}

function ShopDashboardScreen({ onBack, orderAcceptedModal, setOrderAcceptedModal, showAlert, showConfirm, showPrompt }: { 
  onBack: () => void, 
  orderAcceptedModal: { isOpen: boolean, productName: string, ownerMessage: string }, 
  setOrderAcceptedModal: Dispatch<SetStateAction<{ isOpen: boolean, productName: string, ownerMessage: string }>>,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  showPrompt: (title: string, message: string, onConfirm: (value: string) => void, defaultValue?: string) => void
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'stats' | 'marketing' | 'settings'>('orders');
  const [showDebug, setShowDebug] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  useEffect(() => {
    let channel: any; // Real-time channel type is complex, keeping any for now but could be RealtimeChannel
    const fetchShopAndOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        // 1. Get the shop owned by this user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("You are not logged in. Please log in to view your dashboard.");
          return;
        }
        setCurrentUserId(user.id);

        console.log('Fetching shop for owner:', user.id);
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (shopError) {
          console.error('Shop fetch error:', shopError);
          throw shopError;
        }
        
        if (!shopData) {
          console.warn('No shop found for owner:', user.id);
          setError("No shop found associated with your account. Please contact support or ensure your shop is linked to your ID.");
          return;
        }

        // Format shop data to match Shop type
        const formattedShop: Shop = {
          id: String(shopData.id),
          name: shopData.name,
          logo: shopData.logo_url || `https://picsum.photos/seed/${shopData.id}/200/200`,
          rating: Number(shopData.rating) || 4.5,
          description: shopData.description || "",
          address: shopData.location || "",
          category: shopData.category || "",
          owner_id: shopData.owner_id,
          opening_time: shopData.opening_time,
          closing_time: shopData.closing_time,
          phone: shopData.phone,
          latitude: shopData.latitude,
          longitude: shopData.longitude,
          menu: [] // Menu items will be fetched if needed or left empty for dashboard
        };

        setShop(formattedShop);

        if (shopData) {
          // 2. Initial fetch of orders for this shop
          console.log('Fetching orders for shop ID:', shopData.id);
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('shop_id', shopData.id)
            .order('created_at', { ascending: false });

          if (ordersError) {
            console.error('Orders fetch error:', ordersError);
            throw ordersError;
          }
          
          console.log(`Found ${ordersData?.length || 0} orders for this shop.`);
          setOrders((ordersData || []) as Order[]);

          // 3. Subscribe to real-time updates for THIS shop
          channel = supabase
            .channel(`orders:${shopData.id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'orders',
                filter: `shop_id=eq.${shopData.id}`
              },
              (payload) => {
                console.log('Real-time order update received:', payload);
                if (payload.eventType === 'INSERT') {
                  setOrders(prev => [payload.new as Order, ...prev]);
                  // Vibration alert for new order
                  if ("vibrate" in navigator) {
                    navigator.vibrate([100, 50, 100]);
                  }
                } else if (payload.eventType === 'UPDATE') {
                  setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
                } else if (payload.eventType === 'DELETE') {
                  setOrders(prev => prev.filter(o => o.id !== payload.old.id));
                }
              }
            )
            .subscribe();
        }
      } catch (err: any) {
        console.error('Error in Shop Dashboard:', err);
        setError(err.message === 'Failed to fetch' 
          ? 'Network Error: Please check your internet connection.'
          : (err.message || 'Failed to load dashboard data'));
      } finally {
        setLoading(false);
      }
    };

    fetchShopAndOrders();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (newStatus === 'confirmed') {
      showPrompt(
        "Order Message",
        "Enter a message for the customer (optional):",
        (ownerMessage) => {
          executeStatusUpdate(orderId, newStatus, ownerMessage || "Your order is being prepared with love! 🔥");
        },
        "Your order is being prepared with love! 🔥"
      );
    } else {
      executeStatusUpdate(orderId, newStatus);
    }
  };

  const executeStatusUpdate = async (orderId: string, newStatus: string, ownerMessage?: string) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10); // Subtle feedback for status change
    }
    try {
      // Fetch current order to get existing history and delivery info
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const history = currentOrder?.status_history || [];
      const newHistory = [...history, { status: newStatus, timestamp: new Date().toISOString() }];

      // BUSINESS LOGIC: If a guest ordered delivery and it's marked as ready, 
      // it shifts to 'finding_rider' status instead of just 'ready'
      let finalStatus = newStatus;
      let deliveryStatus = currentOrder?.delivery_status;

      if (newStatus === 'ready' && currentOrder?.is_delivery) {
        finalStatus = 'ready';
        deliveryStatus = 'finding_rider';
      }

      const updateData: any = { 
        status: finalStatus,
        status_history: newHistory,
        delivery_status: deliveryStatus
      };
      if (ownerMessage) updateData.owner_message = ownerMessage;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
    } catch (err: unknown) {
      console.error('Error updating order status:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      showAlert("Update Failed", errorMessage);
    }
  };

  const getStatusColor = (status: string, deliveryStatus?: string) => {
    if (deliveryStatus === 'finding_rider') return 'bg-indigo-100 text-indigo-600 border-indigo-200';
    if (deliveryStatus === 'rider_assigned') return 'bg-blue-100 text-blue-600 border-blue-200';
    if (deliveryStatus === 'picked_up') return 'bg-purple-100 text-purple-600 border-purple-200';
    if (deliveryStatus === 'delivered') return 'bg-emerald-100 text-emerald-600 border-emerald-200';

    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'confirmed': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'preparing': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'ready': return 'bg-green-100 text-green-600 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Calculate Stats
  const activeOrdersCount = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length;
  const readyOrdersCount = orders.filter(o => o.status === 'ready').length;
  const todayRevenue = orders
    .filter(o => {
      const orderDate = new Date(o.created_at);
      const today = new Date();
      // Only count completed or ready orders for revenue
      return orderDate.toDateString() === today.toDateString() && ['ready', 'completed'].includes(o.status);
    })
    .reduce((sum, o) => sum + (o.price || 0), 0);

  // Weekly Stats Calculation
  const getWeeklyStats = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const now = new Date();
    const stats = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === dayStr);
      const dayRevenue = dayOrders
        .filter(o => ['ready', 'completed'].includes(o.status))
        .reduce((sum, o) => sum + (o.price || 0), 0);
      
      stats.push({
        label: days[d.getDay()],
        value: dayRevenue,
        count: dayOrders.length
      });
    }
    
    const maxRevenue = Math.max(...stats.map(s => s.value), 1);
    return stats.map(s => ({ ...s, height: (s.value / maxRevenue) * 100 }));
  };

  const weeklyStats = getWeeklyStats();

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
      doc.addImage(qrDataUrl, 'PNG', 55, 80, 100, 100);
      
      // Add Call to Action
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text("Skip the queue. Order ahead.", 105, 200, { align: "center" });
      
      // Save PDF
      doc.save(`${shop.name.replace(/\s+/g, '_')}_Flyer.pdf`);
      showAlert('Success', 'Flyer downloaded successfully!');
    } catch (err) {
      console.error('Error generating flyer:', err);
      showAlert('Error', 'Failed to generate flyer. Please try again.');
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#221610]/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center relative">
            {loading && !shop ? (
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto mb-1"></div>
            ) : (
              <h1 className="text-xl font-bold tracking-tight">{shop?.name || 'Shop Dashboard'}</h1>
            )}
            <div className="flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Kitchen Live</p>
            </div>
          </div>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showDebug ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-orange-500'}`}
          >
            <Bug className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-4 pb-24">
        {showDebug && (
          <div className="mb-6 p-4 bg-slate-900 text-slate-300 rounded-2xl text-[10px] font-mono border border-slate-700 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-2 border-b border-slate-800 pb-2">
              <span className="text-orange-400 font-bold uppercase tracking-widest">Debug Info</span>
              <button onClick={() => setShowDebug(false)} className="text-slate-500 hover:text-white">Close</button>
            </div>
            <p className="mb-1"><span className="text-slate-500">User ID:</span> {currentUserId}</p>
            <p className="mb-1"><span className="text-slate-500">Shop ID:</span> {shop?.id || 'None'}</p>
            <p className="mb-1"><span className="text-slate-500">Shop Owner ID:</span> {shop?.owner_id || 'None'}</p>
            <p className="mb-3"><span className="text-slate-500">Orders Count:</span> {orders.length}</p>
            
            <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700">
              <p className="text-orange-400/80 mb-1 font-bold">Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Ensure your User ID matches the Shop Owner ID.</li>
                <li>Check if orders in Supabase have the correct Shop ID.</li>
                <li>Run the SQL provided in the chat to fix schema.</li>
              </ul>
            </div>
            
            <button 
              onClick={async () => {
                const { count, error } = await supabase.from('orders').select('*', { count: 'exact', head: true });
                showAlert('Database Info', `Total orders in DB: ${count || 0}`);
              }}
              className="mt-3 w-full py-2 bg-orange-600/20 text-orange-400 border border-orange-600/30 rounded-lg font-bold hover:bg-orange-600/30 transition-colors"
            >
              Check Global Order Count
            </button>

            <button 
              onClick={() => {
                setOrderAcceptedModal({
                  isOpen: true,
                  productName: "Test Product",
                  ownerMessage: "This is a test message from the shop owner! 🚀"
                });
              }}
              className="mt-2 w-full py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-lg font-bold hover:bg-emerald-600/30 transition-colors"
            >
              Test Acceptance Modal
            </button>
          </div>
        )}
        {/* Stats Bar */}
        {!loading && !error && shop && activeTab === 'orders' && (
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-2xl border border-orange-100 dark:border-orange-800/50">
              <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Active</p>
              <p className="text-xl font-black text-orange-700 dark:text-orange-300">{activeOrdersCount}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-2xl border border-green-100 dark:border-green-800/50">
              <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Ready</p>
              <p className="text-xl font-black text-green-700 dark:text-green-300">{readyOrdersCount}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/50">
              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Revenue</p>
              <p className="text-xl font-black text-blue-700 dark:text-blue-300">R{Math.round(todayRevenue)}</p>
            </div>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 px-6">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-900 dark:text-white">Dashboard Unavailable</p>
              <p className="text-slate-500 text-sm mb-2">{error}</p>
              <div className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800 inline-block">
                Project Ref: {supabaseUrl.split('//')[1]?.split('.')[0]}<br/>
                User ID: {currentUserId || 'unknown'}
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <button 
                onClick={() => window.location.reload()}
                className="w-full px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 cursor-pointer"
              >
                Retry Connection
              </button>
              
              {/* Presentation Tool: Create Shop for User */}
              {error.includes("No shop found") && (
                <button 
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    
                    try {
                      const { error: shopErr } = await supabase
                        .from('shops')
                        .insert({
                          name: "My Tembisa Shop",
                          description: "Freshly prepared Kotas and more",
                          location: "Tembisa",
                          category: "Kota",
                          rating: 5.0,
                          owner_id: user.id,
                          is_active: true
                        });
                        
                      if (shopErr) throw shopErr;
                      window.location.reload();
                    } catch (err: any) {
                      console.error('Error creating shop:', err);
                      showAlert('Error', 'Failed to create shop: ' + err.message);
                    }
                  }}
                  className="w-full px-6 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold text-sm cursor-pointer"
                >
                  Create Demo Shop
                </button>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                  </div>
                  <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
                <div className="h-4 w-full bg-slate-50 dark:bg-slate-800 rounded mb-4"></div>
                <div className="flex gap-2 pt-4 border-t border-slate-50 dark:border-slate-800">
                  <div className="h-10 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                  <div className="h-10 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'inventory' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Menu Items</h3>
              <button className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
            {shop?.menu_items?.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {shop.menu.map((item: MenuItem) => {
                  const isExpanded = expandedItems.includes(item.id);
                  const hasDescription = item.description && item.description.length > 0;
                  const isLongDescription = item.description && item.description.length > 40;

                  return (
                    <div key={item.id} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5 shadow-sm flex flex-col space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">{item.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary text-sm">R{item.price}</p>
                          <span className="text-[8px] font-bold uppercase text-green-500">In Stock</span>
                        </div>
                      </div>
                      {hasDescription && (
                        <div className="mt-1">
                          <p className={`text-[10px] text-slate-500 leading-relaxed ${!isExpanded && isLongDescription ? 'line-clamp-1' : ''}`}>
                            {item.description}
                          </p>
                          {isLongDescription && (
                            <button 
                              onClick={() => toggleExpand(item.id)}
                              className="flex items-center gap-1 text-[10px] font-bold text-primary mt-1 hover:underline cursor-pointer"
                            >
                              <span>{isExpanded ? 'Show Less' : 'Read More'}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
                <p className="font-bold text-slate-900 dark:text-white">No Menu Items Found</p>
                <p className="text-xs text-slate-500 px-12">Your shop's menu items will appear here once they are added to the database.</p>
              </div>
            )}
          </div>
        ) : activeTab === 'stats' ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm">
              <h3 className="font-bold mb-4">Weekly Revenue (R)</h3>
              <div className="h-32 flex items-end gap-2 px-2">
                {weeklyStats.map((stat, i) => (
                  <div key={i} className="flex-1 bg-primary/20 rounded-t-lg relative group">
                    <div style={{ height: `${stat.height}%` }} className="bg-primary rounded-t-lg transition-all group-hover:bg-orange-600"></div>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      R{Math.round(stat.value)}
                    </div>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-400 uppercase">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Orders</p>
                <p className="text-2xl font-black">{orders.length}</p>
              </div>
              <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg. Rating</p>
                <p className="text-2xl font-black">{shop?.rating || '5.0'}</p>
              </div>
            </div>
          </div>
        ) : activeTab === 'marketing' ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-600">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Printable Flyer</h3>
                  <p className="text-xs text-slate-500">Generate a PDF flyer with a QR code</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Print this flyer and stick it on your shop window. Customers can scan the QR code to order directly from your LocalEats menu.
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
        ) : activeTab === 'settings' ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm">
              <h3 className="font-bold text-lg mb-4">Shop Location</h3>
              <p className="text-xs text-slate-500 mb-4">Update your shop's coordinates so customers can find you on the map.</p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Latitude</label>
                  <input 
                    type="text" 
                    value={shop.latitude || ''}
                    readOnly
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mt-1 text-sm font-medium opacity-70"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Longitude</label>
                  <input 
                    type="text" 
                    value={shop.longitude || ''}
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
                            const { error } = await supabase
                              .from('shops')
                              .update({ 
                                latitude: position.coords.latitude, 
                                longitude: position.coords.longitude 
                              })
                              .eq('id', shop.id);
                            
                            if (error) throw error;
                            
                            setShop({ ...shop, latitude: position.coords.latitude, longitude: position.coords.longitude });
                            showAlert('Success', 'Shop location updated to your current position!');
                          } catch (err: any) {
                            showAlert('Error', 'Failed to update location: ' + err.message);
                          }
                        },
                        (error) => {
                          showAlert('Error', 'Could not get your location. Please ensure location services are enabled.');
                        }
                      );
                    } else {
                      showAlert('Error', 'Geolocation is not supported by your browser.');
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LocateFixed className="w-4 h-4" />
                  Update to Current Location
                </button>
              </div>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
              <Utensils className="w-10 h-10" />
            </div>
            <div>
              <p className="font-bold text-lg text-slate-900 dark:text-white">No active orders</p>
              <p className="text-slate-500 text-sm">New orders will appear here in real-time.</p>
            </div>
            
            {/* Presentation Tool: Seed Demo Data */}
            <button 
              onClick={async () => {
                if (!shop) return;
                
                try {
                  // Create sample menu items if they don't exist
                  await supabase.from('menu_items').insert([
                    { shop_id: shop.id, name: "The King Kota", price: 45, description: "Chips, Polony, Cheese, Egg, Russian, Steak" },
                    { shop_id: shop.id, name: "Oakmoor Special", price: 35, description: "Chips, Polony, Cheese, Russian" }
                  ]);
                  
                  // Create sample orders
                  await supabase.from('orders').insert([
                    { 
                      shop_id: shop.id, 
                      customer_name: "Thabo M.", 
                      product_name: "The King Kota", 
                      quantity: 1, 
                      price: 45, 
                      status: 'pending',
                      created_at: new Date().toISOString()
                    },
                    { 
                      shop_id: shop.id, 
                      customer_name: "Lerato K.", 
                      product_name: "Oakmoor Special", 
                      quantity: 2, 
                      price: 70, 
                      status: 'preparing',
                      created_at: new Date(Date.now() - 600000).toISOString()
                    }
                  ]);
                  
                  // No need to reload, real-time subscription will pick it up
                  // but we might want to refresh shop data if we added menu items
                } catch (err: any) {
                  console.error('Error seeding orders:', err);
                  showAlert('Error', 'Failed to seed orders: ' + err.message);
                }
              }}
              className="px-4 py-2 border border-primary/20 text-primary/60 rounded-lg text-[10px] uppercase font-bold tracking-widest hover:bg-primary/5 transition-colors cursor-pointer"
            >
              Seed Demo Orders (For Presentation)
            </button>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-primary/5 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-4 border-b border-primary/5 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-400">#{order.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusColor(order.status, order.delivery_status)}`}>
                      {order.delivery_status ? order.delivery_status.replace('_', ' ') : order.status}
                    </span>
                    {order.is_delivery && (
                      <span className="bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1">
                        <Navigation className="w-2 h-2" />
                        Rider Required
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg">{order.customer_name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-slate-300">•</span>
                    <span>{Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)}m ago</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-primary font-bold">R {order.price.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg border border-primary/5 flex items-center justify-center text-primary font-bold">
                      {order.quantity}x
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{order.product_name}</p>
                  </div>
                  {order.payment_method && (
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-bold text-xs">
                      {order.payment_method === 'cash' ? <Banknote className="w-3.5 h-3.5 text-green-500" /> : <CreditCard className="w-3.5 h-3.5 text-blue-500" />}
                      {order.payment_method === 'cash' ? 'Cash' : 'Card'}
                    </div>
                  )}
                </div>
                {order.notes && (
                  <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-100 dark:border-orange-500/20">
                    <p className="text-xs text-orange-700 dark:text-orange-400 font-medium italic">"{order.notes}"</p>
                  </div>
                )}
              </div>

              <div className="p-4 flex gap-2 overflow-x-auto no-scrollbar">
                {order.status === 'pending' && (
                  <button 
                    onClick={() => updateOrderStatus('confirmed', order.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Confirm Order
                  </button>
                )}
                {order.status === 'confirmed' && (
                  <button 
                    onClick={() => updateOrderStatus('preparing', order.id)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button 
                    onClick={() => updateOrderStatus('ready', order.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Mark as Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button 
                    onClick={() => updateOrderStatus('completed', order.id)}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Complete Order
                  </button>
                )}
                {['pending', 'confirmed'].includes(order.status) && (
                  <button 
                    onClick={() => {
                      showConfirm('Cancel Order', 'Are you sure you want to cancel this order?', () => {
                        updateOrderStatus('cancelled', order.id);
                      });
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
            </div>
          ))
        )}
      </main>

      <nav className="bg-white dark:bg-slate-900 border-t border-primary/10 px-6 py-4 flex justify-around items-center sticky bottom-0">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'orders' ? 'text-primary' : 'text-slate-400'}`}
        >
          <ClipboardList className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'inventory' ? 'text-primary' : 'text-slate-400'}`}
        >
          <Package className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Inventory</span>
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'stats' ? 'text-primary' : 'text-slate-400'}`}
        >
          <BarChart3 className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Stats</span>
        </button>
        <button 
          onClick={() => setActiveTab('marketing')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'marketing' ? 'text-primary' : 'text-slate-400'}`}
        >
          <Megaphone className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Marketing</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'settings' ? 'text-primary' : 'text-slate-400'}`}
        >
          <MapPin className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Location</span>
        </button>
      </nav>
    </div>
  );
}

function AdminOrdersScreen({ onBack, showAlert, showConfirm }: { 
  onBack: () => void,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState("Your order is being prepared with love! 🔥");

  useEffect(() => {
    fetchOrders();

    // Real-time updates for admin
    const channel = supabase
      .channel('admin_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new as Order : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders((data || []) as Order[]);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      // We don't have a local error state in AdminOrdersScreen, but we can log it clearly
      if (error.message === 'Failed to fetch') {
        console.error('Network Error: Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (status: string, orderId: string, message?: string) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10); // Subtle feedback for status change
    }
    try {
      // Fetch current order to get existing history and delivery info
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const history = currentOrder?.status_history || [];
      const newHistory = [...history, { status, timestamp: new Date().toISOString() }];

      // BUSINESS LOGIC: If a guest ordered delivery and it's marked as ready, 
      // it shifts to 'finding_rider' status instead of just 'ready'
      let finalStatus = status;
      let deliveryStatus = currentOrder?.delivery_status;

      if (status === 'ready' && currentOrder?.is_delivery) {
        finalStatus = 'ready';
        deliveryStatus = 'finding_rider';
      }

      const updateData: any = { 
        status: finalStatus,
        status_history: newHistory,
        delivery_status: deliveryStatus
      };
      if (message) updateData.owner_message = message;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (error) throw error;
      fetchOrders(); // Refresh list
    } catch (error: unknown) {
      console.error('Error updating order status:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showAlert('Error', errorMessage);
    }
  };

  const getStatusColor = (status: string, deliveryStatus?: string) => {
    if (deliveryStatus === 'finding_rider') return 'bg-indigo-100 text-indigo-600 border-indigo-200';
    if (deliveryStatus === 'rider_assigned') return 'bg-blue-100 text-blue-600 border-blue-200';
    if (deliveryStatus === 'picked_up') return 'bg-purple-100 text-purple-600 border-purple-200';
    if (deliveryStatus === 'delivered') return 'bg-emerald-100 text-emerald-600 border-emerald-200';

    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'confirmed': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'preparing': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'ready': return 'bg-green-100 text-green-600 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden">
        <header className="flex items-center p-4 bg-white dark:bg-[#221610] sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
          <button onClick={onBack} className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center mr-10">Admin Dashboard</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
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
            {['all', 'pending', 'confirmed', 'ready', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer border ${
                  statusFilter === status 
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105' 
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-primary/30'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              {statusFilter === 'all' ? 'Recent Orders' : `${statusFilter} Orders`} ({filteredOrders.length})
            </h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} 
                className="text-slate-500 hover:text-primary text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title={`Sort by date: ${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}`}
              >
                <Clock className="w-4 h-4" />
                {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </button>
              <button onClick={fetchOrders} className="text-primary text-xs font-bold flex items-center gap-1 cursor-pointer">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    </div>
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  </div>
                  <div className="h-4 w-full bg-slate-50 dark:bg-slate-800 rounded mb-3"></div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-800">
                    <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                    <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <Package className="w-12 h-12" />
              <p className="text-slate-500 font-medium">No orders found</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border transition-all cursor-pointer ${
                  expandedOrderId === order.id ? 'border-primary ring-1 ring-primary/10' : 'border-slate-100 dark:border-slate-800'
                }`}
                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{order.product_name}</p>
                    <p className="text-xs text-slate-500 truncate">{order.customer_name} • {order.phone}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shrink-0 ml-2 border ${getStatusColor(order.status, order.delivery_status)}`}>
                    {order.delivery_status ? order.delivery_status.replace('_', ' ') : order.status}
                  </span>
                </div>
                {order.is_delivery && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1">
                      <Navigation className="w-2 h-2" />
                      Rider Needed (R{order.delivery_fee})
                    </span>
                  </div>
                )}
                
                {/* Collapsed View: Address */}
                {expandedOrderId !== order.id && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <p className="truncate">{order.address}, {order.city}</p>
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
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Customer Details</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <p className="text-sm font-bold mb-1">{order.customer_name}</p>
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
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Order Particulars</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-bold">{order.product_name}</p>
                            <p className="text-sm font-black text-primary">R {((order.price || 0) + (order.delivery_fee || 0)).toLocaleString()}</p>
                          </div>
                          {order.product_variant && (
                            <p className="text-xs text-slate-500 mb-1">Variant: {order.product_variant}</p>
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
                                {order.payment_method === 'cash' ? <Banknote className="w-3.5 h-3.5 text-green-500" /> : <CreditCard className="w-3.5 h-3.5 text-blue-500" />}
                                {order.payment_method === 'cash' ? 'Cash' : 'Card'}
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
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Delivery Destination</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${order.address}, ${order.city}, ${order.country}`);
                            showAlert('Copied', 'Address copied to clipboard!');
                          }}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-xs leading-relaxed font-medium">{order.address}</p>
                        <p className="text-xs text-slate-500 mt-1">{order.city}, {order.country}</p>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <StickyNote className="w-4 h-4 text-primary" />
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Special Instructions</p>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100/50 dark:border-amber-800/30 italic">
                          "{order.notes}"
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                      <div className="text-[9px] text-slate-400 font-medium">
                        REF: {order.id.toString().toUpperCase().slice(-8)} • {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-3" onClick={(e) => e.stopPropagation()}>
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => {
                        setOrderToConfirm(order);
                        setConfirmationMessage("Your order is being prepared with love! 🔥");
                      }}
                      className="flex-1 h-9 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
                    >
                      Confirm
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button 
                      onClick={() => updateOrderStatus('ready', order.id)}
                      className="flex-1 h-9 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button 
                      onClick={() => updateOrderStatus('completed', order.id)}
                      className="flex-1 h-9 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors cursor-pointer"
                    >
                      Complete
                    </button>
                  )}
                  {['pending', 'confirmed', 'ready'].includes(order.status) && (
                    <button 
                      onClick={() => setOrderToCancel(order)}
                      className="flex-1 h-9 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </main>

        {/* Cancellation Confirmation Modal */}
        {orderToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#221610] w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="size-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                <XCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Cancel Order?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                Are you sure you want to cancel the order for <span className="font-bold text-slate-900 dark:text-white">{orderToCancel.product_name}</span>? This action cannot be undone.
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
                    updateOrderStatus('cancelled', orderToCancel.id);
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
            <div className="bg-white dark:bg-[#221610] w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="size-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Confirm Order</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-4">
                Send a message to <span className="font-bold text-slate-900 dark:text-white">{orderToConfirm.customer_name}</span> about their order.
              </p>
              
              <div className="space-y-2 mb-6">
                <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Confirmation Message</label>
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
                    updateOrderStatus('confirmed', orderToConfirm.id, confirmationMessage);
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

function OrderHistoryScreen({ session, onBack, userProfile, showAlert, showConfirm }: { 
  session: Session | null, 
  onBack: () => void, 
  userProfile: UserProfile,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;
      setCancellingOrderId(null);
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      showAlert('Error', `Failed to cancel order: ${error.message}`);
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        if (error.message === 'Failed to fetch') {
          // You could add a local error state here if needed
          console.error('Network Error: Please check your internet connection.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Real-time updates for order history
    const channel = supabase
      .channel(`order_history:${session?.user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${session?.user?.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  return (
    <div className="bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full max-w-md mx-auto flex-col bg-white dark:bg-[#221610] overflow-x-hidden shadow-xl">
        <div className="flex items-center bg-white dark:bg-[#221610] p-4 pb-2 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
          <div onClick={onBack} className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center justify-start cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </div>
          {loading ? (
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          ) : (
            <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1">My Orders</h2>
          )}
        </div>

        <main className="flex-1 p-4 flex flex-col gap-4">
          {loading ? (
            <div className="flex-1 flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    </div>
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
                    <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold mb-2">No orders yet</h3>
              <p className="text-slate-500 text-sm mb-8">Your order history will appear here once you place an order.</p>
              <button 
                onClick={onBack}
                className="bg-primary text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
              >
                Start Ordering
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[12px] font-bold text-primary uppercase tracking-widest mb-1">Order #{order.id.toString().slice(-6)}</p>
                    <p className="text-slate-900 dark:text-slate-100 font-bold text-lg">{order.product_name}</p>
                    <p className="text-slate-500 text-[12px] font-medium">{new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                      order.status === 'ready' ? (order.is_delivery ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200') :
                      order.status === 'completed' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                      order.status === 'cancelled' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {order.status === 'ready' && order.is_delivery ? 'Finding Rider' : order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {order.status === 'pending' && (
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={() => setCancellingOrderId(order.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-widest rounded-lg border border-rose-100 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Order
                    </button>
                  </div>
                )}

                {/* Stepped Progress Indicator */}
                {order.status !== 'cancelled' && (
                  <div className="mt-4 px-2">
                    <div className="relative flex justify-between items-center w-full">
                      {/* Progress Line Background */}
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
                      
                      {/* Active Progress Line */}
                      <div 
                        className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0 transition-all duration-700 ease-in-out"
                        style={{ 
                          width: 
                            order.status === 'pending' ? '0%' :
                            order.status === 'confirmed' ? '33%' :
                            order.status === 'ready' ? '66%' :
                            order.status === 'completed' ? '100%' : '0%'
                        }}
                      ></div>

                      {/* Steps */}
                      {[
                        { id: 'pending', icon: Hourglass, label: 'Pending' },
                        { id: 'confirmed', icon: CheckCircle2, label: 'Confirmed' },
                        { id: 'ready', icon: Utensils, label: 'Ready' },
                        { id: 'completed', icon: CheckSquare, label: 'Done' }
                      ].map((step, idx, arr) => {
                        const statuses = arr.map(s => s.id);
                        const currentIdx = statuses.indexOf(order.status);
                        const isCompleted = currentIdx >= idx || order.status === 'completed';
                        const isActive = order.status === step.id;
                        const StepIcon = step.icon;

                        return (
                          <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5">
                            <div className={`size-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                              isCompleted ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-300'
                            }`}>
                              <StepIcon className="w-3.5 h-3.5" />
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${
                              isCompleted ? 'text-primary' : 'text-slate-400'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-50 dark:border-slate-800">
                  <div className="flex flex-col">
                    <p className="text-slate-500 text-xs">Quantity: {order.quantity}</p>
                    {order.is_delivery ? (
                      <p className="text-orange-600 text-[10px] uppercase font-black tracking-widest mt-1 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Bicycle Delivery (R{order.delivery_fee || '5.00'})
                      </p>
                    ) : (
                      <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">
                        {order.payment_method === 'cash' ? '💵 Cash on Collection' : '💳 Card Machine'}
                      </p>
                    )}
                  </div>
                  <p className="text-primary font-bold">R {((order.price || 0) + (order.delivery_fee || 0)).toFixed(2)}</p>
                </div>
                {order.notes && (
                  <div className="bg-orange-50 dark:bg-orange-900/10 p-2 rounded-lg border border-orange-100 dark:border-orange-900/30">
                    <p className="text-orange-700 dark:text-orange-400 text-[10px] font-medium italic">
                      <span className="font-bold not-italic">Note:</span> {order.notes}
                    </p>
                  </div>
                )}

                {/* Status History Timeline */}
                {order.status_history && order.status_history.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-slate-50 dark:border-slate-800">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                      <History className="w-3 h-3" />
                      Status Journey
                    </p>
                    <div className="space-y-3 pl-1">
                      {order.status_history.map((h: StatusHistoryItem, i: number) => (
                        <div key={i} className="flex gap-3 relative">
                          {i !== order.status_history.length - 1 && (
                            <div className="absolute left-1.5 top-3 w-0.5 h-full bg-slate-100 dark:bg-slate-800"></div>
                          )}
                          <div className={`size-3 rounded-full mt-1 z-10 ${
                            i === order.status_history.length - 1 ? 'bg-primary ring-4 ring-primary/10' : 'bg-slate-200 dark:bg-slate-700'
                          }`}></div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <p className={`text-[10px] font-black uppercase tracking-wider ${
                                i === order.status_history.length - 1 ? 'text-primary' : 'text-slate-500'
                              }`}>
                                {h.status}
                              </p>
                              <p className="text-[9px] text-slate-400 font-medium">
                                {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {h.status === 'confirmed' && order.owner_message && (
                              <p className="text-[10px] text-slate-500 italic mt-0.5 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                "{order.owner_message}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </main>

        {/* Cancellation Confirmation Modal */}
        {cancellingOrderId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div className="size-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Cancel Order?</h3>
              <p className="text-xs text-slate-500 text-center mb-6 leading-relaxed">
                Are you sure you want to cancel this order? This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleCancelOrder(cancellingOrderId)}
                  className="w-full py-3.5 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  Yes, Cancel Order
                </button>
                <button 
                  onClick={() => setCancellingOrderId(null)}
                  className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl active:scale-95 transition-all cursor-pointer"
                >
                  No, Keep It
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewScreen({ 
  pendingReview, 
  onSnooze, 
  onSubmit 
}: { 
  pendingReview: PendingReview, 
  onSnooze: () => void, 
  onSubmit: (rating: number, comment: string) => void 
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      onSubmit(rating, comment);
      setSubmitting(false);
    }, 1000);
  };

  return (
    <div className="bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto shadow-2xl p-6">
      <div className="flex-grow flex flex-col justify-center space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-orange-100 dark:bg-orange-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">How was your {pendingReview.productName}?</h1>
          <p className="text-gray-500 dark:text-slate-400">Your feedback helps us improve!</p>
        </div>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`p-2 transition-transform active:scale-90 ${rating >= star ? 'text-orange-500' : 'text-gray-300'}`}
            >
              <Star className={`w-10 h-10 ${rating >= star ? 'fill-current' : ''}`} />
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a comment (optional)..."
          className="w-full p-4 bg-gray-50 rounded-2xl border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-orange-500 outline-none min-h-[120px] transition-all text-sm"
        />

        <div className="space-y-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
          <button
            onClick={onSnooze}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-4 rounded-2xl transition-all active:scale-95 cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactScreen({ onBack, userProfile, showAlert }: { onBack: () => void, userProfile: UserProfile, showAlert: (title: string, message: string) => void }) {
  const [name, setName] = useState(userProfile.fullName || '');
  const [email, setEmail] = useState(userProfile.email || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showAlert('Error', 'Please fill in all fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages').insert([{
        name,
        email,
        message,
        user_id: userProfile.id || null,
        created_at: new Date().toISOString()
      }]);
      
      if (error) {
        console.warn('Could not insert into contact_messages, falling back to mailto', error);
        window.location.href = `mailto:support@localeats.co.za?subject=Contact from ${name}&body=${encodeURIComponent(message + '\n\nFrom: ' + email)}`;
      } else {
        showAlert('Success', 'Your message has been sent. We will get back to you soon!');
        setMessage('');
      }
    } catch (err) {
      console.error(err);
      window.location.href = `mailto:support@localeats.co.za?subject=Contact from ${name}&body=${encodeURIComponent(message + '\n\nFrom: ' + email)}`;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#221610]/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 py-4 flex items-center">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer transition-transform active:scale-95">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight flex-1 text-center pr-10">Contact Us</h1>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl mb-8 flex flex-col items-center text-center border border-blue-100 dark:border-blue-800/50">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 mb-4 shadow-inner">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">We'd love to hear from you!</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Have a question, feedback, or need help with an order? Send us a message.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Your Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="John Doe"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="john@example.com"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Message</label>
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

