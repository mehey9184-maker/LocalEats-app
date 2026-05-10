import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'zu' | 'af' | 'st' | 'ts';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

const translations: Translations = {
  settings: {
    en: 'Settings',
    zu: 'Izilungiselelo',
    af: 'Instellings',
    st: 'Di-settings',
    ts: 'Tisettingi'
  },
  account_security: {
    en: 'Account Security',
    zu: 'Ukuphepha kwe-Akhawunti',
    af: 'Rekening sekuriteit',
    st: 'Tshireletso ya Akhaonto',
    ts: 'Nsirhelelo wa Akhaonto'
  },
  preferences: {
    en: 'Preferences',
    zu: 'Okukhethwayo',
    af: 'Voorkeure',
    st: 'Dikgetho',
    ts: 'Swin’wana swi tsakela'
  },
  support_legal: {
    en: 'Support & Legal',
    zu: 'Ukusekelwa noMthetho',
    af: 'Ondersteuning en Regs',
    st: 'Tshehetso le Melao',
    ts: 'Nseketelo na swa le Nawini'
  },
  edit_profile: {
    en: 'Edit Profile',
    zu: 'Hlela Iphrofayela',
    af: 'Wysig profiel',
    st: 'Fetola Phrofayele',
    ts: 'Lulamisa Phrofayili'
  },
  saved_addresses: {
    en: 'Saved Addresses',
    zu: 'Amakheli Agciniwe',
    af: 'Gestoorde Adresse',
    st: 'Diaterese tse bolokilweng',
    ts: 'Tiaderese leti hlayisiweke'
  },
  delete_account: {
    en: 'Delete Account',
    zu: 'Sula I-akhawunti',
    af: 'Skrap rekening',
    st: 'Hlakola Akhaonto',
    ts: 'Sula Akhaonto'
  },
  app_language: {
    en: 'App Language',
    zu: 'Ulimi Lokusebenza',
    af: 'Taal van die Toep',
    st: 'Puo ya Lenaneo',
    ts: 'Ririmi ra Aplikhayixini'
  },
  notifications: {
    en: 'Notifications',
    zu: 'Izaziso',
    af: 'Kennisgewings',
    st: 'Ditsebiso',
    ts: 'Switiviso'
  },
  dark_mode: {
    en: 'Dark Mode',
    zu: 'Imodi Emnyama',
    af: 'Donker modus',
    st: 'Mokgoa o mofitshwana',
    ts: 'Maendlelo ya munyama'
  },
  help_center: {
    en: 'Help Center',
    zu: 'Isikhungo Sosizo',
    af: 'Hulpsentrum',
    st: 'Setsi sa Thuso',
    ts: 'Xitichi xa Mpfuno'
  },
  terms_conditions: {
    en: 'Terms & Conditions',
    zu: 'Migomo nemibandela',
    af: 'Bepalings en Voorwaardes',
    st: 'Dipehelo le Maemo',
    ts: 'Milawu na Swipimelo'
  },
  privacy_policy: {
    en: 'Privacy Policy',
    zu: 'Inqubomgomo Yemfihlo',
    af: 'Privaatheidsbeleid',
    st: 'Pholisi ya Boporayefete',
    ts: 'Pholisi ya Xihundla'
  },
  app_version: {
    en: 'App Version',
    zu: 'Inguqulo ye-App',
    af: 'Weergawe van Toep',
    st: 'Mofuta wa Lenaneo',
    ts: 'Vhexini ya Aplikhayixini'
  },
  logout: {
    en: 'Logout',
    zu: 'Phuma',
    af: 'Meld uit',
    st: 'Tswa',
    ts: 'Huma'
  },
  home: {
    en: 'Home',
    zu: 'Ikhaya',
    af: 'Tuis',
    st: 'Gae',
    ts: 'Kaya'
  },
  profile: {
    en: 'Profile',
    zu: 'Iphrofayela',
    af: 'Profiel',
    st: 'Phrofayele',
    ts: 'Phrofayili'
  },
  save: {
    en: 'Save',
    zu: 'Gcina',
    af: 'Stoor',
    st: 'Boloka',
    ts: 'Hlayisa'
  },
  discover: {
    en: 'Discover',
    zu: 'Thola',
    af: 'Ontdek',
    st: 'Tswela Pele',
    ts: 'Tshubula'
  },
  explore: {
    en: 'Explore',
    zu: 'Hlola',
    af: 'Verken',
    st: 'Hlahloba',
    ts: 'Valanga'
  },
  order_history: {
    en: 'Order History',
    zu: 'Umlando we-oda',
    af: 'Bestelling Geskiedenis',
    st: 'Nalane ya ditaelo',
    ts: 'Matimu ya odara'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language] || translations[key]['en'];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
