const fs = require('fs');

let content = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf-8');

content = content.replace('import { UserProfile, Shop, CartItem, Screen } from "../types";',
'import { Shop, CartItem, Screen } from "../types";\nimport { UserProfile } from "../App";');

content = content.replace('import { calculateDistance, formatSAPhone, validateSAPhone, safeLocalStorageSet, safeLocalStorageGet, getShopStatus, DEFAULT_MENU_IMAGE } from "../utils";',
'import { calculateDistance, formatSAPhone, validateSAPhone, safeLocalStorageSet, safeLocalStorageGet, getShopStatus, DEFAULT_MENU_IMAGE } from "../utils";');

content = content.replace('import { detectTownship } from "../utils";',
'import { detectTownship } from "../App";\nimport { Tag } from "lucide-react";');

fs.writeFileSync('src/screens/CheckoutScreen.tsx', content);
