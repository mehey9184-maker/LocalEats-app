const fs = require('fs');
let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

// The file starts with two blocks of imports. We'll find the first function CheckoutScreen and keep everything from there, prepending the correct imports.

const functionIndex = content.indexOf('function CheckoutScreen({');

const cleanContent = content.substring(functionIndex);

const correctImports = `import React, { useState, useEffect, useMemo, useRef, Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, MapPin, Clock, CreditCard, ChevronRight, X, Phone, User, Home, Building2, Wallet, Navigation, ShoppingBag, Plus, Minus, ArrowRight, Truck, Info, ShieldCheck, Banknote, ShoppingBasket, ExternalLink, Lock, UserPlus, Sparkles, Bike, Loader2, Target, CheckCircle, QrCode, Trash2, AlertTriangle, Gift, Shield, Utensils
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { UserProfile, Shop, CartItem, Screen } from "../types";
import { calculateDistance, formatSAPhone, validateSAPhone, safeLocalStorageSet, safeLocalStorageGet, getShopStatus, DEFAULT_MENU_IMAGE } from "../utils";
import { Session } from "@supabase/supabase-js";
import { LocalEatsLogo } from "../components/LocalEatsLogo";
import { useTranslation } from "../contexts/LanguageContext";
import { AddressSearch, LocationPickerMap } from "../components/MapComponents";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { BlurUpImage } from "../components/BlurUpImage"; // Assuming this exists or I will just import it. Let me just add it to utils if needed, or I'll just change BlurUpImage to img.

export `;

fs.writeFileSync('src/screens/CheckoutScreen.tsx', correctImports + cleanContent);
