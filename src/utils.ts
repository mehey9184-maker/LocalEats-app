export const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export const handleSupabaseError = (error: any, action: string, showAlert: (title: string, msg: string) => void) => {
  console.error(`Supabase error during ${action}:`, error);
  if (error?.code === 'PGRST204' || error?.code === 'PGRST200') {
    showAlert('Updating Store Info', 'We are currently updating our store lists to bring you the latest menus. Please try again in a few seconds.');
  } else if (error?.message === 'Failed to fetch' || error?.message?.includes('Network Error')) {
    showAlert('Connection Issue', 'We are having trouble connecting to the server. Please check your internet connection and try again.');
  } else if (error?.code === '23505') {
    showAlert('Already Exists', 'This information is already saved in your profile.');
  } else if (error?.code === '42501' || error?.message?.includes('permission denied')) {
    showAlert('Access Needed', 'It looks like you do not have permission for this action. Please sign in again.');
  } else if (error?.code === 'PGRST301') {
    showAlert('Session Timed Out', 'Your session has expired for security. Please refresh the page to continue.');
  } else {
    showAlert('Something Went Wrong', `We encountered an issue while trying to ${action}. Please try again later.`);
  }
  return error;
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

export const getShopStatus = (shop: { opening_time?: string, closing_time?: string }): { isOpen: boolean, message: string, warning?: boolean, nextOpeningTime?: string } => {
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

  if (minutesUntilClose > 0 && minutesUntilClose <= 30) {
    return { isOpen: true, message: `Closing soon (${minutesUntilClose}m)`, warning: true, nextOpeningTime: undefined };
  }

  return { isOpen: true, message: 'Open Now', nextOpeningTime: undefined };
};

export const DEFAULT_MENU_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800";
export const DEFAULT_SHOP_LOGO = "/logo.png";
export const APP_VERSION = "2.4.1 (1024)";
export const DEFAULT_COORDS = { lat: -25.9964, lng: 28.2268 };
export const SUPPORTED_CITIES = ['Tembisa', 'Kaalfontein', 'Ivory Park'];

