export type Screen = 'splash' | 'signup' | 'login' | 'verify' | 'setup-pin' | 'setup-password' | 'success' | 'complete-profile' | 'login-success' | 'home' | 'settings' | 'profile' | 'checkout' | 'order-success' | 'discover' | 'explore' | 'store-info' | 'admin-orders' | 'order-history' | 'shop-dashboard' | 'rider-dashboard' | 'review' | 'order-tracking' | 'notifications' | 'contact';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system' | 'follow';
  timestamp: number;
  read: boolean;
  orderId?: string;
  data?: any;
};

export type StatusHistoryItem = {
  status: string;
  timestamp: string;
};

export type Order = {
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
  delivery_instructions?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'delivered';
  is_delivery?: boolean;
  delivery_fee?: number;
  rider_id?: string;
  delivery_status?: 'none' | 'finding_rider' | 'rider_assigned' | 'picked_up' | 'delivered' | 'cancelled' | 'delivery' | 'collection' | 'ready' | 'pending' | 'preparing' | 'confirmed' | 'completed';
  created_at: string;
  status_history?: StatusHistoryItem[];
  owner_message?: string;
  cancellation_reason?: string;
  payment_method?: 'cash' | 'card_machine' | 'Cash on Delivery' | 'Card Machine';
  special_instructions?: string;
  customizations?: { name: string, price: number }[];
  latitude?: number;
  longitude?: number;
};

export type PendingReview = {
  orderId: string;
  shopId: string;
  productName: string;
  snoozeCount: number;
  nextReminder?: number;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  displayPrice: string;
  image: string;
  image_url?: string;
  description?: string;
  category?: string;
  customizations?: { name: string, price: number }[];
  is_available?: boolean;
};

export type CartItem = {
  id: string;
  shopId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  specialInstructions?: string;
  selectedCustomizations?: { name: string, price: number }[];
};

export type Review = {
  id: string;
  shop_id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type Shop = {
  id: string;
  name: string;
  logo: string;
  rating: number;
  description: string;
  address: string;
  menu: MenuItem[];
  category: string;
  cuisine_type?: string;
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
  images?: string[];
  cash_trust_enabled?: boolean;
  allow_external_riders?: boolean;
  auto_look_for_rider?: boolean;
  updated_at?: string;
  is_active?: boolean;
};
