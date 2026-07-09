const fs = require('fs');
let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

const imports = `import React, { useState, useEffect, useMemo, useRef, Dispatch, SetStateAction } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, MapPin, Clock, CreditCard, ChevronRight, X, Phone, User, Home, Building2, Wallet, Navigation, ShoppingBag, Plus, Minus, ArrowRight, Truck, Info, ShieldCheck, Banknote, ShoppingBasket, ExternalLink, Lock, UserPlus
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { UserProfile, Shop, CartItem } from "../types";
import { calculateDistance, formatSAPhone, validateSAPhone } from "../utils";
import { Session } from "@supabase/supabase-js";
import { LocalEatsLogo } from "../components/LocalEatsLogo";
import { useTranslation } from "../contexts/LanguageContext";

// Local types that were inline in App.tsx
// TODO: ensure any needed constants are imported
`;

fs.writeFileSync('src/screens/CheckoutScreen.tsx', imports + "\n" + content);
