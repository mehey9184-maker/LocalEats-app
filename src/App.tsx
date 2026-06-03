/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction, useEffect, useCallback, useMemo, useRef, ChangeEvent, FormEvent, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Fix for default marker icons in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import QRCode from 'qrcode';

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
  LogIn,
  Locate,
  LocateFixed,
  Banknote,
  Wallet,
  ChevronLeft,
  Bug,
  Eye,
  EyeOff,
  FileText,
  Shield,
  QrCode,
  Download,
  Gift,
  Fingerprint,
  Zap,
  WifiOff,
  Edit,
  Edit2,
  SlidersHorizontal,
  Languages,
  HelpCircle,
  ShieldCheck,
  Apple,
  ExternalLink 
} from 'lucide-react';
import { supabase, supabaseUrl, APP_URL } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { LocalEatsLogo } from './components/LocalEatsLogo';
import jsPDF from 'jspdf';
import { useTranslation } from './contexts/LanguageContext';
import { Screen, AppNotification, StatusHistoryItem, Order, PendingReview, MenuItem, CartItem, Review, Shop } from './types';
import { hashString, handleSupabaseError, calculateDistance, getShopStatus, SUPPORTED_CITIES, APP_VERSION, DEFAULT_COORDS, DEFAULT_MENU_IMAGE, DEFAULT_SHOP_LOGO } from './utils';

const LOCAL_PROMO_DB: Record<string, { code: string; type: 'percent' | 'fixed' | 'delivery_free'; value: number; expiry_date: string; is_active: boolean }> = {
  'LOCALEATS10': { code: 'LOCALEATS10', type: 'percent', value: 10, expiry_date: '2027-12-31T23:59:59Z', is_active: true },
  'FIRSTTREAT': { code: 'FIRSTTREAT', type: 'fixed', value: 15, expiry_date: '2027-12-31T23:59:59Z', is_active: true },
  'BICYCLE5': { code: 'BICYCLE5', type: 'delivery_free', value: 5, expiry_date: '2027-12-31T23:59:59Z', is_active: true },
  'EXPIRED20': { code: 'EXPIRED20', type: 'percent', value: 20, expiry_date: '2025-01-01T00:00:00Z', is_active: true },
  'EXPIREDHALF': { code: 'EXPIREDHALF', type: 'percent', value: 50, expiry_date: '2026-05-01T00:00:00Z', is_active: true }
};

import { AddressSearch, LocationPickerMap } from './components/MapComponents';
import { BlurUpImage } from './components/BlurUpImage';
import { TrustBadge } from './components/TrustBadge';
import { AppHelp } from './components/AppHelp';
import { OnboardingTour } from './components/OnboardingTour';
import { OrderHistorySkeleton, ShopOrdersSkeleton, RiderDashboardSkeleton, StatsSkeleton } from './components/FacebookSkeleton';

const ShopCard = memo(({ shop, isFollowed, onStoreInfo, triggerHaptic }: { 
  shop: Shop, 
  isFollowed: boolean, 
  onStoreInfo: (id: string) => void,
  triggerHaptic: (pattern?: number | number[]) => void
}) => {
  const status = getShopStatus(shop);
  return (
    <motion.div 
      layout
      variants={{
        hidden: { opacity: 0, y: 15, scale: 0.98 },
        show: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: {
            type: 'spring',
            damping: 25,
            stiffness: 300
          }
        }
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        triggerHaptic();
        onStoreInfo(shop.id);
      }}
      className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-[28px] transition-colors cursor-pointer relative group border border-slate-100 dark:border-slate-800/50 shadow-sm hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-500/30`}
    >
      {/* Shop Logo (WhatsApp Circle Style) */}
      <div className="relative shrink-0">
        <div className={`w-15 h-15 rounded-full overflow-hidden border-2 p-0.5 ${status.isOpen ? 'border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'border-slate-300 dark:border-slate-700'}`}>
          <BlurUpImage src={shop.logo || DEFAULT_SHOP_LOGO} alt={shop.name} className="w-full h-full rounded-full object-cover" blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`} />
        </div>
        {status.isOpen && (
          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
        )}
      </div>

      {/* Shop Info (Chat Preview Style) */}
      <div className="flex-1 min-w-0 py-1">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className="text-[16px] font-black text-slate-900 dark:text-white truncate pr-2 group-hover:text-orange-600 transition-colors">{shop.name}</h4>
          <div className="flex items-center gap-1 shrink-0 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-700">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-[11px] font-black text-slate-900 dark:text-white">{shop.rating}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-1 flex-1 font-medium italic opacity-80">
            {shop.category} • {shop.description}
          </p>
          {isFollowed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              <Heart className="w-4 h-4 text-orange-500 fill-current ml-2 shrink-0 opacity-80" />
            </motion.div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-2 overflow-hidden">
          <TrustBadge shop={shop} />
          {!status.isOpen && (
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap bg-slate-100/50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">Opens {status.nextOpeningTime || 'Soon'}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

const MenuItemCard = memo(({ item, shop, addToCart, showAlert, setCurrentScreen, onSelect }: { 
  item: MenuItem, 
  shop: Shop, 
  addToCart?: (item: MenuItem, shopId: string, quantity?: number, specialInstructions?: string, selectedCustomizations?: {name: string, price: number}[]) => void,
  showAlert: (title: string, message: string) => void,
  setCurrentScreen?: (screen: any) => void,
  onSelect?: (item: MenuItem) => void
}) => {
  return (
    <motion.div 
      variants={{
        hidden: { opacity: 0, y: 10, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1 }
      }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-50 dark:border-slate-800 flex gap-4 group hover:border-orange-600/20 transition-all cursor-pointer shadow-sm"
      onClick={() => {
        const status = getShopStatus(shop);
        if (!status.isOpen) {
          showAlert('Closed', `This store is currently closed. ${status.message}`);
          return;
        }
        if (item.is_available === false) {
          showAlert('Out of Stock', 'This item is currently unavailable.');
          return;
        }
        if (onSelect) {
          onSelect(item);
        } else if (addToCart && setCurrentScreen) {
          addToCart(item, shop.id, 1);
          setCurrentScreen('checkout');
        }
      }}
    >
      <div className="size-20 rounded-xl overflow-hidden shrink-0 shadow-sm">
        <BlurUpImage src={item.image || DEFAULT_MENU_IMAGE} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" blurHash={`https://picsum.photos/seed/${item.id}/10/10?blur=10`} />
      </div>
      <div className="flex-1 flex flex-col justify-between py-0.5">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-orange-600 transition-colors">{item.name}</h4>
              {item.customizations && item.customizations.length > 0 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded text-[8px] font-black text-orange-600 uppercase tracking-tighter" title="Customizable">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Customizable</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{item.description || 'Freshly prepared local favourite'}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <p className="font-black text-orange-600 text-sm">{item.displayPrice}</p>
          <div 
            className={`px-4 py-2 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-[10px] font-black uppercase tracking-widest ${(!getShopStatus(shop).isOpen || item.is_available === false) ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-orange-600 text-white shadow-orange-600/20 group-hover:bg-orange-700'}`}
          >
            <span>{!getShopStatus(shop).isOpen ? 'Closed' : item.is_available === false ? 'Sold Out' : 'Buy'}</span>
            {getShopStatus(shop).isOpen && item.is_available !== false && <Plus className="w-3 h-3" />}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

type UserProfile = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  country: string;
  role: 'user' | 'admin' | 'shop_owner' | 'rider';
  photoURL?: string;
  latitude?: number;
  longitude?: number;
  language?: string;
};

const formatSAPhone = (val: string) => {
  if (!val) return '';
  let cleaned = val.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '27' + cleaned.substring(1);
  }
  if (cleaned.length > 11) cleaned = cleaned.substring(0, 11);
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return '+' + cleaned;
  if (cleaned.length <= 4) return `+${cleaned.substring(0, 2)} ${cleaned.substring(2)}`;
  if (cleaned.length <= 7) return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4)}`;
  return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 7)} ${cleaned.substring(7)}`;
};

const validateSAPhone = (phone: string) => {
  // SA format: +27 followed by 9 digits (total 11 digits)
  const cleaned = phone.replace(/\D/g, '');
  return /^27[0-9]{9}$/.test(cleaned);
};

