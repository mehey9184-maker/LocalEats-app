/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, Dispatch, SetStateAction, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, supabaseUrl } from './lib/supabase';

type Screen = 'splash' | 'signup' | 'login' | 'verify' | 'setup-pin' | 'success' | 'complete-profile' | 'login-success' | 'home' | 'settings' | 'profile' | 'checkout' | 'order-success' | 'discover' | 'explore' | 'store-info' | 'admin-orders' | 'order-history' | 'shop-dashboard' | 'review';

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
};

type CartItem = {
  id: string;
  shopId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null);
  const [session, setSession] = useState<any>(null);
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
  const [orderAcceptedModal, setOrderAcceptedModal] = useState<{
    isOpen: boolean;
    productName: string;
    ownerMessage: string;
  }>({
    isOpen: false,
    productName: '',
    ownerMessage: ''
  });

  const [notification, setNotification] = useState<{ 
    message: string, 
    type: 'success' | 'info' | 'ready', 
    actions?: { label: string, onClick: () => void }[],
    persistent?: boolean
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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
        setNotification({ message: "Location updated successfully", type: 'success' });
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

  useEffect(() => {
    if (currentScreen === 'home' || currentScreen === 'explore') {
      requestLocation();
    }
  }, [currentScreen, requestLocation]);
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
  }, [favorites]);

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

  const toggleFavorite = (shopId: string) => {
    setFavorites(prev => 
      prev.includes(shopId) 
        ? prev.filter(id => id !== shopId) 
        : [...prev, shopId]
    );
    triggerHaptic();
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
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerHaptic = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
  };

  const authInitialized = useRef(false);

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setCurrentScreen('home');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setUserProfile(prev => ({ ...prev, id: session.user.id }));
        setCurrentScreen('home');
      }
      else setCurrentScreen('splash');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Listen for status changes on the user's orders
    const channel = supabase
      .channel(`user_notifications:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Real-time order update received:', payload);
          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          console.log(`Status change: ${oldStatus} -> ${newStatus}`);

          if (newStatus === 'confirmed') {
            console.log('Order confirmed! Showing modal...');
            
            // Add vibration for confirmation
            if ("vibrate" in navigator) {
              navigator.vibrate([100, 50, 100]); // Double pulse
            }

            // Add sound effect for confirmation
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.volume = 0.5;
              audio.play().catch(e => console.log('Audio play failed (likely browser policy):', e));
            } catch (e) {
              console.log('Audio initialization failed:', e);
            }
            
            setOrderAcceptedModal({
              isOpen: true,
              productName: payload.new.product_name,
              ownerMessage: payload.new.owner_message || "Your order has been received and is being prepared with love! 🔥"
            });
            setNotification({
              message: `✅ Your order for ${payload.new.product_name} has been ACCEPTED!`,
              type: 'success',
              actions: [
                { label: 'View Order', onClick: () => setCurrentScreen('order-history') }
              ]
            });
            // Auto-hide after 10 seconds
            setTimeout(() => setNotification(null), 10000);
          }

          if (oldStatus !== newStatus && newStatus === 'ready') {
            setNotification({
              message: `🔥 Your order for ${payload.new.product_name} is READY for pickup!`,
              type: 'success',
              actions: [
                { label: 'View Order', onClick: () => setCurrentScreen('order-history') }
              ]
            });
            // Auto-hide after 10 seconds
            setTimeout(() => setNotification(null), 10000);
          }

          if (oldStatus !== newStatus && newStatus === 'picked_up') {
            setPendingReview({
              orderId: payload.new.id,
              shopId: payload.new.shop_id,
              productName: payload.new.product_name,
              snoozeCount: 0
            });
            setCurrentScreen('review');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Global Order Status Notifications
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`global_orders:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;

          if (oldStatus !== newStatus) {
            let icon = 'info';
            let message = `Order for ${payload.new.product_name} is now ${newStatus}`;

            if (newStatus === 'confirmed') icon = 'check_circle';
            if (newStatus === 'ready') icon = 'restaurant';
            if (newStatus === 'delivered') icon = 'local_shipping';
            if (newStatus === 'cancelled') icon = 'cancel';

            setNotification({
              message,
              type: newStatus === 'cancelled' ? 'error' : 'success',
              icon
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, setNotification]);

  const fetchShopsData = async (retries = 3) => {
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

      const formattedShops: Shop[] = (shopsData || []).map(s => ({
        id: String(s.id),
        name: s.name,
        logo: s.logo_url || `https://picsum.photos/seed/${s.id}/200/200`,
        rating: Number(s.rating) || 4.5,
        description: s.description || "Local Tembisa Flavours",
        address: s.location || "Tembisa",
        category: s.category || "Kota",
        menu: (menuData || [])
          .filter(m => String(m.shop_id) === String(s.id))
          .map(m => ({
            id: String(m.id),
            name: m.name,
            price: Number(m.price),
            displayPrice: `R${Number(m.price).toFixed(2)}`,
            image: m.image_url || `https://picsum.photos/seed/${m.id}/200/200`
          }))
      })).sort((a, b) => (b.rating || 0) - (a.rating || 0)); // Smart Ranking: Best rated first

      console.log(`Successfully fetched ${formattedShops.length} shops.`);
      setShops(formattedShops);
      localStorage.setItem('cached_shops', JSON.stringify(formattedShops)); // Instant-Load Caching
      setLoadingShops(false);
    } catch (err: any) {
      console.error('Error fetching shops:', err);
      
      // Detailed error diagnostics
      let errorMessage = err.message || 'Failed to connect to the server';
      
      if (err.message === 'Failed to fetch') {
        errorMessage = 'Network Error: The connection to Supabase was blocked or timed out. This often happens due to ad-blockers, firewalls, or being offline.';
      } else if (err.status === 401 || err.status === 403) {
        errorMessage = 'Authentication Error: Your Supabase API key might be invalid or expired.';
      } else if (err.status === 404) {
        errorMessage = 'Configuration Error: The Supabase project or table was not found.';
      }
      
      if (retries > 0) {
        console.log(`Retrying fetchShopsData... (${retries} retries left)`);
        setTimeout(() => fetchShopsData(retries - 1), 2000);
      } else {
        setFetchError(errorMessage);
        setLoadingShops(false);
      }
    }
  };

  useEffect(() => {
    fetchShopsData();

    // Subscribe to changes in shops and menu_items
    const shopsChannel = supabase.channel('public:shops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, () => fetchShopsData())
      .subscribe();
    
    const menuChannel = supabase.channel('public:menu_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchShopsData())
      .subscribe();

    return () => {
      supabase.removeChannel(shopsChannel);
      supabase.removeChannel(menuChannel);
    };
  }, []);

  useEffect(() => {
    const TEMBISA_COORDS = { lat: -25.9964, lng: 28.2268 };
    
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

  const addToCart = (item: MenuItem, shopId: string) => {
    triggerHaptic();
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.shopId === shopId);
      let newCart;
      if (existing) {
        newCart = prev.map(i => i.id === item.id && i.shopId === shopId ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        newCart = [...prev, { ...item, shopId, quantity: 1 }];
      }
      localStorage.setItem('cart', JSON.stringify(newCart));
      return newCart;
    });
    setNotification({ message: `Added ${item.name} to cart`, type: 'success' });
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
    triggerHaptic();
    setCart([]);
    localStorage.setItem('cart', JSON.stringify([]));
    setNotification({ message: 'Cart cleared', type: 'info' });
    setTimeout(() => setNotification(null), 2000);
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
    
    // Sync with Supabase if profile is complete and session exists
    if (session?.user?.id && userProfile.fullName) {
      const timer = setTimeout(async () => {
        if (!navigator.onLine) return;
        try {
          const { error } = await supabase
            .from('profiles')
            .upsert({
              user_id: session.user.id,
              fullName: userProfile.fullName,
              email: userProfile.email,
              role: userProfile.role,
              photo_url: userProfile.photoURL,
              updated_at: new Date().toISOString()
            });
          if (error) {
            console.error('Error syncing profile to Supabase:', error);
            if (error.message === 'Failed to fetch') {
              setNotification({ 
                message: "⚠️ Connection lost. Profile sync failed. Check your internet.", 
                type: 'info' 
              });
            }
          }
        } catch (err) {
          console.error('Sync error:', err);
        }
      }, 1000); // 1s debounce
      return () => clearTimeout(timer);
    }
  }, [userProfile, session]);

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
                <div className="flex items-center gap-3">
                  <div className={`${notification.type === 'ready' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'} p-3 rounded-2xl`}>
                    <span className="material-symbols-outlined text-2xl">
                      {notification.type === 'ready' ? 'restaurant' : 'notifications_active'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg leading-tight">
                      {notification.type === 'ready' ? 'Order Ready!' : 'Notification'}
                    </h3>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">{notification.message}</p>
                  </div>
                  {!notification.persistent && (
                    <button onClick={() => setNotification(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg self-start">
                      <span className="material-symbols-outlined text-gray-500 dark:text-slate-400">close</span>
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
                  <span className="material-symbols-outlined text-5xl">check_circle</span>
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
          <SplashScreen onNext={() => setCurrentScreen('signup')} onLogin={() => setCurrentScreen('login')} />
        )}
        {currentScreen === 'signup' && (
          <SignUpScreen 
            onNext={(data) => {
              setUserProfile(prev => ({ ...prev, ...data }));
              setCurrentScreen('setup-pin');
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
        {currentScreen === 'setup-pin' && (
          <SetupPinScreen onNext={() => setCurrentScreen('success')} onBack={() => setCurrentScreen('signup')} />
        )}
        {currentScreen === 'success' && (
          <SuccessScreen onCompleteProfile={() => setCurrentScreen('complete-profile')} onExplore={() => setCurrentScreen('home')} />
        )}
        {currentScreen === 'complete-profile' && (
          <CompleteProfileScreen 
            userProfile={userProfile}
            onBack={() => setCurrentScreen('success')} 
            onSave={(data) => {
              setUserProfile(prev => ({ ...prev, ...data }));
              setCurrentScreen('home');
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
            onSettings={() => setCurrentScreen('settings')} 
            onProfile={() => setCurrentScreen('profile')} 
            onCheckout={() => setCurrentScreen('checkout')} 
            onDiscover={() => setCurrentScreen('discover')} 
            onExplore={() => setCurrentScreen('explore')} 
            onOrderHistory={() => setCurrentScreen('order-history')}
            onStoreInfo={(id) => { setSelectedStoreId(id); setCurrentScreen('store-info'); }} 
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
            onSubmit={(rating, comment) => {
              // Here you would normally save to DB
              console.log('Review submitted:', { rating, comment, orderId: pendingReview.orderId });
              setPendingReview(null);
              setCurrentScreen('home');
              setNotification({
                message: 'Thank you for your review! 🔥',
                type: 'success'
              });
            }}
          />
        )}
        {currentScreen === 'discover' && (
          <DiscoverScreen 
            shops={shops} 
            onHome={() => { setPreviousScreen('discover'); setCurrentScreen('home'); }} 
            onExplore={() => { setPreviousScreen('discover'); setCurrentScreen('explore'); }}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onSelectShop={(shopId) => {
              setSelectedStoreId(shopId);
              setPreviousScreen('discover');
              setCurrentScreen('store-info');
            }}
            userLocation={userLocation}
          />
        )}
        {currentScreen === 'explore' && (
          <ExploreScreen 
            shops={shops} 
            onHome={() => { setPreviousScreen('explore'); setCurrentScreen('home'); }} 
            onDiscover={() => { setPreviousScreen('explore'); setCurrentScreen('discover'); }} 
            userLocation={userLocation}
            onRequestLocation={requestLocation}
            onStoreInfo={(shopId) => {
              setSelectedStoreId(shopId);
              setPreviousScreen('explore');
              setCurrentScreen('store-info');
            }}
          />
        )}
        {currentScreen === 'store-info' && (
          <StoreInfoScreen 
            onBack={() => setCurrentScreen(previousScreen === 'discover' ? 'discover' : 'home')} 
            shop={shops.find(s => s.id === selectedStoreId) || shops[0]} 
            isFavorite={favorites.includes(selectedStoreId || '')}
            onToggleFavorite={() => toggleFavorite(selectedStoreId || '')}
            userProfile={userProfile}
          />
        )}
        {currentScreen === 'settings' && (
          <SettingsScreen 
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            onBack={() => setCurrentScreen('home')} 
            onLogout={() => setCurrentScreen('splash')} 
            onProfile={() => setCurrentScreen('profile')} 
            onOrderHistory={() => setCurrentScreen('order-history')}
            onAdminOrders={() => setCurrentScreen('admin-orders')}
            onShopDashboard={() => setCurrentScreen('shop-dashboard')}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            setNotification={setNotification}
          />
        )}
        {currentScreen === 'admin-orders' && (
          <AdminOrdersScreen onBack={() => setCurrentScreen(previousScreen || 'home')} />
        )}
        {currentScreen === 'shop-dashboard' && (
          <ShopDashboardScreen 
            onBack={() => setCurrentScreen(previousScreen || 'home')} 
            orderAcceptedModal={orderAcceptedModal}
            setOrderAcceptedModal={setOrderAcceptedModal}
          />
        )}
        {currentScreen === 'profile' && (
          <ProfileScreen 
            onBack={() => setCurrentScreen('home')} 
            onSave={(data) => {
              setUserProfile(prev => ({ ...prev, ...data }));
              setCurrentScreen('home');
            }} 
            onOrderHistory={() => setCurrentScreen('order-history')}
            onAdminOrders={() => { setPreviousScreen('profile'); setCurrentScreen('admin-orders'); }}
            onShopDashboard={() => { setPreviousScreen('profile'); setCurrentScreen('shop-dashboard'); }}
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
        {currentScreen === 'checkout' && (
          <CheckoutScreen 
            userProfile={userProfile}
            session={session}
            shops={shops}
            onBack={() => setCurrentScreen('home')} 
            onConfirm={() => setCurrentScreen('order-success')} 
            cart={cart}
            setCart={setCart}
          />
        )}
        {currentScreen === 'order-success' && (
          <OrderSuccessScreen onHome={() => { setCart([]); setCurrentScreen('home'); }} cart={cart} shops={shops} />
        )}
        {currentScreen === 'order-history' && (
          <OrderHistoryScreen 
            session={session}
            onBack={() => setCurrentScreen('profile')} 
            userProfile={userProfile} 
          />
        )}
      </motion.div>
    </div>
  </AnimatePresence>
  </div>
);
}

function SplashScreen({ onNext, onLogin }: { onNext: () => void, onLogin: () => void }) {
  useEffect(() => {
    // Subtle jingle on launch
    const jingle = new Audio('https://assets.mixkit.co/active_storage/sfx/2430/2430-preview.mp3');
    jingle.volume = 0.4;
    jingle.play().catch(e => console.log("Autoplay prevented:", e));
  }, []);

  const playClick = () => {
    const click = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    click.volume = 0.6;
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
        <div className="flex items-center space-x-2">
          {/* Logo Icon Placeholder */}
          <div className="bg-brand-orange p-2 rounded-xl shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              ></path>
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            Local<span className="text-brand-orange">Eats</span>
          </h1>
        </div>
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
          <div className="flex space-x-1">
            <span className="h-1.5 w-6 bg-brand-orange rounded-full"></span>
            <span className="h-1.5 w-1.5 bg-white/40 rounded-full"></span>
            <span className="h-1.5 w-1.5 bg-white/40 rounded-full"></span>
          </div>
        </div>
      </section>
    </main>
  );
}

function SignUpScreen({ onNext, onLogin, setNotification }: { onNext: (data: Partial<UserProfile>) => void, onLogin: () => void, setNotification: (n: any) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName || !email || !password || !phone) {
      setNotification({ message: 'Please fill in all fields', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone
          }
        }
      });
      if (error) throw error;
      onNext({ fullName, email, phone });
    } catch (error: any) {
      setNotification({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden">
        <div className="flex items-center p-4 pb-2 justify-center mt-8">
          <div className="text-primary flex size-16 shrink-0 items-center justify-center bg-primary/10 rounded-full">
            <span className="material-symbols-outlined !text-4xl">restaurant_menu</span>
          </div>
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
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">person</span>
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
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
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
            <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">Password</p>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
              <input 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                placeholder="••••••••" 
                type="password"
              />
            </div>
          </label>
          <label className="flex flex-col w-full">
            <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">Phone Number</p>
            <div className="flex w-full items-stretch">
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 rounded-l-xl border-r-0">
                <span className="material-symbols-outlined text-primary !text-xl">flag</span>
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
            <span>{loading ? 'Signing up...' : 'Sign Up'}</span>
            <span className="material-symbols-outlined">arrow_forward</span>
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
              onClick={() => setNotification({ message: "Google login coming soon!", type: 'info' })}
              className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <img alt="Google Logo" className="h-5 w-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5uYjQizkp0NzZOJp6gAxVIoom_EY70LzkakkWsAQaYO29sik9xD6rSvJFnoztFAIzTeXZX17vg94A_hZuYmV2_Va3hBYvZoEXVuzb6Uypat-btNCXq2M3UdT8jllg-feqnW8CKzK5T5EB9l6GU-uqjg_oOpWia8T2AYqmOudM6LiS5I7wofQv0QG0MZc_KJNHHx60c_02idR-68zHoEMZwxAGOW33qn0nylojD9egOorA99Q5_UD2H8L0LMgVA9aAoGK-TF--TQ"/>
              <span className="text-sm font-semibold">Google</span>
            </button>
            <button 
              onClick={() => setNotification({ message: "Apple login coming soon!", type: 'info' })}
              className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined !text-xl">ios</span>
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
            <span className="material-symbols-outlined">arrow_back</span>
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
              <span className="material-symbols-outlined text-2xl">backspace</span>
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

function SetupPinScreen({ onNext, onBack }: { onNext: () => void, onBack: () => void }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [activeSection, setActiveSection] = useState<'create' | 'confirm'>('create');

  const handlePinChange = (index: number, value: string, type: 'create' | 'confirm') => {
    if (value.length > 1) value = value.slice(-1);
    const target = type === 'create' ? pin : confirmPin;
    const setter = type === 'create' ? setPin : setConfirmPin;
    
    const newPin = [...target];
    newPin[index] = value;
    setter(newPin);
  };

  const isPinComplete = pin.every(d => d);
  const isConfirmComplete = confirmPin.every(d => d);
  const pinsMatch = pin.join('') === confirmPin.join('');
  const canSave = isPinComplete && isConfirmComplete && pinsMatch;

  return (
    <div className="font-display bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <div className="max-w-md mx-auto w-full flex flex-col min-h-screen">
        {/* Top App Bar */}
        <header className="flex items-center p-4 bg-white dark:bg-[#221610] border-b border-primary/10">
          <button onClick={onBack} className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 ml-2 text-center mr-10">Set Up Your PIN</h1>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 w-full space-y-12 py-8">
          {/* Create PIN Section */}
          <section className={`w-full text-center space-y-4 transition-opacity ${activeSection === 'confirm' ? 'opacity-50' : 'opacity-100'}`} onClick={() => setActiveSection('create')}>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Create your PIN</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Enter a 4-digit PIN to secure your account</p>
            </div>
            <div className="flex justify-center gap-4">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  id={`create-pin-input-${index}`}
                  className={`w-12 h-14 text-center text-2xl font-bold bg-white dark:bg-slate-800 border-2 rounded-xl focus:ring-0 transition-all ${activeSection === 'create' ? 'border-primary' : 'border-slate-200 dark:border-slate-700'}`}
                  maxLength={1}
                  type="password"
                  value={digit}
                  readOnly
                />
              ))}
            </div>
          </section>
          {/* Divider */}
          <div className="w-full flex items-center gap-4">
            <div className="h-[1px] flex-1 bg-primary/20"></div>
            <span className="material-symbols-outlined text-primary/40">lock</span>
            <div className="h-[1px] flex-1 bg-primary/20"></div>
          </div>
          {/* Confirm PIN Section */}
          <section className={`w-full text-center space-y-4 transition-opacity ${activeSection === 'create' ? 'opacity-50' : 'opacity-100'}`} onClick={() => isPinComplete && setActiveSection('confirm')}>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight">Confirm your PIN</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Please re-enter your PIN to confirm</p>
            </div>
            <div className="flex justify-center gap-4">
              {confirmPin.map((digit, index) => (
                <input
                  key={index}
                  id={`confirm-pin-input-${index}`}
                  className={`w-12 h-14 text-center text-2xl font-bold bg-white dark:bg-slate-800 border-2 rounded-xl focus:ring-0 transition-all ${activeSection === 'confirm' ? 'border-primary' : 'border-slate-200 dark:border-slate-700'}`}
                  maxLength={1}
                  type="password"
                  value={digit}
                  readOnly
                />
              ))}
            </div>
            {isConfirmComplete && !pinsMatch && (
              <p className="text-red-500 text-xs font-bold animate-bounce">PINs do not match!</p>
            )}
          </section>
        </main>
        {/* Numeric Keypad */}
        <footer className="mt-auto w-full px-6 pb-8">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num} 
                onClick={() => {
                  const target = activeSection === 'create' ? pin : confirmPin;
                  const emptyIndex = target.findIndex(d => !d);
                  if (emptyIndex !== -1) {
                    handlePinChange(emptyIndex, num.toString(), activeSection);
                    if (activeSection === 'create' && emptyIndex === 3) {
                      setTimeout(() => setActiveSection('confirm'), 300);
                    }
                  }
                }}
                className="h-16 flex items-center justify-center text-2xl font-semibold bg-white dark:bg-slate-800 rounded-xl hover:bg-primary/10 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button className="h-16 flex items-center justify-center text-2xl font-semibold rounded-xl"></button>
            <button 
              onClick={() => {
                const target = activeSection === 'create' ? pin : confirmPin;
                const emptyIndex = target.findIndex(d => !d);
                if (emptyIndex !== -1) {
                  handlePinChange(emptyIndex, '0', activeSection);
                  if (activeSection === 'create' && emptyIndex === 3) {
                    setTimeout(() => setActiveSection('confirm'), 300);
                  }
                }
              }}
              className="h-16 flex items-center justify-center text-2xl font-semibold bg-white dark:bg-slate-800 rounded-xl hover:bg-primary/10 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              0
            </button>
            <button 
              onClick={() => {
                const target = activeSection === 'create' ? pin : confirmPin;
                const lastFilledIndex = [...target].reverse().findIndex(d => d);
                if (lastFilledIndex !== -1) {
                  const index = 3 - lastFilledIndex;
                  handlePinChange(index, '', activeSection);
                } else if (activeSection === 'confirm') {
                  setActiveSection('create');
                }
              }}
              className="h-16 flex items-center justify-center text-2xl font-semibold bg-white dark:bg-slate-800 rounded-xl hover:bg-primary/10 active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined">backspace</span>
            </button>
          </div>
          <button 
            onClick={onNext} 
            disabled={!canSave}
            className="w-full mt-8 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-primary/20 cursor-pointer"
          >
            Confirm & Save
          </button>
        </footer>
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
          <button className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer">
            <span className="material-symbols-outlined">close</span>
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
                <span className="material-symbols-outlined text-white text-7xl" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
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

function CompleteProfileScreen({ userProfile, onBack, onSave, setNotification }: { userProfile: UserProfile, onBack: () => void, onSave: (data: Partial<UserProfile>) => void, setNotification: (n: any) => void }) {
  const [email, setEmail] = useState(userProfile.email);
  const [address, setAddress] = useState(userProfile.address);
  const [city, setCity] = useState(userProfile.city);
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
        errorMsg = "Storage bucket 'avatars' not found. Please create a public bucket named 'avatars' in your Supabase dashboard.";
      }
      setNotification({ message: `Error uploading avatar: ${errorMsg}`, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        {/* Top App Bar */}
        <div className="flex items-center bg-white dark:bg-[#221610] p-4 pb-2 sticky top-0 z-10">
          <div onClick={onBack} className="text-primary flex size-12 shrink-0 items-center cursor-pointer">
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Complete Your Profile</h2>
        </div>
        {/* Profile Photo Section */}
        <div className="flex p-6 @container">
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
                <div className="bg-primary/10 dark:bg-primary/20 bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32 border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden" style={{ backgroundImage: `url("${userProfile.photoURL || DEFAULT_AVATAR_URL}")` }}>
                  {uploading ? (
                    <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
                  ) : (
                    !userProfile.photoURL && <span className="material-symbols-outlined text-primary text-4xl">account_circle</span>
                  )}
                </div>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 border-4 border-background-light dark:border-background-dark shadow-lg cursor-pointer hover:scale-110 transition-transform"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add_a_photo</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-1">
                <p className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight text-center">{userProfile.fullName || 'Upload Photo'}</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal text-center max-w-[240px]">Add a photo so the LocalEats community can recognize you</p>
              </div>
            </div>
          </div>
        </div>
        {/* Form Fields */}
        <div className="flex flex-col gap-1 px-4 py-2 max-w-md mx-auto w-full">
          <div className="flex flex-wrap items-end gap-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2 ml-1">Email Address</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">mail</span>
                <input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                  placeholder="example@email.com" 
                  type="email"
                />
              </div>
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2 ml-1">City</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">location_city</span>
                <input 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="form-input flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                  placeholder="Enter your city" 
                  type="text"
                />
              </div>
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2 ml-1">Home Address</p>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">location_on</span>
                <input 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="form-input flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                  placeholder="Enter your street address" 
                  type="text"
                />
              </div>
            </label>
          </div>
          <div className="flex items-center gap-2 px-1 py-4">
            <input className="rounded text-primary focus:ring-primary border-slate-300 dark:bg-slate-800" id="terms" type="checkbox" defaultChecked/>
            <label className="text-sm text-slate-500 dark:text-slate-400" htmlFor="terms">I agree to the <span className="text-primary font-medium">Terms of Service</span> and <span className="text-primary font-medium">Privacy Policy</span></label>
          </div>
        </div>
        {/* Sticky Bottom Button */}
        <div className="mt-auto p-4 bg-white dark:bg-[#221610] max-w-md mx-auto w-full">
          <button onClick={() => onSave({ email, address, city })} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-primary text-white text-base font-bold leading-normal tracking-wide shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform">
            <span className="truncate">Save & Continue</span>
          </button>
          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, onSignUp, setNotification }: { onLogin: () => void, onSignUp: () => void, setNotification: (n: any) => void }) {
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('remembered_email'));
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setNotification({ message: 'Please enter both email and password', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
      } else {
        localStorage.removeItem('remembered_email');
      }
      
      onLogin();
    } catch (error: any) {
      setNotification({ message: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden">
        {/* Logo Section */}
        <div className="flex items-center p-4 pb-2 justify-center mt-8">
          <div className="text-primary flex size-16 shrink-0 items-center justify-center bg-primary/10 rounded-full">
            <span className="material-symbols-outlined !text-4xl">restaurant_menu</span>
          </div>
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
        {/* Form Fields */}
        <div className="flex flex-col gap-4 px-6 py-2">
          <label className="flex flex-col w-full">
            <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal pb-2">Email</p>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
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
            <div className="flex justify-between items-center pb-2">
              <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold leading-normal">Password</p>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
              <input 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 placeholder:text-slate-400 pl-12 pr-4 text-base font-normal leading-normal transition-all" 
                placeholder="••••••••" 
                type="password"
              />
            </div>
          </label>
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-700'}`}>
                {rememberMe && <span className="material-symbols-outlined text-white text-sm">check</span>}
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
            <span className="material-symbols-outlined">login</span>
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
              onClick={() => setNotification({ message: "Google signup coming soon!", type: 'info' })}
              className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <img alt="Google Logo" className="h-5 w-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5uYjQizkp0NzZOJp6gAxVIoom_EY70LzkakkWsAQaYO29sik9xD6rSvJFnoztFAIzTeXZX17vg94A_hZuYmV2_Va3hBYvZoEXVuzb6Uypat-btNCXq2M3UdT8jllg-feqnW8CKzK5T5EB9l6GU-uqjg_oOpWia8T2AYqmOudM6LiS5I7wofQv0QG0MZc_KJNHHx60c_02idR-68zHoEMZwxAGOW33qn0nylojD9egOorA99Q5_UD2H8L0LMgVA9aAoGK-TF--TQ"/>
              <span className="text-sm font-semibold">Google</span>
            </button>
            <button 
              onClick={() => setNotification({ message: "Apple signup coming soon!", type: 'info' })}
              className="flex items-center justify-center gap-2 h-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined !text-xl">ios</span>
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
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">Login Success</h2>
        </div>
        <div className="flex flex-col items-center justify-center grow p-6 space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl transform scale-150"></div>
            <div className="relative bg-white dark:bg-slate-800 p-8 rounded-full shadow-xl border-4 border-primary/10">
              <span className="material-symbols-outlined text-primary text-[120px] leading-none select-none" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>
                check_circle
              </span>
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

function HomeScreen({ userProfile, session, shops, loadingShops, fetchError, onSettings, onProfile, onCheckout, onDiscover, onExplore, onOrderHistory, onStoreInfo, onRetry, cart, addToCart, removeFromCart, clearCart, setNotification, setPendingReview, setCurrentScreen, favorites, toggleFavorite, userLocation, onRequestLocation }: { userProfile: UserProfile, session: any, shops: Shop[], loadingShops: boolean, fetchError: string | null, onSettings: () => void, onProfile: () => void, onCheckout: () => void, onDiscover: () => void, onExplore: () => void, onOrderHistory: () => void, onStoreInfo: (shopId: string) => void, onRetry: () => void, cart: CartItem[], addToCart: (item: MenuItem, shopId: string) => void, removeFromCart: (itemId: string, shopId: string) => void, clearCart: () => void, setNotification: Dispatch<SetStateAction<any>>, setPendingReview: Dispatch<SetStateAction<PendingReview | null>>, setCurrentScreen: Dispatch<SetStateAction<Screen>>, favorites: string[], toggleFavorite: (shopId: string) => void, userLocation: { lat: number, lng: number } | null, onRequestLocation: () => void }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStoreSettingsOpen, setIsStoreSettingsOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  useEffect(() => {
    if (shops.length > 0 && selectedShopId === null) {
      setSelectedShopId(shops[0].id);
    }
  }, [shops, selectedShopId]);

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
    
    return matchesSearch && matchesCategory;
  });

  const sortedShops = [...filteredShops].sort((a, b) => {
    if (selectedCategory === 'Nearby' && userLocation) {
      // For demo, we use some fixed coordinates for shops if they don't have them
      const aLat = (a as any).latitude || -25.9964 + (parseInt(a.id) % 10) * 0.005;
      const aLng = (a as any).longitude || 28.2268 + (parseInt(a.id) % 10) * 0.005;
      const bLat = (b as any).latitude || -25.9964 + (parseInt(b.id) % 10) * 0.005;
      const bLng = (b as any).longitude || 28.2268 + (parseInt(b.id) % 10) * 0.005;
      
      const distA = Math.sqrt(Math.pow(aLat - userLocation.lat, 2) + Math.pow(aLng - userLocation.lng, 2));
      const distB = Math.sqrt(Math.pow(bLat - userLocation.lat, 2) + Math.pow(bLng - userLocation.lng, 2));
      return distA - distB;
    }
    return 0;
  });

  const selectedShop = shops.find(s => s.id === selectedShopId) || shops[0];

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown';

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
          <span className="material-symbols-outlined text-orange-500 text-[120px] relative z-10">storefront</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">No Shops Found</h2>
        <p className="text-gray-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
          {fetchError ? fetchError : "It looks like there are no active shops in your area yet."}
        </p>
        
        {fetchError && fetchError.includes('Network Error') && (
          <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl mb-6 text-left max-w-xs border border-orange-100 dark:border-orange-900/30">
            <h4 className="text-[10px] font-bold text-orange-800 dark:text-orange-400 uppercase mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">info</span>
              Troubleshooting
            </h4>
            <ul className="text-[10px] text-orange-700 dark:text-orange-300 space-y-1.5 list-disc pl-3">
              <li>Check if your internet connection is active.</li>
              <li>Disable any **Ad-Blockers** (uBlock, AdBlock) for this site.</li>
              <li>Ensure your Supabase project is not paused.</li>
              <li>Verify **VITE_SUPABASE_URL** & **VITE_SUPABASE_ANON_KEY** in settings.</li>
            </ul>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-6 text-[10px] font-mono text-slate-400 border border-slate-100 dark:border-slate-700 w-full max-w-xs overflow-hidden">
          <div className="flex justify-between items-center mb-1">
            <span>Supabase Endpoint</span>
            <span className="text-[8px] bg-slate-200 dark:bg-slate-700 px-1 rounded uppercase">Active</span>
          </div>
          <div className="truncate text-slate-500 dark:text-slate-300">{supabaseUrl}</div>
        </div>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button 
            onClick={onRetry} 
            className="w-full bg-orange-600 text-white font-bold py-4 px-8 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
            Retry Loading
          </button>

          {/* Demo Seeder for Presentation */}
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
                
                alert(`Seeding Error: ${msg}`);
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
  logo_url text DEFAULT 'https://picsum.photos/seed/shop/200/200'
);

-- 2. Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL,
  description text,
  image_url text DEFAULT 'https://picsum.photos/seed/food/200/200',
  is_available boolean DEFAULT true
);

-- 3. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  userName text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  createdAt timestamptz DEFAULT now()
);

-- 4. Insert demo data
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
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-sans max-w-md mx-auto relative shadow-2xl">
      {/* TopBar */}
      <header className="bg-white dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-primary/5">
        <div className="flex items-center gap-1">
          <span className="text-orange-600 font-extrabold text-2xl tracking-tighter">LocalEats</span>
          <div className="w-2 h-2 bg-red-500 rounded-full mb-1"></div>
        </div>
        <div className="flex items-center gap-2">
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
                    <span className="material-symbols-outlined text-gray-500 dark:text-slate-400 group-hover:text-orange-600">settings</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Settings</span>
                  </button>
                  <button onClick={() => { setIsSettingsOpen(false); onProfile(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group cursor-pointer">
                    <span className="material-symbols-outlined text-gray-500 dark:text-slate-400 group-hover:text-orange-600">person</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Profile</span>
                  </button>
                  <button onClick={() => { setIsSettingsOpen(false); onOrderHistory(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group cursor-pointer">
                    <span className="material-symbols-outlined text-gray-500 dark:text-slate-400 group-hover:text-orange-600">history</span>
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
                  <svg className="h-5 w-5 text-gray-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path clipRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" fillRule="evenodd"></path>
                  </svg>
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
            <section className="mb-4 overflow-x-auto no-scrollbar flex gap-2 pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${selectedCategory === cat ? 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                >
                  {cat}
                </button>
              ))}
            </section>

            {/* Restaurants Near You */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Restaurants Near You</h3>
                <button 
                  onClick={onRequestLocation}
                  className="flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400"
                >
                  <span className="material-symbols-outlined text-[14px]">{userLocation ? 'my_location' : 'location_searching'}</span>
                  {userLocation ? 'Update Location' : 'Get Location'}
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {sortedShops.slice(0, 5).map((shop) => (
                  <div 
                    key={shop.id} 
                    onClick={() => onStoreInfo(shop.id)}
                    className="flex flex-col gap-2 shrink-0 w-48 bg-white dark:bg-slate-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-slate-800 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="h-24 w-full rounded-xl overflow-hidden relative">
                      <img alt={shop.name} className="w-full h-full object-cover" src={shop.logo} loading="lazy" referrerPolicy="no-referrer"/>
                      <div className="absolute top-2 right-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shadow-sm">
                        <span className="material-symbols-outlined text-yellow-500 text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                        <span className="text-[10px] font-bold text-slate-900 dark:text-white">{shop.rating}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{shop.name}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[10px] text-gray-400">location_on</span>
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate">{shop.address || 'Tembisa'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {sortedShops.length === 0 && (
                  <div className="flex flex-col items-center justify-center w-full py-8 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                    <span className="material-symbols-outlined text-gray-300 dark:text-slate-600 text-4xl mb-2">near_me</span>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 italic">No restaurants found nearby.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Followed Stores */}
            <section className="mb-6">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Followed Stores</h3>
              <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {shops.filter(s => favorites.includes(s.id)).map((shop) => (
                  <div 
                    key={shop.id} 
                    onClick={() => setSelectedShopId(shop.id)}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-[72px] cursor-pointer"
                  >
                    <div className={`w-16 h-16 rounded-full ring-2 p-0.5 shadow-sm bg-white dark:bg-slate-800 transition-all ${selectedShopId === shop.id ? 'ring-orange-500 scale-105' : 'ring-gray-200 dark:ring-slate-700'}`}>
                      <img alt={shop.name} className="w-full h-full rounded-full object-cover" src={shop.logo} loading="lazy" referrerPolicy="no-referrer"/>
                    </div>
                    <span className={`text-[10px] font-semibold text-center truncate w-full transition-colors ${selectedShopId === shop.id ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-slate-400'}`}>
                      {shop.name}
                    </span>
                  </div>
                ))}
                {shops.filter(s => favorites.includes(s.id)).length === 0 && (
                  <div className="flex flex-col items-center justify-center w-full py-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 italic mb-2">You haven't followed any stores yet.</p>
                    <button onClick={onDiscover} className="text-[10px] font-bold text-orange-600 dark:text-orange-400 underline">Discover Stores</button>
                  </div>
                )}
              </div>
            </section>

            {/* Menu Section */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg flex-grow flex flex-col overflow-hidden mb-4 relative">
              <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                    <img alt={selectedShop.name} className="w-8 h-8 rounded-full object-cover" src={selectedShop.logo} loading="lazy" referrerPolicy="no-referrer"/>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedShop.name} Menu</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{selectedShop.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-col items-end justify-center">
                  <div className="flex items-center gap-2 relative">
                    <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Open Now</span>
                    <button 
                      onClick={() => setIsStoreSettingsOpen(!isStoreSettingsOpen)}
                      aria-label="Store settings" 
                      className={`text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors flex items-center justify-center p-1 rounded-full cursor-pointer ${isStoreSettingsOpen ? 'bg-gray-100 dark:bg-slate-800' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>

                    {isStoreSettingsOpen && (
                      <>
                        <div className="fixed inset-0 z-[50]" onClick={() => setIsStoreSettingsOpen(false)}></div>
                        <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl z-[60] py-1 animate-in fade-in zoom-in duration-200 origin-top-right">
                          <button className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2 border-b border-gray-50 dark:border-slate-700 cursor-pointer">
                            <span className="material-symbols-outlined !text-[16px]">person_remove</span>
                            Unfollow
                          </button>
                          <button 
                            onClick={() => { setIsStoreSettingsOpen(false); onStoreInfo(selectedShopId); }}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-b border-gray-50 dark:border-slate-700 cursor-pointer"
                          >
                            <span className="material-symbols-outlined !text-[16px]">info</span>
                            Store Info
                          </button>
                          <button className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 cursor-pointer">
                            <span className="material-symbols-outlined !text-[16px]">report</span>
                            Report Store
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-[14px] text-orange-500" style={{ fontVariationSettings: `'FILL' ${i < Math.floor(selectedShop.rating) ? 1 : 0}` }}>
                        {i < Math.floor(selectedShop.rating) ? 'star' : (i < selectedShop.rating ? 'star_half' : 'star')}
                      </span>
                    ))}
                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 ml-1">{selectedShop.rating}</span>
                  </div>
                </div>
              </div>
                  <div className="flex-grow overflow-y-auto p-4 space-y-3 pb-24">
                    {selectedShop.menu.map((item) => {
                      const cartItem = cart.find(i => i.id === item.id && i.shopId === selectedShopId);
                      const quantity = cartItem?.quantity || 0;
                      const isExpanded = expandedItems.includes(item.id);
                      const hasDescription = item.description && item.description.length > 0;
                      const isLongDescription = item.description && item.description.length > 40;

                      return (
                        <div key={item.id} className={`flex flex-col p-3 rounded-2xl border transition-all ${quantity > 0 ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 shadow-sm' : 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700'}`}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col flex-1 mr-2">
                              <span className="text-sm font-bold text-gray-800 dark:text-white">{item.name}</span>
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-bold mt-1">{item.displayPrice}</span>
                            </div>
                            
                            {quantity > 0 ? (
                              <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-orange-200 dark:border-orange-500/30 p-1 shadow-sm">
                                <button 
                                  onClick={() => removeFromCart(item.id, selectedShopId)}
                                  className="w-8 h-8 flex items-center justify-center text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-lg">remove</span>
                                </button>
                                <span className="text-sm font-bold w-4 text-center dark:text-white">{quantity}</span>
                                <button 
                                  onClick={() => addToCart(item, selectedShopId)}
                                  className="w-8 h-8 flex items-center justify-center text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-lg">add</span>
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => addToCart(item, selectedShopId)} 
                                className="text-xs font-bold px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white shadow-md shadow-orange-200 dark:shadow-none transition-all cursor-pointer"
                              >
                                Buy
                              </button>
                            )}
                          </div>

                          {hasDescription && (
                            <div className="mt-2">
                              <p className={`text-[10px] text-gray-500 dark:text-slate-400 leading-relaxed ${!isExpanded && isLongDescription ? 'line-clamp-1' : ''}`}>
                                {item.description}
                              </p>
                              {isLongDescription && (
                                <button 
                                  onClick={() => toggleExpand(item.id)}
                                  className="flex items-center gap-1 text-[10px] font-bold text-primary mt-1 hover:underline cursor-pointer"
                                >
                                  <span>{isExpanded ? 'Show Less' : 'Read More'}</span>
                                  <span className={`material-symbols-outlined text-[12px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
              
              {/* Submit Order Button Container */}
              {cartCount > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-slate-900 via-white dark:via-slate-900 to-transparent pt-8 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex gap-2">
                    <button onClick={onCheckout} className="flex-grow bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-200 dark:shadow-none flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer">
                      <span>Submit order ({cartCount})</span>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                    </button>
                    <button 
                      onClick={clearCart}
                      title="Clear Cart"
                      className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30 p-4 rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined">delete_sweep</span>
                    </button>
                  </div>
                </div>
              )}
            </section>
      </main>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.button
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0, y: 20 }}
            onClick={onCheckout}
            className="fixed bottom-24 right-6 z-50 bg-orange-600 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="relative">
              <span className="material-symbols-outlined">shopping_cart</span>
              <span className="absolute -top-2 -right-2 bg-white text-orange-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm border border-orange-100">
                {cartCount}
              </span>
            </div>
            <span className="font-bold text-sm pr-1">Checkout</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sticky Checkout Bar */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/80 dark:bg-[#221610]/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]"
          >
            <div className="max-w-md mx-auto">
              <button 
                onClick={onCheckout}
                className="w-full h-14 bg-orange-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-200 dark:shadow-none flex items-center justify-between px-6 active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 px-2.5 py-1 rounded-lg text-[10px]">
                    {cartCount}
                  </div>
                  <span className="uppercase tracking-widest">Checkout Now</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-70">Total:</span>
                  <span className="text-base">R {cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BottomNavigation */}
      <nav className="bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-6 py-2 pb-6 flex justify-around items-center sticky bottom-0 z-40">
        <button className="flex flex-col items-center gap-1 text-orange-600 cursor-pointer">
          <div className="p-1 rounded-xl bg-orange-50 dark:bg-orange-500/10">
            <span className="material-symbols-outlined">home</span>
          </div>
          <span className="text-xs font-bold">Home</span>
        </button>
        <button onClick={onDiscover} className="flex flex-col items-center gap-1 text-gray-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <span className="material-symbols-outlined">storefront</span>
          </div>
          <span className="text-xs font-semibold">Discover</span>
        </button>
        <button onClick={onExplore} className="flex flex-col items-center gap-1 text-gray-400 dark:text-slate-500 hover:text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <span className="material-symbols-outlined">explore</span>
          </div>
          <span className="text-xs font-semibold">Explore</span>
        </button>
      </nav>
    </div>
  );
}

function CheckoutScreen({ userProfile, session, shops, onBack, onConfirm, cart, setCart }: { userProfile: UserProfile, session: any, shops: Shop[], onBack: () => void, onConfirm: () => void, cart: CartItem[], setCart: Dispatch<SetStateAction<CartItem[]>> }) {
  const [loading, setLoading] = useState(false);
  
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const primaryShopId = cart.length > 0 ? cart[0].shopId : (shops[0]?.id || '');
  const primaryShop = shops.find(s => s.id === primaryShopId) || shops[0];

  const handleConfirm = async () => {
    if (!userProfile.fullName || !userProfile.phone) {
      alert('Please complete your profile (Name and Phone) before ordering.');
      return;
    }
    
    setLoading(true);
    if ("vibrate" in navigator) {
      navigator.vibrate([10, 30, 10]); // Premium double-tap feel for confirmation
    }
    try {
      const orderData = cart.map(item => ({
        user_id: session?.user?.id,
        shop_id: item.shopId, // Added shop_id so the owner sees it!
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
        notes: '',
        status: 'pending'
      }));

      console.log('Submitting order to Supabase:', orderData);
      const { data, error } = await supabase.from('orders').insert(orderData).select();
      
      if (error) {
        console.error('Supabase insert error details:', error);
        throw error;
      }
      
      console.log('Order successfully placed:', data);
      onConfirm();
    } catch (error: any) {
      console.error('Error submitting order:', error);
      alert(`Failed to place order: ${error.message || 'Unknown error'}. Please try again.`);
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
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] flex-1">Checkout</h2>
          <button 
            onClick={() => {
              if (window.confirm('Clear all items from your cart?')) {
                setCart([]);
                localStorage.setItem('cart', JSON.stringify([]));
                onBack();
              }
            }}
            className="text-red-500 text-xs font-bold flex items-center gap-1 p-2 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>
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
                  </div>
                  <div className="shrink-0">
                    <p className="text-primary text-base font-bold leading-normal">R {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          
          {/* Pickup Details Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-3">Pickup Details</h3>
            <div className="bg-white dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-stretch justify-between gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                    <p className="text-primary text-sm font-bold uppercase tracking-wider">Ready in 15-20 mins</p>
                  </div>
                  <p className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight">{primaryShop.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-tight">{primaryShop.address}</p>
                </div>
                <div className="w-24 bg-center bg-no-repeat aspect-square bg-cover rounded-xl border border-slate-200 dark:border-slate-700" style={{ backgroundImage: `url("${primaryShop.logo}")` }}></div>
              </div>
            </div>
          </section>
          
          {/* Payment Info Section */}
          <section>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-[-0.015em] pb-3">Payment Info</h3>
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">payments</span>
              <p className="text-slate-900 dark:text-slate-100 text-base font-medium">Pay at store upon pickup</p>
            </div>
          </section>
          
          {/* Total Amount Section */}
          <section className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex justify-between items-center px-2">
              <span className="text-slate-500 dark:text-slate-400 text-lg">Total Amount</span>
              <span className="text-slate-900 dark:text-slate-100 text-3xl font-black">R {totalAmount.toFixed(2)}</span>
            </div>
          </section>
          
          <div className="mt-4 mb-10">
            <button 
              onClick={handleConfirm}
              disabled={loading || cart.length === 0}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>
                  <span>Confirm Order</span>
                  <span className="material-symbols-outlined">check_circle</span>
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
            <span className="material-symbols-outlined text-white text-7xl" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
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
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-primary uppercase tracking-wider">Ready in 15-20 mins</p>
            <p className="text-slate-500 text-xs">Please head to the store for collection</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined">payments</span>
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

function DiscoverScreen({ shops, onHome, onExplore, favorites, toggleFavorite, onSelectShop, userLocation }: { shops: Shop[], onHome: () => void, onExplore: () => void, favorites: string[], toggleFavorite: (shopId: string) => void, onSelectShop: (shopId: string) => void, userLocation: { lat: number, lng: number } | null }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  const categories = ['All', 'Nearby', ...new Set(shops.map(s => s.category))];
  
  const filteredShops = shops.filter(shop => {
    const query = searchQuery.trim().toLowerCase();
    const shopText = `${shop.name} ${shop.description} ${shop.category}`.toLowerCase();
    const matchesSearch = query === '' || query.split(/\s+/).every(term => shopText.includes(term));
    const matchesCategory = selectedCategory === 'All' || selectedCategory === 'Nearby' || shop.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedShops = [...filteredShops].sort((a, b) => {
    if (selectedCategory === 'Nearby' && userLocation) {
      const aLat = (a as any).latitude || -25.9964 + (parseInt(a.id) % 10) * 0.005;
      const aLng = (a as any).longitude || 28.2268 + (parseInt(a.id) % 10) * 0.005;
      const bLat = (b as any).latitude || -25.9964 + (parseInt(b.id) % 10) * 0.005;
      const bLng = (b as any).longitude || 28.2268 + (parseInt(b.id) % 10) * 0.005;
      
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
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>arrow_back</span>
            </button>
            <h1 className="font-['Plus_Jakarta_Sans'] font-bold tracking-tight text-xl text-[#FF6B00]">DISCOVER</h1>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#ff7a2f] shadow-sm">
            <img className="w-full h-full object-cover" alt="User profile photo avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjDviWscgS5U3EHdflVMH2lw438ZIVTcAGpl49HTuhtYnGnSfmj-j2T7UXu5rn0URgx6WUnkNAvuzKIgfhWSpQOch5ABihBoWNM3z-RPXHqaA24O9y0NFMKiMIoU9TFnGbS4tbMulbBnjouRLsmXb3kMzUopz3ng_f-1m3X7yAo1Fb3Hebd-UF2Y7b8ZpwTWzv38qWzFP3dBBKbJr5gf6vK6XlqxSL_RJLfyxvBFqEHeF6XjLFdIGLeqWj_gft_DIt4zi87H4PEQ"/>
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
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>search</span>
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
                {category === 'Nearby' && <span className="material-symbols-outlined text-[14px] mr-1 align-middle">near_me</span>}
                {category}
              </button>
            ))}
          </div>
        </section>
        
        {/* Store Grid */}
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
                  <img className="w-full h-full object-cover" alt={shop.name} src={shop.logo}/>
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-yellow-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-sm font-bold text-[#2d2f31] dark:text-white">{shop.rating}</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#ffc69f] dark:bg-orange-500/20 flex items-center justify-center text-[#904800] dark:text-orange-400 font-bold text-xl">
                        {shop.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#2d2f31] dark:text-white">{shop.name}</h3>
                        <p className="text-[#5a5c5e] dark:text-slate-400 text-sm">{shop.address}</p>
                      </div>
                    </div>
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
        
        {/* Chef's Selection Carousel */}
        <section className="mt-16 overflow-hidden">
          <div className="px-6 mb-6">
            <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#2d2f31] dark:text-white">Chef's Selection</h2>
            <p className="text-[#5a5c5e] dark:text-slate-400">Handpicked local favorites</p>
          </div>
          <div className="flex gap-6 overflow-x-auto px-6 pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
            {shops.slice(0, 2).map(shop => (
              <div key={shop.id} className="flex-none w-80 snap-center bg-[#dbdde0] dark:bg-slate-800 rounded-lg p-6 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-white dark:border-slate-700 shadow-lg">
                  <img className="w-full h-full object-cover" alt={shop.name} src={shop.logo}/>
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
            <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>home</span>
            <span className="font-['Inter'] text-[11px] font-semibold tracking-wide">Home</span>
          </button>
          <button className="flex flex-col items-center justify-center text-[#FF6B00] dark:text-[#ff7a2f] bg-[#FF6B00]/10 rounded-full px-5 py-2 transition-transform duration-150 active:scale-96 cursor-pointer">
            <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>storefront</span>
            <span className="font-['Inter'] text-[11px] font-semibold tracking-wide">Discover</span>
          </button>
          <button onClick={onExplore} className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 px-5 py-2 hover:text-[#FF6B00] transition-colors cursor-pointer">
            <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>explore</span>
            <span className="font-['Inter'] text-[11px] font-semibold tracking-wide">Explore</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function ProfileScreen({ onBack, onSave, onOrderHistory, onAdminOrders, onShopDashboard, userProfile, onLogout, setNotification }: { onBack: () => void, onSave: (data: Partial<UserProfile>) => void, onOrderHistory: () => void, onAdminOrders: () => void, onShopDashboard: () => void, userProfile: UserProfile, onLogout: () => void, setNotification: (n: any) => void }) {
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
        errorMsg = "Storage bucket 'avatars' not found. Please create a public bucket named 'avatars' in your Supabase dashboard.";
      }
      setNotification({ message: `Error uploading avatar: ${errorMsg}`, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full max-w-md mx-auto flex-col bg-white dark:bg-[#221610] overflow-x-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center p-4 justify-between sticky top-0 bg-white/80 dark:bg-[#221610]/80 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-800">
          <button onClick={onBack} className="flex size-10 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-slate-900 dark:text-slate-100">arrow_back</span>
          </button>
          <h2 className="text-xl font-bold leading-tight tracking-tight flex-1 text-center pr-10">Profile</h2>
        </div>
        
        {/* Profile Picture Section */}
        <div className="flex p-6 @container">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            ref={fileInputRef}
            className="hidden"
          />
          <div className="flex w-full flex-col gap-4 items-center">
            <div className="relative group">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full border-4 border-white dark:border-slate-800 shadow-lg h-32 w-32 flex items-center justify-center overflow-hidden" style={{ backgroundImage: `url("${userProfile.photoURL || DEFAULT_AVATAR_URL}")` }}>
                {uploading && <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
            <div className="flex flex-col items-center justify-center">
              <p className="text-2xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">{userProfile.fullName || 'User'}</p>
              <p className="text-primary text-sm font-medium mt-1">{userProfile.email}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation Options */}
        <div className="px-4 py-2 flex flex-col gap-3">
          <button 
            onClick={onOrderHistory}
            className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">shopping_bag</span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-slate-900 dark:text-white">My Orders</p>
              <p className="text-slate-500 text-xs">View your order history</p>
            </div>
            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
          </button>

          {userProfile.role === 'admin' && (
            <button 
              onClick={onAdminOrders}
              className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10 shadow-sm hover:bg-primary/10 transition-all cursor-pointer"
            >
              <div className="size-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">dashboard</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-primary">Admin Dashboard</p>
                <p className="text-slate-500 text-xs">Manage store orders</p>
              </div>
              <span className="material-symbols-outlined text-primary">chevron_right</span>
            </button>
          )}

          {userProfile.role === 'shop_owner' && (
            <button 
              onClick={onShopDashboard}
              className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-100 dark:border-orange-500/20 shadow-sm hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-all cursor-pointer"
            >
              <div className="size-10 bg-orange-100 dark:bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400">
                <span className="material-symbols-outlined">storefront</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-orange-600 dark:text-orange-400">Shop Dashboard</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Manage your shop orders</p>
              </div>
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">chevron_right</span>
            </button>
          )}
        </div>

        {/* Editable Fields */}
        <div className="flex flex-col gap-2 px-4 py-2 mt-4">
          <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest ml-1 mb-2">Account Settings</h3>
          
          <div className="flex flex-col gap-1.5 py-2">
            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold ml-1">Full Name</label>
            <div className="relative flex items-center group">
              <input 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-4 px-4 pr-12 focus:border-primary focus:ring-primary dark:focus:border-primary transition-all text-slate-900 dark:text-white font-medium" 
                type="text"
              />
              <span className="material-symbols-outlined absolute right-4 text-slate-400 group-focus-within:text-primary">edit</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 py-2">
            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold ml-1">Phone Number</label>
            <div className="relative flex items-center group">
              <input 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-4 px-4 pr-12 focus:border-primary focus:ring-primary dark:focus:border-primary transition-all text-slate-900 dark:text-white font-medium" 
                type="tel"
              />
              <span className="material-symbols-outlined absolute right-4 text-slate-400 group-focus-within:text-primary">call</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 py-2">
            <label className="text-slate-500 dark:text-slate-400 text-xs font-semibold ml-1">Home Address</label>
            <div className="relative flex items-center group">
              <textarea 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="form-input w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-4 px-4 pr-12 focus:border-primary focus:ring-primary dark:focus:border-primary transition-all text-slate-900 dark:text-white font-medium resize-none" 
                rows={2}
              ></textarea>
              <span className="material-symbols-outlined absolute right-4 top-4 text-slate-400 group-focus-within:text-primary">location_on</span>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-6">
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>

        {/* Action Button */}
        <div className="p-4 bg-white dark:bg-[#221610] sticky bottom-0 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => onSave({ fullName, phone, address })} 
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined">save</span>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function StoreInfoScreen({ onBack, shop, isFavorite, onToggleFavorite, userProfile }: { onBack: () => void, shop: Shop, isFavorite: boolean, onToggleFavorite: () => void, userProfile: UserProfile | null }) {
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

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
          alert('Error: The reviews table is missing from the database. Please run the SQL setup in the Home screen.');
          return;
        }
        throw error;
      }
      
      setShowReviewForm(false);
      setNewComment('');
      setNewRating(5);
      fetchReviews();
      alert('Thank you for your review!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#221610] text-gray-900 dark:text-white antialiased min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center px-4 h-16 bg-white dark:bg-[#221610] max-w-md mx-auto">
        <div className="flex items-center w-full">
          <button onClick={onBack} className="mr-4 active:scale-95 duration-200 ease-in-out transition-opacity hover:opacity-80 text-orange-600 cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-bold text-lg tracking-tight text-gray-900 dark:text-white flex-grow">Store Info</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={onToggleFavorite}
              className={`material-symbols-outlined cursor-pointer transition-all active:scale-90 ${isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
              style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
            >
              favorite
            </button>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: shop.name,
                    text: `Check out ${shop.name} on LocalEats!`,
                    url: window.location.href,
                  }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="material-symbols-outlined text-gray-700 cursor-pointer hover:text-orange-600 transition-colors"
            >
              share
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4 flex-grow overflow-y-auto">
        {/* Hero Section: Logo and Rating */}
        <section className="mb-8 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center p-2 border-4 border-orange-100 dark:border-orange-500/20">
              <img alt={shop.name} className="w-full h-full rounded-full object-cover" src={shop.logo} loading="lazy" referrerPolicy="no-referrer"/>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 px-4 py-1 rounded-full shadow-md flex items-center space-x-1 border border-gray-100 dark:border-slate-700">
              <span className="material-symbols-outlined text-orange-500 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{shop.rating}</span>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{shop.name}</h2>
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
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 !text-xl group-focus-within:text-orange-600 transition-colors">search</span>
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
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">Freshly prepared local favourite</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-black text-orange-600 text-sm">{item.displayPrice}</p>
                          <button className="size-8 bg-orange-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-orange-600/20 active:scale-90 transition-all cursor-pointer">
                            <span className="material-symbols-outlined !text-lg">add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <div className="size-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <span className="material-symbols-outlined text-3xl">search_off</span>
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
                      <span key={i} className="material-symbols-outlined !text-sm" style={{ fontVariationSettings: `'FILL' ${i < Math.floor(shop.rating) ? 1 : 0}` }}>star</span>
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
                      <span className="material-symbols-outlined !text-lg">close</span>
                    </button>
                  </div>
                  
                  <div className="flex justify-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className={`transition-transform active:scale-90 ${newRating >= star ? 'text-orange-600' : 'text-slate-300'}`}
                      >
                        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: `'FILL' ${newRating >= star ? 1 : 0}` }}>
                          star
                        </span>
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
                      <span className="material-symbols-outlined text-3xl">database_off</span>
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
                                <span key={i} className="material-symbols-outlined !text-[10px]" style={{ fontVariationSettings: `'FILL' ${i < review.rating ? 1 : 0}` }}>star</span>
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
                      <span className="material-symbols-outlined text-3xl">rate_review</span>
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
                      <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">location_on</span>
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
                    <span className="material-symbols-outlined text-lg">directions</span>
                    <span>Get Directions</span>
                  </button>
                </div>

                {/* Hours & Contact */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">schedule</span>
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
                        <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">call</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Contact</h3>
                        <p className="text-gray-500 dark:text-slate-400 mt-1">+27 12 345 6789</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => window.open('tel:+27123456789')}
                      className="w-full mt-2 py-4 px-6 bg-orange-600 rounded-xl text-white font-bold hover:bg-orange-700 active:scale-[0.96] transition-all shadow-lg shadow-orange-900/20 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">phone_enabled</span>
                      <span>Call Store</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ExploreScreen({ shops, onHome, onDiscover, userLocation, onRequestLocation, onStoreInfo }: { shops: Shop[], onHome: () => void, onDiscover: () => void, userLocation: { lat: number, lng: number } | null, onRequestLocation: () => void, onStoreInfo: (shopId: string) => void }) {
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  // Map shop data to the format expected by the map view
  const mapShops = shops.map((shop, index) => ({
    ...shop,
    // Distribute them on the map if they don't have coordinates
    top: `${20 + (index * 25) % 60}%`,
    left: `${20 + (index * 35) % 60}%`,
  }));

  const activeShop = mapShops.find(s => s.id === selectedShopId);

  return (
    <div className="bg-white dark:bg-[#221610] text-slate-900 dark:text-slate-100 h-screen flex flex-col font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {/* Search Overlay */}
      <div className="absolute top-6 left-4 right-4 z-30">
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-full shadow-xl flex items-center px-4 py-3 border border-gray-100 dark:border-slate-800">
          <span className="material-symbols-outlined text-gray-400 mr-3">search</span>
          <input 
            type="text" 
            placeholder="Search for food spots..." 
            className="flex-grow outline-none text-sm font-medium bg-transparent"
          />
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-3"></div>
          <button className="text-orange-500" onClick={onRequestLocation}>
            <span className="material-symbols-outlined">{userLocation ? 'my_location' : 'location_searching'}</span>
          </button>
        </div>
        
        {/* Quick Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-2">
          {['Near Me', 'Top Rated', 'Open Now', 'Kota', 'Braai'].map((filter) => (
            <button key={filter} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-md text-xs font-semibold whitespace-nowrap border border-gray-100 dark:border-slate-800">
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="map-container flex-grow relative">
        {/* Simulated Roads */}
        <div className="map-road" style={{ top: '20%', left: 0, width: '100%', height: '40px' }}></div>
        <div className="map-road" style={{ top: 0, left: '30%', width: '40px', height: '100%' }}></div>
        <div className="map-road" style={{ top: '60%', left: 0, width: '100%', height: '40px' }}></div>
        <div className="map-road" style={{ top: 0, left: '70%', width: '40px', height: '100%' }}></div>

        {/* User Location Marker */}
        {userLocation && (
          <div 
            className="absolute z-20 flex flex-col items-center"
            style={{ top: '45%', left: '45%' }}
          >
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
              <div className="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="bg-blue-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-1 shadow-sm">You</span>
          </div>
        )}

        {/* Shop Pins */}
        {mapShops.map((shop) => (
          <div 
            key={shop.id}
            className="absolute z-10 cursor-pointer transition-transform hover:scale-110" 
            style={{ top: shop.top, left: shop.left }}
            onClick={() => setSelectedShopId(shop.id)}
          >
            <div className="relative">
              {selectedShopId === shop.id && (
                <div className="animate-pulse-orange absolute -inset-2 bg-orange-500 rounded-full opacity-20"></div>
              )}
              <div className={`${selectedShopId === shop.id ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 text-orange-500'} p-2 rounded-full shadow-lg border-2 border-white dark:border-slate-700 transition-colors`}>
                <span className="material-symbols-outlined text-sm">restaurant</span>
              </div>
            </div>
          </div>
        ))}

        {/* User Location */}
        <div className="absolute z-20" style={{ top: '50%', left: '35%' }}>
          <div className="relative">
            <div className="absolute -inset-3 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
            <div className="bg-blue-600 w-4 h-4 rounded-full border-2 border-white shadow-md"></div>
          </div>
        </div>

        {/* Floating Action Buttons */}
        <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-3">
          <button className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg text-gray-600 dark:text-slate-300 hover:text-orange-500 transition-colors">
            <span className="material-symbols-outlined">my_location</span>
          </button>
          <button className="bg-orange-500 p-3 rounded-full shadow-lg text-white hover:bg-orange-600 transition-colors">
            <span className="material-symbols-outlined">layers</span>
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
            className="absolute bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#221610] rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-24"
          >
            <div className="relative">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-6 cursor-pointer" onClick={() => setSelectedShopId(null)}></div>
              <button 
                onClick={() => setSelectedShopId(null)}
                className="absolute -top-2 -right-2 p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{activeShop.name}</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm font-medium">{activeShop.category} • 1.2 km away</p>
                <div className="flex items-center mt-1">
                  <span className="material-symbols-outlined text-orange-500 text-sm">star</span>
                  <span className="text-sm font-bold ml-1 dark:text-white">{activeShop.rating}</span>
                  <span className="text-gray-400 dark:text-slate-500 text-xs ml-1">(120+ reviews)</span>
                </div>
              </div>
              <button className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full text-gray-400 dark:text-slate-500">
                <span className="material-symbols-outlined">favorite</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => onStoreInfo(activeShop.id)}
                className="bg-orange-500 text-white py-3 rounded-2xl font-bold shadow-lg shadow-orange-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">menu_book</span>
                View Menu
              </button>
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeShop.address)}`, '_blank')}
                className="bg-gray-900 dark:bg-slate-800 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">directions</span>
                Directions
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar">
              {[1, 2, 3].map((i) => (
                <img 
                  key={i}
                  src={`https://picsum.photos/seed/food${activeShop.id}${i}/200/150`} 
                  alt="Food" 
                  className="w-32 h-24 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-slate-800"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-around items-center max-w-md mx-auto z-50">
        <button onClick={onHome} className="flex flex-col items-center gap-1 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <span className="material-symbols-outlined">home</span>
          </div>
          <span className="text-xs font-semibold">Home</span>
        </button>
        <button onClick={onDiscover} className="flex flex-col items-center gap-1 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <span className="material-symbols-outlined">storefront</span>
          </div>
          <span className="text-xs font-semibold">Discover</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-orange-500 transition-colors cursor-pointer">
          <div className="p-1">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
          </div>
          <span className="text-xs font-semibold">Explore</span>
        </button>
      </div>
    </div>
  );
}

function SettingsScreen({ userProfile, setUserProfile, onBack, onLogout, onProfile, onOrderHistory, onAdminOrders, onShopDashboard, isDarkMode, onToggleDarkMode, setNotification }: { userProfile: UserProfile, setUserProfile: Dispatch<SetStateAction<UserProfile>>, onBack: () => void, onLogout: () => void, onProfile: () => void, onOrderHistory: () => void, onAdminOrders: () => void, onShopDashboard: () => void, isDarkMode: boolean, onToggleDarkMode: () => void, setNotification: (n: any) => void }) {
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
        errorMsg = "Storage bucket 'avatars' not found. Please create a public bucket named 'avatars' in your Supabase dashboard.";
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
            <span className="material-symbols-outlined">arrow_back_ios</span>
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
                  <span className="material-symbols-outlined text-primary animate-spin">sync</span>
                </div>
              ) : (
                <img 
                  alt="Profile Picture" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" 
                  src={userProfile.photoURL || DEFAULT_AVATAR_URL}
                />
              )}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-primary w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg active:scale-90 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-[12px] text-white">photo_camera</span>
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
                  <span className="material-symbols-outlined text-xl">{isDarkMode ? 'dark_mode' : 'light_mode'}</span>
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
                <span className="material-symbols-outlined text-xs">restart_alt</span>
                <span>Reset Theme Preference</span>
              </button>
            </div>
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
                    <span className="material-symbols-outlined text-xl">orders</span>
                  </div>
                  <span className="font-medium">Manage Orders</span>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
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
                    <span className="material-symbols-outlined text-xl">storefront</span>
                  </div>
                  <span className="font-medium">Shop Dashboard</span>
                </div>
                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
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
                  <span className="material-symbols-outlined text-xl">person</span>
                </div>
                <span className="font-medium">Profile Information</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
            <button onClick={onOrderHistory} className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">history</span>
                </div>
                <span className="font-medium">Order History</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
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
                  <span className="material-symbols-outlined text-xl">notifications_active</span>
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
                  <span className="material-symbols-outlined text-xl">local_offer</span>
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
                  <span className="material-symbols-outlined text-xl">language</span>
                </div>
                <span className="font-medium">Language</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-500">
                <span className="text-sm">English</span>
                <span className="material-symbols-outlined">chevron_right</span>
              </div>
            </button>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">info</span>
                </div>
                <span className="font-medium">About App</span>
              </div>
              <span className="text-xs text-slate-400">v1.0.4</span>
            </div>
          </div>
        </section>

        {/* Logout Button */}
        <div className="pt-4">
          <button onClick={onLogout} className="w-full py-4 rounded-xl border-2 border-primary/20 text-primary font-bold hover:bg-primary/5 transition-colors flex items-center justify-center space-x-2 cursor-pointer">
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
          <p className="text-center text-xs text-slate-400 mt-6">LocalEats Version 2.4.1 (1024)</p>
        </div>
      </main>
    </div>
  );
}

function ShopDashboardScreen({ onBack, orderAcceptedModal, setOrderAcceptedModal }: { onBack: () => void, orderAcceptedModal: any, setOrderAcceptedModal: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'stats'>('orders');
  const [showDebug, setShowDebug] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  useEffect(() => {
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

        setShop(shopData);

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
          setOrders(ordersData || []);

          // 3. Subscribe to real-time updates for THIS shop
          const channel = supabase
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
                  setOrders(prev => [payload.new, ...prev]);
                  // Vibration alert for new order
                  if ("vibrate" in navigator) {
                    navigator.vibrate([100, 50, 100]);
                  }
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
        }
      } catch (err: any) {
        console.error('Error in Shop Dashboard:', err);
        setError(err.message === 'Failed to fetch' 
          ? 'Network Error: Could not reach Supabase. Check your internet or disable ad-blockers.'
          : (err.message || 'Failed to load dashboard data'));
      } finally {
        setLoading(false);
      }
    };

    fetchShopAndOrders();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    let ownerMessage = "";
    if (newStatus === 'confirmed') {
      ownerMessage = window.prompt("Enter a message for the customer (optional):", "Your order is being prepared with love! 🔥") || "";
    }

    if ("vibrate" in navigator) {
      navigator.vibrate(10); // Subtle feedback for status change
    }
    try {
      // Fetch current order to get existing history
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('status_history')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const history = currentOrder?.status_history || [];
      const newHistory = [...history, { status: newStatus, timestamp: new Date().toISOString() }];

      const updateData: any = { 
        status: newStatus,
        status_history: newHistory
      };
      if (ownerMessage) updateData.owner_message = ownerMessage;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) {
        // Fallback if columns don't exist
        const fallbackData: any = { status: newStatus };
        const { error: fallbackError } = await supabase
          .from('orders')
          .update(fallbackData)
          .eq('id', orderId);
        if (fallbackError) throw fallbackError;
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
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

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#221610]/80 backdrop-blur-md border-b border-primary/10">
        <div className="px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer">
            <span className="material-symbols-outlined">arrow_back_ios</span>
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
            <span className="material-symbols-outlined text-xl">bug_report</span>
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
                alert(`Total orders in DB: ${count || 0}`);
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
              <span className="material-symbols-outlined text-4xl">error</span>
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
                      alert('Failed to create shop: ' + err.message);
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
                <span className="material-symbols-outlined text-sm">add</span> Add Item
              </button>
            </div>
            {shop?.menu_items?.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {shop.menu_items.map((item: any) => {
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
                              <span className={`material-symbols-outlined text-[12px] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
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
                  <span className="material-symbols-outlined text-3xl">inventory_2</span>
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
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-4xl">restaurant</span>
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
                  alert('Failed to seed orders: ' + err.message);
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
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg">{order.customer_name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-sm">schedule</span>
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
                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Confirm Order
                  </button>
                )}
                {order.status === 'confirmed' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Mark as Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-3 rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    Complete Order
                  </button>
                )}
                {['pending', 'confirmed'].includes(order.status) && (
                  <button 
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this order?')) {
                        updateOrderStatus(order.id, 'cancelled');
                      }
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
                  <span className="material-symbols-outlined text-sm">call</span>
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
          <span className="material-symbols-outlined">list_alt</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'inventory' ? 'text-primary' : 'text-slate-400'}`}
        >
          <span className="material-symbols-outlined">inventory_2</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Inventory</span>
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${activeTab === 'stats' ? 'text-primary' : 'text-slate-400'}`}
        >
          <span className="material-symbols-outlined">insights</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Stats</span>
        </button>
      </nav>
    </div>
  );
}

function AdminOrdersScreen({ onBack }: { onBack: () => void }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [orderToConfirm, setOrderToConfirm] = useState<any | null>(null);
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
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      // We don't have a local error state in AdminOrdersScreen, but we can log it clearly
      if (error.message === 'Failed to fetch') {
        console.error('Network Error: Could not reach Supabase. Check your internet or disable ad-blockers.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, message?: string) => {
    if ("vibrate" in navigator) {
      navigator.vibrate(10); // Subtle feedback for status change
    }
    try {
      // Fetch current order to get existing history
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('status_history')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const history = currentOrder?.status_history || [];
      const newHistory = [...history, { status, timestamp: new Date().toISOString() }];

      const updateData: any = { 
        status,
        status_history: newHistory
      };
      if (message) updateData.owner_message = message;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
      
      if (error) {
        // Fallback if columns don't exist
        const fallbackData: any = { status };
        const { error: fallbackError } = await supabase
          .from('orders')
          .update(fallbackData)
          .eq('id', orderId);
        if (fallbackError) throw fallbackError;
      }
      fetchOrders(); // Refresh list
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update status');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white dark:bg-[#221610] font-display text-slate-900 dark:text-slate-100 min-h-screen">
      <div className="relative flex h-screen w-full flex-col max-w-md mx-auto overflow-x-hidden">
        <header className="flex items-center p-4 bg-white dark:bg-[#221610] sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
          <button onClick={onBack} className="text-slate-900 dark:text-slate-100 flex size-10 shrink-0 items-center justify-center hover:bg-primary/10 rounded-full transition-colors cursor-pointer">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center mr-10">Admin Dashboard</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 !text-xl group-focus-within:text-primary transition-colors">search</span>
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
            <button onClick={fetchOrders} className="text-primary text-xs font-bold flex items-center gap-1 cursor-pointer">
              <span className="material-symbols-outlined !text-sm">refresh</span>
              Refresh
            </button>
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
              <span className="material-symbols-outlined !text-6xl">inventory_2</span>
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
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shrink-0 ml-2 ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'ready' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                    order.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
                
                {/* Collapsed View: Address */}
                {expandedOrderId !== order.id && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                    <span className="material-symbols-outlined !text-sm">location_on</span>
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
                          <span className="material-symbols-outlined text-primary !text-lg">person</span>
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
                              <span className="material-symbols-outlined !text-sm">call</span>
                              {order.phone}
                            </a>
                            <a 
                              href={`mailto:${order.email}`}
                              className="flex items-center gap-2 text-xs text-primary hover:underline font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="material-symbols-outlined !text-sm">mail</span>
                              {order.email}
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Order Info */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary !text-lg">shopping_basket</span>
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Order Particulars</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-sm font-bold">{order.product_name}</p>
                            <p className="text-sm font-black text-primary">R {order.price?.toLocaleString()}</p>
                          </div>
                          {order.product_variant && (
                            <p className="text-xs text-slate-500 mb-1">Variant: {order.product_variant}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="material-symbols-outlined !text-sm">layers</span>
                            Quantity: {order.quantity}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary !text-lg">location_on</span>
                          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Delivery Destination</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`${order.address}, ${order.city}, ${order.country}`);
                            alert('Address copied to clipboard!');
                          }}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined !text-xs">content_copy</span>
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
                          <span className="material-symbols-outlined text-primary !text-lg">sticky_note_2</span>
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
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 h-9 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'completed')}
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
                <span className="material-symbols-outlined !text-2xl">cancel</span>
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
                    updateOrderStatus(orderToCancel.id, 'cancelled');
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
                <span className="material-symbols-outlined !text-2xl">check_circle</span>
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
                    updateOrderStatus(orderToConfirm.id, 'confirmed', confirmationMessage);
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

function OrderHistoryScreen({ session, onBack, userProfile }: { session: any, onBack: () => void, userProfile: UserProfile }) {
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
      alert(`Failed to cancel order: ${error.message}`);
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
          console.error('Network Error: Could not reach Supabase. Check your internet or disable ad-blockers.');
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
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
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
                <span className="material-symbols-outlined text-4xl">shopping_bag</span>
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
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Order #{order.id.toString().slice(-6)}</p>
                    <p className="text-slate-900 dark:text-slate-100 font-bold text-base">{order.product_name}</p>
                    <p className="text-slate-500 text-[10px] font-medium">{new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                      order.status === 'ready' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      order.status === 'completed' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                      order.status === 'cancelled' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                {order.status === 'pending' && (
                  <div className="flex justify-end pt-2">
                    <button 
                      onClick={() => setCancellingOrderId(order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-rose-100 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined !text-xs">cancel</span>
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
                        { id: 'pending', icon: 'hourglass_empty', label: 'Pending' },
                        { id: 'confirmed', icon: 'check_circle', label: 'Confirmed' },
                        { id: 'ready', icon: 'restaurant', label: 'Ready' },
                        { id: 'completed', icon: 'task_alt', label: 'Done' }
                      ].map((step, idx, arr) => {
                        const statuses = arr.map(s => s.id);
                        const currentIdx = statuses.indexOf(order.status);
                        const isCompleted = currentIdx >= idx || order.status === 'completed';
                        const isActive = order.status === step.id;

                        return (
                          <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5">
                            <div className={`size-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                              isCompleted ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-300'
                            }`}>
                              <span className="material-symbols-outlined !text-sm" style={{ fontVariationSettings: `'FILL' ${isCompleted ? 1 : 0}` }}>
                                {step.icon}
                              </span>
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
                  <p className="text-slate-500 text-xs">Quantity: {order.quantity}</p>
                  <p className="text-primary font-bold">R {(order.price || 0).toFixed(2)}</p>
                </div>

                {/* Status History Timeline */}
                {order.status_history && order.status_history.length > 0 && (
                  <div className="mt-2 pt-3 border-t border-slate-50 dark:border-slate-800">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                      <span className="material-symbols-outlined !text-xs">history</span>
                      Status Journey
                    </p>
                    <div className="space-y-3 pl-1">
                      {order.status_history.map((h: any, i: number) => (
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
                <span className="material-symbols-outlined text-3xl">warning</span>
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
            <span className="material-symbols-outlined text-orange-600 text-4xl">rate_review</span>
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
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: `'FILL' ${rating >= star ? 1 : 0}` }}>
                star
              </span>
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

