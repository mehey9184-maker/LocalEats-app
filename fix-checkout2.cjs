const fs = require('fs');
let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

// replace the imports at the top
content = content.replace(/import React, [\s\S]*?\/\/ TODO: ensure any needed constants are imported\n/, `import React, { useState, useEffect, useMemo, useRef, Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, MapPin, Clock, CreditCard, ChevronRight, X, Phone, User, Home, Building2, Wallet, Navigation, ShoppingBag, Plus, Minus, ArrowRight, Truck, Info, ShieldCheck, Banknote, ShoppingBasket, ExternalLink, Lock, UserPlus, Sparkles, Bike, Loader2, Target, CheckCircle
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { UserProfile, Shop, CartItem } from "../types";
import { calculateDistance, formatSAPhone, validateSAPhone, safeLocalStorageSet } from "../utils";
import { Session } from "@supabase/supabase-js";
import { LocalEatsLogo } from "../components/LocalEatsLogo";
import { useTranslation } from "../contexts/LanguageContext";
import { AddressSearch, LocationPickerMap } from "../components/MapComponents";
import { toast } from "sonner";

export `); // export function CheckoutScreen

fs.writeFileSync('src/screens/CheckoutScreen.tsx', content);