const DEFAULT_AVATAR_URL = "https://ui-avatars.com/api/?name=User&background=orange&color=fff&size=64&format=webp";
async function searchAddress(query: string) {
  if (!query || query.length < 3) return [];
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=za&limit=5`);
    const data = await response.json();
    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    }));
  } catch (error) {
    console.error("Address search error:", error);
    return [];
  }
}

const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.75): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Image compression failed'));
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

const uploadAvatar = async (file: File, userId?: string) => {
  try {
    // Compress image before upload to save database/storage space
    const compressedBlob = await compressImage(file);
    const fileExt = 'jpg'; // We compress to jpeg
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = userId ? `${userId}/${fileName}` : `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, compressedBlob, {
        contentType: 'image/jpeg'
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Compression or Upload failed:', error);
    throw error;
  }
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

const safeLocalStorageGet = (key: string, fallback: any) => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    return JSON.parse(saved);
  } catch (err) {
    console.warn(`[SafeStorage] Failed parsing or getting item for key "${key}", reverting to fallback.`, err);
    return fallback;
  }
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    console.error(`[SafeStorage] Uncaught error saving "${key}" to localStorage:`, err);
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      try {
        console.warn('[SafeStorage] Quota exceeded. Evicting non-essential cache databases and retrying...');
        localStorage.removeItem('cached_shops');
        localStorage.removeItem('cached_orders');
        localStorage.removeItem('admin_cached_orders');
        localStorage.setItem(key, value);
      } catch (retryErr) {
        console.error('[SafeStorage] Recovery eviction failed to clear sufficient quota.', retryErr);
      }
    }
  }
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [appVersion, setAppVersion] = useState("4.0"); // Initialize with 4.0
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return safeLocalStorageGet('userProfile', {
      fullName: '',
      email: '',
      phone: '',
      city: SUPPORTED_CITIES[0],
      address: '',
      country: 'South Africa',
      role: 'user'
    });
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    return safeLocalStorageGet('favorites', []);
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('dark_mode');
      if (saved === null) return false;
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [pendingReview, setPendingReview] = useState<PendingReview | null>(() => {
    return safeLocalStorageGet('pending_review', null);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [shops, setShops] = useState<Shop[]>(() => {
    return safeLocalStorageGet('cached_shops', []);
  });
  const [loadingShops, setLoadingShops] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    return safeLocalStorageGet('cart', []);
  });
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const [processingState, setProcessingState] = useState<'idle' | 'saving' | 'success'>('idle');

  const runWithProcessing = async <T,>(action: () => Promise<T>, successCallback?: () => void, loadingLabel?: string) => {
    setProcessingState('saving');
    try {
      await action();
      setProcessingState('success');
      setTimeout(() => {
        setProcessingState('idle');
        if (successCallback) successCallback();
      }, 1200); // Slightly faster feedback loop
    } catch (err) {
      setProcessingState('idle');
      throw err;
    }
  };

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
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(DEFAULT_COORDS);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    return safeLocalStorageGet('app_notifications', []);
  });
  const [orders, setOrders] = useState<Order[]>([]);

  // Audio state for notifications
  const notificationAudio = useRef<HTMLAudioElement | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  useEffect(() => {
    // Premium "sweet" notification sound
    notificationAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  const playNotificationSound = useCallback(() => {
    if (notificationAudio.current) {
      notificationAudio.current.currentTime = 0;
      notificationAudio.current.play().catch(e => console.warn("Audio autoplay blocked:", e));
    }
  }, []);

  // Initialize audio on first click to satisfy browser autoplay policies
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (notificationAudio.current && !audioInitialized) {
        notificationAudio.current.play().then(() => {
           notificationAudio.current?.pause();
           setAudioInitialized(true);
        }).catch(() => {});
        window.removeEventListener('click', handleFirstInteraction);
      }
    };
    window.addEventListener('click', handleFirstInteraction);
    return () => window.removeEventListener('click', handleFirstInteraction);
  }, [audioInitialized]);

  const cartCount = cart.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const cartTotal = cart.reduce((sum, item) => sum + ((item?.price || 0) * (item?.quantity || 0)), 0);

  // PERSISTENCE SYNCING
  useEffect(() => {
    safeLocalStorageSet('userProfile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    safeLocalStorageSet('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    safeLocalStorageSet('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    safeLocalStorageSet('app_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    safeLocalStorageSet('dark_mode', String(isDarkMode));
    try {
      const root = window.document.documentElement;
      const body = window.document.body;
      if (isDarkMode) {
        root.classList.add('dark');
        body.classList.add('dark');
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
      }
    } catch (e) {
      console.warn("DOM Dark class toggle failed:", e);
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (pendingReview) {
      safeLocalStorageSet('pending_review', JSON.stringify(pendingReview));
    } else {
      try {
        localStorage.removeItem('pending_review');
      } catch (e) {
        console.warn("localStorage remove item error:", e);
      }
    }
  }, [pendingReview]);

  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const fetchShopsData = useCallback(async (retries = 3) => {
    setLoadingShops(true);
    setFetchError(null);

    // Load from cache first if offline or to show immediate results
    if (!navigator.onLine) {
      try {
        const cached = safeLocalStorageGet('cached_shops', null);
        if (cached) {
          setShops(cached);
          setLoadingShops(false);
          return;
        }
      } catch (e) {
        console.warn("Retreiving shops from cache offline failed:", e);
      }
    }

    try {
      // Fetch all shops
      const { data: shopsData, error: shopsError } = await supabase
        .from('shops')
        .select('*');

      if (shopsError) {
        console.error('Shops fetch error:', shopsError);
        const errObj = new Error(shopsError.message || 'Unknown Supabase error');
        (errObj as any).code = shopsError.code;
        (errObj as any).details = shopsError.details;
        throw errObj;
      }

      console.log(`Total shops found: ${shopsData?.length || 0}`);

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*');

      if (menuError) {
        console.error('Menu items fetch error:', menuError);
        const isNetwork = (menuError.message && menuError.message.toLowerCase().includes('failed to fetch')) || 
                        (menuError.details && menuError.details.toLowerCase().includes('failed to fetch')) ||
                        menuError.code === 'PGRST301';
        
        if (isNetwork) {
          throw new Error('FAILED_TO_FETCH_MENU');
        }
        throw menuError;
      }

      const formattedShops: Shop[] = (shopsData || []).map(s => {
        // Generate deterministic mock coordinates if missing for default area
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
          logo: s.logo_url || DEFAULT_SHOP_LOGO,
          rating: Number(s.rating) || 4.5,
          cash_trust_enabled: s.cash_trust_enabled === true || s.cash_trust_enabled === 'true',
          allow_external_riders: s.allow_external_riders === true || s.allow_external_riders === 'true',
          auto_look_for_rider: s.auto_look_for_rider === true || s.auto_look_for_rider === 'true',
          reviewCount: 12 + (shopHash % 88), // Mock review count
          prepTime: "15-20 min", // Mock prep time
          isOpen: isOpen,
          description: s.description || "Local Flavours",
          address: s.location || "Local Eats",
          category: s.category || "Kota",
          owner_id: s.owner_id,
          opening_time: s.opening_time,
          closing_time: s.closing_time,
          phone: s.phone || "+27 12 345 6789",
          latitude: s.latitude || DEFAULT_COORDS.lat,
          longitude: s.longitude || DEFAULT_COORDS.lng,
          images: (s as any).images || [
            DEFAULT_SHOP_LOGO,
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1476224484581-5d996cc0750e?auto=format&fit=crop&q=80&w=600",
            "https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&q=80&w=600"
          ],
          menu: (menuData || [])
            .filter(m => String(m.shop_id) === String(s.id))
            .map(m => ({
              id: String(m.id),
              name: m.name,
              price: Number(m.price),
              displayPrice: `R${Number(m.price).toFixed(2)}`,
              image: m.image_url || DEFAULT_MENU_IMAGE,
              description: m.description || "",
              category: m.category || "Main Course",
              is_available: m.is_available !== false,
              customizations: m.customizations || []
            }))
        };
      }).sort((a, b) => (b.rating || 0) - (a.rating || 0)); // Smart Ranking: Best rated first

      console.log(`Successfully fetched ${formattedShops.length} shops.`);
      setShops(formattedShops);
      safeLocalStorageSet('cached_shops', JSON.stringify(formattedShops)); // Instant-Load Caching
      setLoadingShops(false);
    } catch (err: any) {
      const errStr = (err?.message || String(err)).toLowerCase();
      const isNetworkError = errStr.includes('failed to fetch') || errStr.includes('network error') || errStr.includes('load failed') || err?.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('network'));
      
      // Only log errors that are not network-related, or log them only on final failure
      if (!isNetworkError || retries === 0) {
        console.error('Error fetching shops:', err);
      }
      
      let errorMessage = err.message || 'Failed to connect to the server';
      
      if (isNetworkError || err.message === 'FAILED_TO_FETCH_MENU') {
        errorMessage = 'Check Your Connection: We\'re having trouble reaching the store. Please ensure your internet is working or check your ad-blocker.';
      } else if (err.status === 401 || err.status === 403) {
        errorMessage = 'Please Sign In: We need you to log in again to keep your information secure.';
      } else if (err.status === 404) {
        errorMessage = 'Not Found: We couldn\'t find the store or items you were looking for.';
      } else if (err.code === 'PGRST301') {
        errorMessage = 'Session Expired: Your security token has timed out. A quick refresh should fix it!';
      }
      
      if (retries > 0) {
        console.log(`Retrying fetchShopsData... (${retries} retries left)`);
        // We don't stop loading spinner during retries to prevent flickering
        setTimeout(() => fetchShopsData(retries - 1), 2500);
      } else {
        // Sandboxed Zero-Downtime Guarantee: fallback to local cache if available when database fails
        const cached = safeLocalStorageGet('cached_shops', null);
        if (cached && Array.isArray(cached) && cached.length > 0) {
          console.warn("Database fetch failed - Falling back gracefully to localStorage cached shops under Zero-Downtime Guarantee rules");
          setShops(cached);
          setLoadingShops(false);
          setNotification({
            message: "Running in offline mode. Standard default state loaded.",
            type: 'info'
          });
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
    }
  }, []);

  // Connectivity monitoring consolidated
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setNotification({ message: "Back online! Syncing your data... 🍟", type: 'success' });
      fetchShopsData();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNotification({ message: "You're offline. Some features may be limited.", type: 'info' });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Heartbeat check for Supabase connectivity
    const checkSupabase = async () => {
      try {
        const { error } = await supabase.from('shops').select('id').limit(1);
        if (error) {
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
  }, [fetchShopsData]);

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
        console.warn("Error getting location:", error.message);
        let errorMsg = "Could not get your location automatically.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location access denied. Please set address manually.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location timed out. Using default (Koffiefontein area). Search manually for better accuracy.";
        }
        setNotification({ 
          message: errorMsg, 
          type: 'info' 
        });
      },
      { timeout: 15000, enableHighAccuracy: false }
    );
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const filtered = shops
        .map(s => s.name)
        .filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, shops]);

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
          photoURL: data.photo_url || '',
          latitude: data.latitude,
          longitude: data.longitude
        });
        if (data.favorites) {
          setFavorites(data.favorites);
        }
      }
    } catch (err: any) {
      const errStr = (err?.message || String(err)).toLowerCase();
      const isNetworkError = errStr.includes('failed to fetch') || errStr.includes('network error') || errStr.includes('load failed') || err?.name === 'TypeError';
      
      if (!isNetworkError) { 
        console.error('Error fetching user profile:', err); 
      }
      
      if (isNetworkError && retries > 0) {
        console.log(`Retrying fetchUserProfile... (${retries} retries left)`);
        setTimeout(() => fetchUserProfile(userId, retries - 1), 3000);
      } else if (isNetworkError) {
        console.warn('Network Error: Could not reach Supabase for profile fetch.');
        setIsOnline(false);
      }
    }
  }, []);

  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    await runWithProcessing(async () => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled', 
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      setNotification({ message: 'Order cancelled successfully', type: 'info' });
    });
  }, [runWithProcessing, setNotification]);

  const handleUpdateProfile = async (data: any, showSuccess: boolean = true, successCallback?: () => void) => {
    const updated = { ...userProfile, ...data };
    setUserProfile(updated);
    
    if (session?.user?.id) {
      const action = async () => {
        const payload: any = {
          user_id: session.user.id,
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          city: updated.city,
          address: updated.address,
          country: updated.country,
          role: updated.role,
          photo_url: updated.photoURL,
          language: updated.language || 'en',
          updated_at: new Date().toISOString()
        };

        // Only include location if available and likely to be in schema
        if (updated.latitude !== undefined && updated.longitude !== undefined) {
          payload.latitude = updated.latitude;
          payload.longitude = updated.longitude;
        }

        const { error } = await supabase.from('profiles').upsert(payload);
        
        if (error) {
          // If columns are missing, try one more time without them
          if (error.code === 'PGRST204' || error.message?.includes('column')) {
            console.warn('Profiles table missing columns, retrying without location/extended fields');
            const safePayload = {
              user_id: session.user.id,
              fullName: updated.fullName,
              email: updated.email,
              phone: updated.phone,
              updated_at: new Date().toISOString()
            };
            const { error: retryError } = await supabase.from('profiles').upsert(safePayload);
            if (retryError) throw retryError;
            return;
          }
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
          if (successCallback) successCallback();
        } catch (err: any) {
          setNotification({ message: 'Error saving profile: ' + err.message, type: 'error' });
        }
      }
    }
  };

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
            const lastKnownVersion = safeLocalStorageGet('last_known_version', null);
            if (lastKnownVersion && lastKnownVersion !== mData.version) {
              setIsUpdateAvailable(true);
            }
            safeLocalStorageSet('last_known_version', mData.version);
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
              const title = `Store Update`;
              let message = `Your order from ${shop?.name || 'the shop'} is now ${newStatus}.`;
              
              if (newStatus === 'preparing') message = `Chef at ${shop?.name} is preparing your food! 🍳`;
              if (newStatus === 'ready') message = `🔥 Your order from ${shop?.name} is READY for collection!`;
              if (newStatus === 'confirmed') message = `${shop?.name} has confirmed your order!`;
              if (newStatus === 'completed') message = `Legendary! You've collected your order from ${shop?.name}. Enjoy! 😋`;
              
              // Special handling for "ready" status - High visibility UI
              if (newStatus === 'ready') {
                const isDelivery = payload.new.is_delivery;
                toast.success(`🔥 YOUR ORDER IS READY!`, {
                  description: isDelivery 
                    ? `Order from ${shop?.name} is ready for the driver! 🚚` 
                    : `Run! ${shop?.name} has your order ready for pickup! 🏃‍♂️`,
                  duration: 10000,
                  position: 'top-center',
                  style: {
                    background: '#059669', // Emerald 600
                    color: '#ffffff',
                    border: '4px solid #10b981',
                    borderRadius: '28px',
                    padding: '20px',
                    fontSize: '18px',
                    fontWeight: '900',
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                    textTransform: 'uppercase'
                  }
                });

                // Audio Alert - Using a more distinct built-in beep pattern if possible or the existing playNotificationSound
                if (typeof window !== 'undefined') {
                  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const oscillator = audioCtx.createOscillator();
                  const gainNode = audioCtx.createGain();
                  
                  oscillator.type = 'sine';
                  oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                  
                  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                  gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioCtx.destination);
                  
                  oscillator.start();
                  oscillator.stop(audioCtx.currentTime + 1);
                }

                // Haptic Pulse (Double vibration)
                if (navigator.vibrate) {
                  navigator.vibrate([100, 50, 100, 50, 200]);
                }
              }

              // Trigger browser notification if permission granted
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(title, { body: message, icon: shop?.logo });
              }

              // Show prominent temporary notification (toast)
              setNotification({ 
                message: message, 
                type: newStatus === 'cancelled' ? 'error' : (newStatus === 'ready' || newStatus === 'completed' ? 'success' : 'info')
              });

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

                setNotification({
                  message: `✅ ${message}`,
                  type: 'ready',
                  persistent: true,
                  actions: [
                    { label: 'Track Order', onClick: () => setCurrentScreen('order-tracking') },
                    { label: 'Dismiss', onClick: () => {} }
                  ]
                });
              } else {
                setNotification({
                  message: `✅ ${message}`,
                  type: 'success',
                  actions: [
                    { label: 'Track Order', onClick: () => setCurrentScreen('order-tracking') }
                  ]
                });
              }

              if (newStatus === 'completed') {
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


  useEffect(() => {
    // Sync favorites to profiles table if session exists (Storage is managed by top hook)
    if (session?.user?.id) {
      const syncFavorites = async () => {
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ favorites })
            .eq('user_id', session.user.id);
          
          if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
             console.warn('Profiles table missing favorites column, skipping sync');
             return;
          }
        } catch (err) {
          console.error('Error syncing favorites:', err);
        }
      };
      syncFavorites();
    }
  }, [favorites, session]);

  const toggleFavorite = useCallback(async (shopId: string) => {
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
  }, [session, favorites, currentScreen, showAlert, shops, userProfile.fullName, triggerHaptic, setFavorites, setPreviousScreen, setCurrentScreen]);

  useEffect(() => {
    // Handle review reminder timer only (Storage is managed by top hook)
    if (pendingReview && pendingReview.nextReminder) {
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
  }, [pendingReview]);
    
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
          // Low-overhead info log when sandbox or device doesn't expose precise hardware GPS
          console.info('Using default coordinates fallback:', error.message);
          setUserLocation(DEFAULT_COORDS);
        },
        { timeout: 5000, enableHighAccuracy: false, maximumAge: 300000 }
      );
    } else {
      setUserLocation(DEFAULT_COORDS);
    }
  }, []);

  const addToCart = useCallback((item: MenuItem, shopId: string, quantity: number = 1, specialInstructions: string = '', selectedCustomizations: {name: string, price: number}[] = []) => {
    // Check if cart has items from a different shop
    if (cart.length > 0 && cart.some(i => i.shopId !== shopId)) {
      const existingShopName = shops.find(s => s.id === cart[0].shopId)?.name || 'another shop';
      showConfirm(
        "Start New Cart?",
        `You already have items from ${existingShopName} in your cart. Would you like to clear your current cart and start a new one from this shop?`,
        () => {
          triggerHaptic([100, 50, 100]); // Stronger pulse for clear
          setCart([{ ...item, shopId, quantity, specialInstructions, selectedCustomizations }]);
          setNotification({ message: `Started new cart with ${item.name}`, type: 'success' });
          setTimeout(() => setNotification(null), 2000);
        }
      );
      return;
    }

    triggerHaptic([50, 30, 50]); // Premium double-pulse haptic
    setCart(prev => {
      // Find matching item with same ID, instructions, and customizations
      const isSameCustomization = (a: {name: string, price: number}[], b: {name: string, price: number}[]) => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort((x, y) => x.name.localeCompare(y.name));
        const sortedB = [...b].sort((x, y) => x.name.localeCompare(y.name));
        return sortedA.every((val, index) => val.name === sortedB[index].name && val.price === sortedB[index].price);
      };
      
      const existing = prev.find(i => i.id === item.id && i.shopId === shopId && i.specialInstructions === specialInstructions && isSameCustomization(i.selectedCustomizations || [], selectedCustomizations));
      if (existing) {
        return prev.map(i => i.id === item.id && i.shopId === shopId && i.specialInstructions === specialInstructions && isSameCustomization(i.selectedCustomizations || [], selectedCustomizations) ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, shopId, quantity, specialInstructions, selectedCustomizations }];
    });
    setNotification({ message: `Added ${quantity}x ${item.name} to cart`, type: 'success' });
    setTimeout(() => setNotification(null), 2000);
  }, [cart, shops, showConfirm, triggerHaptic, setNotification, setCart]);

  const removeFromCart = useCallback((itemId: string, shopId: string) => {
    triggerHaptic();
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId && i.shopId === shopId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId && i.shopId === shopId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => !(i.id === itemId && i.shopId === shopId));
    });
  }, [triggerHaptic, setCart]);

  const clearCart = useCallback(() => {
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
  }, [showConfirm, triggerHaptic, setCart, setNotification]);

  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    
    // Sync with Supabase if session exists
    if (session?.user?.id) {
      const timer = setTimeout(async () => {
        if (!navigator.onLine) return;
        try {
          const payload: any = {
            user_id: session.user.id,
            fullName: userProfile.fullName,
            email: userProfile.email,
            phone: userProfile.phone,
            city: userProfile.city,
            address: userProfile.address,
            country: userProfile.country,
            role: userProfile.role,
            photo_url: userProfile.photoURL,
            language: userProfile.language || 'en',
            favorites: favorites,
            updated_at: new Date().toISOString()
          };

          if (userProfile.latitude !== undefined && userProfile.longitude !== undefined) {
            payload.latitude = userProfile.latitude;
            payload.longitude = userProfile.longitude;
          }

          const { error } = await supabase.from('profiles').upsert(payload);

          if (error) {
            if (error.message !== 'Failed to fetch') { console.error('Error syncing profile to Supabase:', error); }
            if (error.code === 'PGRST204' || error.message?.includes('column')) {
              // Graceful degradation: sync only essential fields known to exist
              const safePayload = {
                user_id: session.user.id,
                fullName: userProfile.fullName,
                email: userProfile.email,
                phone: userProfile.phone,
                updated_at: new Date().toISOString()
              };
              try {
                await supabase.from('profiles').upsert(safePayload);
              } catch (e) {
                console.warn('Silent failure in safe profile sync fallback');
              }
              
              const colName = error.message.includes("'") ? error.message.split("'")[1] : 'field';
              setNotification({ 
                message: `⚠️ Database syncing new profile fields (like '${colName}'). Wait a few minutes or reload DB schema.`, 
                type: 'info' 
              });
            } else if (error.message === 'Failed to fetch') {
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
        <Toaster position="top-center" expand={true} richColors closeButton />
        
        {/* Global Saving/Success Overlay */}
        <AnimatePresence>
          {processingState !== 'idle' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md"
            >
              <div className="flex flex-col items-center gap-6">
                {processingState === 'saving' ? (
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.5, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40 border-4 border-white dark:border-slate-800"
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
                    {processingState === 'saving' ? 'Processing...' : 'Done!'}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {processingState === 'saving' ? 'Please wait a moment' : 'Changes Saved Successfully'}
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
              className="bg-red-650 dark:bg-red-700 text-white text-xs py-3 px-4 text-center font-black flex items-center justify-center gap-2 z-[250] sticky top-0 shadow-lg border-b border-red-500"
            >
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 animate-bounce" />
                <span className="uppercase tracking-wider">You are offline. Intermittent connection or poor signal.</span>
              </div>
              <button 
                onClick={async () => {
                  triggerHaptic();
                  toast.info("Retrying connection to store servers...");
                  await fetchShopsData();
                }} 
                className="ml-4 bg-white text-red-600 hover:bg-slate-50 px-3 py-1 bg-white text-red-600 font-extrabold text-[10px] rounded-full transition-all active:scale-95 shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                Retry Connection
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

        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="h-full w-full"
          >
            {currentScreen === 'splash' && (
          <SplashScreen 
            onNext={() => setCurrentScreen('signup')} 
            onLogin={() => setCurrentScreen('login')} 
            onGuestBrowse={() => setCurrentScreen('home')} 
            session={session}
            userProfile={userProfile}
          />
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
            runWithProcessing={runWithProcessing}
          />
        )}
        {currentScreen === 'success' && (
          <SuccessScreen onCompleteProfile={() => setCurrentScreen('complete-profile')} onExplore={() => setCurrentScreen('home')} />
        )}
        {currentScreen === 'complete-profile' && (
          <CompleteProfileScreen 
            userProfile={userProfile}
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            onSave={async (data) => {
              await handleUpdateProfile(data, true, () => {
                setCurrentScreen(previousScreen || 'home');
              });
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
            isOnline={isOnline}
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
            currentScreen={currentScreen}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            userLocation={userLocation}
            onRequestLocation={requestLocation}
            orders={orders}
            showAlert={showAlert}
            appVersion={appVersion}
            triggerHaptic={triggerHaptic}
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
            showAlert={showAlert}
            onBack={() => setCurrentScreen(previousScreen || 'home')}
            triggerHaptic={triggerHaptic}
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
            onSubmit={async (rating, comment, riderRating, riderComment) => {
              try {
                // 1. Save Shop Review
                const { error: shopErr } = await supabase.from('reviews').insert({
                  shop_id: pendingReview.shopId,
                  order_id: pendingReview.orderId,
                  user_name: userProfile.fullName || 'Anonymous',
                  rating,
                  comment,
                  created_at: new Date().toISOString()
                });
                
                if (shopErr) throw shopErr;

                // 2. Save Rider Review if exists
                const { data: order } = await supabase
                  .from('orders')
                  .select('rider_id')
                  .eq('id', pendingReview.orderId)
                  .single();

                if (order?.rider_id && riderRating) {
                  await supabase
                    .from('orders')
                    .update({
                      rider_rating: riderRating,
                      rider_rating_comment: riderComment
                    })
                    .eq('id', pendingReview.orderId);

                  // Update rider profile average rating
                  const { data: rider } = await supabase
                    .from('rider_profiles')
                    .select('rating, rating_count')
                    .eq('id', order.rider_id)
                    .single();

                  if (rider) {
                    const currentRating = rider.rating || 5;
                    const currentCount = rider.rating_count || 0;
                    const newCount = currentCount + 1;
                    const newRating = ((currentRating * currentCount) + riderRating) / newCount;

                    await supabase
                      .from('rider_profiles')
                      .update({
                        rating: Number(newRating.toFixed(1)),
                        rating_count: newCount
                      })
                      .eq('id', order.rider_id);
                  }
                }
                
                showAlert('Feedback Submitted', 'Thank you for helping us improve! 🔥');
              } catch (err) {
                console.error('Error saving review:', err);
                showAlert('Error', 'Failed to save your review.');
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
            setCurrentScreen={setCurrentScreen}
            triggerHaptic={triggerHaptic}
            isOnline={isOnline}
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
            triggerHaptic={triggerHaptic}
            isOnline={isOnline}
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
            isOnline={isOnline}
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
            addToCart={addToCart}
            showAlert={showAlert}
            showConfirm={showConfirm}
            setCurrentScreen={setCurrentScreen}
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
            onRiderDashboard={() => { setPreviousScreen('settings'); setCurrentScreen('rider-dashboard'); }}
            onContactUs={() => { setPreviousScreen('settings'); setCurrentScreen('contact'); }}
            onUpdateProfile={handleUpdateProfile}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => {
              setIsDarkMode(!isDarkMode);
              triggerHaptic(10);
            }}
            setNotification={setNotification}
            showAlert={showAlert}
            showConfirm={showConfirm}
            isOnline={isOnline}
          />
        )}
        {currentScreen === 'admin-orders' && (
          <AdminOrdersScreen 
            shops={shops}
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            showAlert={showAlert}
            showConfirm={showConfirm}
            runWithProcessing={runWithProcessing}
            isOnline={isOnline}
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
            triggerHaptic={triggerHaptic}
            runWithProcessing={runWithProcessing}
            isOnline={isOnline}
          />
        )}
        {currentScreen === 'rider-dashboard' && (
          <RiderDashboardScreen 
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            showAlert={showAlert}
            showConfirm={showConfirm}
            triggerHaptic={triggerHaptic}
            runWithProcessing={runWithProcessing}
            isOnline={isOnline}
          />
        )}
        {currentScreen === 'profile' && (
          <ProfileScreen 
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            onSave={async (data) => {
              await handleUpdateProfile(data, true, () => {
                setCurrentScreen(previousScreen || 'home');
              });
            }} 
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
            triggerHaptic={triggerHaptic}
            isOnline={isOnline}
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
            isOnline={isOnline}
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
            userLocation={userLocation}
            runWithProcessing={runWithProcessing}
            setPreviousScreen={setPreviousScreen}
            setCurrentScreen={setCurrentScreen}
          />
        )}
        {currentScreen === 'order-success' && (
          <OrderSuccessScreen onHome={() => { setCart([]); setCurrentScreen('home'); }} cart={cart} shops={shops} triggerHaptic={triggerHaptic} />
        )}
        {currentScreen === 'order-history' && (
          <OrderHistoryScreen 
            session={session}
            onBack={() => setCurrentScreen(previousScreen || 'profile')} 
            userProfile={userProfile} 
            showAlert={showAlert}
            showConfirm={showConfirm}
            isOnline={isOnline}
            shops={shops}
            addToCart={addToCart}
            setCurrentScreen={setCurrentScreen}
            triggerHaptic={triggerHaptic}
          />
        )}
      </motion.div>
    </AnimatePresence>

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

      <AppHelp />
      {session && <OnboardingTour />}
    </div>
    </AnimatePresence>
    </div>
  );
}

function SplashScreen({ onNext, onLogin, onGuestBrowse, session, userProfile }: { onNext: () => void, onLogin: () => void, onGuestBrowse: () => void, session: any, userProfile: any }) {
  useEffect(() => {
    // Professional welcome chime on launch
    const jingle = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    jingle.volume = 0.3;
    jingle.play().catch(e => console.log("Autoplay prevented:", e));

    // Auto-transition logic for persistent sessions
    const timeout = setTimeout(() => {
      if (session) {
        // If we have a session AND profile data is mostly filled, skip to home
        // Otherwise wait for login
        onGuestBrowse(); // Skip to home for session
      }
    }, 2000); // 2 second brand immersion then skip if auth'd

    return () => clearTimeout(timeout);
  }, [session]);

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
    <main className="relative min-h-screen w-full flex flex-col overflow-hidden font-sans antialiased text-brand-dark bg-white dark:bg-slate-950 dark:text-white">
      {/* Background Image Section */}
      <section className="absolute inset-0 z-0">
        <img
          alt="Delicious South African Kota with chips and toppings"
          className="w-full h-full object-cover grayscale-[10%]"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuALAhJY_048XGlh8sNMGuww7VeuS2h3Og31s-hbNNwHFmTDaxjk8N-NQXrl-aJtTh6qzRJ1a08acjgvkI46WVBuMtsPK4Wb4uvAPENlBULnMLPADN_q4yUJxmWbpJBTvuNUsyCwdim2YO8lT-LWsvOU599-LeSw4NBONUWlIIlCdqU8rAq86Kz8L_9gOUyop73K2Uu4yq_46NeYWOUTqYJ6nS7GFVWqREEiIeSXyxXGJdwVOZwg2y7-MUGLlVI4HTtsM3_a6kMNbA"
          referrerPolicy="no-referrer"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 hero-gradient"></div>
      </section>

      <div className="relative z-10 flex-1 flex flex-col max-w-screen-xl mx-auto w-full">
        {/* Header Content */}
        <header className="w-full px-6 pt-12 flex flex-col items-center sm:items-start">
          <div className="status-bar-spacer"></div>
          <LocalEatsLogo width={220} height={60} showBackground={true} />
        </header>

        {/* Bottom Action Section */}
        <section className="mt-auto w-full px-6 pb-12 bottom-inset max-w-2xl">
          {/* Value Proposition */}
          <div className="mb-8">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Find the legendary <br />
              <span className="text-brand-orange underline decoration-4 underline-offset-8">
                Kota joints
              </span>{" "}
              near you.
            </h2>
            <p className="text-gray-100 mt-4 text-base md:text-lg font-medium opacity-90">
              Fresh ingredients, street-style, delivered fast by our bicycle fleet.
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <motion.button 
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGetStarted}
              className="flex-1 bg-brand-orange text-white py-4 px-8 rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-xl shadow-orange-950/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); onGuestBrowse(); }}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-2xl font-bold transition-all cursor-pointer"
            >
              Explore as Guest
            </motion.button>
          </div>

          {/* Small Footer */}
          <div className="mt-8 flex items-center gap-2">
            <p className="text-white/60 text-sm">Have account already?</p>
            <button
              className="text-white font-bold text-sm hover:text-brand-orange underline underline-offset-4 transition-colors cursor-pointer"
              onClick={handleSignIn}
            >
              Log In
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function SignUpScreen({ onNext, onLogin, setNotification }: { onNext: (data: SignUpData) => void, onLogin: () => void, setNotification: (n: NotificationState) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(formatSAPhone(''));
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !phone) {
      setNotification({ message: 'Please fill in all fields', type: 'error' });
      return;
    }
    
    if (!validateSAPhone(phone)) {
      setNotification({ 
        message: 'Invalid South African phone format. Use +27 XX XXX XXXX', 
        type: 'error' 
      });
      return;
    }

    onNext({ fullName, email, phone });
  };

  return (
    <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-screen-xl mx-auto overflow-x-hidden p-6 md:p-12">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center gap-6">
          <div className="flex items-center justify-center">
            <LocalEatsLogo width={160} height={42} />
          </div>
          <div className="text-center">
            <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-bold leading-tight pb-2">Welcome</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Discover the best local flavors near you.</p>
          </div>
          <div className="w-full">
            <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between mb-6">
              <button onClick={onLogin} className="flex flex-col items-center justify-center border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 pb-[13px] pt-4 flex-1 cursor-pointer">
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">Login</p>
              </button>
              <button className="flex flex-col items-center justify-center border-b-[3px] border-primary text-primary pb-[13px] pt-4 flex-1 cursor-pointer">
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">Sign Up</p>
              </button>
            </div>
            <div className="flex flex-col gap-5">
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
            <div className="relative">
              <Smartphone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={phone}
                onChange={(e) => setPhone(formatSAPhone(e.target.value))}
                className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                placeholder="e.g. +27 71 234 5678" 
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
    <div className="font-display bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
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

function SetupPasswordScreen({ onNext, onBack, signupData, setNotification, runWithProcessing }: { 
  onNext: () => void, 
  onBack: () => void, 
  signupData: SignUpData, 
  setNotification: (n: NotificationState) => void,
  runWithProcessing: (action: () => Promise<void>, successCallback?: () => void) => Promise<void>
}) {
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

    await runWithProcessing(async () => {
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
        const { error: profileError } = await supabase.from('profiles').upsert({
          user_id: data.user.id,
          fullName: signupData.fullName,
          email: signupData.email,
          phone: signupData.phone,
          updated_at: new Date().toISOString()
        });
        if (profileError) throw profileError;
      }
    }, onNext);
  };

  return (
    <div className="font-display bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        <header className="flex items-center p-4 bg-white dark:bg-slate-950 border-b border-primary/10">
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
    <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 antialiased">
      <div className="relative flex h-screen w-full flex-col overflow-x-hidden">
        {/* Top Navigation */}
        <header className="flex items-center justify-between p-4 bg-white dark:bg-slate-950">
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
            Please check your email and <span className="text-primary font-semibold">verify your account</span> to order the best Kotas in your area.
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
  const [phone, setPhone] = useState(formatSAPhone(userProfile.phone));
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [city, setCity] = useState(userProfile.city);
  const [latitude, setLatitude] = useState<number | undefined>(userProfile.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(userProfile.longitude);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!fullName || !phone || !city || !address) {
      setNotification({ message: 'Please fill in all required fields to proceed.', type: 'error' });
      return;
    }
    
    if (!validateSAPhone(phone)) {
      setNotification({ 
        message: 'Invalid South African phone format. Use +27 XX XXX XXXX', 
        type: 'error' 
      });
      return;
    }

    if (!latitude || !longitude) {
      setNotification({ message: 'Please search and select your precise address on the map to provide delivery coordinates.', type: 'error' });
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave({ fullName, phone, city, address, latitude, longitude });
    } finally {
      setIsSaving(false);
    }
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
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col w-full max-w-screen-xl mx-auto overflow-x-hidden pb-24 relative">
        {/* Top App Bar */}
        <div className="flex items-center bg-white dark:bg-slate-950 p-4 pb-2 sticky top-0 z-10 border-b border-primary/10">
          <button onClick={onBack} className="text-primary flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-primary/5 transition-colors cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Complete Your Profile</h2>
        </div>

        {/* Profile Photo Section */}
        <div className="flex p-8 max-w-md mx-auto w-full">
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
                  onChange={(e) => setPhone(formatSAPhone(e.target.value))}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none" 
                  placeholder="e.g. +27 71 234 5678" 
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
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none appearance-none" 
                >
                  {SUPPORTED_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </label>

            <div className="space-y-4">
              <label className="block p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl">
                <span className="block text-orange-900 dark:text-orange-300 text-sm font-bold mb-3 ml-1 flex items-center gap-2">
                  <LocateFixed className="w-4 h-4" />
                  Precise Home Location
                </span>
                
                <div className="space-y-4">
                  <AddressSearch 
                    initialAddress={address}
                    initialCoords={latitude && longitude ? { lat: latitude, lng: longitude } : undefined}
                    onSelect={(data) => {
                      setAddress(data.address);
                      setLatitude(data.lat);
                      setLongitude(data.lng);
                    }}
                  />

                  {latitude && longitude && (
                    <LocationPickerMap 
                      coords={{ lat: latitude, lng: longitude }}
                      onCoordsChange={(c) => {
                        setLatitude(c.lat);
                        setLongitude(c.lng);
                      }}
                    />
                  )}

                  {!latitude && (
                    <div className="text-[10px] text-slate-500 italic bg-white dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      * Search your address to drop a precise pin for the rider.
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-4">
          <input className="rounded text-primary focus:ring-primary border-slate-300 dark:bg-slate-900" id="terms" type="checkbox" defaultChecked/>
          <label className="text-sm text-slate-500 dark:text-slate-400" htmlFor="terms">I agree to the <span className="text-primary font-medium">Terms of Service</span></label>
        </div>
        </div>
        
        {/* Sticky Save Button Container */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-t border-primary/10 max-w-md mx-auto">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary text-white font-black h-16 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:cursor-wait"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Profile...
              </>
            ) : (
              <>
                Save Profile Info
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
}

function LoginScreen({ onLogin, onSignUp, setNotification }: { onLogin: () => void, onSignUp: () => void, setNotification: (n: NotificationState) => void }) {
  const [identifier, setIdentifier] = useState(() => {
    try {
      return localStorage.getItem('remembered_identifier') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return !!localStorage.getItem('remembered_identifier');
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setNotification({ message: `Please enter both email and password`, type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
      if (error) throw error;
      
      try {
        if (rememberMe) {
          localStorage.setItem('remembered_identifier', identifier);
        } else {
          localStorage.removeItem('remembered_identifier');
        }
      } catch (e) {
        console.warn("Credential storage persist error:", e);
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
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-screen-xl mx-auto overflow-x-hidden p-6 md:p-12">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center gap-6">
          {/* Logo Section */}
          <div className="flex items-center justify-center">
            <LocalEatsLogo width={160} height={42} />
          </div>
          {/* Welcome Header */}
          <div className="text-center">
            <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-bold leading-tight pb-2">Welcome Back</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">Log in to order your favorite local meals.</p>
          </div>
          {/* Tabs */}
          <div className="w-full">
            <div className="flex border-b border-slate-200 dark:border-slate-800 justify-between mb-6">
              <button className="flex flex-col items-center justify-center border-b-[3px] border-primary text-primary pb-[13px] pt-4 flex-1 cursor-pointer">
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">Login</p>
              </button>
              <button onClick={onSignUp} className="flex flex-col items-center justify-center border-b-[3px] border-transparent text-slate-500 dark:text-slate-400 pb-[13px] pt-4 flex-1 cursor-pointer">
                <p className="text-sm font-bold leading-normal tracking-[0.015em]">Sign Up</p>
              </button>
            </div>
          
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setNotification({ message: 'Google login coming soon!', type: 'info' })}
                className="flex items-center justify-center gap-3 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-bold text-sm active:scale-95"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-70" alt="Google" />
                <span>Google</span>
              </button>
              <button 
                onClick={() => setNotification({ message: 'Apple login coming soon!', type: 'info' })}
                className="flex items-center justify-center gap-3 py-3.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-bold text-sm active:scale-95"
              >
                <Apple className="w-4 h-4 text-slate-400" />
                <span>Apple</span>
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-5">
          <label className="flex flex-col w-full">
            <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">Email</p>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                placeholder="Enter your email" 
                type="email"
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
  </div>
  );
}

function LoginSuccessScreen({ onHome, onViewProfile, onBack }: { onHome: () => void, onViewProfile: () => void, onBack: () => void }) {
  return (
    <div className="bg-white dark:bg-slate-950 font-display antialiased min-h-screen">
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

interface HorizontalShopCardProps {
  key?: string | number;
  shop: Shop;
  onClick: () => void;
  userLocation: { lat: number; lng: number } | null;
}

const HorizontalShopCard = ({ shop, onClick, userLocation }: HorizontalShopCardProps) => {
  return (
    <motion.div 
      whileHover={shop.isOpen !== false ? { y: -4, scale: 1.01 } : undefined}
      whileTap={shop.isOpen !== false ? { scale: 0.98 } : undefined}
      onClick={shop.isOpen !== false ? onClick : undefined}
      className={`flex flex-col gap-2 shrink-0 w-64 bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-slate-800 transition-all group ${shop.isOpen !== false ? 'cursor-pointer hover:shadow-xl' : 'opacity-60 grayscale-[0.5]'}`}
    >
      <div className="h-36 w-full rounded-2xl overflow-hidden relative">
        <BlurUpImage 
          src={shop.logo || DEFAULT_SHOP_LOGO} 
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
            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 truncate">{shop.distance ? `${shop.distance.toFixed(1)} km` : (shop.address || 'Local')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-bold text-orange-600">{shop.prepTime || '15-20 min'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function HomeScreen({ userProfile, session, shops, loadingShops, fetchError, onSettings, onProfile, onCheckout, onDiscover, onExplore, onOrderHistory, onStoreInfo, onRetry, cart, addToCart, removeFromCart, clearCart, setNotification, setPendingReview, setCurrentScreen, currentScreen, favorites, toggleFavorite, userLocation, onRequestLocation, onNotifications, unreadCount, orders, showAlert, appVersion, triggerHaptic, isOnline }: { userProfile: UserProfile, session: Session | null, shops: Shop[], loadingShops: boolean, fetchError: string | null, onSettings: () => void, onProfile: () => void, onCheckout: () => void, onDiscover: () => void, onExplore: () => void, onOrderHistory: () => void, onStoreInfo: (shopId: string) => void, onRetry: () => void, cart: CartItem[], addToCart: (item: MenuItem, shopId: string, quantity?: number, specialInstructions?: string) => void, removeFromCart: (itemId: string, shopId: string) => void, clearCart: () => void, setNotification: Dispatch<SetStateAction<any>>, setPendingReview: Dispatch<SetStateAction<PendingReview | null>>, setCurrentScreen: Dispatch<SetStateAction<Screen>>, currentScreen: Screen, favorites: string[], toggleFavorite: (shopId: string) => void, userLocation: { lat: number, lng: number } | null, onRequestLocation: () => void, onNotifications: () => void, unreadCount: number, orders: Order[], showAlert: (title: string, message: string) => void, appVersion: string, triggerHaptic: (pattern?: number | number[]) => void, isOnline: boolean }) {
  const { t } = useTranslation();
  const isUpdateAvailable = false;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return shops
      .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map(s => s.name)
      .slice(0, 5);
  }, [shops, searchQuery]);

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'delivered'), [orders]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const categories = useMemo(() => {
    const base = ['All', 'Favorites', 'Nearby'];
    const types = shops.map(s => s.category);
    const cuisines = shops.map(s => s.cuisine_type).filter(Boolean);
    return Array.from(new Set([...base, ...types, ...cuisines] as string[]));
  }, [shops]);

  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      const query = searchQuery.trim().toLowerCase();
      const shopText = `${shop.name} ${shop.description} ${shop.category} ${shop.cuisine_type || ''}`.toLowerCase();
      const matchesSearch = query === '' || query.split(/\s+/).every(term => shopText.includes(term));
      
      let matchesCategory = false;
      if (selectedCategory === 'All') {
        matchesCategory = true;
      } else if (selectedCategory === 'Favorites') {
        matchesCategory = favorites.includes(shop.id);
      } else if (selectedCategory === 'Nearby') {
        matchesCategory = true; // We'll sort these
      } else {
        matchesCategory = shop.category === selectedCategory || shop.cuisine_type === selectedCategory;
      }
      
      const matchesRating = shop.rating >= minRating;
      const matchesOpen = !showOnlyOpen || getShopStatus(shop).isOpen;
      
      return matchesSearch && matchesCategory && matchesRating && matchesOpen;
    });
  }, [shops, searchQuery, selectedCategory, favorites, minRating, showOnlyOpen]);

  const sortedShops = useMemo(() => {
    return [...filteredShops].sort((a, b) => {
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
  }, [filteredShops, userLocation]);

  const recentShops = useMemo(() => {
    const ids = [...new Set(orders.map(o => o.shop_id))].slice(0, 5);
    return ids.map(id => shops.find(s => s.id === id)).filter(Boolean) as Shop[];
  }, [orders, shops]);

  const cartCount = cart.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  const cartTotal = cart.reduce((sum, item) => sum + ((item?.price || 0) * (item?.quantity || 0)), 0);

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
      <div className="bg-[#f8fafc] dark:bg-slate-950 min-h-screen flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
        {/* Top Header Bar Skeleton */}
        <header className="bg-white dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-slate-850">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              {/* Logo block */}
              <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
              {/* Version pill */}
              <div className="h-4 w-8 bg-slate-100 dark:bg-slate-800 rounded relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
            {/* Status indicator line */}
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-200 dark:bg-green-900 animate-pulse"></div>
              <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification trigger skeleton */}
            <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
            {/* Settings trigger skeleton */}
            <div className="h-9 w-9 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
        </header>

        {/* Home Screen Body Skeleton */}
        <main className="p-4 space-y-7 overflow-y-auto max-w-md w-full mx-auto">
          {/* Greeting text blocks */}
          <div className="space-y-2 pt-2">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
            <div className="h-8 w-44 bg-slate-200 dark:bg-slate-800 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>

          {/* Banner Promo Shimmer Template */}
          <div className="relative rounded-[28px] p-5 bg-gradient-to-r from-slate-100 to-slate-250 dark:from-slate-900 dark:to-slate-800 border border-slate-200/50 dark:border-slate-800 overflow-hidden shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]"></div>
            <div className="space-y-3 relative z-10">
              <div className="h-4 w-32 bg-slate-300 dark:bg-slate-700 rounded-full relative overflow-hidden"></div>
              <div className="h-6 w-52 bg-slate-300 dark:bg-slate-700 rounded-lg relative overflow-hidden"></div>
              <div className="h-3.5 w-64 bg-slate-300 dark:bg-slate-700 rounded relative overflow-hidden"></div>
              <div className="pt-2 flex justify-between items-center">
                <div className="h-9 w-28 bg-slate-300 dark:bg-slate-705 rounded-xl"></div>
                <div className="h-7 w-20 bg-slate-300 dark:bg-slate-700 rounded-lg"></div>
              </div>
            </div>
          </div>

          {/* "Order Again" Section Skeleton */}
          <section className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
              <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800/80 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
            {/* Horizontal sliding circular avatars */}
            <div className="flex gap-4 overflow-x-hidden pt-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-shrink-0 w-[110px] flex flex-col items-center space-y-2">
                  <div className="w-[84px] h-[84px] bg-slate-200 dark:bg-slate-800 rounded-[28px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/20 dark:via-slate-700/15 to-transparent -translate-x-full animate-[shimmer_2.2s_infinite]"></div>
                  </div>
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Food Category Chips Slider Skeleton */}
          <section className="space-y-2">
            <div className="flex gap-2 overflow-x-hidden pt-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0 relative overflow-hidden border border-slate-200/40 dark:border-slate-800">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                </div>
              ))}
            </div>
          </section>

          {/* Spaza Listings Skeleton Grid */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-700/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                </div>
                <div className="h-1 w-6 bg-slate-250 dark:bg-slate-800 rounded-full"></div>
              </div>
              <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full relative overflow-hidden"></div>
            </div>

            {/* List with 2 detailed beautiful pulsing cards */}
            <div className="space-y-5">
              {[1, 2].map(i => (
                <div key={i} className="bg-white dark:bg-slate-900/50 p-4 rounded-[32px] border border-slate-100 dark:border-slate-800/80 space-y-4 shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/5 dark:via-slate-800/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"></div>
                  
                  {/* Aspect ratio frame */}
                  <div className="h-40 w-full bg-slate-150 dark:bg-slate-800/80 rounded-[24px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                  </div>

                  {/* Merchant Details Row */}
                  <div className="flex items-start gap-3">
                    {/* Merchant Round Icon */}
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                    {/* Multi line details */}
                    <div className="flex-1 space-y-2.5">
                      <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-lg relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/20 dark:via-slate-700/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                      <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-800 rounded-lg relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/20 dark:via-slate-700/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (shops.length === 0 && !loadingShops) {
    return (
      <div className="bg-white dark:bg-slate-950 h-screen flex flex-col items-center justify-center p-6 text-center">
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
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-orange-200 dark:shadow-none transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans relative shadow-2xl">
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
      <header className="bg-white dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-primary/5">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <LocalEatsLogo width={130} height={34} />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">v{appVersion}</span>
            </div>
            <div className="flex items-center gap-1.5 ml-0.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Serving Local Flavours</p>
            </div>
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
      </div>
    </header>

      <main className="flex-grow flex flex-col p-4 overflow-y-auto max-w-screen-xl mx-auto w-full">
        <div className="mb-8 px-1 pt-2 animate-in fade-in slide-in-from-left-4 duration-700">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{greeting},</p>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
            {userProfile.fullName ? userProfile.fullName.split(' ')[0] : 'Legend'}! 👋
          </h2>
        </div>

        {activeOrders.length > 0 && (
          <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
            <button 
              onClick={() => { triggerHaptic(); setCurrentScreen('order-tracking'); }}
              className="w-full bg-slate-900 dark:bg-orange-600 rounded-[32px] p-4 flex items-center justify-between shadow-xl shadow-slate-200 dark:shadow-none hover:translate-y-[-2px] active:scale-95 transition-all text-white relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center animate-pulse">
                  <Package className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 decoration-white/20 underline decoration-2 underline-offset-4 mb-0.5">Active Order</p>
                  <p className="text-[15px] font-black tracking-tight">{activeOrders.length} order{activeOrders.length > 1 ? 's' : ''} in progress...</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 opacity-60 mr-2" />
            </button>
          </div>
        )}

        {/* Interactive Promotion Banner */}
        <section className="mb-8 animate-in fade-in duration-500">
          <div className="bg-gradient-to-r from-orange-600 to-amber-500 rounded-[28px] p-5 text-white shadow-xl shadow-orange-500/10 relative overflow-hidden group">
            {/* Ambient Accent details */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-750"></div>
            <div className="absolute -left-6 -top-6 w-20 h-20 bg-amber-400/20 rounded-full blur-xl"></div>
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest leading-none">
                  <Tag className="w-3 h-3 text-orange-200" />
                  Winter Discount Live
                </span>
                <h3 className="text-xl font-black mt-2 leading-tight tracking-tight">South African Local Flavours</h3>
                <p className="text-xs text-orange-100 mt-1 max-w-[285px] leading-relaxed">Save 10% on your next Kota! Tap to copy the voucher code instantly.</p>
              </div>
              
              <div className="flex flex-col gap-2 shrink-0">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
                  <div className="pr-1">
                    <p className="text-[8px] font-extrabold text-orange-200 uppercase tracking-widest">PROMO CODE</p>
                    <p className="text-xs font-black tracking-wider uppercase font-mono text-white">LOCALEATS10</p>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("LOCALEATS10");
                      toast.success("Promo Code Copied!", {
                        description: "Use LOCALEATS10 during checkout to secure 10% off your entire meal!"
                      });
                      triggerHaptic(15);
                    }}
                    className="bg-white hover:bg-orange-50 text-orange-600 font-black text-[10px] px-3.5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 shrink-0 uppercase cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <div className="text-[9px] text-white/80 font-bold uppercase tracking-widest text-center">
                  First Time? Use <span className="font-extrabold text-white underline">FIRSTTREAT</span> for R15 off!
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Order Again Carousel */}
        {recentShops.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2 italic">
                Order Again
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
              </h3>
              <button 
                onClick={onOrderHistory}
                className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline px-2 py-1 bg-orange-50 dark:bg-orange-900/10 rounded-lg"
              >
                View History
              </button>
            </div>
            
            <div className="relative">
              <div className="flex overflow-x-auto gap-4 no-scrollbar pb-2 pt-1 touch-pan-x -mx-4 px-4">
                {recentShops.map((shop) => (
                  <motion.div 
                    key={`again-${shop.id}`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onStoreInfo(shop.id)}
                    className="flex-shrink-0 w-[140px] group cursor-pointer"
                  >
                    <div className="relative mb-3">
                      <div className="aspect-square rounded-[32px] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm transition-all group-hover:shadow-md group-hover:border-orange-200 dark:group-hover:border-orange-900/30">
                        <BlurUpImage 
                          src={shop.logo || DEFAULT_SHOP_LOGO} 
                          alt={shop.name} 
                          className="w-full h-full object-cover p-4 bg-slate-50 dark:bg-slate-800/50" 
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-slate-900 rounded-2xl shadow-lg flex items-center justify-center border border-slate-50 dark:border-slate-800">
                        <RotateCcw className="w-4 h-4 text-orange-500" />
                      </div>
                    </div>
                    <h4 className="text-[11px] font-black text-slate-900 dark:text-white truncate uppercase tracking-tight text-center px-1">
                      {shop.name}
                    </h4>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{shop.delivery_eta || '30m'}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SearchSection */}
        <section className="mb-4">
              <div className="relative group/search flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                </div>
                <input 
                  className="block w-full pl-10 pr-12 py-3 border-none bg-white dark:bg-slate-800 rounded-2xl shadow-md ring-1 ring-black/5 dark:ring-white/5 focus:ring-2 focus:ring-orange-500 transition-all text-sm outline-none dark:text-white dark:placeholder:text-slate-500" 
                  placeholder="Search for the best local Kotas..." 
                  type="text"
                  value={searchQuery}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(e.target.value.length > 1);
                  }}
                />
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden">
                    {suggestions.map((s, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setSearchQuery(s);
                          setShowSuggestions(false);
                        }}
                        className="w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-[13px] font-bold border-b border-white/5 last:border-none flex items-center gap-2"
                      >
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <button 
                  onClick={() => setSelectedCategory(selectedCategory === 'Favorites' ? 'All' : 'Favorites')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all cursor-pointer ${selectedCategory === 'Favorites' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-orange-500'}`}
                >
                  <Heart className={`w-5 h-5 ${selectedCategory === 'Favorites' ? 'fill-current' : ''}`} />
                </button>
              </div>
            </section>
        
        {/* Location Display & Manual Fix */}
        <section className="mb-8 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-3 overflow-hidden">
               <div className="size-10 bg-orange-100 dark:bg-orange-500/20 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
                 <MapPin className="w-5 h-5" />
               </div>
               <div className="min-w-0 pr-2">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Delivering To</p>
                 <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">
                   {userProfile.address || (userLocation?.lat === -28.68 ? "Koffiefontein (Default)" : "Current Location")}
                 </p>
               </div>
             </div>
             <div className="flex gap-2 shrink-0">
               <button 
                 onClick={onProfile}
                 className="bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 active:scale-95 transition-all shadow-sm cursor-pointer"
               >
                 Set
               </button>
               <button 
                 onClick={() => {
                   onRequestLocation();
                   triggerHaptic(10);
                   toast.success("Locating Your Position...", {
                     description: "Accessing device GPS to update delivery coordinates."
                   });
                 }}
                 className="size-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-orange-600 hover:border-orange-500 transition-all shadow-sm cursor-pointer"
                 title="GPS Quick Locate"
               >
                 <MapPin className="w-4 h-4 text-orange-500" />
               </button>
             </div>
          </div>
        </section>

            {/* Category Filters */}
            <section className="mb-4 overflow-x-auto no-scrollbar flex flex-col gap-4 pb-2">
              <div className="flex gap-2">
                {categories.map(cat => (
                  <motion.button
                    key={cat}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${selectedCategory === cat ? 'bg-orange-500 text-white shadow-md shadow-orange-600/15' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                  >
                    {cat}
                  </motion.button>
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

            {/* Local Merchants */}
            <section className="mb-24">
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Local Merchants</h3>
                  <div className="h-1 w-8 bg-orange-600 rounded-full"></div>
                </div>
                {loadingShops ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-full border border-amber-100 dark:border-amber-900/40">
                    <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest animate-pulse">Syncing...</span>
                  </div>
                ) : (
                  <span className="text-[9px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1 rounded-full border border-orange-100 dark:border-orange-500/20">{sortedShops.length} Online</span>
                )}
              </div>

              {loadingShops && (
                <div className="mx-1 mb-4 bg-orange-50/70 dark:bg-orange-950/20 border border-orange-100/70 dark:border-orange-900/40 py-3 px-4 rounded-2xl flex items-center justify-between gap-3 text-orange-850 dark:text-orange-400 text-xs font-semibold animate-pulse">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                    <span>Updating Spaza shop inventories and active menus with Supabase...</span>
                  </div>
                  <span className="text-[8px] bg-orange-500 text-white font-black px-1.5 py-0.5 rounded uppercase">Live</span>
                </div>
              )}
              <motion.div 
                layout
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1
                    }
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {sortedShops.map((shop) => (
                  <ShopCard 
                    key={shop.id}
                    shop={shop}
                    isFollowed={favorites.includes(shop.id)}
                    onStoreInfo={onStoreInfo}
                    triggerHaptic={triggerHaptic}
                  />
                ))}
              </motion.div>
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
      <div className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 sticky bottom-0 z-40">
        <nav className="max-w-screen-xl mx-auto px-3 sm:px-6 py-2 pb-6 flex justify-around items-center bg-slate-100 dark:bg-slate-800/80 rounded-[12px] border-[3px] border-indigo-200/30 inset-shadow-sm shadow-inner transition-all transform active:scale-98">
          <button className="flex flex-col items-center gap-1 text-slate-700 dark:text-slate-300 cursor-pointer">
          <div className="p-1 rounded-xl bg-orange-500/10 dark:bg-orange-500/10">
            <Home className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button onClick={onDiscover} className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors cursor-pointer group">
          <div className="p-1 relative">
            <Store className="w-6 h-6 bg-white dark:bg-slate-800 rounded-lg p-0.5 shadow-sm group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[10px] font-bold">Discover</span>
        </button>
        <button onClick={onExplore} className="flex flex-col items-center gap-1 text-gray-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <Compass className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold">Explore</span>
        </button>
          <button 
            onClick={() => {
              if (activeOrders.length > 0) {
                setCurrentScreen('order-tracking');
              } else {
                onOrderHistory();
              }
              triggerHaptic();
            }}
            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${currentScreen === 'order-tracking' || currentScreen === 'order-history' ? 'text-orange-600' : 'text-gray-400 dark:text-slate-500 hover:text-orange-500'}`}
          >
            <div className={`p-1 rounded-xl ${currentScreen === 'order-tracking' || currentScreen === 'order-history' ? 'bg-orange-50 dark:bg-orange-500/10' : ''}`}>
              <ClipboardList className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold">Orders</span>
          </button>
        {userProfile.role === 'shop_owner' && (
          <button onClick={() => { setCurrentScreen('shop-dashboard'); triggerHaptic(); }} className="flex flex-col items-center gap-1 text-gray-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer">
            <div className="p-1">
              <Store className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold">Dashboard</span>
          </button>
        )}
        {userProfile.role === 'rider' && (
          <button onClick={() => { setCurrentScreen('rider-dashboard'); triggerHaptic(); }} className="flex flex-col items-center gap-1 text-gray-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer">
            <div className="p-1">
              <Bike className="w-6 h-6" />
            </div>
            <span className="text-xs font-semibold">Riders</span>
          </button>
        )}
      </nav>
    </div>
  </div>
    );
}

function CheckoutScreen({ userProfile, session, shops, onBack, onConfirm, onIncompleteProfile, cart, setCart, setNotification, showAlert, showConfirm, userLocation, runWithProcessing, setPreviousScreen, setCurrentScreen, isOnline }: { 
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
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => void,
  userLocation: { lat: number, lng: number } | null,
  runWithProcessing: (action: () => Promise<void>, successCallback?: () => void) => Promise<void>,
  setPreviousScreen: (screen: Screen | null) => void,
  setCurrentScreen: (screen: Screen) => void,
  isOnline: boolean
}) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_machine'>('cash');
  const [deliveryType, setDeliveryType] = useState<'collection' | 'delivery'>('collection');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  
  const [userOrderCount, setUserOrderCount] = useState<number>(() => {
    try {
      const cached = localStorage.getItem('cached_orders');
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
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        if (!error && typeof count === 'number') {
          setUserOrderCount(count);
        }
      } catch (e) {
        console.warn("Failed to fetch exact order count", e);
      }
    };
    fetchUserOrderCount();
  }, [session]);
  
  // Recipient details editable inline to prevent block/exit funnel
  const [customerName, setCustomerName] = useState(userProfile.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(userProfile.phone || '');
  const [saveToProfile, setSaveToProfile] = useState(true);

  // Cash change options
  const [cashChangeOption, setCashChangeOption] = useState<'no_change' | 'R50' | 'R100' | 'R200' | 'custom'>('no_change');
  const [customChangeAmount, setCustomChangeAmount] = useState('');

  // Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; type: 'percent' | 'fixed' | 'delivery_free'; value: number } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'checking' | 'valid' | 'already_used' | 'expired' | 'invalid'>('idle');

  // Refactored state objects for precision and spatial data
  const [deliveryAddressText, setDeliveryAddressText] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('delivery_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.address) return parsed.address;
      }
    } catch (e) {
      console.warn("Error parsing cached delivery address:", e);
    }
    return userProfile.address || '';
  });
  
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<{ type: "Point", coordinates: [number, number] } | null>(() => {
    try {
      const cached = localStorage.getItem('delivery_location');
      if (cached) {
        const data = JSON.parse(cached);
        if (data && typeof data.lng === 'number' && typeof data.lat === 'number') {
          return { type: "Point", coordinates: [Number(data.lng.toFixed(6)), Number(data.lat.toFixed(6))] };
        }
      }
    } catch (e) {
      console.warn("Error parsing cached delivery coordinates:", e);
    }
    if (userLocation) {
      return { type: "Point", coordinates: [Number(userLocation.lng.toFixed(6)), Number(userLocation.lat.toFixed(6))] };
    }
    if (userProfile.latitude && userProfile.longitude) {
      return { type: "Point", coordinates: [Number(userProfile.longitude.toFixed(6)), Number(userProfile.latitude.toFixed(6))] };
    }
    return null;
  });

  // Enforce spatial authority and precision validation via visual map pin confirmation
  const [isLocationConfirmed, setIsLocationConfirmed] = useState<boolean>(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(5.00);
  
  const ZONE_A_LIMIT = 3.0;
  const ZONE_B_LIMIT = 6.0;
  const ZONE_A_FEE = 5.00;
  const ZONE_B_FEE = 10.00;

  useEffect(() => {
    if (!deliveryCoordinates && userLocation && deliveryType === 'delivery') {
      setDeliveryCoordinates({
        type: "Point",
        coordinates: [Number(userLocation.lng.toFixed(6)), Number(userLocation.lat.toFixed(6))]
      });
      setDeliveryAddressText('Current Location (GPS)');
      setIsLocationConfirmed(false);
    }
  }, [userLocation, deliveryType, deliveryCoordinates]);

  const primaryShopId = cart.length > 0 ? cart[0].shopId : (shops[0]?.id || '');
  const primaryShop = shops.find(s => s.id === primaryShopId) || shops[0];

  const [hasInHouseRiderOnline, setHasInHouseRiderOnline] = useState(false);

  useEffect(() => {
    const checkInHouseRiders = async () => {
      if (!primaryShop?.id) return;
      try {
        const { data, error } = await (supabase as any)
          .from('rider_profiles')
          .select('id')
          .eq('is_online', true)
          .eq('shop_id', primaryShop.id);
        
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
        primaryShop.longitude
      );
      setDistance(dist);

      // Distance Warnings & Dynamic Pricing
      if (dist > ZONE_B_LIMIT) {
        toast.error("Outside Delivery Range", {
          description: `Store is ${dist.toFixed(1)}km away. We only deliver within ${ZONE_B_LIMIT}km.`,
          duration: 5000,
          position: 'top-center',
        });
        setDeliveryFee(0); // Effectively disabled
      } else if (dist > ZONE_A_LIMIT) {
        toast.warning("Entering +R5 Delivery Zone", {
          description: "A small distance surcharge applies to this delivery.",
          duration: 3000,
          position: 'top-center',
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
          safeLocalStorageSet('cart', JSON.stringify(newCart));
          toast.success("Item removed from cart");
          if (newCart.length === 0) {
            onBack();
          }
        }
      );
    } else {
      const newCart = cart.map((c, i) => i === idx ? { ...c, quantity: newQty } : c);
      setCart(newCart);
      safeLocalStorageSet('cart', JSON.stringify(newCart));
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
        safeLocalStorageSet('cart', JSON.stringify(newCart));
        toast.success("Item removed");
        if (newCart.length === 0) {
          onBack();
        }
      }
    );
  };

  // Promo Code Validation
  const handleApplyPromo = async (overrideCode?: string) => {
    setPromoError('');
    setPromoStatus('checking');
    const rawCode = overrideCode || promoCodeInput;
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setPromoStatus('idle');
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
      setPromoError(`You have already redeemed the promo code "${code}" previously!`);
      setPromoStatus('already_used');
      setAppliedPromo(null);
      return;
    }

    // 2. Query DB / Local fallback configurations
    let dbCodeInfo = null;
    let fallbackToLocal = false;

    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .eq('code', code)
          .single();
        
        if (error) {
          fallbackToLocal = true;
        } else if (data) {
          dbCodeInfo = data;
        } else {
          fallbackToLocal = true;
        }
      } catch (err) {
        console.warn("Exception checking promo_codes table, falling back to local:", err);
        fallbackToLocal = true;
      }
    } else {
      fallbackToLocal = true;
    }

    if (fallbackToLocal) {
      dbCodeInfo = LOCAL_PROMO_DB[code] || null;
    }

    if (!dbCodeInfo) {
      setPromoError('Invalid coupon code. Try LOCALEATS10 or FIRSTTREAT!');
      setPromoStatus('invalid');
      setAppliedPromo(null);
      return;
    }

    // Checking 'expired'
    const expiry = dbCodeInfo.expiry_date ? new Date(dbCodeInfo.expiry_date) : null;
    const now = new Date();
    if (expiry && now > expiry) {
      setPromoError(`The promo code "${code}" expired on ${expiry.toLocaleDateString()}!`);
      setPromoStatus('expired');
      setAppliedPromo(null);
      return;
    }

    // 3. Server-side check: Check if the promo code has already been used by the current user ID in 'orders' table
    if (session?.user?.id && isOnline) {
      try {
        const { data: existingOrders, error } = await supabase
          .from('orders')
          .select('delivery_instructions')
          .eq('user_id', session.user.id);
        
        if (existingOrders && !error) {
          const hasUsed = existingOrders.some(o => 
            o.delivery_instructions && o.delivery_instructions.includes(`[PROMO:${code}]`)
          );
          if (hasUsed) {
            // Sync back to local storage
            const updatedLocal = Array.from(new Set([...usedLocal, code]));
            safeLocalStorageSet(usedLocalKey, JSON.stringify(updatedLocal));
            setPromoError(`Our database shows you have already redeemed "${code}" on a previous order!`);
            setPromoStatus('already_used');
            setAppliedPromo(null);
            return;
          }
        }
      } catch (err) {
        console.warn("Error checking order history coupon logs:", err);
      }
    }

    // Valid check
    if (code === 'BICYCLE5' && deliveryType !== 'delivery') {
      setPromoError('This voucher code is only valid for Delivery orders!');
      setPromoStatus('invalid');
      setAppliedPromo(null);
      return;
    }

    // Calculate dynamic discount to preview success in toast
    let tempDiscount = 0;
    if (dbCodeInfo.type === 'percent') {
      tempDiscount = (subtotal * dbCodeInfo.value) / 100;
    } else if (dbCodeInfo.type === 'fixed') {
      tempDiscount = Math.min(subtotal, dbCodeInfo.value);
    } else if (dbCodeInfo.type === 'delivery_free') {
      tempDiscount = Math.min(deliveryFee, dbCodeInfo.value);
    }

    setAppliedPromo({ code, type: dbCodeInfo.type, value: dbCodeInfo.value });
    setPromoStatus('valid');
    toast.success(`Coupon Applied successfully! Saved R${tempDiscount.toFixed(2)}`);
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoStatus('idle');
    setPromoCodeInput('');
    toast.info("Promo code removed");
  };

  // Pricing calculations
  const subtotal = cart.reduce((sum, item) => {
    const customizationsTotal = (item.selectedCustomizations || []).reduce((acc, c) => acc + Number(c.price), 0);
    return sum + ((item.price + customizationsTotal) * item.quantity);
  }, 0);

  // Dynamic promo discounts
  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.type === 'percent') {
      discountAmount = (subtotal * appliedPromo.value) / 100;
    } else if (appliedPromo.type === 'fixed') {
      discountAmount = Math.min(subtotal, appliedPromo.value);
    } else if (appliedPromo.type === 'delivery_free') {
      discountAmount = Math.min(deliveryFee, appliedPromo.value);
    }
  }

  const activeDeliveryFee = deliveryType === 'delivery' ? deliveryFee : 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + activeDeliveryFee);

  const isCashTrustActive = primaryShop ? (
    localStorage.getItem('localeats_cash_trust_' + primaryShop.id) === 'true' || 
    (primaryShop as any).cash_trust_enabled === true || 
    (primaryShop as any).cash_trust_enabled === 'true' ||
    (primaryShop as any).localeats_cash_trust === true || 
    (primaryShop as any).localeats_cash_trust === 'true'
  ) : false;
  const isCoaEligible = isCashTrustActive && (userOrderCount === 0 || totalAmount < 350);
  const isCoaDisabled = isCashTrustActive && (userOrderCount > 0 && totalAmount >= 350);

  useEffect(() => {
    if (isCashTrustActive && userOrderCount === 0 && !isCoaDisabled) {
      setPaymentMethod('cash');
    }
  }, [userOrderCount, isCashTrustActive, isCoaDisabled]);

  useEffect(() => {
    if (isCoaDisabled && paymentMethod === 'cash') {
      setPaymentMethod('card_machine');
    }
  }, [isCoaDisabled, paymentMethod]);
  
  const handleConfirm = async () => {
    if (!isOnline) {
      showAlert('Offline Mode', 'You are currently offline. Please check your internet connection to place your order. 🍗');
      return;
    }

    if (!session) {
      showConfirm(
        'Welcome to LocalEats!',
        'Please sign in or create an account to finish your order and track it live.',
        () => {
          setPreviousScreen('checkout');
          setCurrentScreen('login');
        },
        'Sign In / Up',
        'Maybe Later'
      );
      return;
    }

    // Interactive validations in checkout directly
    if (!customerName.trim()) {
      toast.error('Recipient Name Required', { description: 'Please enter a name for the delivery / collection record.' });
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 9) {
      toast.error('Valid Mobile Number Required', { description: 'Please input a proper mobile number so our riders can call you!' });
      return;
    }

    if (deliveryType === 'delivery') {
      if (!isLocationConfirmed || !deliveryCoordinates) {
        showAlert('Location Confirmation Required', 'Please drag the pin to your exact door and tap "Confirm Location" on the map.');
        return;
      }
      if (distance !== null && distance > ZONE_B_LIMIT) {
        showAlert('Outside Range', `Sorry, this store is ${distance.toFixed(1)}km away. Our delivery range is capped at ${ZONE_B_LIMIT}km.`);
        return;
      }
    }
    
    const status = getShopStatus(primaryShop);
    const isClosed = !status.isOpen;
    
    if (isClosed) {
      showConfirm(
        'Shop Closed',
        `${primaryShop.name} is currently closed. Your order will be attended to when they open at ${status.nextOpeningTime || 'their next opening hour'}. Do you want to proceed?`,
        () => {
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

    // Double check promo code eligibility before submitting order
    if (appliedPromo) {
      const code = appliedPromo.code;
      const usedLocalKey = session?.user?.id 
        ? `used_promo_codes_${session.user.id}` 
        : `used_promo_codes_guest`;
      const usedLocal = safeLocalStorageGet(usedLocalKey, []);
      if (usedLocal.includes(code)) {
        setLoading(false);
        showAlert('Coupon Already Redeemed', `You have already redeemed the promo code "${code}". It is restricted to one use per customer.`);
        setAppliedPromo(null);
        return;
      }

      if (session?.user?.id && isOnline) {
        try {
          const { data: existingOrders, error } = await supabase
            .from('orders')
            .select('delivery_instructions')
            .eq('user_id', session.user.id);
          
          if (existingOrders && !error) {
            const hasUsed = existingOrders.some(o => 
              o.delivery_instructions && o.delivery_instructions.includes(`[PROMO:${code}]`)
            );
            if (hasUsed) {
              const updatedLocal = Array.from(new Set([...usedLocal, code]));
              safeLocalStorageSet(usedLocalKey, JSON.stringify(updatedLocal));
              setLoading(false);
              showAlert('Coupon Already Redeemed', `Our records show you have already redeemed "${code}". Each promo code is restricted to one use per customer.`);
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
          .from('profiles')
          .update({
            full_name: customerName,
            phone: customerPhone,
            ...(deliveryType === 'delivery' ? {
              address: deliveryAddressText,
              latitude: deliveryCoordinates?.coordinates[1],
              longitude: deliveryCoordinates?.coordinates[0]
            } : {})
          })
          .eq('id', session.user.id);
      } catch (err) {
        console.warn("Could not save recipient details back to userProfile database schema:", err);
      }
    }

    let currentLat = deliveryType === 'delivery' ? deliveryCoordinates?.coordinates[1] : null;
    let currentLng = deliveryType === 'delivery' ? deliveryCoordinates?.coordinates[0] : null;

    // Validation Gate: Ensure precise geolocation captured/confirmed
    if (deliveryType === 'delivery' && (!currentLat || !currentLng || !isLocationConfirmed)) {
      setLoading(false);
      setNotification({ message: "Visual Pin Confirmation Required. Please confirm your exact spot on the map.", type: 'error' });
      return;
    }

    // Append cash change details into instructions beautifully for rider dispatcher
    let finalDeliveryInstructions = deliveryInstructions;
    if (paymentMethod === 'cash') {
      const changeStr = cashChangeOption === 'no_change' 
        ? 'No change needed' 
        : cashChangeOption === 'custom' 
          ? `Needs change for R${customChangeAmount}` 
          : `Needs change for ${cashChangeOption}`;
      finalDeliveryInstructions = `${deliveryInstructions ? deliveryInstructions + ' • ' : ''}[CASH CHANGE REQUEST: ${changeStr}]`;
    }

    // Append promo code tagging into delivery instructions for backend once-per-client tracking
    if (appliedPromo) {
      finalDeliveryInstructions = `${finalDeliveryInstructions ? finalDeliveryInstructions + ' • ' : ''}[PROMO:${appliedPromo.code}]`;
    }

    try {
      await runWithProcessing(async () => {
        // Calculate proportional discount per item to persist exact client payments into database
        const discountRatio = subtotal > 0 ? (discountAmount / subtotal) : 0;

        const orderData = cart.map(item => {
          const customizationsString = item.selectedCustomizations?.map(c => `${c.name} (+R${Number(c.price).toFixed(2)})`).join(', ') || '';
          const customizationsTotal = (item.selectedCustomizations || []).reduce((acc, c) => acc + Number(c.price), 0);
          const originalPrice = (item.price + customizationsTotal) * item.quantity;
          const finalItemPrice = Number(Math.max(0, originalPrice - (originalPrice * discountRatio)).toFixed(2));

          const isCOAOrder = isCashTrustActive && paymentMethod === 'cash';

          return {
            user_id: session?.user?.id,
            shop_id: item.shopId,
            customer_name: customerName,
            phone: customerPhone,
            email: userProfile.email,
            city: userProfile.city,
            address: deliveryType === 'delivery' ? deliveryAddressText : userProfile.address,
            country: userProfile.country,
            product_name: item.name,
            product_variant: customizationsString,
            quantity: item.quantity,
            price: finalItemPrice,
            notes: item.specialInstructions || '',
            delivery_instructions: finalDeliveryInstructions,
            status: 'pending',
            payment_method: isCOAOrder ? 'cash_on_arrival' : paymentMethod,
            is_delivery: deliveryType === 'delivery',
            delivery_fee: deliveryType === 'delivery' ? deliveryFee : 0,
            delivery_status: isCOAOrder ? 'finding_rider' : 'none',
            latitude: currentLat,
            longitude: currentLng
          };
        });

        console.log('Submitting order with upgraded details:', orderData);
        const { error } = await supabase.from('orders').insert(orderData).select();
        
        if (error) {
          console.error('Supabase insert error on first attempt:', error);
          if (error.code === 'PGRST204' || error.message?.includes('column')) {
             console.warn('Orders table missing columns, retrying without spatial data');
             const safeOrderData = orderData.map((d: any) => {
                const { latitude, longitude, ...rest } = d;
                return rest;
             });
             const { error: retryError } = await supabase.from('orders').insert(safeOrderData).select();
             if (retryError) throw retryError;
             
             // Pop COA confirmation on retry success
             if (isCashTrustActive && paymentMethod === 'cash') {
               showAlert(
                 "Order Broadcasted!",
                 "Your order is broadcasted! An on-demand rider is being dispatched to retrieve and deliver your fresh order."
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
          }
          throw error;
        }

        // Pop COA confirmation on initial success
        if (isCashTrustActive && paymentMethod === 'cash') {
          showAlert(
            "Order Broadcasted!",
            "Your order is broadcasted! An on-demand rider is being dispatched to retrieve and deliver your fresh order."
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
      }, onConfirm);
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setLoading(false);
      showAlert('Checkout Failed', err.message || 'An unexpected error occurred while placing your order.');
    }
  };

  return (
    <main className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen font-sans">
      <div className="relative flex h-auto w-full max-w-md mx-auto flex-col bg-white dark:bg-slate-900 overflow-x-hidden shadow-2xl pb-16 min-h-screen">
        
        {/* Header Block */}
        <div className="flex items-center bg-white dark:bg-slate-900 px-4 py-4 sticky top-0 z-40 border-b border-slate-100 dark:border-slate-800 backdrop-blur-md">
          <button onClick={onBack} className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-start cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
            <ArrowLeft className="w-6 h-6 mx-auto" />
          </button>
          <div className="flex-1 text-center justify-center">
            <h2 className="text-slate-950 dark:text-white text-base font-black leading-tight tracking-tight uppercase">Secured Checkout</h2>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Fill details & place food order</p>
          </div>
          <button 
            onClick={() => {
              showConfirm('Clear Cart', 'Do you want to clear all items and start fresh?', () => {
                setCart([]);
                safeLocalStorageSet('cart', JSON.stringify([]));
                onBack();
              });
            }}
            className="text-red-500 font-black flex items-center gap-1 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer text-xs uppercase"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>

        <div className="flex flex-col gap-6 p-4">

          {/* SECTION 1: Fulfillment Type (Moved to the Top for Perfect User Flow Context) */}
          <section className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3.5 px-1">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-orange-500" />
                 Fulfill Order via
              </h3>
              {distance !== null && deliveryType === 'delivery' && (
                <div className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                  distance > ZONE_B_LIMIT ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' : 
                  distance > ZONE_A_LIMIT ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                  'bg-green-100 text-green-700 border-green-200'
                }`}>
                  {distance.toFixed(1)}km away {distance > ZONE_B_LIMIT && '• Out of Range'}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setDeliveryType('collection')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  deliveryType === 'collection' 
                    ? 'border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-black shadow-sm' 
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShoppingBasket className="w-6 h-6 shrink-0" />
                <div className="text-center">
                  <p className="text-xs font-bold leading-none mb-0.5">Counter Pickup</p>
                  <p className="text-[9px] font-medium opacity-80">R0.00 Delivery Fee</p>
                </div>
              </button>

              <button 
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  deliveryType === 'delivery' 
                    ? 'border-orange-500 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-black shadow-sm' 
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                <div className="relative">
                  <Navigation className="w-5 h-5 shrink-0 rotate-45" />
                  {distance !== null && distance > ZONE_B_LIMIT && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-black px-1 rounded-full animate-bounce">!</span>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold leading-none mb-0.5">Bicycle Delivery</p>
                  <p className="text-[9px] font-medium opacity-80">
                    {distance !== null && distance > ZONE_A_LIMIT ? `Zone B: +R10.00` : `Zone A: +R5.00`}
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* SECTION 2: Shipment/Delivery Inputs or Merchant Pickup Info */}
          {deliveryType === 'delivery' ? (
            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Choose Delivery Spot</span>
                {userLocation && (
                  <div className="flex items-center gap-1 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-500/20">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-[8px] font-black text-green-600 uppercase tracking-wider">Live Position Lock</span>
                  </div>
                )}
              </div>
              
              <AddressSearch 
                initialAddress={deliveryAddressText}
                initialCoords={deliveryCoordinates ? { lat: deliveryCoordinates.coordinates[1], lng: deliveryCoordinates.coordinates[0] } : undefined}
                shopCoords={primaryShop.latitude && primaryShop.longitude ? { lat: primaryShop.latitude, lng: primaryShop.longitude } : undefined}
                onSelect={(data) => {
                  setDeliveryAddressText(data.address);
                  setDeliveryCoordinates({ 
                    type: "Point", 
                    coordinates: [Number(data.lng.toFixed(6)), Number(data.lat.toFixed(6))] 
                  });
                  // Reset location confirmation to force visual pin check on the map below
                  setIsLocationConfirmed(false);
                  safeLocalStorageSet('delivery_location', JSON.stringify(data));
                  toast.info("Address loaded! Please confirm your exact pin location on the map below.");
                }} 
              />

              <div className="space-y-1 mt-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rider Drop-off Instructions</label>
                <textarea
                  placeholder="e.g., Green gate next to the Spaza, or 3rd building flat B."
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-400 dark:text-white resize-none"
                />
              </div>

              {primaryShop && primaryShop.allow_external_riders === false && !hasInHouseRiderOnline && (
                <div className="p-3.5 bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-start gap-2.5">
                  <span className="text-sm shrink-0">🍳</span>
                  <div>
                    <h5 className="font-extrabold text-[9px] text-orange-600 dark:text-orange-400 uppercase tracking-widest">Self-Delivered by Store</h5>
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 font-bold mt-0.5">
                      This food is self-delivered directly by the shop’s internal kitchen staff.
                    </p>
                  </div>
                </div>
              )}

              {deliveryCoordinates && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Pin Precision Control Map</p>
                    {isLocationConfirmed && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-md">
                        <Target className="w-3 h-3 text-green-600" />
                        <span className="text-[9px] font-mono font-bold text-green-600 tracking-tighter">
                          {deliveryCoordinates.coordinates[1].toFixed(6)}, {deliveryCoordinates.coordinates[0].toFixed(6)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <LocationPickerMap 
                      coords={{ lat: deliveryCoordinates.coordinates[1], lng: deliveryCoordinates.coordinates[0] }}
                      onCoordsChange={(c) => {
                        setDeliveryCoordinates({
                          type: "Point",
                          coordinates: [Number(c.lng.toFixed(6)), Number(c.lat.toFixed(6))]
                        });
                        setIsLocationConfirmed(false); // Reset confirmation on drag to force re-confirm
                      }}
                      shopCoords={primaryShop.latitude && primaryShop.longitude ? { lat: primaryShop.latitude, lng: primaryShop.longitude } : undefined}
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
                      onClick={() => setIsLocationConfirmed(true)}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      <span>Confirm Exact Delivery Spot</span>
                    </button>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 p-3 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="text-[10px] font-black text-green-800 dark:text-green-400 uppercase tracking-wider">Location Secured</p>
                      </div>
                      <button type="button" onClick={() => setIsLocationConfirmed(false)} className="text-[10px] font-black text-slate-400 hover:text-orange-600 dark:text-slate-500 dark:hover:text-orange-400 uppercase underline cursor-pointer">Change Pin</button>
                    </div>
                  )}
                  
                  {/* Visual distance range helper badge */}
                  <div className="flex flex-col gap-2">
                    <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800/10 p-3 rounded-2xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-orange-900 dark:text-orange-400">
                        <Bike className="w-4 h-4 text-orange-500" />
                        <span>Distance Map Point: {distance !== null ? `${distance.toFixed(2)}km` : 'Calculating distance...'}</span>
                      </div>
                      {distance !== null && (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          distance > ZONE_B_LIMIT ? 'bg-red-100 text-red-700' :
                          distance > ZONE_A_LIMIT ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {distance > ZONE_B_LIMIT ? 'Limit Exceeded' : distance > ZONE_A_LIMIT ? 'Zone B' : 'Zone A'}
                        </span>
                      )}
                    </div>

                    {distance !== null && distance > ZONE_B_LIMIT && (
                      <div className="bg-rose-50 dark:bg-red-950/20 border border-rose-150 p-3.5 rounded-2xl flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                        <div className="text-left">
                          <p className="text-xs font-black text-rose-700 uppercase tracking-wide">Out of service area</p>
                          <p className="text-[10px] text-rose-500 mt-0.5 leading-relaxed font-semibold">Max range limit is {ZONE_B_LIMIT}km. Adjust your delivery pin closer or switch to Counter Pickup!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 text-primary font-black uppercase tracking-wider text-[10px]">
                <Clock className="w-4 h-4" />
                <span>Pickup From Location</span>
              </div>
              <div className="flex items-stretch gap-3">
                <div className="flex-1 space-y-1">
                  <h4 className="font-black text-slate-900 dark:text-white text-base">{primaryShop.name}</h4>
                  <p className="text-xs text-slate-500 tracking-tight leading-relaxed">{primaryShop.address}</p>
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
                    <BlurUpImage src={primaryShop.logo} alt={primaryShop.name} className="w-full h-full object-cover" blurHash={`https://picsum.photos/seed/${primaryShop.id}/10/10?blur=10`} />
                  </div>
                )}
              </div>

              {/* Simple illustrative pickup Map to help find the shop */}
              {primaryShop.latitude && primaryShop.longitude && (
                <div className="h-40 rounded-2xl overflow-hidden border border-slate-150 mt-3 relative z-0">
                  <MapContainer 
                    center={[primaryShop.latitude, primaryShop.longitude]} 
                    zoom={15} 
                    scrollWheelZoom={false} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[primaryShop.latitude, primaryShop.longitude]}>
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
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Receive Name</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Thabo Mokoena"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-3 text-xs font-bold focus:ring-1 focus:ring-orange-500 outline-none transition-all dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile Number</label>
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
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Save change details to user profile for future checkouts</span>
            </label>
          </section>

          {/* SECTION 4: Interactive Order Summary / Cart Editor */}
          <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-orange-500" />
                Items to Order
              </h3>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                {cart.reduce((s, c) => s + c.quantity, 0)} Items Added
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {cart.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3.5 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 relative group"
                >
                  <div className="size-14 rounded-xl overflow-hidden shrink-0 shadow-sm border bg-white relative">
                    <BlurUpImage src={item.image || DEFAULT_MENU_IMAGE} alt={item.name} className="w-full h-full object-cover" blurHash={`https://picsum.photos/seed/${item.id}/10/10?blur=10`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 dark:text-white text-xs font-black truncate leading-none mb-1">{item.name}</p>
                    
                    {item.selectedCustomizations && item.selectedCustomizations.length > 0 ? (
                      <p className="text-[9px] text-slate-400 leading-tight italic truncate mb-1">
                        + {item.selectedCustomizations.map(c => c.name).join(', ')}
                      </p>
                    ) : null}

                    {item.specialInstructions ? (
                      <p className="text-[9px] text-orange-600 font-bold italic truncate leading-none mb-1">
                        Memo: "{item.specialInstructions}"
                      </p>
                    ) : null}

                    <p className="text-primary font-black text-xs leading-none">
                      R {((item.price + (item.selectedCustomizations || []).reduce((acc, c) => acc + Number(c.price), 0)) * item.quantity).toFixed(2)}
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
                    <span className="text-xs font-black min-w-[14px] text-center text-slate-900 dark:text-white leading-none">{item.quantity}</span>
                    <button 
                      type="button"
                      onClick={() => updateCartQty(idx, 1)}
                      className="text-slate-500 hover:text-orange-600 p-0.5 hover:bg-slate-50 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button 
                    type="button"
                    onClick={() => removeCartItem(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 size-6 rounded-full border border-rose-100 dark:border-rose-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
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
                      if (promoStatus !== 'idle') setPromoStatus('idle');
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
                {promoStatus === 'checking' && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold bg-blue-50 dark:bg-blue-950/25 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/30 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Validating "{promoCodeInput.toUpperCase()}" with Database...</span>
                  </div>
                )}

                {promoStatus === 'already_used' && (
                  <div className="flex flex-col gap-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-100/50 p-3 rounded-2xl text-amber-800 dark:text-amber-400">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">🔒 Database Verified - Already Redeemed</span>
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold ml-6">
                      {promoError} Limit of 1 use per customer.
                    </p>
                  </div>
                )}

                {promoStatus === 'expired' && (
                  <div className="flex flex-col gap-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 p-3 rounded-2xl text-rose-800 dark:text-rose-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">⌛ Database Verified - Campaign Expired</span>
                    </div>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold ml-6">
                      {promoError} This campaign has closed.
                    </p>
                  </div>
                )}

                {promoStatus === 'invalid' && (
                  <div className="flex flex-col gap-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 p-3 rounded-2xl text-rose-800 dark:text-rose-400">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span className="font-extrabold text-[10px] uppercase tracking-wider">✕ Database Checked - Code Invalid</span>
                    </div>
                    <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold ml-6">
                      {promoError} Please check spelling and retry.
                    </p>
                  </div>
                )}

                {/* Popular Promo suggestions as clickable chips */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest pl-1">Voucher campaigns in DB:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      type="button"
                      onClick={() => handleApplyPromo('LOCALEATS10')}
                      className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Gift className="w-3 h-3" />
                      LOCALEATS10 (Active)
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleApplyPromo('FIRSTTREAT')}
                      className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Gift className="w-3 h-3" />
                      FIRSTTREAT (Active)
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleApplyPromo('EXPIRED20')}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/20 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-900/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Clock className="w-3 h-3 text-slate-400" />
                      EXPIRED20 (Expired)
                    </button>
                    {deliveryType === 'delivery' && (
                      <button 
                        type="button"
                        onClick={() => handleApplyPromo('BICYCLE5')}
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
                    <h5 className="font-extrabold text-[10px] text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">✔ VOUCHER APPLIED</h5>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-tight">
                      Code "{appliedPromo.code}" saved R{discountAmount.toFixed(2)}!
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
              <div id="checkout-coa-trust-banner" className="bg-green-500/10 dark:bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/20 p-3.5 rounded-2xl flex items-center gap-3 shadow-inner">
                <span className="text-lg shrink-0">💵</span>
                <p className="text-xs font-black tracking-tight leading-snug">
                  Local COD Supported! Pay cash right at your door with complete peace of mind.
                </p>
              </div>
            )}
            
            <div className="flex flex-col gap-2.5">
              <label 
                className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  isCoaDisabled 
                    ? 'opacity-50 cursor-not-allowed border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20' 
                    : paymentMethod === 'cash' 
                      ? 'border-orange-500 bg-orange-500/5 dark:bg-orange-500/10' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                }`}
                onClick={(e) => {
                  if (isCoaDisabled) {
                    e.preventDefault();
                    toast.info("COA is restricted to first-time shoppers or orders under R350.");
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                    isCoaDisabled 
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' 
                      : paymentMethod === 'cash' 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {isCoaDisabled ? <Shield className="w-4 h-4 text-slate-400" /> : <Banknote className="w-4 h-4" />}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-slate-950 dark:text-white text-sm font-black uppercase tracking-tight">
                        {isCashTrustActive ? "Cash on Arrival (COA)" : `Cash on ${deliveryType === 'delivery' ? 'Delivery' : 'Counter'}`}
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
                        : isCashTrustActive 
                          ? "Pay safely with cash or mobile wallet when rider arrives at your door." 
                          : "Pay cash directly to customer helper"}
                    </p>
                  </div>
                </div>
                <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCoaDisabled ? 'border-slate-200 bg-slate-100 dark:border-slate-800' : paymentMethod === 'cash' ? 'border-orange-500' : 'border-slate-300'}`}>
                  {isCoaDisabled ? (
                    <span className="text-[10px]">🔒</span>
                  ) : (
                    paymentMethod === 'cash' && <div className="size-2.5 bg-orange-500 rounded-full animate-scale-in" />
                  )}
                </div>
                <input 
                  type="radio" 
                  name="payment" 
                  value="cash" 
                  disabled={isCoaDisabled} 
                  checked={paymentMethod === 'cash'} 
                  onChange={() => {
                    if (!isCoaDisabled) {
                      setPaymentMethod('cash');
                    }
                  }} 
                  className="hidden" 
                />
              </label>

              <label className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'card_machine' ? 'border-orange-500 bg-orange-500/5 dark:bg-orange-500/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`size-9 rounded-full flex items-center justify-center ${paymentMethod === 'card_machine' ? 'bg-orange-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-slate-950 dark:text-white text-sm font-black uppercase tracking-tight">Swipe on delivery</p>
                    <p className="text-slate-400 text-[10px] font-bold tracking-tight">Bring portable card tap machine to door</p>
                  </div>
                </div>
                <div className={`size-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'card_machine' ? 'border-orange-500' : 'border-slate-300'}`}>
                  {paymentMethod === 'card_machine' && <div className="size-2.5 bg-orange-500 rounded-full animate-scale-in" />}
                </div>
                <input type="radio" name="payment" value="card_machine" checked={paymentMethod === 'card_machine'} onChange={() => setPaymentMethod('card_machine')} className="hidden" />
              </label>
            </div>

            {/* CASH CHANGE QUICK SELECT CHIPS (Solves the Rider "No Change Available" complaint!) */}
            {paymentMethod === 'cash' && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-2.5 animate-in slide-in-from-top-1.5 duration-300">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Do you need change for cash?</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { val: 'no_change', label: 'No Change' },
                    { val: 'R50', label: 'R50 Notes' },
                    { val: 'R100', label: 'R100 Notes' },
                    { val: 'R200', label: 'R200 Notes' },
                    { val: 'custom', label: 'Custom Note...' }
                  ].map(item => (
                    <button
                      type="button"
                      key={item.val}
                      onClick={() => setCashChangeOption(item.val as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 border ${
                        cashChangeOption === item.val
                          ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {cashChangeOption === 'custom' && (
                  <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200 pt-1">
                    <span className="text-xs font-black text-slate-500 font-mono">R</span>
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

          {/* SECTION 7: Unified Visually Clean Receipt Details */}
          <section className="bg-slate-950 text-slate-100 p-5 rounded-3xl space-y-3 shadow-xl relative overflow-hidden border border-slate-850">
            {/* Real receipt style details */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500"></div>
            
            <div className="flex items-center justify-between border-b border-dashed border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Order Tax Invoice</h4>
                <p className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">LOCAL FOODS CORP • REG SECURED</p>
              </div>
              <QrCode className="w-8 h-8 text-slate-500" />
            </div>

            <div className="space-y-2.5 pt-1.5 text-xs font-bold">
              <div className="flex justify-between items-center text-slate-400">
                <span className="uppercase tracking-wider">Subtotal</span>
                <span className="font-mono">R {subtotal.toFixed(2)}</span>
              </div>
              
              {appliedPromo && (
                <div className="flex justify-between items-center text-emerald-400 bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/30 animate-pulse">
                  <span className="uppercase tracking-wider flex items-center gap-1.5 font-extrabold text-[10px]">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Promo Applied: "{appliedPromo.code}"</span>
                  </span>
                  <span className="font-mono text-xs flex items-center gap-1.5 font-black">
                    <span className="text-[8px] bg-emerald-500 text-slate-950 font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full select-none">Coupon Saved</span>
                    <span>- R {discountAmount.toFixed(2)}</span>
                  </span>
                </div>
              )}

              {deliveryType === 'delivery' && (
                <div className="flex justify-between items-center text-orange-400">
                  <span className="uppercase tracking-wider flex items-center gap-1">
                    <Bike className="w-3.5 h-3.5" />
                    Delivery Fee ({distance !== null && distance > ZONE_A_LIMIT ? 'Zone B' : 'Zone A'})
                  </span>
                  <span className="font-mono">R {deliveryFee.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-800 pt-3 flex justify-between items-center text-slate-100">
                <span className="text-sm font-black uppercase tracking-widest">Grand Total Amount</span>
                <span className="text-2xl font-black font-mono text-orange-500">R {totalAmount.toFixed(2)}</span>
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
              disabled={loading || cart.length === 0 || (deliveryType === 'delivery' && distance !== null && distance > ZONE_B_LIMIT)}
              className={`w-full py-4.5 rounded-2xl font-black shadow-xl uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:scale-100 cursor-pointer ${
                loading || (deliveryType === 'delivery' && distance !== null && distance > ZONE_B_LIMIT)
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-none shadow-none'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30 font-extrabold text-sm'
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5 shrink-0" />
                  {deliveryType === 'delivery' && distance !== null && distance > ZONE_B_LIMIT 
                    ? 'Out of Delivery Range' 
                    : `Confirm & Pay R ${totalAmount.toFixed(2)}`}
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-400 mt-4.5 font-bold uppercase tracking-widest leading-relaxed px-4">
              {deliveryType === 'delivery' 
                ? '📍 Precise bicycle navigation is automatically active' 
                : '⚡ Your fresh food is prepared on demand for pickup'}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function OrderSuccessScreen({ onHome, cart, shops, triggerHaptic }: { onHome: () => void, cart: CartItem[], shops: Shop[], triggerHaptic: (pattern?: number | number[]) => void }) {
  const [showRatePrompt, setShowRatePrompt] = useState(true);

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
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl mx-auto w-full flex flex-col items-center py-12">
        <div className="relative mb-12 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/10 rounded-full scale-150 blur-3xl"></div>
          <div className="relative h-48 w-48 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/5">
            <div className="h-32 w-32 rounded-full bg-primary flex items-center justify-center shadow-2xl shadow-primary/40 animate-in zoom-in duration-500">
              <Check className="w-16 h-16 text-white" strokeWidth={4} />
            </div>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic mb-4">Order Placed!</h1>
        <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl font-medium mb-12 max-w-md mx-auto">
          Your order for <span className="text-primary font-bold">R {totalAmount.toFixed(2)}</span> has been sent to {shopDisplay}.
        </p>

        <div className="w-full max-w-screen-md grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-left flex items-start gap-5">
            <div className="size-16 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-black text-orange-600 uppercase tracking-widest mb-1">Time Estimate</p>
              <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">Ready in 15-20 mins</p>
              <p className="text-slate-500 text-sm mt-1 uppercase font-black text-[10px] tracking-tighter">Status: Preparing Now</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-left flex items-start gap-5">
            <div className="size-16 bg-green-600/10 rounded-2xl flex items-center justify-center text-green-600 shrink-0">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-black text-green-600 uppercase tracking-widest mb-1">Order Status</p>
              <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight">Sent to Merchant</p>
              <p className="text-slate-500 text-sm mt-1 uppercase font-black text-[10px] tracking-tighter">Tracking ID: #{Math.floor(1000 + Math.random() * 9000)}</p>
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
              className="w-full max-w-md bg-[#221610] text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden mb-12 border border-white/5"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setShowRatePrompt(false)} className="text-white/20 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-6 relative z-10">
                <div className="size-20 bg-orange-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-600/30 rotate-3">
                  <Star className="w-10 h-10 text-white fill-current" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black uppercase tracking-tight italic mb-2">Love LocalEats?</h3>
                  <p className="text-white/60 text-sm font-medium leading-relaxed px-4">Your support helps local merchants thrive. Rate us on the App Store!</p>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} className="text-orange-500 hover:scale-110 active:scale-95 transition-transform" onClick={() => triggerHaptic(10)}>
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => {
                    triggerHaptic(50);
                    window.open('https://apps.apple.com', '_blank');
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
          className="w-full max-w-sm py-5 bg-slate-900 dark:bg-orange-600 text-white font-black uppercase tracking-[0.2em] rounded-3xl shadow-2xl active:scale-95 transition-all mb-4 flex items-center justify-center gap-3"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </motion.button>
      </div>
    </div>
  );
}

function DiscoverScreen({ shops, onHome, onExplore, favorites, toggleFavorite, onSelectShop, userLocation, showAlert, setCurrentScreen, triggerHaptic, isOnline }: { 
  shops: Shop[], 
  onHome: () => void, 
  onExplore: () => void, 
  favorites: string[], 
  toggleFavorite: (shopId: string) => void, 
  onSelectShop: (shopId: string) => void, 
  userLocation: { lat: number, lng: number } | null,
  showAlert: (title: string, message: string) => void,
  setCurrentScreen: (screen: Screen) => void,
  triggerHaptic: (pattern?: number | number[]) => void,
  isOnline: boolean
}) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [minRating, setMinRating] = useState(0);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  const categories = ['All', 'Favorites', 'Nearby', ...new Set(shops.map(s => s.category))];
  
  const filteredShops = shops.filter(shop => {
    const query = searchQuery.trim().toLowerCase();
    const shopText = `${shop.name} ${shop.description} ${shop.category}`.toLowerCase();
    const matchesSearch = query === '' || query.split(/\s+/).every(term => shopText.includes(term));
    
    let matchesCategory = false;
    if (selectedCategory === 'All' || selectedCategory === 'Nearby') {
      matchesCategory = true;
    } else if (selectedCategory === 'Favorites') {
      matchesCategory = favorites.includes(shop.id);
    } else {
      matchesCategory = shop.category === selectedCategory;
    }
    
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
    <div className="bg-[#f6f6f9] dark:bg-slate-950 text-[#2d2f31] dark:text-slate-100 min-h-screen flex flex-col font-sans relative shadow-2xl">
      {/* TopAppBar */}
      <header className="bg-[#f6f6f9] dark:bg-slate-900 w-full top-0 sticky z-40 transition-opacity duration-200">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-screen-xl mx-auto">
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
      
      <main className="pb-32 flex-grow overflow-y-auto max-w-screen-xl mx-auto w-full">
        {/* Search & Hero */}
        <section className="px-6 pt-4 pb-8 bg-[#f6f6f9] dark:bg-slate-950">
          <div className="mb-6">
            <h2 className="font-['Plus_Jakarta_Sans'] text-3xl font-extrabold tracking-tight text-[#2d2f31] dark:text-white mb-2">Local Flavor</h2>
            <p className="text-[#5a5c5e] dark:text-slate-400 text-lg">Discover the finest local Kota spots.</p>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#5a5c5e] dark:text-slate-500">
              <Search className="w-5 h-5" />
            </div>
            <input 
              className="w-full h-14 pl-12 pr-4 bg-[#ffffff] dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-[0_8px_32px_rgba(45,47,49,0.04)] text-[#2d2f31] dark:text-white placeholder:text-[#757779] dark:placeholder:text-slate-500 outline-none transition-all" 
              placeholder="Search stores nearby..." 
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
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-500/10' 
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
          <section className="px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedShops.map(shop => {
              const isFollowing = favorites.includes(shop.id);
              const status = getShopStatus(shop);
              return (
                <div 
                  key={shop.id} 
                  onClick={() => onSelectShop(shop.id)}
                  className="group bg-[#ffffff] dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_12px_36px_rgba(45,47,49,0.06)] dark:shadow-none hover:shadow-[0_16px_48px_rgba(251,146,60,0.1)] transition-all duration-350 hover:-translate-y-1.5 border border-slate-100/60 dark:border-slate-800/60 cursor-pointer flex flex-col h-full"
                >
                  <div className="h-52 relative overflow-hidden">
                    <BlurUpImage 
                      src={shop.logo || DEFAULT_SHOP_LOGO} 
                      alt={shop.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
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
                            description: "You'll receive exclusive voucher promos from this store."
                          });
                        }
                      }}
                      className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/95 backdrop-blur-md size-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 hover:scale-110 transition-all z-10 cursor-pointer text-slate-400 hover:text-rose-500 border border-slate-50 dark:border-slate-800"
                    >
                      <Heart className={`w-4 h-4 transition-transform duration-300 ${isFollowing ? 'text-rose-500 fill-rose-500 scale-110' : ''}`} />
                    </button>

                    {/* Highly Visible Rating Tag */}
                    <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center gap-1 shadow-md border border-slate-50 dark:border-slate-850">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-black text-slate-900 dark:text-white">{shop.rating.toFixed(1)}</span>
                    </div>

                    {/* Delivery Method Overlay */}
                    <div className="absolute bottom-4 left-4 bg-orange-600 text-white font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">
                      Speed: {shop.delivery_eta || '20m'}
                    </div>
                  </div>
                  
                  <div className="p-6 flex flex-col flex-grow justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3 gap-3">
                        <div>
                          <h3 className="font-['Plus_Jakarta_Sans'] font-black text-xl text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-orange-600 transition-colors">{shop.name}</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">{shop.address}</p>
                          {!status.isOpen && (
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                              Opens {status.nextOpeningTime || 'Soon'}
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
            })}
            {filteredShops.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="relative mb-6">
                  <div className="size-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                    <Store className="w-12 h-12" />
                  </div>
                  <X className="absolute -top-1 -right-1 w-6 h-6 text-rose-500 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm" />
                </div>
                <h3 className="text-xl font-black text-[#2d2f31] dark:text-white mb-2">No matches found</h3>
                <p className="text-[#5a5c5e] dark:text-slate-400 text-sm max-w-[260px] mx-auto leading-relaxed">
                  We couldn't find any stores matching your criteria. Try adjusting your filters or search query.
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setMinRating(0);
                    setShowOnlyOpen(false);
                  }}
                  className="mt-8 px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </section>
        ) : (
          <section className="px-6 h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            {!isOnline && (
              <div className="absolute inset-0 z-[1001] bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                <WifiOff className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-bold">Map Unavailable Offline</h3>
                <p className="text-sm text-slate-500 max-w-xs">Interactive maps require an active internet connection. Please check your signal.</p>
                <button onClick={() => setViewMode('list')} className="mt-6 px-6 py-2 bg-primary text-white rounded-xl font-bold">View List Instead</button>
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
                  <Marker position={userLocation} icon={userIcon}>
                    <Popup>
                      <p className="font-extrabold text-xs text-blue-600 text-center m-0">Your Spot</p>
                    </Popup>
                  </Marker>
                )}

                {sortedShops.map((shop) => {
                  const sLat = shop.latitude || -25.9964 + (hashString(shop.id) % 10) * 0.005;
                  const sLng = shop.longitude || 28.2268 + (hashString(shop.id) % 10) * 0.005;
                  const dist = userLocation ? calculateDistance(sLat, sLng, userLocation.lat, userLocation.lng) : null;
                  const status = getShopStatus(shop);
                  
                  return (
                    <Marker 
                      key={shop.id} 
                      position={{ lat: sLat, lng: sLng }} 
                      icon={shopIcon}
                    >
                      <Popup minWidth={200}>
                        <div className="p-1">
                          <p className="font-black text-xs text-slate-800 m-0 mb-1">{shop.name}</p>
                          <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">{shop.description}</p>
                          <div className="flex items-center justify-between text-[10px] mb-2.5 border-t pt-1.5 border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-amber-500">★ {shop.rating}</span>
                            {dist !== null && <span className="text-slate-500 font-semibold">{dist.toFixed(1)} km</span>}
                            <span className={`font-extrabold ${status.isOpen ? 'text-green-600' : 'text-slate-400'}`}>
                              {status.isOpen ? 'Open Now' : 'Closed'}
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
                
                <MapRecenter center={[userLocation?.lat || -25.9964, userLocation?.lng || 28.2268]} />
              </MapContainer>
            </div>
            <div className="absolute bottom-6 left-6 right-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 z-[1000] pointer-events-none">
              <p className="text-xs font-black text-slate-900 dark:text-white mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <span className="size-2 bg-orange-500 rounded-full animate-ping"></span>
                Interactive Leaflet Map
              </p>
              <p className="text-[10px] text-slate-500 font-medium">Showing top-rated Spaza Kota shops near you. Click pins to explore OTA menus instantly.</p>
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
                  <BlurUpImage src={shop.logo || DEFAULT_SHOP_LOGO} alt={shop.name} className="w-full h-full" blurHash={`https://picsum.photos/seed/${shop.id}/10/10?blur=10`} />
                </div>
                <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#2d2f31] dark:text-white">{shop.name}</h4>
                <p className="text-[#5a5c5e] dark:text-slate-400 text-sm mb-4 italic">"{shop.description}"</p>
                <button className="px-6 py-2 bg-[#2d2f31] dark:bg-slate-700 text-[#f6f6f9] dark:text-white rounded-full text-sm font-bold cursor-pointer">View Menu</button>
              </div>
            ))}
          </div>
        </section>
      </main>
      
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <nav className="mx-auto w-full max-w-md md:max-w-xl rounded-t-[2rem] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-[0_-8px_32px_rgba(45,47,49,0.06)] pointer-events-auto">
          <div className="flex justify-around items-center px-6 pb-8 pt-4">
          <button onClick={onHome} className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-5 py-2 hover:text-[#FF6B00] transition-colors cursor-pointer">
            <Home className="w-6 h-6 mb-1" />
            <span className="font-['Inter'] text-[11px] font-semibold tracking-wide">{t('home')}</span>
          </button>
          <button className="flex flex-col items-center justify-center text-[#FF6B00] dark:text-[#ff7a2f] bg-[#FF6B00]/10 rounded-full px-5 py-2 transition-transform duration-150 active:scale-96 cursor-pointer">
            <Store className="w-6 h-6 mb-1" />
            <span className="font-['Inter'] text-[11px] font-semibold tracking-wide">{t('discover')}</span>
          </button>
          <button onClick={onExplore} className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-5 py-2 hover:text-[#FF6B00] transition-colors cursor-pointer">
            <Compass className="w-6 h-6 mb-1" />
            <span className="font-['Inter'] text-[11px] font-semibold tracking-wide">{t('explore')}</span>
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
  initialLocation 
}: { 
  value: string, 
  onAddressChange: (val: string) => void, 
  onLocationChange: (lat: number, lng: number) => void,
  initialLocation?: { lat: number, lng: number } | null
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markerPos, setMarkerPos] = useState<{lat: number, lng: number} | null>(initialLocation || null);

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
    setMarkerPos({ lat: s.lat, lng: s.lon });
    onLocationChange(s.lat, s.lon);
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
      >
        <Popup minWidth={90}>
          <span>Delivery point</span>
        </Popup>
      </Marker>
    ) : null;
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search for your street address..."
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:border-primary transition-all outline-none"
        />
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl mt-2 overflow-hidden shadow-2xl z-50">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm border-b border-slate-100 dark:border-slate-800 last:border-none"
              >
                <div className="font-bold truncate">{s.display_name.split(',')[0]}</div>
                <div className="text-[10px] text-slate-400 truncate uppercase tracking-widest">{s.display_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
        <MapContainer 
          center={markerPos || DEFAULT_COORDS} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap coords={markerPos || DEFAULT_COORDS} />
          <DraggableMarker />
        </MapContainer>
        {!markerPos && (
          <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[2px]">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Select an address to see map</p>
          </div>
        )}
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
        📍 Drag the pin to your exact door for perfect deliveries
      </p>
    </div>
  );
}

function ProfileScreen({ onBack, onSave, userProfile, onLogout, setNotification, triggerHaptic, isOnline }: { 
  onBack: () => void, 
  onSave: (data: Partial<UserProfile>) => void, 
  userProfile: UserProfile, 
  onLogout: () => void, 
  setNotification: (n: NotificationState) => void,
  triggerHaptic: (pattern?: number | number[]) => void,
  isOnline: boolean
}) {
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [phone, setPhone] = useState(formatSAPhone(userProfile.phone));
  const [address, setAddress] = useState(userProfile.address || '');
  const [city, setCity] = useState(userProfile.city || '');
  const [latitude, setLatitude] = useState<number | undefined>(userProfile.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(userProfile.longitude);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!isOnline) {
      setNotification({ message: 'No internet connection. Cannot upload photo.', type: 'error' });
      return;
    }
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      const publicUrl = await uploadAvatar(event.target.files[0], userProfile.id);
      onSave({ photoURL: publicUrl });
      setNotification({ message: 'Profile picture updated!', type: 'success' });
      triggerHaptic?.(10);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setNotification({ message: `Error: ${error.message}`, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = () => {
    if (!isOnline) {
      setNotification({ message: 'No internet connection. Cannot save profile changes.', type: 'error' });
      return;
    }
    if (!fullName.trim()) {
      setNotification({ message: 'Name cannot be empty', type: 'error' });
      return;
    }
    onSave({ fullName, phone, address, city, latitude, longitude });
    setNotification({ message: 'Profile updated successfully!', type: 'success' });
    triggerHaptic?.(10);
  };

  return (
    <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-primary/5 sticky top-0 bg-white dark:bg-slate-950 z-10">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold flex-1 text-center pr-10">{t('edit_profile')}</h2>
      </div>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            ref={fileInputRef}
            className="hidden"
          />
          <div className="relative group">
            <div 
              className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center bg-cover bg-center"
              style={{ backgroundImage: userProfile.photoURL ? `url("${userProfile.photoURL}")` : undefined }}
            >
              {!userProfile.photoURL && <User className="w-12 h-12 text-slate-300" />}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-xl shadow-lg border-2 border-white dark:border-slate-800 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">{userProfile.fullName || 'User'}</p>
            <p className="text-xs text-slate-400">{userProfile.email}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Phone Number</label>
            <div className="relative group">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatSAPhone(e.target.value))}
                placeholder="e.g. +27 71 234 5678"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-primary uppercase tracking-widest ml-1">Delivery Address & Pin</label>
            <AddressSearch 
              initialAddress={address}
              initialCoords={latitude && longitude ? { lat: latitude, lng: longitude } : undefined}
              onSelect={(data) => {
                setAddress(data.address);
                setLatitude(data.lat);
                setLongitude(data.lng);
              }}
            />
          </div>

          {/* City */}
          <div className="space-y-2 opacity-60">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">City (Current Service Zone)</label>
            <div className="relative">
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
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address (Primary)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={userProfile.email}
                readOnly
                className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-2xl text-sm cursor-not-allowed outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 ml-1">Email is linked to your account and cannot be changed.</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-8 space-y-4">
          <button 
            onClick={handleUpdateProfile}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>

          <button 
            onClick={onLogout}
            className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold rounded-2xl hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}

const QuantityModal = ({ item, isOpen, onClose, onConfirm }: { item: MenuItem | null, isOpen: boolean, onClose: () => void, onConfirm: (quantity: number, specialInstructions: string, selectedCustomizations: {name: string, price: number}[]) => void }) => {
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [selectedCustomizations, setSelectedCustomizations] = useState<{name: string, price: number}[]>([]);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSpecialInstructions('');
      setSelectedCustomizations([]);
    }
  }, [isOpen]);

  if (!item || !isOpen) return null;

  const basePrice = item.price;
  const customizationsTotal = selectedCustomizations.reduce((sum, c) => sum + Number(c.price), 0);
  const totalPrice = (basePrice + customizationsTotal) * quantity;

  const toggleCustomization = (customization: {name: string, price: number}) => {
    setSelectedCustomizations(prev => {
      const exists = prev.find(c => c.name === customization.name);
      if (exists) {
        return prev.filter(c => c.name !== customization.name);
      } else {
        return [...prev, customization];
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl overflow-y-auto max-h-[90vh] animate-in slide-in-from-bottom-10 duration-500">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 pr-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{item.name}</h3>
            {item.description && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.description}</p>}
            <p className="text-orange-600 font-black text-lg mt-2">{item.displayPrice}</p>
          </div>
          <button onClick={onClose} className="p-2 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col gap-6 py-4">
          {item.customizations && item.customizations.length > 0 && (
            <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Customize Your Order</label>
              <div className="space-y-3">
                {item.customizations.map((customization, idx) => {
                  const isSelected = selectedCustomizations.some(c => c.name === customization.name);
                  return (
                    <label key={idx} className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-slate-300 dark:border-slate-600 group-hover:border-orange-500'}`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{customization.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-500">+ R{Number(customization.price).toFixed(2)}</span>
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
                className="size-16 rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white active:scale-90 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <Minus className="w-8 h-8" />
              </button>
              <span className="text-5xl font-black text-slate-900 dark:text-white min-w-[60px] text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="size-16 rounded-3xl bg-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-600/20 active:scale-90 transition-all cursor-pointer"
              >
                <Plus className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          <button 
            onClick={() => onConfirm(quantity, specialInstructions, selectedCustomizations)}
            className="flex-1 h-16 bg-slate-900 dark:bg-orange-600 text-white font-black rounded-3xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
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
    "name": shop.name,
    "image": shop.logo,
    "servesCuisine": shop.category,
    "description": shop.description,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": shop.address,
      "addressLocality": "Local",
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

const ImageCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="relative w-full h-64 md:h-96 rounded-[32px] overflow-hidden group shadow-2xl">
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
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

function StoreInfoScreen({ onBack, shop, isFavorite, onToggleFavorite, userProfile, session, onSignUp, addToCart, showAlert, showConfirm, setCurrentScreen, isOnline }: { 
  onBack: () => void, 
  shop: Shop, 
  isFavorite: boolean, 
  onToggleFavorite: () => void, 
  userProfile: UserProfile | null, 
  session: Session | null, 
  onSignUp: () => void, 
  addToCart: (item: MenuItem, shopId: string, quantity?: number, specialInstructions?: string, selectedCustomizations?: {name: string, price: number}[]) => void,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  setCurrentScreen: (screen: Screen) => void,
  isOnline: boolean
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
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('All');
  const [collapsedCategories, setCollapsedCategories] = useState<{ [key: string]: boolean }>({});
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const isScrollingRef = useRef(false);
  const [showTrustTooltip, setShowTrustTooltip] = useState(false);
  const [userOrderCount, setUserOrderCount] = useState<number>(() => {
    try {
      const cached = localStorage.getItem('cached_orders');
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
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
        if (!error && typeof count === 'number') {
          setUserOrderCount(count);
        }
      } catch (e) {
        console.warn("Failed to fetch exact order count", e);
      }
    };
    fetchUserOrderCount();
  }, [session]);

  const isCashTrustActive = localStorage.getItem('localeats_cash_trust_' + shop.id) === 'true' || 
    (shop as any).cash_trust_enabled === true || 
    (shop as any).cash_trust_enabled === 'true' ||
    (shop as any).localeats_cash_trust === true || 
    (shop as any).localeats_cash_trust === 'true';

  // Memoized filtered reviews list to avoid unnecessary recalculations
  const filteredReviews = useMemo(() => {
    if (selectedStarFilter === null) return reviews;
    return reviews.filter(r => r.rating === selectedStarFilter);
  }, [reviews, selectedStarFilter]);

  // Determine if the store is open or closed based on current hour
  const getStoreStatus = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const isOpen = currentHour >= 8 && currentHour < 20;
    return {
      isOpen,
      text: isOpen ? 'Open' : 'Closed',
      hours: '08:00 - 20:00',
      closingText: isOpen ? 'Closes at 20:00' : 'Opens at 08:00'
    };
  };

  const storeStatus = getStoreStatus();

  const filteredMenu = shop.menu.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group filteredMenu by category
  const groupedMenu = useMemo(() => {
    const groups: { [key: string]: MenuItem[] } = {};
    
    filteredMenu.forEach(item => {
      const cat = (item.category || "Main Course").trim();
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });
    
    return groups;
  }, [filteredMenu]);

  // Extract unique visible categories
  const visibleCategories = useMemo(() => {
    const categoriesWithItems = Object.keys(groupedMenu);
    if (categoriesWithItems.length > 0) {
      return ['All', ...categoriesWithItems];
    }
    return [];
  }, [groupedMenu]);

  // Map category keywords to premium food emojis
  const getCategoryEmoji = (category: string) => {
    const catLower = category.toLowerCase();
    if (catLower.includes('egg') || catLower.includes('breakfast')) return '🍳';
    if (catLower.includes('bread') || catLower.includes('toast')) return '🍞';
    if (catLower.includes('sandwich') || catLower.includes('burger') || catLower.includes('sub')) return '🥪';
    if (catLower.includes('beverage') || catLower.includes('drink') || catLower.includes('coffee') || catLower.includes('juice')) return '🥤';
    if (catLower.includes('dessert') || catLower.includes('sweet') || catLower.includes('cake')) return '🍰';
    if (catLower.includes('pizza')) return '🍕';
    if (catLower.includes('salad') || catLower.includes('healthy')) return '🥗';
    if (catLower.includes('chicken') || catLower.includes('wing') || catLower.includes('meat')) return '🍗';
    if (catLower.includes('pasta') || catLower.includes('noodle')) return '🍝';
    if (catLower.includes('traditional') || catLower.includes('local') || catLower.includes('kota')) return '🇿🇦';
    return '🍽️';
  };

  const handleCategoryClick = (category: string) => {
    isScrollingRef.current = true;
    setSelectedMenuCategory(category);
    if ("vibrate" in navigator) navigator.vibrate(5);
    
    if (category === 'All') {
      const topElement = document.getElementById('store-menu-search');
      if (topElement) {
        topElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      const element = document.getElementById(`category-sec-${category.replace(/\s+/g, '-')}`);
      if (element) {
        const yOffset = -180; // Offset perfectly accommodates sticky top bar heights and padding
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 850);
  };

  // Center selected active button in the horizontally scrolling category tab bar
  useEffect(() => {
    const activeBtn = document.getElementById(`cat-btn-${selectedMenuCategory.replace(/\s+/g, '-')}`);
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [selectedMenuCategory]);

  // Handle window scroll-to-bottom fallback to highlight the last category
  useEffect(() => {
    if (activeTab !== 'menu' || visibleCategories.length <= 2) return;

    const handleWindowScroll = () => {
      if (isScrollingRef.current) return;
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 30) {
        const categoriesWithItems = visibleCategories.filter(c => c !== 'All');
        if (categoriesWithItems.length > 0) {
          setSelectedMenuCategory(categoriesWithItems[categoriesWithItems.length - 1]);
        }
      }
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [activeTab, visibleCategories]);

  // Automatically update selected category highlighting on scroll
  useEffect(() => {
    if (activeTab !== 'menu' || visibleCategories.length <= 1) return;
    
    const categoryIDs = visibleCategories.filter(c => c !== 'All').map(c => `category-sec-${c.replace(/\s+/g, '-')}`);
    
    const observerOptions = {
      root: null,
      rootMargin: '-140px 0px -55% 0px',
      threshold: 0
    };
    
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (isScrollingRef.current) return;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          const matchingCategory = visibleCategories.find(c => `category-sec-${c.replace(/\s+/g, '-')}` === id);
          if (matchingCategory) {
            setSelectedMenuCategory(matchingCategory);
          }
        }
      });
    };
    
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    categoryIDs.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    
    return () => {
      categoryIDs.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, [activeTab, visibleCategories]);

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

  const handleSubmitReview = async () => {
    if (!isOnline) {
      showAlert('Offline Mode', 'Connectivity is down. We cannot post your review right now. Please try again when back online! 🍻');
      return;
    }
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
    <div className="bg-white dark:bg-slate-950 text-[#221610] dark:text-white antialiased min-h-screen flex flex-col relative shadow-2xl overflow-x-hidden">
      <RestaurantSchema shop={shop} />
      
      {/* Immersive Header with Carousel */}
      <div className="relative h-80 w-full group overflow-hidden">
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
              onClick={() => {
                const shareUrl = `${window.location.origin}${window.location.pathname}?shopId=${shop.id}`;
                if (navigator.share) {
                  navigator.share({ title: shop.name, text: `Check out ${shop.name} on LocalEats!`, url: shareUrl }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(shareUrl);
                  showAlert('Link Copied', 'Link copied to clipboard!');
                }
              }}
              className="p-3 bg-black/30 backdrop-blur-md rounded-2xl text-white hover:bg-black/50 transition-all active:scale-90 cursor-pointer"
            >
              <Share2 className="w-6 h-6" />
            </button>
            <button 
              onClick={onToggleFavorite}
              className="p-3 bg-black/30 backdrop-blur-md rounded-2xl text-white hover:bg-black/50 transition-all active:scale-90 cursor-pointer"
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg">
                {shop.category}
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg flex items-center gap-1 ${storeStatus.isOpen ? 'bg-emerald-600 text-white' : 'bg-rose-700 text-white'}`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-white ${storeStatus.isOpen ? 'animate-pulse' : ''}`} />
                {storeStatus.text}
              </span>
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md text-white text-[10px] font-bold">
                <Clock className="w-3 h-3" />
                {shop.delivery_eta || '30-45 mins'}
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter drop-shadow-2xl">{shop.name}</h1>
            <p className="text-white/80 text-xs font-medium max-w-sm line-clamp-1">{shop.address}</p>
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
          <div className="flex gap-3 mb-4">
            <button 
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`;
                window.open(url, '_blank');
              }}
              className="flex-grow flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </button>
            {shop.phone && (
              <button 
                onClick={() => {
                  const cleanPhone = shop.phone!.replace(/[^0-9]/g, '');
                  const waPhone = cleanPhone.startsWith('0') ? '27' + cleanPhone.substring(1) : cleanPhone;
                  const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi ${shop.name}, I'm interested in ordering from your shop!`)}`;
                  window.open(url, '_blank');
                }}
                className="size-[52px] bg-[#25D366] text-white rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <MessageCircle className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="h-8"></div>

        {/* Verified Trade Trust Banner */}
        {isCashTrustActive && (
          <div id="verified-trade-trust-banner" className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-3 py-2.5 rounded-xl flex items-center gap-2.5 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="text-lg shrink-0">💵</span>
            <div className="flex-1">
              <p className="text-xs font-black tracking-tight leading-normal">
                Pay safely with Cash on Arrival! First-time customer? Pay only when your food is safely in hand.
              </p>
            </div>
          </div>
        )}

        {/* Tab Navigation Buttons */}
        <div className="flex space-x-1 py-1 mb-8 overflow-x-auto no-scrollbar scroll-smooth border-b border-gray-100 dark:border-slate-800">
          {(['menu', 'reviews', 'info'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab 
                  ? 'text-orange-600' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
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
          {activeTab === 'menu' && (
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
                    💵 First-Time Local Trust Active: Cash on Arrival Accepted here! Order with absolute confidence.
                  </span>
                </div>
              )}

              {/* Search Bar */}
              <div id="store-menu-search" className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                <input 
                  type="text" 
                  placeholder={`Search dishes at ${shop.name}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none transition-all focus:ring-2 focus:ring-orange-600/20"
                />
              </div>

              {!session && (
                 <div className="mb-8 p-5 bg-orange-50 dark:bg-orange-950/20 rounded-3xl border border-orange-100 dark:border-orange-900/30 flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-4">
                     <div className="size-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm">
                       <UserPlus className="w-6 h-6" />
                     </div>
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">New Guest</p>
                       <p className="text-sm font-bold dark:text-white">Sign up for rewards</p>
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
                        id={`cat-btn-${category.replace(/\s+/g, '-')}`}
                        onClick={() => handleCategoryClick(category)}
                        className={`rounded-full px-4 py-2 transition-all hover:scale-102 duration-200 text-xs md:text-sm font-label whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-orange-600 text-white font-bold shadow-md shadow-orange-600/20'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
                        }`}
                      >
                        <span className="text-xs md:text-sm">{category === 'All' ? '✨' : getCategoryEmoji(category)}</span>
                        <span>{category}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-8 md:space-y-12 pt-2">
                {visibleCategories.length > 0 ? (
                  visibleCategories
                    .filter((category) => category !== 'All')
                    .map((category) => {
                      const itemsUnderCategory = groupedMenu[category] || [];
                      if (itemsUnderCategory.length === 0) return null;

                      return (
                        <div 
                          key={category} 
                          id={`category-sec-${category.replace(/\s+/g, '-')}`}
                          className="space-y-4 scroll-mt-44"
                        >
                          <div 
                            onClick={() => {
                              setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
                              if ("vibrate" in navigator) navigator.vibrate(5);
                            }}
                            className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 cursor-pointer select-none group/cat"
                          >
                            <h3 className="text-xs md:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2 group-hover/cat:text-orange-600 transition-colors">
                              <span className="text-sm md:text-base">{getCategoryEmoji(category)}</span>
                              <span>{category}</span>
                              <span className="text-[10px] text-slate-400 font-bold normal-case ml-1 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded">
                                {collapsedCategories[category] ? 'Tap to expand' : 'Tap to collapse'}
                              </span>
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-slate-400 px-2 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full">
                                {itemsUnderCategory.length} {itemsUnderCategory.length === 1 ? 'item' : 'items'}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${collapsedCategories[category] ? '' : 'rotate-180'}`} />
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
                                    staggerChildren: 0.05
                                  }
                                }
                              }}
                              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                              {itemsUnderCategory.map((item) => (
                                <MenuItemCard 
                                  key={item.id}
                                  item={item}
                                  shop={shop}
                                  onSelect={(item) => setSelectedItemForQuantity(item)}
                                  showAlert={showAlert}
                                />
                              ))}
                            </motion.div>
                          ) : (
                            <div 
                              onClick={() => setCollapsedCategories(prev => ({ ...prev, [category]: false }))}
                              className="py-4 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                            >
                              📁 {itemsUnderCategory.length} {itemsUnderCategory.length === 1 ? 'dish is' : 'dishes are'} collapsed. Click to expand.
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
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="text-center sm:border-r border-slate-200 dark:border-slate-800/80 sm:pr-8 shrink-0">
                  <p className="text-5xl font-black text-slate-900 dark:text-white">{shop.rating}</p>
                  <div className="flex text-orange-500 justify-center mt-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(shop.rating) ? 'fill-current' : ''}`} />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-wider">{reviews.length} Reviews</p>
                </div>
                <div className="flex-1 w-full space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Filter by Rating</p>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviews.filter(r => r.rating === rating).length;
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    const isSelected = selectedStarFilter === rating;
                    return (
                      <div 
                        key={rating} 
                        onClick={() => {
                          setSelectedStarFilter(prev => prev === rating ? null : rating);
                          if ("vibrate" in navigator) navigator.vibrate(5);
                        }}
                        className={`flex items-center gap-3 cursor-pointer py-1 px-2.5 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border select-none ${
                          isSelected 
                            ? 'bg-orange-50 dark:bg-orange-950/25 border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-400' 
                            : 'border-transparent text-slate-500 dark:text-slate-400'
                        }`}
                        title={`Filter by ${rating} stars`}
                      >
                        <span className="text-[10px] font-bold w-2 shrink-0 text-center">{rating}</span>
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isSelected ? 'bg-orange-600' : 'bg-orange-500'}`} 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold w-12 shrink-0 tabular-nums text-right">({count}) {isSelected && '✓'}</span>
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
                    <span>Showing only {selectedStarFilter}-star reviews ({filteredReviews.length})</span>
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
                ) : filteredReviews.length > 0 ? (
                  filteredReviews.map((review) => (
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
                  <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-900/20 rounded-3xl p-6 border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="size-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedStarFilter !== null ? 'No matching reviews' : 'No reviews yet'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedStarFilter !== null ? 'Try selecting a different rating filter' : 'Be the first to review this store!'}
                    </p>
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
                    <div className="flex-grow">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Location</h3>
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
                              <span className="text-emerald-500 font-bold">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span className="font-bold">Copy Address</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-gray-500 dark:text-slate-400 mt-1">{shop.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`, '_blank')}
                      className="flex-1 py-4 px-6 bg-gray-100 dark:bg-slate-800 rounded-xl text-gray-900 dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Navigation className="w-5 h-5" />
                      <span>Get Directions</span>
                    </button>
                    {shop.phone && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => window.open(`tel:${shop.phone}`, '_blank')}
                          className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl shadow-sm hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                          title="Call Shop"
                        >
                          <Phone className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => {
                            const cleanPhone = shop.phone!.replace(/[^0-9]/g, '');
                            const url = `https://wa.me/${cleanPhone.startsWith('0') ? '27' + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(`Hi ${shop.name}, I'm interested in ordering!`)}`;
                            window.open(url, '_blank');
                          }}
                          className="p-4 bg-[#25D366] text-white rounded-xl shadow-lg shadow-[#25D366]/20 hover:bg-[#20ba59] active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-6 h-6" />
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
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Opening Hours</h3>
                        <div className="mt-3 space-y-3">
                          <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-100 dark:border-slate-800 pb-2">
                            <span className="text-gray-500 dark:text-slate-400 font-medium">Monday - Sunday</span>
                            <span className="font-bold text-gray-900 dark:text-white">{storeStatus.hours}</span>
                          </div>
                          <div className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold ${storeStatus.isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${storeStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            <span>Store is currently {storeStatus.isOpen ? 'Open' : 'Closed'} • {storeStatus.closingText}</span>
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
        onConfirm={(quantity, specialInstructions, selectedCustomizations) => {
          if (selectedItemForQuantity) {
            addToCart(selectedItemForQuantity, shop.id, quantity, specialInstructions, selectedCustomizations);
            setSelectedItemForQuantity(null);
          }
        }}
      />

      {/* Cash on Arrival Trust Tooltip / Micro-Drawer */}
      {showTrustTooltip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-2xl relative animate-in slide-in-from-bottom duration-300"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full sm:hidden" />
            <div className="flex items-start gap-4 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                <span className="text-2xl animate-pulse">💵</span>
              </div>
              <div className="flex-1">
                <h3 className="font-extrabold text-[#221610] dark:text-white text-base">Cash-on-Arrival Enabled</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed font-semibold">
                  Build trust with your first order! Pay safely with physical cash or mobile wallet at your doorstep once the rider arrives.
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
function ExploreScreen({ shops, onHome, onDiscover, userLocation, onRequestLocation, onStoreInfo, favorites, toggleFavorite, showAlert, triggerHaptic, isOnline }: { 
  shops: Shop[], 
  onHome: () => void, 
  onDiscover: () => void, 
  userLocation: { lat: number, lng: number } | null, 
  onRequestLocation: () => void, 
  onStoreInfo: (shopId: string) => void, 
  favorites: string[], 
  toggleFavorite: (id: string) => void,
  showAlert: (title: string, message: string) => void,
  triggerHaptic: (pattern?: number | number[]) => void,
  isOnline: boolean
}) {
  const { t } = useTranslation();
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'map' | 'list'>('map');
  const [maxDistance, setMaxDistance] = useState<number | null>(null);
  const [sortPriority, setSortPriority] = useState<'rating' | 'distance' | 'name'>('rating');

  const categories = ['All', 'Favorites', 'Nearby', ...new Set(shops.map(s => s.category))];

  const filteredShops = shops.filter(shop => {
    const query = searchQuery.trim().toLowerCase();
    const shopText = `${shop.name} ${shop.description} ${shop.category}`.toLowerCase();
    const matchesSearch = query === '' || query.split(/\s+/).every(term => shopText.includes(term));
    
    let matchesCategory = false;
    if (selectedCategory === 'All') {
      matchesCategory = true;
    } else if (selectedCategory === 'Favorites') {
      matchesCategory = favorites.includes(shop.id);
    } else if (selectedCategory === 'Nearby') {
      matchesCategory = true; // Handled in sort
    } else {
      matchesCategory = shop.category === selectedCategory;
    }
    
    const matchesRating = shop.rating >= minRating;
    const matchesOpen = !showOnlyOpen || getShopStatus(shop).isOpen;

    // Filter by max distance if user location is loaded
    let matchesDistance = true;
    if (maxDistance !== null && userLocation) {
      const sLat = (shop as any).latitude || -25.9964 + (hashString(shop.id) % 10) * 0.005;
      const sLng = (shop as any).longitude || 28.2268 + (hashString(shop.id) % 10) * 0.005;
      const dist = calculateDistance(sLat, sLng, userLocation.lat, userLocation.lng);
      matchesDistance = dist <= maxDistance;
    }
    
    return matchesSearch && matchesCategory && matchesRating && matchesOpen && matchesDistance;
  });

  const sortedShops = [...filteredShops].sort((a, b) => {
    const statusA = getShopStatus(a);
    const statusB = getShopStatus(b);
    if (statusA.isOpen && !statusB.isOpen) return -1;
    if (!statusA.isOpen && statusB.isOpen) return 1;

    if (sortPriority === 'distance' && userLocation) {
      const aLat = (a as any).latitude || -25.9964 + (hashString(a.id) % 10) * 0.005;
      const aLng = (a as any).longitude || 28.2268 + (hashString(a.id) % 10) * 0.005;
      const bLat = (b as any).latitude || -25.9964 + (hashString(b.id) % 10) * 0.005;
      const bLng = (b as any).longitude || 28.2268 + (hashString(b.id) % 10) * 0.005;
      const distA = Math.sqrt(Math.pow(aLat - userLocation.lat, 2) + Math.pow(aLng - userLocation.lng, 2));
      const distB = Math.sqrt(Math.pow(bLat - userLocation.lat, 2) + Math.pow(bLng - userLocation.lng, 2));
      return distA - distB;
    }

    if (sortPriority === 'name') {
      return a.name.localeCompare(b.name);
    }

    // Default: Sort by rating
    return b.rating - a.rating;
  });

  const activeShop = shops.find(s => s.id === selectedShopId);
  const mapCenter: [number, number] = activeShop && activeShop.latitude && activeShop.longitude 
    ? [activeShop.latitude, activeShop.longitude] 
    : userLocation 
      ? [userLocation.lat, userLocation.lng] 
      : [-25.9964, 28.2268];

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-screen flex flex-col font-sans relative shadow-2xl overflow-hidden">
      {/* Search & Filter Header Overlay */}
      <div className="absolute top-6 left-4 right-4 z-[1000] flex flex-col gap-3">
        <div className="max-w-lg md:mx-auto w-full">
          <div className="bg-white dark:bg-slate-900/95 backdrop-blur-xl rounded-[28px] shadow-2xl flex items-center px-5 py-4 border border-white/20 dark:border-slate-800 transition-all focus-within:ring-2 focus-within:ring-orange-500/50">
            <Search className="w-5 h-5 text-orange-500 mr-3 shrink-0" />
            <input 
              type="text" 
              placeholder="Filter by name, food, or street..." 
              className="flex-grow outline-none text-sm font-bold bg-transparent dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex items-center gap-2">
               {/* Map / List Layout Switcher Button */}
               <button 
                 onClick={() => {
                   setLayoutMode(layoutMode === 'map' ? 'list' : 'map');
                   triggerHaptic(10);
                 }}
                 className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all select-none active:scale-95 cursor-pointer"
                 title={layoutMode === 'map' ? 'Switch to List View' : 'Switch to Map View'}
               >
                 {layoutMode === 'map' ? <List className="w-4 h-4 text-orange-600 dark:text-orange-400" /> : <Map className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
               </button>

               <button 
                 onClick={() => setIsFilterOpen(!isFilterOpen)}
                 className={`p-2 rounded-full transition-all ${isFilterOpen ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
               >
                 <SlidersHorizontal className="w-4 h-4" />
               </button>
               <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
               <button className="text-orange-500 active:scale-95 transition-transform p-1.5 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-full" onClick={onRequestLocation}>
                 {userLocation ? <LocateFixed className="w-6 h-6" /> : <Locate className="w-6 h-6" />}
               </button>
            </div>
          </div>

          {/* Expanded Filters Drawer Style */}
          <motion.div 
            initial={false}
            animate={{ height: isFilterOpen ? 'auto' : 0, opacity: isFilterOpen ? 1 : 0 }}
            className="overflow-hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl rounded-[32px] mt-2 shadow-2xl border border-gray-100 dark:border-slate-800"
          >
            <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
              {/* Category Toggles */}
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">Browse by Category</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        triggerHaptic(10);
                      }}
                      className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                        selectedCategory === cat 
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xl' 
                          : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Sort Order */}
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">Sort Results By</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { setSortPriority('rating'); triggerHaptic(10); }}
                    className={`px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-center ${
                      sortPriority === 'rating'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md'
                        : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                    }`}
                  >
                    ★ Rating
                  </button>
                  <button
                    onClick={() => {
                      if (!userLocation) {
                        onRequestLocation();
                      }
                      setSortPriority('distance');
                      triggerHaptic(10);
                    }}
                    className={`px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-center relative ${
                      sortPriority === 'distance'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md'
                        : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                    }`}
                  >
                    {!userLocation && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span></span>}
                    📍 Distance
                  </button>
                  <button
                    onClick={() => { setSortPriority('name'); triggerHaptic(10); }}
                    className={`px-3 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-center ${
                      sortPriority === 'name'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md'
                        : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                    }`}
                  >
                    🔤 A-Z Name
                  </button>
                </div>
              </div>

              {/* Maximum Distance Radius */}
              {userLocation && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">Maximum Distance Radius</p>
                  <div className="grid grid-cols-4 gap-2">
                    {([null, 3, 5, 10] as (number | null)[]).map((dist) => (
                      <button
                        key={dist === null ? 'any' : dist}
                        onClick={() => { setMaxDistance(dist); triggerHaptic(10); }}
                        className={`px-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 text-center ${
                          maxDistance === dist
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md'
                            : 'bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                        }`}
                      >
                        {dist === null ? 'Any' : `${dist} km`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Utility Filters */}
              <div className="flex flex-col gap-4">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Refine Results</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      setShowOnlyOpen(!showOnlyOpen);
                      triggerHaptic(10);
                    }}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      showOnlyOpen 
                        ? 'bg-green-500/10 text-green-600 border-green-500/30 shadow-inner' 
                        : 'bg-slate-50 dark:bg-slate-800/30 text-slate-400 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <Clock className={`w-5 h-5 ${showOnlyOpen ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Open Now</span>
                  </button>
                  <button 
                    onClick={() => {
                      setMinRating(minRating > 0 ? 0 : 4);
                      triggerHaptic(10);
                    }}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      minRating > 0 
                        ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 shadow-inner' 
                        : 'bg-slate-50 dark:bg-slate-800/30 text-slate-400 border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    <Star className={`w-5 h-5 ${minRating > 0 ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">4+ Stars</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {layoutMode === 'list' ? (
        /* Gorgeous, Premium Responsive Shop List Layout */
        <div className="flex-grow overflow-y-auto px-4 pb-28 pt-28 space-y-4">
          <div className="max-w-lg mx-auto flex flex-col gap-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Found {sortedShops.length} local eaters
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                {sortPriority === 'rating' ? 'Highest Rating' : sortPriority === 'distance' ? 'Nearest First' : 'Alphabetical'}
              </span>
            </div>

            {sortedShops.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[32px] p-12 text-center border border-slate-100 dark:border-slate-800 animate-in fade-in duration-300">
                <SearchX className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h4 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase tracking-tight mb-2">No Restaurants Found</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  We couldn't find any stores that match your search filters. Try resetting your search query or expanding your category selection.
                </p>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setMinRating(0);
                    setMaxDistance(null);
                    setShowOnlyOpen(false);
                    triggerHaptic(10);
                  }}
                  className="mt-6 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              sortedShops.map((shop) => {
                const isFollowing = favorites.includes(shop.id);
                const status = getShopStatus(shop);
                
                // Get coordinates and compute accurate distance
                const sLat = (shop as any).latitude || -25.9964 + (hashString(shop.id) % 10) * 0.005;
                const sLng = (shop as any).longitude || 28.2268 + (hashString(shop.id) % 10) * 0.005;
                const distanceVal = userLocation 
                  ? calculateDistance(sLat, sLng, userLocation.lat, userLocation.lng)
                  : null;

                return (
                  <div 
                    key={shop.id}
                    onClick={() => {
                      setSelectedShopId(shop.id);
                      triggerHaptic(10);
                    }}
                    className="group bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm dark:shadow-none hover:shadow-xl dark:hover:border-slate-700/80 transition-all duration-300 flex flex-col cursor-pointer"
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
                        <Heart className={`w-4 h-4 transition-all duration-300 ${isFollowing ? 'text-rose-500 fill-rose-500 scale-110' : ''}`} />
                      </button>

                      {/* Speed/Opening Overlays */}
                      <div className="absolute bottom-4 left-4 flex gap-1.5 flex-wrap">
                        {status.isOpen ? (
                          <span className="bg-emerald-500 text-white font-black text-[8px] uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                            Open Now
                          </span>
                        ) : (
                          <span className="bg-slate-600 text-white font-black text-[8px] uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                            Closed
                          </span>
                        )}
                        <span className="bg-[#fff0ea] leading-tight text-orange-700 font-black text-[8px] uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                          {shop.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <div>
                          <h4 className="font-['Plus_Jakarta_Sans'] font-black text-xl text-slate-900 dark:text-white tracking-tight leading-tight group-hover:text-orange-500 transition-colors">
                            {shop.name}
                          </h4>
                          <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-1 font-semibold">
                            {shop.address}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-xl shrink-0 border border-amber-100/30">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-black text-slate-850 dark:text-amber-400">{shop.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 mb-4 leading-relaxed font-semibold">
                        {shop.description || 'Discover incredible local delicacies made with fresh ingredients and served warm.'}
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
                            setLayoutMode('map');
                            triggerHaptic(10);
                          }}
                          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-white rounded-2xl active:scale-95 transition-all text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer"
                          title="View on Map"
                        >
                          <Map className="w-4 h-4 shrink-0 text-orange-500" />
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
        /* Original Map flow with enhanced contrast dimming */
        <div className="flex-grow relative z-10 overflow-hidden dark:[&_.leaflet-tile-container]:invert dark:[&_.leaflet-tile-container]:hue-rotate-[180deg] dark:[&_.leaflet-tile-container]:brightness-[0.75] dark:[&_.leaflet-tile-container]:contrast-[1.2]">
          {!isOnline && (
            <div className="absolute inset-0 z-20 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
               <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-6 shadow-sm border border-slate-200 dark:border-slate-800">
                 <WifiOff className="w-10 h-10" />
               </div>
               <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Maps Unavailable</h3>
               <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                 Interactive maps require an active data connection to stream tiles. Switch to List view to browse cached shops.
               </p>
               <button onClick={onHome} className="mt-8 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer">
                  <Home className="w-4 h-4" />
                  Return Home
               </button>
            </div>
          )}
          <MapContainer center={mapCenter} zoom={14} scrollWheelZoom={true} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Upgrade MapRecenter with animated smooth transitions */}
            <ExploreMapRecenter center={mapCenter} />
            
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}

            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={40}
              spiderfyOnMaxZoom={true}
            >
              {filteredShops.map((shop) => {
                const isFollowed = favorites.includes(shop.id);
                return (
                  <Marker 
                    key={shop.id} 
                    position={[shop.latitude || -25.9964, shop.longitude || 28.2268]} 
                    icon={shopIcon}
                    eventHandlers={{
                      click: () => {
                        setSelectedShopId(shop.id);
                        triggerHaptic(10);
                      },
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
            </MarkerClusterGroup>
          </MapContainer>

          {/* Floating Action Buttons */}
          <div className="absolute bottom-24 left-0 right-0 z-[1000] pointer-events-none">
            <div className="max-w-screen-xl mx-auto flex flex-col items-end gap-3 px-6">
              <button onClick={onHome} className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg text-gray-600 dark:text-slate-300 hover:text-orange-500 transition-colors cursor-pointer pointer-events-auto active:scale-95">
                <Home className="w-6 h-6" />
              </button>
              <button onClick={onRequestLocation} className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg text-gray-600 dark:text-slate-300 hover:text-orange-500 transition-colors cursor-pointer pointer-events-auto active:scale-95">
                <LocateFixed className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      <AnimatePresence>
        {selectedShopId && activeShop && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-slate-950 rounded-t-[32px] bottom-sheet p-6 pb-24"
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
                  <BlurUpImage src={activeShop.logo || DEFAULT_SHOP_LOGO} alt={activeShop.name} className="w-full h-full" blurHash={`https://picsum.photos/seed/${activeShop.id}/10/10?blur=10`} />
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
                    {userLocation && (
                      <>
                        <span className="text-gray-300 dark:text-slate-700 mx-2">•</span>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-extrabold uppercase tracking-wide">
                          📍 {calculateDistance(
                            activeShop.latitude || -25.9964 + (hashString(activeShop.id) % 10) * 0.005,
                            activeShop.longitude || 28.2268 + (hashString(activeShop.id) % 10) * 0.005,
                            userLocation.lat,
                            userLocation.lng
                          ).toFixed(1)} km away
                        </span>
                      </>
                    )}
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

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
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
              {activeShop.phone && (
                <button 
                  onClick={() => {
                    const cleanPhone = activeShop.phone!.replace(/[^0-9]/g, '');
                    const url = `https://wa.me/${cleanPhone.startsWith('0') ? '27' + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(`Hi ${activeShop.name}, I found you on LocalEats!`)}`;
                    window.open(url, '_blank');
                  }}
                  className="bg-[#25D366] text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer col-span-2 md:col-span-1"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex justify-around items-center bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-[20px] border-[3px] border-white/50 dark:border-slate-800/50 shadow-2xl pointer-events-auto transition-all">
          <button onClick={onHome} className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors cursor-pointer group">
          <div className="p-1 group-hover:scale-110 transition-transform">
            <Home className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">{t('home')}</span>
        </button>
        <button onClick={onDiscover} className="flex flex-col items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-orange-600 transition-colors cursor-pointer group">
          <div className="p-1 relative group-hover:scale-110 transition-transform">
            <Store className="w-6 h-6 bg-white dark:bg-slate-800 rounded-lg p-0.5 shadow-sm" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">{t('discover')}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-orange-600 transition-colors cursor-pointer group">
          <div className="p-1 group-hover:scale-110 transition-transform">
            <Compass className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">{t('explore')}</span>
        </button>
      </div>
    </div>
  </div>
    );
}

{/* Smooth FlyTo centered sub-component map tracker helper */}
function ExploreMapRecenter({ center, zoom = 15 }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.2
      });
    }
  }, [center[0], center[1], map, zoom]);
  return null;
}

function NotificationsScreen({ notifications, onBack, onRead, onDelete }: { notifications: AppNotification[], onBack: () => void, onRead: (id: string) => void, onDelete: (id: string) => void }) {
  return (
    <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
      <header className="sticky top-0 z-50 glass-effect border-b border-primary/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto px-4 py-6 space-y-4 flex flex-col justify-between">
        {notifications.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500 my-auto">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-indigo-500/10 rounded-full scale-110 blur-xl opacity-50"></div>
              <div className="size-24 bg-white dark:bg-slate-900 rounded-[36px] shadow-lg flex items-center justify-center text-indigo-500 relative z-10 border border-slate-100 dark:border-slate-800">
                <Bell className="w-11 h-11" />
              </div>
            </div>
            <h3 className="text-lg font-black mb-1 text-slate-900 dark:text-white leading-tight">All Caught Up</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-[220px] leading-relaxed font-semibold mb-6">
              You have no notifications yet. We'll let you know when tasty offers or order updates land here!
            </p>
            <button 
              onClick={onBack}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 cursor-pointer text-xs uppercase tracking-wider mx-auto"
            >
              Back to Home
            </button>
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

function RecenterMap({ coords }: { coords: { lat: number, lng: number } }) {
  const map = useMap();
  const lat = coords?.lat;
  const lng = coords?.lng;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.setView({ lat, lng }, map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

function RealTimeRiderTracking({ order, shop }: { order: Order, shop?: Shop }) {
  const [riderLocation, setRiderLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [showMap, setShowMap] = useState(order.delivery_status === 'picked_up');
  const [riderInfo, setRiderInfo] = useState<any>(null);

  useEffect(() => {
    if (!order.rider_id) return;

    // Fetch initial location and info
    const initTracking = async () => {
      const { data: loc } = await supabase.from('rider_locations').select('*').eq('rider_id', order.rider_id).single();
      if (loc) setRiderLocation({ lat: Number(loc.latitude), lng: Number(loc.longitude) });

      const { data: profile } = await supabase.from('rider_profiles').select('*').eq('id', order.rider_id).single();
      setRiderInfo(profile);
    };

    initTracking();

    const channel = supabase.channel(`tracking-${order.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rider_locations',
        filter: `rider_id=eq.${order.rider_id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setRiderLocation({ lat: Number(payload.new.latitude), lng: Number(payload.new.longitude) });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [order.rider_id, order.id]);

  const storeCoords = shop?.latitude && shop?.longitude ? { lat: shop.latitude, lng: shop.longitude } : DEFAULT_COORDS;
  const deliveryCoords = order.latitude && order.longitude ? { lat: order.latitude, lng: order.longitude } : null;

  if (!order.rider_id) {
    return (
      <div className="p-5 bg-blue-50 dark:bg-blue-950/20 rounded-3xl border border-blue-100 dark:border-blue-900/30">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-600 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Finding a Rider</h3>
            <p className="text-[10px] text-slate-500">Connecting your order to the nearest available partner...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-orange-50 dark:bg-orange-950/20 rounded-3xl border border-orange-100 dark:border-orange-900/30 overflow-hidden relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {order.delivery_status === 'picked_up' ? (
            <span className="bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase animate-pulse">Out for Delivery</span>
          ) : (
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
          )}
          <h3 className="text-sm font-black uppercase tracking-widest text-orange-600">Rider Tracking</h3>
        </div>
        {deliveryCoords && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Map</span>
            <button 
              onClick={() => setShowMap(!showMap)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showMap ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-800'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showMap ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
        )}
      </div>

      {riderLocation && deliveryCoords && (() => {
        const dist = calculateDistance(riderLocation.lat, riderLocation.lng, deliveryCoords.lat, deliveryCoords.lng);
        return dist > 3 ? (
          <div className="mb-4 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-900/30 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-800 dark:text-red-400">Rider is uncharacteristically far away</p>
              <p className="text-[10px] text-red-600 dark:text-red-500/80 mt-0.5">Your rider is currently {dist.toFixed(1)}km away from the delivery address. This might take a bit longer.</p>
            </div>
          </div>
        ) : null;
      })()}

      {showMap && deliveryCoords ? (
        <div className="h-48 w-full rounded-2xl overflow-hidden mb-4 border border-orange-200 dark:border-orange-800 relative z-10 shadow-inner">
          <MapContainer center={riderLocation || storeCoords} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RecenterMap coords={riderLocation || storeCoords} />
            <Marker position={storeCoords} />
            <Marker position={deliveryCoords} />
            {riderLocation && (
              <Marker position={riderLocation} icon={L.divIcon({
                className: 'custom-rider-icon',
                html: `<div class="bg-indigo-600 p-1 rounded-full border-2 border-white shadow-lg flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 28]
              })} />
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
            <p className="text-xs font-bold">{riderInfo?.full_name || 'Assigned Rider'}</p>
            <p className="text-[10px] text-slate-500 capitalize">{riderInfo?.vehicle_type || 'Bicycle'} Delivery</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {riderInfo?.phone && (
            <button 
              onClick={() => {
                const cleanPhone = riderInfo.phone.replace(/[^0-9]/g, '');
                const url = `https://wa.me/${cleanPhone.startsWith('0') ? '27' + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(`Hi ${riderInfo.full_name}, I'm checking on my delivery for order #${order.id.slice(0, 5)}!`)}`;
                window.open(url, '_blank');
              }}
              className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-primary/10 shadow-sm text-[#25D366] active:scale-90 transition-all cursor-pointer group"
              title="WhatsApp Rider"
            >
              <MessageCircle className="w-4 h-4 fill-[#25D366]/20" />
            </button>
          )}
          <a href={`tel:${riderInfo?.phone}`} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-primary/10 shadow-sm text-primary active:scale-90 transition-all">
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

function ChangeView({ center }: { center: { lat: number, lng: number } }) {
  const map = useMap();
  const lat = center?.lat;
  const lng = center?.lng;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.setView({ lat, lng }, 13);
    }
  }, [lat, lng, map]);
  return null;
}

function OrderTrackingScreen({ orders, shops, onBack, showAlert, triggerHaptic }: { 
  orders: Order[], 
  shops: Shop[], 
  onBack: () => void, 
  showAlert: (title: string, message: string) => void,
  triggerHaptic?: (pattern?: number | number[]) => void
}) {
  const [cancellationModal, setCancellationModal] = useState<{ isOpen: boolean, orderId: string | null }>({ isOpen: false, orderId: null });
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);

  // Sync props to local state if props change (e.g. from websocket updates)
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    triggerHaptic?.(10);
    try {
      const activeIds = orders.map(o => o.user_id).filter(Boolean);
      const userId = activeIds[0] || (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        setIsRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setLocalOrders(data);
        triggerHaptic?.([50, 30, 50]);
      }
    } catch (err: any) {
      console.error('Error refreshing orders manually:', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancellationModal.orderId || !cancelReason.trim()) return;
    
    setIsCancelling(true);
    triggerHaptic?.([100, 50, 100]);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled', 
          delivery_status: 'cancelled',
          cancellation_reason: cancelReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', cancellationModal.orderId);

      if (error) throw error;

      showAlert("Order Cancelled", "Your order has been cancelled successfully.");
      setCancellationModal({ isOpen: false, orderId: null });
      setCancelReason("");
      onBack();
    } catch (err: any) {
      showAlert("Cancellation Error", err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusStep = (status: string) => {
    switch(status) {
      case 'pending': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'completed': return 4;
      default: return 1;
    }
  };

  const activeOrders = localOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');

  return (
    <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
      <header className="sticky top-0 z-50 glass-effect border-b border-primary/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer transition-colors hover:text-orange-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Track Orders</h1>
          <button 
            type="button"
            onClick={handleRefresh}
            className="w-10 h-10 flex items-center justify-end text-orange-600 dark:text-orange-400 cursor-pointer active:scale-95 transition-transform"
            title="Refresh Status"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto px-4 py-6 space-y-6 flex flex-col justify-between">
        {activeOrders.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500 my-auto">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-orange-500/20 rounded-full scale-150 blur-3xl opacity-30 animate-pulse"></div>
              <div className="size-28 bg-white dark:bg-slate-900 rounded-[45px] shadow-2xl flex items-center justify-center text-orange-600 relative z-10 -rotate-6 transition-transform hover:rotate-0 duration-500 border border-slate-100 dark:border-slate-800">
                <Bike className="w-14 h-14" />
              </div>
              <div className="absolute -bottom-2 -right-2 size-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                <Search className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white leading-tight animate-pulse">No Active Orders</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-[240px] leading-relaxed font-semibold">
              Everything is currently quiet. Discover local kitchens and order something legendary!
            </p>
            <button 
              onClick={onBack}
              className="bg-orange-600 hover:bg-orange-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-orange-600/20 transition-all active:scale-95 cursor-pointer flex items-center gap-2 mx-auto"
            >
              <span>Browse Local Kitchens</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          activeOrders.map(order => {
            const shop = shops.find(s => s.id === order.shop_id);
            const step = getStatusStep(order.status);
            
            return (
              <div key={order.id} className="bg-white dark:bg-slate-900/50 rounded-2xl border border-primary/10 p-5 shadow-sm space-y-6">
                {order.status !== 'pending' && order.is_delivery && <RealTimeRiderTracking order={order} shop={shop} />}
                
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                      <BlurUpImage src={shop?.logo || DEFAULT_SHOP_LOGO} alt={shop?.name || 'Shop'} className="w-full h-full" blurHash={`https://picsum.photos/seed/${shop?.id || 'shop'}/10/10?blur=10`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">{shop?.name || 'Local Shop'}</h3>
                      <p className="text-xs text-slate-500 font-medium">{order.product_name} x{order.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</p>
                    <p className="text-[11px] font-mono font-bold text-primary">#{order.id.slice(0, 8)}</p>
                    <button
                      onClick={() => {
                        const shareData = {
                          title: `Track my order from ${shop?.name}`,
                          text: `I just ordered ${order.product_name}. Track my delivery here!`,
                          url: `${window.location.origin}/track/${order.id}`
                        };
                        if (navigator.share) {
                          navigator.share(shareData).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(shareData.url);
                          toast.success('Tracking link copied to clipboard!');
                        }
                      }}
                      className="mt-2 text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-full flex items-center gap-1 active:scale-95 transition-transform"
                    >
                      <Share2 className="w-3 h-3" /> Share
                    </button>
                  </div>
                </div>

                {/* Contact Controls */}
                <div className="flex gap-2">
                  {shop?.phone && (
                    <button 
                      onClick={() => {
                        const cleanPhone = shop.phone!.replace(/[^0-9]/g, '');
                        const url = `https://wa.me/${cleanPhone.startsWith('0') ? '27' + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(`Hi ${shop.name}, I'm checking on my order #${order.id.slice(0, 5)}!`)}`;
                        window.open(url, '_blank');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#25D366]/20"
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      <span>Message Shop</span>
                    </button>
                  )}
                  <button 
                    onClick={() => window.open(`tel:${shop?.phone || ''}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call Shop</span>
                  </button>
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
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 z-10 relative ${isActive ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300'} ${isCurrent ? 'scale-110 shadow-lg shadow-primary/30' : ''}`}>
                            {isCurrent && (
                              <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75"></span>
                            )}
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
                    <p className="text-[10px] text-slate-500 font-medium">Estimated time: 15-20 mins</p>
                    {order.is_delivery && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {shop?.allow_external_riders === false ? (
                          <p id="eta-subtext-inhouse" className="text-[10px] text-orange-600 dark:text-orange-400 font-extrabold flex items-start gap-1.5 leading-relaxed">
                            <span>🚴</span>
                            <span>Serviced exclusively by this shop's private couriers.</span>
                          </p>
                        ) : (
                          <p id="eta-subtext-ondemand" className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold flex items-start gap-1.5 leading-relaxed">
                            <span>📡</span>
                            <span>Linked directly to LocalEats Public Fleet</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cancel Order Action */}
                {['pending', 'confirmed'].includes(order.status) && (
                  <button 
                    onClick={() => setCancellationModal({ isOpen: true, orderId: order.id })}
                    className="w-full py-3 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-red-200/50 dark:border-red-900/30 transition-all active:scale-95 hover:bg-red-100"
                  >
                    <Ban className="w-4 h-4" />
                    Cancel Order
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {cancellationModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCancelling && setCancellationModal({ isOpen: false, orderId: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-[32px] p-6 relative z-10 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 mb-4 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white text-center mb-1">Cancel Order?</h3>
              <p className="text-[10px] text-slate-500 text-center mb-6 uppercase tracking-widest font-bold">Please tell us why you want to cancel</p>
              
              <div className="space-y-3 mb-6">
                {["Mistake in order", "Distance is too far", "Changed my mind", "Waiting too long", "Other"].map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                      cancelReason.startsWith(reason) 
                        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
                {cancelReason.startsWith("Other") && (
                  <textarea 
                    autoFocus
                    placeholder="Type details here..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none mt-2"
                    rows={2}
                    onChange={(e) => setCancelReason(`Other: ${e.target.value}`)}
                  />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  disabled={!cancelReason || isCancelling}
                  onClick={handleCancelOrder}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Confirm Cancellation
                </button>
                <button
                  disabled={isCancelling}
                  formNoValidate
                  onClick={() => setCancellationModal({ isOpen: false, orderId: null })}
                  className="w-full py-3 bg-white dark:bg-slate-900 text-slate-500 font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
function SettingsScreen({ userProfile, setUserProfile, onBack, onLogout, onProfile, onOrderHistory, onAdminOrders, onShopDashboard, onRiderDashboard, onContactUs, onUpdateProfile, isDarkMode, onToggleDarkMode, setNotification, showAlert, showConfirm, isOnline }: { 
  userProfile: UserProfile, 
  setUserProfile: Dispatch<SetStateAction<UserProfile>>, 
  onBack: () => void, 
  onLogout: () => void, 
  onProfile: () => void, 
  onOrderHistory: () => void, 
  onAdminOrders: () => void, 
  onShopDashboard: () => void, 
  onRiderDashboard: () => void,
  onContactUs?: () => void,
  onUpdateProfile: (data: Partial<UserProfile>, showSuccess?: boolean) => void,
  isDarkMode: boolean, 
  onToggleDarkMode: () => void, 
  setNotification: (n: NotificationState) => void,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmLabel?: string, cancelLabel?: string) => void,
  isOnline: boolean
}) {
  const [uploading, setUploading] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t, language, setLanguage } = useTranslation();

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!isOnline) {
      setNotification({ message: 'No internet connection. Cannot upload photo.', type: 'error' });
      return;
    }
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

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'zu', name: 'IsiZulu' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'st', name: 'Sesotho' },
    { code: 'ts', name: 'Xitsonga' }
  ];

  const handleLanguageChange = async (langCode: any) => {
    setLanguage(langCode);
    onUpdateProfile({ language: langCode }, false);
    setShowLanguageModal(false);
    setNotification({ message: `Language changed to ${languages.find(l => l.code === langCode)?.name}`, type: 'success' });
  };

  return (
    <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
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
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">{t('settings')}</h1>
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

        {/* 1. Account Security */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t('account_security')}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <button 
              onClick={onProfile}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t('edit_profile')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <button 
              onClick={() => setNotification({ message: "Saved addresses coming soon!", type: "info" })}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t('saved_addresses')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to delete your account? This action is irreversible.")) {
                  setNotification({ message: "Account deletion request received.", type: "info" });
                }
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600">
                  <UserMinus className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm text-red-600">{t('delete_account')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-red-300" />
            </button>
          </div>
        </section>

        {/* 2. Preferences */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t('preferences')}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            {/* Language Selection */}
            <button 
              onClick={() => setShowLanguageModal(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <Languages className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t('app_language')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-bold">{languages.find(l => l.code === language)?.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </button>

            {/* Notifications toggle */}
            <button 
              onClick={() => setNotification({ message: "Notification preferences coming soon!", type: "info" })}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer"
            >
              <div className="flex items-center space-x-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                   <p className="font-medium text-sm">{t('notifications')}</p>
                   <p className="text-[10px] text-slate-500">Push, Email, SMS</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>

            {/* Dark Mode toggle */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                  {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <span className="font-medium text-sm">{t('dark_mode')}</span>
              </div>
              <button 
                onClick={onToggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDarkMode ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* 3. Support & Legal */}
        <section>
          <div className="flex items-center gap-2 mb-3 px-1">
            <HelpCircle className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">{t('support_legal')}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900/50 rounded-xl overflow-hidden border border-primary/5 shadow-sm">
            <button 
              onClick={() => onRiderDashboard ? onContactUs?.() : window.open('https://wa.me/27123456789', '_blank')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t('help_center')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <button 
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t('terms_conditions')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <button 
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t('privacy_policy')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                  <Info className="w-5 h-5" />
                </div>
                <span className="font-medium text-sm">{t('app_version')}</span>
              </div>
              <span className="text-xs text-slate-400 font-bold">v{APP_VERSION.split(' ')[0]}</span>
            </div>
          </div>
        </section>

        {/* Refer a friend snippet */}
        <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 flex items-center gap-4">
          <div className="size-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg">
            <Gift className="w-6 h-6" />
          </div>
          <div className="flex-grow">
            <p className="font-bold text-sm">Refer a Friend</p>
            <p className="text-[10px] text-slate-500 font-medium">Get R50 off your next order</p>
          </div>
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'LocalEats',
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
            if (window.confirm("This will clear all local data. Proceed?")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full flex items-center justify-center p-3 text-red-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest gap-2"
        >
          <RotateCcw className="w-3 h-3" />
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
                "Stay Logged In"
              );
            }} 
            className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold hover:shadow-xl transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            <span>{t('logout')}</span>
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-widest tracking-tighter opacity-50">LocalEats {APP_VERSION}</p>
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
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[32px] p-6 pb-12 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{t('app_language')}</h3>
                <button onClick={() => setShowLanguageModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                      language === lang.code 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-slate-50 dark:border-slate-800 hover:border-primary/20'
                    }`}
                  >
                    <span className="font-bold">{lang.name}</span>
                    {language === lang.code && <CheckCircle className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RiderDashboardScreen({ onBack, showAlert, showConfirm, triggerHaptic, runWithProcessing, isOnline }: { 
  onBack: () => void, 
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void, confirmLabel?: string, cancelLabel?: string) => void,
  triggerHaptic: (pattern?: number | number[]) => void,
  runWithProcessing: (action: () => Promise<void>, successCallback?: () => void) => Promise<void>,
  isOnline: boolean
}) {
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderShop, setOrderShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);
  const [riderLocation, setRiderLocation] = useState<{lat: number, lng: number} | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [manualLocation, setManualLocation] = useState('');
  const [isUpdatingManual, setIsUpdatingManual] = useState(false);

  const fetchRiderData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile, error: profileErr } = await supabase
        .from('rider_profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileErr) {
        if (!isOnline) {
          const cached = localStorage.getItem(`rider_profile_${session.user.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setRiderProfile(parsed.profile);
            setActiveOrder(parsed.order);
            setOrderShop(parsed.shop);
          }
          setLoading(false);
          return;
        }
        throw profileErr;
      }

      if (!profile) {
        setLoading(false);
        return;
      }

      setRiderProfile(profile);

      if (profile.current_order_id) {
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('id', profile.current_order_id)
          .single();
        
        // Trigger haptic if this is a NEW assignment
        if (order && !activeOrder) {
          triggerHaptic([100, 50, 100]);
        }
        
        setActiveOrder(order);

        if (order) {
          const { data: shop } = await supabase
            .from('shops')
            .select('*')
            .eq('id', order.shop_id)
            .single();
          setOrderShop(shop);
        }
      } else {
        setActiveOrder(null);
        setOrderShop(null);
      }

      // Add caching after all data is fetched successfully
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.user) {
        localStorage.setItem(`rider_profile_${currentSession.user.id}`, JSON.stringify({
          profile,
          order: activeOrder,
          shop: orderShop
        }));
      }
    } catch (err) {
      console.error('Error fetching rider data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!riderProfile?.id) return;

    // Subscribe to changes for THIS rider specifically
    const channel = supabase.channel(`rider-dashboard-${riderProfile.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rider_profiles',
        filter: `id=eq.${riderProfile.id}`
      }, fetchRiderData)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `rider_id=eq.${riderProfile.id}`
      }, fetchRiderData)
      .on('postgres_changes', {
        // Also watch for unassigned orders that might need auto-assignment 
        // Or wait for the server-side/shop-side auto-assign to update our rider_id
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `status=eq.ready`
      }, fetchRiderData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchRiderData, riderProfile?.id]);

  // Initial fetch
  useEffect(() => {
    fetchRiderData();
  }, [fetchRiderData]);

  // Periodic Location Updates
  useEffect(() => {
    if (!riderProfile?.is_online) {
      return;
    }

    const updateLocation = async () => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          
          const { error } = await supabase
            .from('rider_locations')
            .upsert({
              rider_id: riderProfile.id,
              latitude,
              longitude,
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.error('Location update failed:', error);
            setGpsError('Sync Error');
          } else {
            setLastLocationUpdate(Date.now());
            setRiderLocation({ lat: latitude, lng: longitude });
            setGpsError(null);
          }
        } catch (err) {
          console.error('Error in location sync task:', err);
          setGpsError('Sync Connection Failed');
        }
      }, (err) => {
        console.error('Geolocation error:', err);
        setGpsError(err.message || 'GPS Signal Lost');
      }, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
    };

    const interval = setInterval(updateLocation, 10000); // Every 10 seconds
    updateLocation();

    return () => clearInterval(interval);
  }, [riderProfile?.is_online, activeOrder?.id, activeOrder?.delivery_status, riderProfile?.id]);

  const handleManualLocationSubmit = async () => {
    if (!manualLocation.trim() || !riderProfile) return;
    setIsUpdatingManual(true);
    try {
      const results = await searchAddress(manualLocation);
      if (results && results.length > 0) {
        const { lat, lng } = results[0];
        const { error } = await supabase
          .from('rider_locations')
          .upsert({
            rider_id: riderProfile.id,
            latitude: lat,
            longitude: lng,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        setRiderLocation({ lat, lng });
        setManualLocation('');
        setLastLocationUpdate(Date.now());
        showAlert('Location Updated', 'Your location has been manually updated.');
      } else {
        showAlert('Not Found', 'Could not find that address. Please be more specific.');
      }
    } catch (err: any) {
      showAlert('Update Failed', err.message);
    } finally {
      setIsUpdatingManual(false);
    }
  };

  const toggleOnline = async () => {
    const { error } = await supabase
      .from('rider_profiles')
      .update({ is_online: !riderProfile.is_online })
      .eq('id', riderProfile.id);
    
    if (error) {
      showAlert('Error', 'Failed to update status');
    } else {
      fetchRiderData();
    }
  };

  const updateDeliveryStatus = async (status: string, deliveryStatus: string) => {
    if (!activeOrder) return;
    if (!isOnline) {
      showAlert('Offline Mode', 'Cannot update delivery status while offline. Please check your connection.');
      return;
    }

    await runWithProcessing(async () => {
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ status, delivery_status: deliveryStatus })
        .eq('id', activeOrder.id);
      
      if (orderErr) throw orderErr;

      if (deliveryStatus === 'delivered') {
        const earned = activeOrder.delivery_fee || 0; // The rider earns the delivery fee
        const { error: riderErr } = await supabase
          .from('rider_profiles')
          .update({ 
            current_order_id: null, 
            completed_deliveries: (riderProfile.completed_deliveries || 0) + 1,
            total_earnings: (riderProfile.total_earnings || 0) + earned
          })
          .eq('id', riderProfile.id);
        if (riderErr) throw riderErr;
      }
    }, fetchRiderData);
  };

  if (loading && !riderProfile) {
    return <RiderDashboardSkeleton />;
  }

  if (!riderProfile) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <XCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">Rider Profile Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">You need to be registered as a rider to access this dashboard.</p>
        <button onClick={onBack} className="bg-primary text-white px-8 py-3 rounded-xl font-bold">Return Home</button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col font-sans max-w-md mx-auto shadow-2xl">
      <header className="p-4 flex items-center justify-between sticky top-0 glass-effect z-50 border-b border-primary/10">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-900 dark:text-white cursor-pointer"><ArrowLeft className="w-6 h-6" /></button>
        <div className="flex flex-col items-center">
          <h1 className="font-black uppercase tracking-tighter text-xl">Rider Dashboard</h1>
          <p className="text-[9px] font-black tracking-widest text-primary uppercase">Fleet Service</p>
        </div>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${riderProfile.is_online ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-2">
             {riderProfile.is_online ? 'Live & Active' : 'Offline'}
           </p>
           <button 
             onClick={toggleOnline}
             className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all active:scale-95 ${riderProfile.is_online ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
           >
             {riderProfile.is_online ? 'Take a Break (Offline)' : 'Start Shift (Online)'}
           </button>
        </div>
      </header>

      {riderProfile.is_online && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 bg-indigo-600 rounded-full animate-ping"></div>
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Searching for nearby orders...</span>
          </div>
          <div className="flex items-center gap-3">
            {gpsError && (
              <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {gpsError}
              </span>
            )}
            {lastLocationUpdate > 0 && (
              <span className="text-[9px] text-slate-400 font-medium italic">
                GPS: {Math.floor((Date.now() - lastLocationUpdate) / 1000)}s ago
              </span>
            )}
          </div>
        </div>
      )}

      <main className="flex-grow p-4 space-y-6 overflow-y-auto">
        {/* Stats & Vehicle Card */}
        <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
           <div className="relative z-10">
             <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 opacity-80 mb-1">Total Earnings</p>
                  <p className="text-4xl font-black text-white">R{(riderProfile.total_earnings || 0).toFixed(2)}</p>
                </div>
                <div className="flex gap-1 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10">
                  {(['bicycle', 'scooter', 'car'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={async () => {
                        const { error } = await supabase
                          .from('rider_profiles')
                          .update({ vehicle_type: v })
                          .eq('id', riderProfile.id);
                        if (!error) fetchRiderData();
                      }}
                      className={`p-2 rounded-lg transition-all active:scale-95 ${riderProfile.vehicle_type === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-indigo-100 hover:bg-white/5'}`}
                    >
                      {v === 'bicycle' && <Bike className="w-4 h-4" />}
                      {v === 'scooter' && <Navigation className="w-4 h-4" />}
                      {v === 'car' && <Layers className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 opacity-60 mb-0.5">Completed</p>
                  <p className="text-xl font-bold">{riderProfile.completed_deliveries || 0} Drops</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 opacity-60 mb-0.5">Rating</p>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xl font-bold">{riderProfile.rating || '5.0'}</span>
                    <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                  </div>
                </div>
             </div>
           </div>
           
           {/* Decorative background element */}
           <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        {/* Active Order Section */}
        <section>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 px-1">Active Assignment</h3>
          
          {!activeOrder ? (
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center space-y-4">
               <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                 <Package className="w-8 h-8" />
               </div>
               <p className="text-sm font-bold text-slate-500">Wait for new assignments</p>
               {!riderProfile.is_online && (
                 <p className="text-[10px] text-orange-500 font-bold uppercase animate-bounce">Go online to receive orders</p>
               )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-primary/10 p-6 shadow-sm space-y-6">
               <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase mb-2 inline-block">
                      {activeOrder.delivery_status.replace('_', ' ')}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Order #{activeOrder.id.slice(0, 8)}</h4>
                    <p className="text-xs text-slate-500">{activeOrder.product_name} x{activeOrder.quantity}</p>
                  </div>
                  <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Bike className="w-6 h-6" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50 dark:border-slate-800">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Customer</p>
                    <p className="text-sm font-bold">{activeOrder.customer_name}</p>
                    <a href={`tel:${activeOrder.phone}`} className="text-xs text-primary font-bold flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" />
                      {activeOrder.phone}
                    </a>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Fixed Payout</p>
                    <div className="flex flex-col items-end">
                      <p className={`text-xl font-black ${activeOrder.delivery_fee > 5 ? 'text-orange-600' : 'text-emerald-600'}`}>R{activeOrder.delivery_fee?.toFixed(2) || '5.00'}</p>
                      {orderShop && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border mt-1 ${
                          calculateDistance(orderShop.latitude || 0, orderShop.longitude || 0, activeOrder.latitude || 0, activeOrder.longitude || 0) > 3 
                            ? 'bg-orange-100 text-orange-700 border-orange-200' 
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}>
                          {calculateDistance(orderShop.latitude || 0, orderShop.longitude || 0, activeOrder.latitude || 0, activeOrder.longitude || 0) > 3 ? 'Zone B (3-6km)' : 'Zone A (0-3km)'}
                        </span>
                      )}
                    </div>
                  </div>
               </div>

               {/* Address Section */}
               <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-start gap-3">
                  <div className="size-8 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Delivery Address</p>
                    <p className="text-xs font-bold leading-relaxed">{activeOrder.address}</p>
                  </div>
                  <button 
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.latitude},${activeOrder.longitude}`, '_blank')}
                    className="p-2 bg-primary text-white rounded-lg shadow-lg active:scale-95 transition-all shrink-0"
                  >
                    <Navigation className="w-4 h-4" />
                  </button>
               </div>

               {/* Manual Location Access */}
               <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
                 <div className="flex items-center gap-2">
                   <div className="size-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600">
                     <LocateFixed className="w-4 h-4" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Manual Location Fix</p>
                 </div>
                 <div className="flex gap-2">
                   <input 
                     type="text"
                     placeholder="Enter nearest street..."
                     value={manualLocation}
                     onChange={(e) => setManualLocation(e.target.value)}
                     className="flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 text-[10px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                   />
                   <button 
                     onClick={handleManualLocationSubmit}
                     disabled={isUpdatingManual}
                     className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                   >
                     {isUpdatingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set'}
                   </button>
                 </div>
               </div>

                {/* Tracking Progress */}
                <div className="bg-white dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    <span>Active Route</span>
                    <span className="text-primary">Live Now</span>
                  </div>
                  <div className="h-48 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10 shadow-inner">
                    <MapContainer 
                      center={{ lat: activeOrder.latitude, lng: activeOrder.longitude }} 
                      zoom={14} 
                      scrollWheelZoom={false} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <RecenterMap coords={riderLocation || { lat: activeOrder.latitude, lng: activeOrder.longitude }} />
                      
                      {/* Destination Marker */}
                      <Marker position={{ lat: activeOrder.latitude, lng: activeOrder.longitude }}>
                        <Popup>Delivery: {activeOrder.customer_name}</Popup>
                      </Marker>
                      
                      {/* Shop Marker */}
                      {orderShop && (
                        <Marker 
                          position={{ lat: orderShop.latitude || 0, lng: orderShop.longitude || 0 }}
                          icon={L.divIcon({
                            className: 'custom-shop-icon',
                            html: `<div class="bg-orange-600 p-1.5 rounded-xl border-2 border-white shadow-lg flex items-center justify-center text-white"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>`,
                            iconSize: [28, 28],
                            iconAnchor: [14, 28]
                          })}
                        />
                      )}
                      
                      {/* Rider Location Marker */}
                      {riderProfile?.is_online && riderLocation && (
                        <Marker 
                          position={riderLocation}
                          icon={L.divIcon({
                            className: 'custom-rider-icon',
                            html: `<div class="bg-indigo-600 p-1 rounded-full border-2 border-white shadow-lg flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg></div>`,
                            iconSize: [28, 28],
                            iconAnchor: [14, 28]
                          })} 
                        />
                      )}
                    </MapContainer>
                  </div>
                </div>

               {/* Action Buttons */}
               <div className="space-y-3">
                  {activeOrder.delivery_status === 'rider_assigned' && (
                    <button 
                      onClick={() => updateDeliveryStatus('preparing', 'picked_up')}
                      disabled={loading}
                      className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Package className="w-5 h-5" />}
                      Mark as Picked Up
                    </button>
                  )}
                  {activeOrder.delivery_status === 'picked_up' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-green-500 animate-pulse bg-green-50 dark:bg-green-500/10 py-2 rounded-lg">
                        <Navigation className="w-3 h-3" />
                        <span>Live Tracking Active</span>
                        {lastLocationUpdate > 0 && <span className="opacity-50">({Math.round((Date.now() - lastLocationUpdate)/1000)}s ago)</span>}
                      </div>
                      <button 
                        onClick={() => updateDeliveryStatus('completed', 'delivered')}
                        disabled={loading}
                        className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-green-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                        Confirm Delivery
                    </button>
                  </div>
                )}
             </div>
          </div>
        )}
      </section>
    </main>

      <div className="p-4 bg-white dark:bg-slate-950 border-t border-primary/10">
        <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-[0.2em]">LocalEats Rider Fleet v2.4.0</p>
      </div>
    </div>
  );
}

function ShopDashboardScreen({ onBack, orderAcceptedModal, setOrderAcceptedModal, showAlert, showConfirm, showPrompt, triggerHaptic, runWithProcessing, isOnline }: { 
  onBack: () => void, 
  orderAcceptedModal: { isOpen: boolean, productName: string, ownerMessage: string }, 
  setOrderAcceptedModal: Dispatch<SetStateAction<{ isOpen: boolean, productName: string, ownerMessage: string }>>,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  showPrompt: (title: string, message: string, onConfirm: (value: string) => void, defaultValue?: string) => void,
  triggerHaptic: (pattern?: number | number[]) => void,
  runWithProcessing: (action: () => Promise<void>, successCallback?: () => void) => Promise<void>,
  isOnline: boolean
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'stats' | 'marketing' | 'settings' | 'riders'>('orders');
  const [orderFilter, setOrderFilter] = useState<'today' | 'seven_days' | 'all'>('today');
  const [cancellationModal, setCancellationModal] = useState<{ isOpen: boolean, orderId: string | null }>({ isOpen: false, orderId: null });
  const [cancellationReason, setCancellationReason] = useState("");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [pairingCode, setPairingCode] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderLocations, setRiderLocations] = useState<Record<string, { lat: number, lng: number }>>({});

  const fetchRiders = async () => {
    try {
      const { data: riderData } = await supabase.from('rider_profiles').select('*').eq('is_online', true);
      setRiders(riderData || []);
      
      const { data: locData } = await supabase.from('rider_locations').select('*');
      const locMap: Record<string, { lat: number, lng: number }> = {};
      locData?.forEach(loc => {
        locMap[loc.rider_id] = { lat: Number(loc.latitude), lng: Number(loc.longitude) };
      });
      setRiderLocations(locMap);
    } catch (err) {
      console.error('Error fetching riders:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'riders') {
      fetchRiders();
      const channel = supabase.channel('rider-tracking')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_locations' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setRiderLocations(prev => ({
              ...prev,
              [payload.new.rider_id]: { lat: Number(payload.new.latitude), lng: Number(payload.new.longitude) }
            }));
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeTab]);

  const [isUploading, setIsUploading] = useState(false);
  const [menuImgUrl, setMenuImgUrl] = useState('');
  const [editingItemAvailable, setEditingItemAvailable] = useState<boolean>(true);
  const [editingItemCustomizations, setEditingItemCustomizations] = useState<{name: string, price: number}[]>([]);

  const autoAssignClosestRider = async (orderId: string) => {
    if (!shop) return;
    
    try {
      // 1. Get online riders who are not busy
      const { data: onlineRiders, error: riderError } = await supabase
        .from('rider_profiles')
        .select('*')
        .eq('is_online', true)
        .is('current_order_id', null);
      
      if (riderError || !onlineRiders || onlineRiders.length === 0) {
        console.log('No free riders available for auto-assignment');
        return;
      }

      // 2. Get their locations (must be updated within last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: locations, error: locError } = await supabase
        .from('rider_locations')
        .select('*')
        .in('rider_id', onlineRiders.map(r => r.id))
        .gt('updated_at', fiveMinutesAgo);

      if (locError || !locations || locations.length === 0) {
        console.log('No rider locations found for auto-assignment');
        return;
      }

      // 3. Find the closest one to the shop
      let closestRiderId = null;
      let minDistance = Infinity;

      locations.forEach(loc => {
        const dist = calculateDistance(shop.latitude || DEFAULT_COORDS.lat, shop.longitude || DEFAULT_COORDS.lng, Number(loc.latitude), Number(loc.longitude));
        if (dist < minDistance) {
          minDistance = dist;
          closestRiderId = loc.rider_id;
        }
      });

      if (closestRiderId) {
        // 4. Assign
        const { error: assignError } = await supabase
          .from('orders')
          .update({ 
            rider_id: closestRiderId, 
            delivery_status: 'rider_assigned',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);
        
        if (assignError) throw assignError;

        await supabase
          .from('rider_profiles')
          .update({ current_order_id: orderId })
          .eq('id', closestRiderId);

        console.log(`Auto-assigned rider ${closestRiderId} to order ${orderId}`);
        triggerHaptic([100, 50, 100]);
        toast.success(`Rider auto-assigned to Order #${orderId.slice(0, 5)}`, {
          description: "Finding closest available delivery partner."
        });
      }
    } catch (err) {
      console.error('Auto-assignment failed:', err);
    }
  };

  const handleMenuImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setIsUploading(true);
      const url = await uploadAvatar(e.target.files[0], shop?.id);
      setMenuImgUrl(url);
    } catch (err: any) {
      showAlert('Upload Error', err.message);
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
      
      const { error: updateError } = await supabase
        .from('shops')
        .update({ logo_url: url })
        .eq('id', shop.id);
        
      if (updateError) throw updateError;
      
      setShop({ ...shop, logo: url });
      showAlert('Success', 'Profile photo updated! We compressed it to save you space. 🚀');
    } catch (err: any) {
      showAlert('Logo Update Error', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditItem = (item: MenuItem | null) => {
    setEditingItem(item);
    setEditingItemAvailable(item ? item.is_available ?? true : true);
    setEditingItemCustomizations(item ? item.customizations || [] : []);
    setMenuImgUrl(item ? item.image_url || '' : '');
    setIsEditingMenu(true);
  };

  const saveMenuItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const itemData = {
      shop_id: shop.id,
      name: formData.get('name') as string,
      price: parseFloat(formData.get('price') as string),
      description: formData.get('description') as string,
      image_url: menuImgUrl || DEFAULT_MENU_IMAGE,
      is_available: editingItemAvailable,
      customizations: editingItemCustomizations
    };

    await runWithProcessing(async () => {
      if (editingItem) {
        const { error } = await supabase.from('menu_items').update(itemData).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('menu_items').insert([itemData]);
        if (error) throw error;
      }
    }, () => {
      setIsEditingMenu(false);
      setEditingItem(null);
      // Refresh shop data to get new menu
      window.location.reload(); 
    });
  };

  const deleteMenuItem = async (itemId: string) => {
    showConfirm('Delete Item', 'Are you sure you want to remove this item from your menu?', async () => {
      try {
        const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
        if (error) throw error;
        showAlert('Success', 'Item deleted');
        window.location.reload();
      } catch (err: any) {
        showAlert('Error', err.message);
      }
    });
  };

  const assignRider = async (orderId: string, riderId: string) => {
    try {
      const { error } = await supabase.from('orders')
        .update({ 
          rider_id: riderId, 
          delivery_status: 'rider_assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (error) throw error;
      showAlert('Success', 'Rider assigned to order!');
      triggerHaptic();
    } catch (err: any) {
      showAlert('Error', err.message);
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
      console.error('QR code generation failed:', err);
    }

    // In a real app, you would save this code to the database with an expiry
    setTimeout(() => {
      setPairingCode('');
      setQrCodeData('');
    }, 600000); // Expires in 10 mins
  };

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
          if (!isOnline) {
            const cachedShop = localStorage.getItem(`cached_shop_${user.id}`);
            const cachedOrders = localStorage.getItem(`cached_shop_orders_${user.id}`);
            if (cachedShop) setShop(JSON.parse(cachedShop));
            if (cachedOrders) setOrders(JSON.parse(cachedOrders));
            setLoading(false);
            return;
          }
          console.error('Shop fetch error:', shopError);
          throw shopError;
        }
        
        if (!shopData) {
          console.warn('No shop found for owner:', user.id);
          setError("No shop found associated with your account. Please contact support or ensure your shop is linked to your ID.");
          return;
        }

        // Fetch menu items for the shop
        const { data: menuData } = await supabase
          .from('menu_items')
          .select('*')
          .eq('shop_id', shopData.id);

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
          phone: shopData.phone,
          latitude: shopData.latitude,
          longitude: shopData.longitude,
          menu: (menuData || []).map(m => ({
            id: String(m.id),
            name: m.name,
            price: Number(m.price),
            displayPrice: `R${Number(m.price).toFixed(2)}`,
            image: m.image_url || DEFAULT_MENU_IMAGE,
            description: m.description || "",
            category: m.category || "Main Course",
            is_available: m.is_available !== false,
            customizations: m.customizations || []
          }))
        };

        setShop(formattedShop);
        localStorage.setItem(`cached_shop_${user.id}`, JSON.stringify(formattedShop));

        if (shopData) {
          // 2. Initial fetch of orders for this shop
          console.log('Fetching orders for shop ID:', shopData.id);
          const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('shop_id', shopData.id)
            .order('created_at', { ascending: false });

          if (ordersError) {
            if (!isOnline) {
              const cachedOrders = localStorage.getItem(`cached_shop_orders_${user.id}`);
              if (cachedOrders) setOrders(JSON.parse(cachedOrders));
              setLoading(false);
              return;
            }
            console.error('Orders fetch error:', ordersError);
            throw ordersError;
          }
          
          console.log(`Found ${ordersData?.length || 0} orders for this shop.`);
          setOrders((ordersData || []) as Order[]);
          localStorage.setItem(`cached_shop_orders_${user.id}`, JSON.stringify(ordersData || []));

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

  const updateOrderStatus = async (orderId: string, newStatus: string, reason?: string) => {
    if (!isOnline) {
      showAlert('Connection Issue', 'You appear to be offline. Status updates require a connection to notify the customer.');
      return;
    }
    if (newStatus === 'cancelled' && !reason) {
      setCancellationModal({ isOpen: true, orderId });
      return;
    }

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

  const executeStatusUpdate = async (orderId: string, newStatus: string, ownerMessage?: string, reason?: string) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10); // Subtle feedback for status change
    }
    
    await runWithProcessing(async () => {
      // Fetch current order to get existing history and delivery info
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const history = currentOrder?.status_history || [];
      const newHistory = [...history, { 
        status: newStatus, 
        timestamp: new Date().toISOString(),
        ...(reason && { reason })
      }];

      // BUSINESS LOGIC: If a guest ordered delivery and it's marked as ready, 
      // it shifts to 'finding_rider' status instead of just 'ready'
      let finalStatus = newStatus;
      let deliveryStatus = currentOrder?.delivery_status || 'none';

      if (newStatus === 'ready' && currentOrder?.is_delivery) {
        finalStatus = 'ready';
        deliveryStatus = 'finding_rider';
        autoAssignClosestRider(orderId);
      }

      const updateData: any = { 
        status: finalStatus,
        status_history: newHistory,
        delivery_status: deliveryStatus
      };
      if (ownerMessage) updateData.owner_message = ownerMessage;
      if (reason) updateData.cancellation_reason = reason;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
    }, () => {
      if (newStatus === 'cancelled') {
        setCancellationModal({ isOpen: false, orderId: null });
        setCancellationReason("");
      }
    });
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
      case 'cancelled': return 'bg-rose-100 text-rose-600 border-rose-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Calculate Stats
  const filteredOrders = orders.filter(o => {
    const orderDate = new Date(o.created_at);
    const now = new Date();
    
    if (orderFilter === 'today') {
      return orderDate.toDateString() === now.toDateString();
    }
    
    if (orderFilter === 'seven_days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return orderDate >= sevenDaysAgo;
    }
    
    return true; // 'all'
  });

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

  const toggleItemAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Update local state
      setShop(prev => {
        if (!prev) return null;
        return {
          ...prev,
          menu: prev.menu.map(item => item.id === itemId ? { ...item, is_available: !currentStatus } : item)
        };
      });
      triggerHaptic(50);
    } catch (err: any) {
      showAlert('Error', 'Failed to update stock: ' + err.message);
    }
  };

  const popularItemName = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.product_name] = (counts[o.product_name] || 0) + (o.quantity || 1);
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
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
    <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans relative shadow-2xl">
      <header className="sticky top-0 z-50 glass-effect border-b border-primary/10">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer hover:text-orange-600 transition-colors">
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
          <div className="w-10 h-10"></div>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-4 pb-24 max-w-screen-xl mx-auto w-full">
        {!loading && !error && shop && activeTab === 'orders' && (
          <div className="space-y-4 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3">
              <motion.div whileHover={{ y: -2 }} className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-2xl border border-orange-100 dark:border-orange-800/50 transition-all shadow-sm">
                <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Active</p>
                <p className="text-xl font-black text-orange-700 dark:text-orange-300">{activeOrdersCount}</p>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} className="bg-green-50 dark:bg-green-900/20 p-3 rounded-2xl border border-green-100 dark:border-green-800/50 transition-all shadow-sm">
                <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">Ready</p>
                <p className="text-xl font-black text-green-700 dark:text-green-300">{readyOrdersCount}</p>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/50 transition-all shadow-sm">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Revenue</p>
                <p className="text-xl font-black text-blue-700 dark:text-blue-300">R{Math.round(todayRevenue)}</p>
              </motion.div>
            </div>

            {/* Date Range Filter */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
              {(['today', 'seven_days', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setOrderFilter(filter)}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    orderFilter === filter 
                      ? 'bg-white dark:bg-slate-700 text-primary shadow-md' 
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  {filter === 'today' ? 'Today' : filter === 'seven_days' ? 'Last 7 Days' : 'All Time'}
                </button>
              ))}
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-600">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100 uppercase tracking-tight">Rider Fleet</p>
                  <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">Connect delivery partners</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('riders')}
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
              
              {/* Register Shop for User */}
              {error.includes("No shop found") && (
                <button 
                  onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    
                    try {
                      const { error: shopErr } = await supabase
                        .from('shops')
                        .insert({
                          name: "My Local Shop",
                          description: "Freshly prepared Kotas and more",
                          location: "Local Area",
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
                  Get Started: Register Shop
                </button>
              )}
            </div>
          </div>
        ) : loading ? (
          <ShopOrdersSkeleton />
        ) : activeTab === 'inventory' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Menu Items</h3>
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
                  const hasDescription = item.description && item.description.length > 0;
                  const isLongDescription = item.description && item.description.length > 40;

                  return (
                    <div key={item.id} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5 shadow-sm flex flex-col space-y-3">
                      <div className="flex items-center gap-3">
                        <BlurUpImage src={item.image_url || DEFAULT_MENU_IMAGE} alt={item.name} className="w-12 h-12 rounded-xl shrink-0" blurHash={`https://picsum.photos/seed/${item.id || 'menu'}/10/10?blur=10`} />
                        <div className="flex-grow">
                          <p className="font-bold text-sm">{item.name}</p>
                          <p className="font-bold text-primary text-xs">R{item.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleItemAvailability(item.id, item.is_available !== false)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all active:scale-95 cursor-pointer ${
                              item.is_available !== false 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {item.is_available !== false ? 'In Stock' : 'Sold Out'}
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
                <p className="text-xs text-slate-500 px-12">Click "Add New Item" to start building your menu.</p>
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
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Most Popular</p>
                <p className="text-xl font-black truncate">{popularItemName}</p>
                <p className="text-[10px] text-primary font-bold uppercase mt-1 tracking-tighter">Bestseller</p>
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
        ) : activeTab === 'riders' ? (
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
                <MapContainer center={shop?.latitude && shop?.longitude ? { lat: shop.latitude, lng: shop.longitude } : DEFAULT_COORDS} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {shop?.latitude && shop?.longitude && <Marker position={{ lat: shop.latitude, lng: shop.longitude }} />}
                  {riders.map(rider => riderLocations[rider.id] && (
                    <Marker key={rider.id} position={riderLocations[rider.id]}>
                      <div className={`p-1 rounded-full shadow-lg border-2 ${rider.current_order_id ? 'bg-orange-500 border-white' : 'bg-green-500 border-white'}`}>
                        <Bike className="w-3 h-3 text-white" />
                      </div>
                    </Marker>
                  ))}
                  <ChangeView center={shop?.latitude && shop?.longitude ? { lat: shop.latitude, lng: shop.longitude } : DEFAULT_COORDS} />
                </MapContainer>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 bg-green-500 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2 bg-orange-500 rounded-full"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">On Delivery</span>
                </div>
              </div>
            </div>

            {/* Rider List & Assignment */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">Online Riders ({riders.length})</h4>
              
              {riders.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/30 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <div className="size-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <UserMinus className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500">No riders are currently online.</p>
                  <button 
                    onClick={generatePairingCode}
                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
                  >
                    Generate Entry Code
                  </button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {riders.map(rider => (
                    <div key={rider.id} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-primary/5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{rider.full_name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">{rider.vehicle_type} • {rider.current_order_id ? 'In Delivery' : 'Available'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${rider.current_order_id ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            {rider.current_order_id ? 'Busy' : 'Free'}
                          </span>
                        </div>
                      </div>

                      {/* Manual Assignment Section */}
                      {orders.some(o => o.status === 'ready' && !o.rider_id) && !rider.current_order_id && (
                        <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assign Pending Order</p>
                          <div className="flex flex-col gap-2">
                            {orders.filter(o => o.status === 'ready' && !o.rider_id).map(readyOrder => {
                              // Rider Suggestion Logic: Calculate Proximity
                              const riderPos = riderLocations[rider.id];
                              const shopPos = shop?.latitude && shop?.longitude ? { lat: shop.latitude, lng: shop.longitude } : null;
                              let distance: number | null = null;
                              
                              if (riderPos && shopPos) {
                                distance = calculateDistance(riderPos.lat, riderPos.lng, shopPos.lat, shopPos.lng);
                              }

                              const isClosest = distance !== null && distance < 2; // Simple threshold for "close"

                              return (
                                <motion.div 
                                  key={readyOrder.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={`flex items-center justify-between p-2 rounded-xl border ${isClosest ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100'}`}
                                >
                                  <div>
                                    <p className="text-[10px] font-bold">Order #{readyOrder.id.slice(0, 5)}</p>
                                    {distance !== null && (
                                      <p className="text-[8px] text-indigo-600 font-bold uppercase">{distance.toFixed(1)}km away</p>
                                    )}
                                  </div>
                                  <button 
                                    onClick={async () => {
                                      try {
                                        const { error: updateErr } = await supabase
                                          .from('orders')
                                          .update({ rider_id: rider.id, delivery_status: 'finding_rider' })
                                          .eq('id', readyOrder.id);
                                        if (updateErr) throw updateErr;
                                        
                                        const { error: riderErr } = await supabase
                                          .from('rider_profiles')
                                          .update({ current_order_id: readyOrder.id })
                                          .eq('id', rider.id);
                                        if (riderErr) throw riderErr;

                                        showAlert('Success', `Assigned order #${readyOrder.id.slice(0,5)} to ${rider.full_name}`);
                                        fetchRiders();
                                      } catch (err: any) {
                                        showAlert('Error', 'Assignment failed: ' + err.message);
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all active:scale-95 cursor-pointer ${
                                      isClosest ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {isClosest ? 'Accept Sugggestion' : 'Assign'}
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
                    <p className="text-xs text-indigo-100/80 mb-6">Equip your fleet with the Rider App</p>
                    
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
                          <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mb-1">Enter Code in Rider App</p>
                          <p className="text-4xl font-black tracking-[0.3em] font-mono">{pairingCode}</p>
                        </div>
                        <div className="flex justify-center bg-white p-3 rounded-2xl shadow-inner">
                          {qrCodeData ? (
                            <img src={qrCodeData} alt="QR Code" className="w-32 h-32" />
                          ) : (
                            <div className="w-32 h-32 flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-indigo-200" />
                            </div>
                          )}
                        </div>
                        <button onClick={() => setPairingCode('')} className="w-full py-2 text-xs font-bold text-indigo-200 hover:text-white transition-colors cursor-pointer">
                          Dismiss
                        </button>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'settings' ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm">
              <h3 className="font-bold text-lg mb-4">Shop Profile</h3>
              <p className="text-xs text-slate-500 mb-6">Manage how your shop appears to customers.</p>
              
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
                    <input type="file" className="hidden" accept="image/*" onChange={handleShopLogoUpload} disabled={isUploading} />
                  </label>
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm">{shop.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Shop ID: {shop.id.slice(0, 8)}</p>
                </div>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Shop Description</label>
                    <textarea 
                      id="shop-desc-input"
                      defaultValue={shop.description || ''}
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mt-1 text-sm font-medium resize-none focus:border-primary/30 transition-colors"
                      placeholder="Tell customers what makes your joint legendary..."
                    />
                 </div>
                 <button 
                   onClick={async () => {
                     const desc = (document.getElementById('shop-desc-input') as HTMLTextAreaElement)?.value;
                     await runWithProcessing(async () => {
                       const { error } = await supabase
                         .from('shops')
                         .update({ description: desc })
                         .eq('id', shop.id);
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

            {/* Cash on Arrival (COA) Trust Badge Settings Card */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-primary/5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Banknote className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#221610] dark:text-white text-base">Cash on Arrival (COA) Trust Badge</h3>
                  <p className="text-xs text-slate-500 font-medium">Allow customers to choose cash payment safely</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 gap-4">
                <div className="space-y-1 my-1 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Enable Trust Status Banner</p>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                    Displays high-trust badges stating: <strong className="text-slate-700 dark:text-slate-300">"💵 First-Time Local Trust Active: Cash on Arrival Accepted here!"</strong>. Boosts order volume by reassuring first-time visitors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const isTrustCurrentlyActive = localStorage.getItem('localeats_cash_trust_' + shop.id) === 'true' || 
                      (shop as any).cash_trust_enabled === true || 
                      (shop as any).cash_trust_enabled === 'true' ||
                      (shop as any).localeats_cash_trust === true || 
                      (shop as any).localeats_cash_trust === 'true';
                    const nextVal = !isTrustCurrentlyActive;
                    
                    await runWithProcessing(async () => {
                      // Attempt to persist remote db column update
                      try {
                        const { error } = await supabase
                          .from('shops')
                          .update({ 
                            localeats_cash_trust: nextVal,
                            cash_trust_enabled: nextVal
                          })
                          .eq('id', shop.id);
                        if (error) console.warn("Supabase column update warn:", error);
                      } catch (err) {
                        console.warn("Supabase column error:", err);
                      }
                      
                      // Always update LocalStorage as persistent fallback (Rule #1)
                      localStorage.setItem('localeats_cash_trust_' + shop.id, String(nextVal));
                      
                      const updatedShop = { ...shop, localeats_cash_trust: nextVal, cash_trust_enabled: nextVal } as any;
                      setShop(updatedShop);
 
                      toast.success(nextVal ? "COA Trust Banner activated! Customers will now see your trust badges." : "COA trust features deactivated.");
                    });
                  }}
                  className={`px-4 py-3 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all text-white shadow-lg shrink-0 ${
                    (localStorage.getItem('localeats_cash_trust_' + shop.id) === 'true' || 
                    (shop as any).cash_trust_enabled === true || 
                    (shop as any).cash_trust_enabled === 'true' ||
                    (shop as any).localeats_cash_trust === true || 
                    (shop as any).localeats_cash_trust === 'true')
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/10' 
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/10'
                  }`}
                >
                  {(localStorage.getItem('localeats_cash_trust_' + shop.id) === 'true' || 
                  (shop as any).cash_trust_enabled === true || 
                  (shop as any).cash_trust_enabled === 'true' ||
                  (shop as any).localeats_cash_trust === true || 
                  (shop as any).localeats_cash_trust === 'true') ? 'Disable Banner' : 'Enable Banner'}
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
          </div>
        ) : (
          filteredOrders.map((order) => {
            const dist = (order.latitude && order.longitude && shop.latitude && shop.longitude) 
              ? calculateDistance(shop.latitude, shop.longitude, order.latitude, order.longitude)
              : null;
            const zone = dist !== null ? (dist > 3 ? 'B' : 'A') : null;
            const zoneFee = zone === 'A' ? 5 : 10;

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
                      <span className="text-xs font-bold text-slate-400">#{order.id.slice(0, 8)}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${getStatusColor(order.status, order.delivery_status)}`}>
                        {order.status === 'pending' && <Clock className="w-3 h-3" />}
                        {order.status === 'confirmed' && <CheckCircle2 className="w-3 h-3" />}
                        {order.status === 'preparing' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {order.status === 'ready' && <Package className="w-3 h-3" />}
                        {order.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {order.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                        {order.delivery_status ? order.delivery_status.replace('_', ' ') : order.status}
                      </span>
                      {order.is_delivery && (
                        <>
                          <span className="bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1">
                            <Navigation className="w-2 h-2" />
                            Rider Required
                          </span>
                          {zone && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border ${zone === 'A' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                              Zone {zone} - R{zoneFee} {dist && `(${dist.toFixed(1)}km)`}
                            </span>
                          )}
                        </>
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
                      {order.payment_method === 'cash' || order.payment_method === 'cash_on_arrival' ? <Banknote className="w-3.5 h-3.5 text-green-500" /> : <CreditCard className="w-3.5 h-3.5 text-blue-500" />}
                      {order.payment_method === 'cash' ? 'Cash' : order.payment_method === 'cash_on_arrival' ? 'COA' : 'Card'}
                    </div>
                  )}
                </div>
                {order.notes && (
                  <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-100 dark:border-orange-500/20">
                    <p className="text-xs text-orange-700 dark:text-orange-400 font-medium italic">Note: "{order.notes}"</p>
                  </div>
                )}
                {order.delivery_instructions && (
                  <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between">
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 font-medium font-mono text-[10px]">📍 {order.delivery_instructions}</p>
                    {order.latitude && order.longitude && (
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`, '_blank')}
                        className="p-1.5 bg-white dark:bg-slate-800 rounded-md shadow-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                        title="View on Map"
                      >
                        <Navigation className="w-3 h-3" />
                      </button>
                    )}
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
            </motion.div>
          );
        })
      )}
    </main>

      <nav className="bg-white dark:bg-slate-900 border-t border-primary/10 px-4 py-4 flex justify-between items-center sticky bottom-0">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === 'orders' ? 'text-primary' : 'text-slate-400'}`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Orders</span>
        </button>
        <button 
          onClick={() => setActiveTab('riders')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === 'riders' ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <Navigation className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Riders</span>
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === 'inventory' ? 'text-primary' : 'text-slate-400'}`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Stock</span>
        </button>
        <button 
          onClick={() => setActiveTab('marketing')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === 'marketing' ? 'text-primary' : 'text-slate-400'}`}
        >
          <Megaphone className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Promo</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer flex-1 ${activeTab === 'settings' ? 'text-primary' : 'text-slate-400'}`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[8px] font-bold uppercase tracking-wider">Map</span>
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
              onClick={() => setCancellationModal({ isOpen: false, orderId: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xl font-bold">Cancellation Reason</h3>
                <p className="text-xs text-slate-500">Please provide a reason for cancelling this order.</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  {[
                    "Out of Ingredients", 
                    "Kitchen Too Busy", 
                    "Invalid Address", 
                    "Customer Requested",
                    "Closing Soon"
                  ].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setCancellationReason(reason)}
                      className={`w-full p-4 rounded-2xl text-left text-sm font-bold transition-all border ${
                        cancellationReason === reason 
                          ? 'bg-orange-50 border-orange-200 text-orange-600 ring-2 ring-orange-500/10' 
                          : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 mt-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Reason (Optional)</label>
                  <textarea 
                    value={cancellationReason.includes("Out of Ingredients") || cancellationReason === "" ? "" : cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Tell the customer why..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none resize-none"
                    rows={2}
                  />
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button 
                    onClick={() => setCancellationModal({ isOpen: false, orderId: null })}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl font-bold uppercase tracking-widest text-xs"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => executeStatusUpdate(cancellationModal.orderId!, 'cancelled', undefined, cancellationReason || "Operational issues")}
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
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                  <p className="text-xs text-slate-500">Update your shop menu</p>
                </div>
                <button onClick={() => setIsEditingMenu(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={saveMenuItem} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Item Name</label>
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Price (R)</label>
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Photo</label>
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
                           <BlurUpImage src={menuImgUrl || editingItem?.image_url || DEFAULT_MENU_IMAGE} alt="Menu Item" className="w-full h-full rounded-lg" blurHash={`https://picsum.photos/seed/${editingItem?.id || 'new'}/10/10?blur=10`} />
                         ) : (
                           <Camera className="w-5 h-5 text-slate-400" />
                         )}
                       </label>
                       <input 
                         name="image_url"
                         type="text" 
                         value={menuImgUrl || editingItem?.image_url || ''}
                         onChange={(e) => setMenuImgUrl(e.target.value)}
                         placeholder="Or paste URL..."
                         className="flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                       />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Available in Stock</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Show or hide on menu</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setEditingItemAvailable(!editingItemAvailable)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${editingItemAvailable ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingItemAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Customizations</label>
                    <button 
                      type="button"
                      onClick={() => setEditingItemCustomizations([...editingItemCustomizations, { name: '', price: 0 }])}
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
                              const newC = editingItemCustomizations.filter((_, i) => i !== idx);
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Description</label>
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
                  {editingItem ? 'Save Changes' : 'Add to Menu'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminOrdersScreen({ shops, onBack, showAlert, showConfirm, runWithProcessing, isOnline }: { 
  shops: Shop[],
  onBack: () => void,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  runWithProcessing: (action: () => Promise<void>, successCallback?: () => void) => Promise<void>,
  isOnline: boolean
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
      
      if (error) {
        if (!isOnline) {
          const cached = localStorage.getItem('admin_cached_orders');
          if (cached) setOrders(JSON.parse(cached));
          setLoading(false);
          return;
        }
        throw error;
      }
      setOrders((data || []) as Order[]);
      localStorage.setItem('admin_cached_orders', JSON.stringify(data || []));
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      if (error.message === 'Failed to fetch') {
        console.error('Network Error: Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (status: string, orderId: string, message?: string) => {
    if (!isOnline) {
      showAlert('Connection Issue', 'You appear to be offline. Status updates require a connection to notify the customer.');
      return;
    }
    if ("vibrate" in navigator) {
      navigator.vibrate(10); // Subtle feedback for status change
    }
    
    await runWithProcessing(async () => {
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
      let deliveryStatus = currentOrder?.delivery_status || 'none';

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
    }, fetchOrders);
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
      case 'cancelled': return 'bg-rose-100 text-rose-600 border-rose-200';
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
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex min-h-screen w-full flex-col max-w-screen-xl mx-auto overflow-x-hidden shadow-2xl">
        <header className="flex items-center p-4 bg-white dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
          <button onClick={onBack} className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center mr-10">Admin Dashboard</h1>
        </header>

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
            <ShopOrdersSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <Package className="w-12 h-12" />
              <p className="text-slate-500 font-medium">No orders found</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const shop = shops.find(s => s.id === order.shop_id);
              const dist = (order.latitude && order.longitude && shop?.latitude && shop?.longitude) 
                ? calculateDistance(shop.latitude, shop.longitude, order.latitude, order.longitude)
                : null;
              const zone = dist !== null ? (dist > 3 ? 'B' : 'A') : null;

              return (
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
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1">
                      <Navigation className="w-2 h-2" />
                      Rider Needed (R{order.delivery_fee})
                    </span>
                    {zone && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border ${zone === 'A' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
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
                      <p className="truncate">{order.address}, {order.city}</p>
                    </div>
                    {order.latitude && order.longitude && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.latitude},${order.longitude}`, '_blank');
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
                                {order.payment_method === 'cash' || order.payment_method === 'cash_on_arrival' ? <Banknote className="w-3.5 h-3.5 text-green-500" /> : <CreditCard className="w-3.5 h-3.5 text-blue-500" />}
                                {order.payment_method === 'cash' ? 'Cash' : order.payment_method === 'cash_on_arrival' ? 'Cash on Arrival (COA)' : 'Card'}
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

                    {order.delivery_instructions && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Navigation className="w-4 h-4 text-indigo-600" />
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Delivery Directions</p>
                        </div>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30 font-medium font-mono text-[10px]">
                          {order.delivery_instructions}
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
                  {['pending', 'confirmed'].includes(order.status) && (
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

        {/* Cancellation Confirmation Modal */}
        {orderToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-950 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
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
            <div className="bg-white dark:bg-slate-950 w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
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

function OrderHistoryScreen({ 
  session, 
  onBack, 
  userProfile, 
  showAlert, 
  showConfirm, 
  isOnline,
  shops = [],
  addToCart,
  setCurrentScreen,
  triggerHaptic
}: { 
  session: Session | null, 
  onBack: () => void, 
  userProfile: UserProfile,
  showAlert: (title: string, message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  isOnline: boolean,
  shops?: Shop[],
  addToCart?: (item: MenuItem, shopId: string, quantity?: number, specialInstructions?: string, selectedCustomizations?: {name: string, price: number}[]) => void,
  setCurrentScreen?: Dispatch<SetStateAction<Screen>>,
  triggerHaptic?: (pattern?: number | number[]) => void
}) {
  const [orders, setOrders] = useState<any[]>(() => {
    return safeLocalStorageGet('cached_orders', []);
  });
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [cancelReason, setCancelReason] = useState("");
  const [customReasonText, setCustomReasonText] = useState("");

  // Search & advanced filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterShop, setFilterShop] = useState("All");
  const [filterDate, setFilterDate] = useState("All");

  // Support/Help query states
  const [supportOrder, setSupportOrder] = useState<any | null>(null);
  const [issueType, setIssueType] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [isSendingIssue, setIsSendingIssue] = useState(false);

  // Reorder Preview configurations
  const [reorderPreviewItem, setReorderPreviewItem] = useState<any | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (!isOnline) {
          setLoading(false);
          return;
        }
        throw error;
      }
      setOrders(data || []);
      safeLocalStorageSet('cached_orders', JSON.stringify(data || []));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [session, isOnline]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Aggregate veteran diner statistics
  const stats = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalSpent = completedOrders.reduce((sum, o) => sum + (o.price || 0) + (o.delivery_fee || 0), 0);
    const totalOrdersCount = completedOrders.length;
    
    const shopCounts: { [key: string]: number } = {};
    completedOrders.forEach(o => {
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

    const favoriteShopObj = shops.find(s => s.id === favoriteShopId);
    const favoriteShopName = favoriteShopObj ? favoriteShopObj.name : 'None yet';

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
      milestone
    };
  }, [orders, shops]);

  // List of unique shops ordered from to populate filters
  const orderedShopsList = useMemo(() => {
    const sids = Array.from(new Set(orders.map(o => o.shop_id)));
    return shops.filter(s => sids.includes(s.id));
  }, [orders, shops]);

  // Combined filters: Status + Search Input + Shop Selected + Date range selected
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Filter status
      if (filterStatus !== 'All') {
        const isPendingGroup = filterStatus === 'Pending' && (o.status === 'pending' || o.status === 'confirmed');
        const isReadyGroup = filterStatus === 'Ready' && o.status === 'ready';
        const isDeliveredGroup = filterStatus === 'Delivered' && o.status === 'completed';
        const isCancelledGroup = filterStatus === 'Cancelled' && o.status === 'cancelled';
        if (!isPendingGroup && !isReadyGroup && !isDeliveredGroup && !isCancelledGroup) return false;
      }

      // 2. Filter search query text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const itemName = (o.product_name || '').toLowerCase();
        const orderId = (o.id || '').toString().toLowerCase();
        const shop = shops.find(s => s.id === o.shop_id);
        const shopName = (shop?.name || '').toLowerCase();
        if (!itemName.includes(query) && !orderId.includes(query) && !shopName.includes(query)) return false;
      }

      // 3. Filter restaurant shop
      if (filterShop !== 'All' && o.shop_id !== filterShop) return false;

      // 4. Filter date range
      if (filterDate !== 'All') {
        const orderDate = new Date(o.created_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (filterDate === '7days' && diffDays > 7) return false;
        if (filterDate === '30days' && diffDays > 30) return false;
        if (filterDate === '90days' && diffDays > 90) return false;
      }

      return true;
    });
  }, [orders, filterStatus, searchQuery, filterShop, filterDate, shops]);

  const handleCancelOrderSubmit = async () => {
    if (!cancellingOrderId) return;
    
    let reasonToSend = cancelReason;
    if (cancelReason === 'Other') {
      if (!customReasonText.trim()) {
        showAlert('Details Required', 'Please tell us more about the reason in the text box.');
        return;
      }
      reasonToSend = `Other: ${customReasonText}`;
    }

    if (!reasonToSend) {
      showAlert('Selection Required', 'Please select a reason for cancellation.');
      return;
    }

    try {
      setIsCancelling(true);
      triggerHaptic?.([100, 50, 100]);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reasonToSend,
          updated_at: new Date().toISOString()
        })
        .eq('id', cancellingOrderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === cancellingOrderId ? { ...o, status: 'cancelled', cancellation_reason: reasonToSend } : o));
      showAlert("Success", "Order cancelled successfully.");
      setCancellingOrderId(null);
      setCancelReason("");
      setCustomReasonText("");
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      showAlert('Error', `Failed to cancel order: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  // Reorder confirmation flow
  const handleReorderClick = (order: any) => {
    triggerHaptic?.(10);
    const shop = shops.find(s => s.id === order.shop_id);
    let originalMenuItem: MenuItem | undefined = undefined;
    if (shop) {
      originalMenuItem = shop.menu?.find(m => m.name.toLowerCase() === order.product_name.toLowerCase() || m.id === order.product_variant);
    }

    setReorderPreviewItem({
      order,
      shop,
      originalItem: originalMenuItem,
      quantity: order.quantity || 1,
      specialInstructions: order.notes || order.special_instructions || "",
      price: originalMenuItem ? originalMenuItem.price : order.price
    });
  };

  const handleConfirmReorder = () => {
    if (!reorderPreviewItem) return;
    const { order, shop, originalItem, quantity, specialInstructions } = reorderPreviewItem;

    let menuItem: MenuItem = originalItem || {
      id: order.product_variant || order.product_name,
      name: order.product_name,
      price: order.price,
      displayPrice: `R ${order.price.toFixed(2)}`,
      image: shop?.logo || DEFAULT_SHOP_LOGO,
      customizations: order.customizations || []
    };

    if (addToCart) {
      addToCart(menuItem, order.shop_id, quantity, specialInstructions, order.customizations || []);
      triggerHaptic?.([50, 30, 50]);
      showAlert("Reordered!", `"${order.product_name}" has been added to your cart.`);
      setReorderPreviewItem(null);
      if (setCurrentScreen) {
        setCurrentScreen('checkout');
      }
    }
  };

  // Support ticket submissions to DB
  const handleSupportSubmit = async () => {
    if (!supportOrder || !issueType) return;
    if (!issueDesc.trim()) {
      showAlert("Details Required", "Please provide a description of the issue.");
      return;
    }
    
    setIsSendingIssue(true);
    triggerHaptic?.(10);
    try {
      const shopName = shops.find(s => s.id === supportOrder.shop_id)?.name || "Kitchen";
      const subject = `[ORDER SUPPORT] ID: #${supportOrder.id.toString().slice(-6)} (${shopName})`;
      const completeMessage = `Issue Type: ${issueType}\n\nDetails:\n${issueDesc}\n\nOrder Info:\nProduct: ${supportOrder.product_name} x${supportOrder.quantity}\nTotal: R ${(supportOrder.price + (supportOrder.delivery_fee || 0)).toFixed(2)}`;
      
      const { error } = await supabase.from('contact_messages').insert([{
        name: userProfile.fullName || userProfile.email || 'Loyal Client',
        email: userProfile.email || session?.user?.email || 'client@localeats.co.za',
        message: `${subject}\n\n${completeMessage}`,
        user_id: session?.user?.id || null,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;
      
      showAlert("Report Received", "Your support ticket has been created! Our support team will get in touch soon.");
      setSupportOrder(null);
      setIssueType("");
      setIssueDesc("");
    } catch (err: any) {
      console.error("Error submitting issue:", err);
      showAlert("Error", `Failed to send issue details: ${err.message}`);
    } finally {
      setIsSendingIssue(false);
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
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

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
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen font-display">
      <div className="relative flex h-auto min-h-screen w-full flex-col bg-white dark:bg-slate-950 overflow-x-hidden shadow-xl">
        <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 mr-4">
          <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between w-full">
            <div onClick={onBack} className="text-slate-900 dark:text-slate-100 flex size-12 shrink-0 items-center justify-start cursor-pointer transition-colors hover:text-orange-500">
              <ArrowLeft className="w-6 h-6" />
            </div>
            {loading ? (
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto"></div>
            ) : (
              <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">My Orders</h2>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 max-w-screen-xl mx-auto w-full flex flex-col gap-4">
          {/* Veteran Dashboard Summary Card */}
          {!loading && orders.length > 0 && (
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/80 text-white p-5 rounded-3xl border border-slate-200/5 dark:border-slate-800/80 shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-top duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Diner Profile</p>
                  <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                    {userProfile.fullName || 'Loyal Diner'} 
                    <span className="text-[10px] bg-orange-600/20 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{stats.milestone}</span>
                  </h3>
                </div>
                <div className="size-10 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500">
                  <BarChart3 className="w-5 h-5 animate-pulse" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-800/60">
                <div className="flex flex-col gap-0.5 p-2 bg-slate-900/60 rounded-2xl border border-slate-800/40">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
                    <Banknote className="w-3 h-3 text-emerald-500" /> Spendings
                  </span>
                  <span className="text-xs font-black text-white mt-1">R {stats.totalSpent.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-0.5 p-2 bg-slate-900/60 rounded-2xl border border-slate-800/40">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none">
                    <ShoppingBag className="w-3 h-3 text-orange-500" /> Count
                  </span>
                  <span className="text-xs font-black text-white mt-1">{stats.totalOrdersCount} Completed</span>
                </div>
                <div className="flex flex-col gap-0.5 p-2 bg-slate-900/60 rounded-2xl border border-slate-800/40 overflow-hidden">
                  <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1 leading-none overflow-hidden truncate whitespace-nowrap">
                    <Heart className="w-3 h-3 text-rose-500" /> Fav Spot
                  </span>
                  <span className="text-[10px] font-black text-orange-400 mt-1 truncate max-w-full leading-none">{stats.favoriteShopName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Search & Filtering Utilities */}
          {!loading && orders.length > 0 && (
            <div className="flex flex-col gap-2.5 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search orders, items, or shops..."
                  className="w-full bg-white dark:bg-slate-950 pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white"
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

              <div className="grid grid-cols-2 gap-2 mt-0.5">
                {/* Shop Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-slate-400">Filter by Shop</label>
                  <select
                    value={filterShop}
                    onChange={(e) => setFilterShop(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 p-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Shops</option>
                    {orderedShopsList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date range Filter */}
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-black uppercase tracking-wider text-slate-400">Date Range</label>
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 p-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-300"
                  >
                    <option value="All">All Time</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['All', 'Pending', 'Ready', 'Delivered', 'Cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filterStatus === status 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                    : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {loading ? (
            <OrderHistorySkeleton />
          ) : orders.length > 0 && filteredOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 py-20 animate-in fade-in duration-300">
              <SearchX className="w-12 h-12 text-slate-400 mb-3" />
              <h4 className="text-base font-black text-slate-800 dark:text-white mb-1">No matches found</h4>
              <p className="text-xs text-slate-500 max-w-xs mb-6 font-semibold">Try modifying your query search criteria, selecting another tab, or clearing the custom shop filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterShop("All");
                  setFilterDate("All");
                  setFilterStatus("All");
                }}
                className="px-5 py-2.5 bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-200 transition-all active:scale-95"
              >
                Reset All Filters
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 py-20 animate-in fade-in zoom-in duration-500">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 rounded-full scale-150 blur-3xl opacity-30 animate-pulse"></div>
                <div className="size-28 bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl flex items-center justify-center text-primary relative z-10 rotate-3 transition-transform hover:rotate-0 duration-500">
                  <ShoppingBag className="w-14 h-14" />
                </div>
                <div className="absolute -bottom-2 -right-2 size-10 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                  <Plus className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-2xl font-black mb-3 text-slate-900 dark:text-white leading-tight">No {filterStatus !== 'All' ? filterStatus.toLowerCase() : ''} cravings?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 max-w-[240px] leading-relaxed font-semibold">
                {filterStatus === 'All' 
                  ? "Your delicious journey starts with your first order. Ready to discover the best local flavors?"
                  : `You don't have any orders with status "${filterStatus}" at the moment.`}
              </p>
              {filterStatus === 'All' && (
                <button 
                  onClick={onBack}
                  className="group bg-primary text-white font-black py-4 px-10 rounded-[28px] shadow-2xl shadow-primary/30 transition-all active:scale-95 cursor-pointer flex items-center gap-3"
                >
                  <span>Find Good Food</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-3 group hover:border-orange-500/20 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[12px] font-bold text-primary uppercase tracking-widest mb-1">Order #{order.id.toString().slice(-6)}</p>
                      <p className="text-slate-900 dark:text-slate-100 font-bold text-lg">{order.product_name}</p>
                      <p className="text-slate-500 text-[12px] font-medium">{new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-1 ${
                        order.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        order.status === 'ready' ? (order.is_delivery ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200') :
                        order.status === 'completed' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                        order.status === 'cancelled' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {order.status === 'pending' && <Hourglass className="w-3 h-3" />}
                        {order.status === 'confirmed' && <CheckSquare className="w-3 h-3" />}
                        {order.status === 'ready' && <Utensils className="w-3 h-3" />}
                        {order.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {order.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                        {order.status === 'ready' && order.is_delivery ? 'Finding Rider' : order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {order.status === 'cancelled' && order.cancellation_reason && (
                    <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
                      <p className="text-rose-700 dark:text-rose-400 text-[10px] font-semibold">
                        <span className="font-bold uppercase tracking-wider">Reason for Cancellation:</span> "{order.cancellation_reason}"
                      </p>
                    </div>
                  )}

                  {['pending', 'confirmed'].includes(order.status) && (
                    <div className="flex justify-end pt-1">
                      <button 
                        type="button"
                        onClick={() => {
                          setCancelReason("");
                          setCustomReasonText("");
                          setCancellingOrderId(order.id);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-widest rounded-lg border border-rose-100 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer shadow-sm active:scale-95"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel Order
                      </button>
                    </div>
                  )}

                  {['completed', 'cancelled'].includes(order.status) && (
                    <div className="flex justify-end items-center gap-2 pt-1 border-t border-slate-50 dark:border-slate-800/60 mt-1">
                      <button 
                        type="button"
                        onClick={() => {
                          setIssueType("");
                          setIssueDesc("");
                          setSupportOrder(order);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-808/80 text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-widest rounded-lg border border-slate-100 dark:border-slate-800 transition-colors cursor-pointer shadow-sm active:scale-95"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        Get Help
                      </button>

                      {addToCart && (
                        <button 
                          type="button"
                          onClick={() => handleReorderClick(order)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-black uppercase tracking-widest rounded-lg border border-orange-100 dark:border-orange-500/30 transition-colors cursor-pointer shadow-sm active:scale-95"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Order Again
                        </button>
                      )}
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
                          {order.payment_method === 'cash_on_arrival' ? '💵 Cash on Arrival (COA)' : order.payment_method === 'cash' ? '💵 Cash on Collection' : '💳 Card Machine'}
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
                  {order.delivery_instructions && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                      <p className="text-indigo-700 dark:text-indigo-400 text-[10px] font-medium italic">
                        <span className="font-bold not-italic">📍 Directions:</span> {order.delivery_instructions}
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
              ))}
            </div>
          )}
        </main>

        {/* Beautiful Custom Predefined Cancel Reason Modal */}
        {cancellingOrderId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              <div className="size-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-center mb-1 text-slate-900 dark:text-white">Cancel Order?</h3>
              <p className="text-[10px] text-slate-500 text-center mb-6 uppercase tracking-widest font-bold">Please select a reason</p>
              
              <div className="space-y-2 mb-6 max-h-52 overflow-y-auto pr-1">
                {["Mistake in order", "Placed wrong items", "Changed my mind", "Delivery taking too long", "Other"].map(reason => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setCancelReason(reason);
                      if (reason !== 'Other') {
                        setCustomReasonText("");
                      }
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      cancelReason === reason
                        ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-600' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400'
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
                  className={`w-full py-3.5 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${isCancelling ? 'bg-slate-400 text-white cursor-wait shadow-none' : 'bg-rose-600 text-white shadow-rose-600/20'}`}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cancelling...</span>
                    </>
                  ) : 'Confirm Cancellation'}
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
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-sm w-full border border-slate-100 dark:border-slate-805 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reorder Item</p>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">{reorderPreviewItem.order.product_name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{reorderPreviewItem.shop?.name || "Local Kitchen"}</p>
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
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={reorderPreviewItem.quantity <= 1}
                      onClick={() => setReorderPreviewItem((prev: any) => ({...prev, quantity: prev.quantity - 1}))}
                      className="size-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-bold border border-slate-100 dark:border-slate-800 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white select-none w-5 text-center">{reorderPreviewItem.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setReorderPreviewItem((prev: any) => ({...prev, quantity: prev.quantity + 1}))}
                      className="size-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-bold border border-slate-100 dark:border-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Special Instructions</label>
                  <textarea
                    placeholder="E.g., No onions, extra garlic, spicy, sauce on the side..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl p-3.5 text-xs font-semibold focus:ring-2 focus:ring-orange-500 outline-none text-slate-900 dark:text-white resize-none"
                    rows={3}
                    value={reorderPreviewItem.specialInstructions || ""}
                    onChange={(e) => setReorderPreviewItem((prev: any) => ({...prev, specialInstructions: e.target.value}))}
                  />
                </div>

                {/* Total price preview */}
                <div className="flex justify-between items-center py-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500">Subtotal Price</span>
                  <span className="text-sm font-black text-orange-600 dark:text-orange-400">R {(reorderPreviewItem.price * reorderPreviewItem.quantity).toFixed(2)}</span>
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
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 max-w-sm w-full border border-slate-100 dark:border-slate-808 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Past Order Issue</p>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">Report #{(supportOrder.id || '').toString().slice(-6)} Issue</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Item: {supportOrder.product_name}</p>
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
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Issue Type</label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-orange-500 outline-none text-slate-800 dark:text-slate-200"
                  >
                    <option value="">-- Choose what went wrong --</option>
                    <option value="cold_food">Food arrived cold / stale</option>
                    <option value="missing_items">Missing toppings or items</option>
                    <option value="wrong_item">Received the wrong item</option>
                    <option value="delivery_delay">Extremely delayed delivery</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Description of Issue</label>
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
                  {isSendingIssue && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSendingIssue ? 'Sending Report...' : 'Submit Support Ticket'}</span>
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

function ReviewScreen({ 
  pendingReview, 
  onSnooze, 
  onSubmit 
}: { 
  pendingReview: PendingReview, 
  onSnooze: () => void, 
  onSubmit: (rating: number, comment: string, riderRating?: number, riderComment?: string) => void 
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [riderRating, setRiderRating] = useState(5);
  const [riderComment, setRiderComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(rating, comment, riderRating, riderComment);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto shadow-2xl p-6 overflow-y-auto">
      <div className="flex-grow flex flex-col space-y-8 py-10">
        <div className="text-center space-y-2">
          <div className="bg-orange-100 dark:bg-orange-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight uppercase tracking-tight">Rate your Experience</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Your feedback helps the local fleet improve!</p>
        </div>

        {/* Shop Review */}
        <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Food & Shop Experience</p>
          <h2 className="text-lg font-bold text-center">{pendingReview.productName}</h2>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1 transition-transform active:scale-90"
              >
                <Star 
                  className={`w-8 h-8 ${star <= rating ? 'fill-orange-500 text-orange-500' : 'text-slate-300'}`} 
                />
              </button>
            ))}
          </div>
          <textarea
            placeholder="How was the food?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-orange-500 transition-all min-h-[80px] resize-none"
          />
        </div>

        {/* Rider Review */}
        <div className="space-y-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-[32px] border border-indigo-100/50 dark:border-indigo-800/30">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Rider & Delivery</p>
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
                onClick={() => setRiderRating(star)}
                className="p-1 transition-transform active:scale-90"
              >
                <Star 
                  className={`w-8 h-8 ${star <= riderRating ? 'fill-indigo-500 text-indigo-500' : 'text-slate-300'}`} 
                />
              </button>
            ))}
          </div>
          <textarea
            placeholder="Speed, politeness, handling..."
            value={riderComment}
            onChange={(e) => setRiderComment(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all min-h-[80px] resize-none"
          />
        </div>
      </div>

      <div className="sticky bottom-0 glass-effect pt-4 pb-6 flex flex-col gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
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
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="sticky top-0 z-50 glass-effect border-b border-primary/10">
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

