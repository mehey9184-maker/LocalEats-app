import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'zu' | 'xh' | 'af' | 'st' | 'ts' | 'nso' | 'tn' | 'ss' | 've' | 'nr';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

const translations: Translations = {
  settings: {
    en: 'Settings',
    zu: 'Izilungiselelo',
    xh: 'Izicwangciso',
    af: 'Instellings',
    st: 'Di-settings',
    ts: 'Tisettingi',
    nso: 'Dipehelo',
    tn: 'Di-settings',
    ss: 'Tilungiselelo',
    ve: 'Zwilungisedzo',
    nr: 'Izilungiselelo'
  },
  account_security: {
    en: 'Account Security',
    zu: 'Ukuphepha kwe-Akhawunti',
    xh: 'Ukhuseleko lwe-Akhawunti',
    af: 'Rekening sekuriteit',
    st: 'Tshireletso ya Akhaonto',
    ts: 'Nsirhelelo wa Akhaonto',
    nso: 'Tšhireletso ya Akhaonto',
    tn: 'Tshireletso ya Akhaonto',
    ss: 'Kuphepha kwe-Akhawunti',
    ve: 'Tsireledzo ya Akhaonthu',
    nr: 'Ukuvikeleka kwe-Akhawunti'
  },
  preferences: {
    en: 'Preferences',
    zu: 'Okukhethwayo',
    xh: 'Ukukhetha',
    af: 'Voorkeure',
    st: 'Dikgetho',
    ts: 'Swin’wana swi tsakela',
    nso: 'Dikgetho',
    tn: 'Dikgetho',
    ss: 'Lokukhethwako',
    ve: 'Zwinandzeleswaho',
    nr: 'Okukhethwako'
  },
  support_legal: {
    en: 'Support & Legal',
    zu: 'Ukusekelwa noMthetho',
    xh: 'Inkxaso noMthetho',
    af: 'Ondersteuning en Regs',
    st: 'Tshehetso le Melao',
    ts: 'Nseketelo na swa le Nawini',
    nso: 'Thekgo le Melao',
    tn: 'Tshegetso le Melao',
    ss: 'Sisekelo nemitfwaso',
    ve: 'Thikhiso na Mulayo',
    nr: 'Isizo nomThetho'
  },
  edit_profile: {
    en: 'Edit Profile',
    zu: 'Hlela Iphrofayela',
    xh: 'Lungisa Iprofayile',
    af: 'Wysig profiel',
    st: 'Fetola Phrofayele',
    ts: 'Lulamisa Phrofayili',
    nso: 'Fetola Phrofayele',
    tn: 'Fetola Phofayele',
    ss: 'Hlela Iphrofayela',
    ve: 'Khwinisa Phurofaele',
    nr: 'Lungisa Iphrofayili'
  },
  saved_addresses: {
    en: 'Saved Addresses',
    zu: 'Amakheli Agciniwe',
    xh: 'Iidilesi Ezisindisiweyo',
    af: 'Gestoorde Adresse',
    st: 'Diaterese tse bolokilweng',
    ts: 'Tiaderese leti hlayisiweke',
    nso: 'Diaterese tšeo di bolokilwego',
    tn: 'Diaterese tse di bolokilweng',
    ss: 'Tindzawo letilondvolotiwe',
    ve: 'Diaderese dzo vhalewaho',
    nr: 'Amakheli we-Dilesi aGciniweko'
  },
  delete_account: {
    en: 'Delete Account',
    zu: 'Sula I-akhawunti',
    xh: 'Cima i-Akhawunti',
    af: 'Skrap rekening',
    st: 'Hlakola Akhaonto',
    ts: 'Sula Akhaonto',
    nso: 'Phumola Akhaonto',
    tn: 'Phumola Akhaonto',
    ss: 'Sula I-akhawunti',
    ve: 'Phumula Akhaonthu',
    nr: 'Sula I-akhawunti'
  },
  app_language: {
    en: 'App Language',
    zu: 'Ulimi Lokusebenza',
    xh: 'Ulwimi lwe-App',
    af: 'Taal van die Toep',
    st: 'Puo ya Lenaneo',
    ts: 'Ririmi ra Aplikhayixini',
    nso: 'Puo ya Lenaneo',
    tn: 'Puo ya Lenaneo',
    ss: 'Lulwimi lwe-App',
    ve: 'Luambo lwa Phurogiramu',
    nr: 'Ilimi ye-App'
  },
  notifications: {
    en: 'Notifications',
    zu: 'Izaziso',
    xh: 'Izaziso',
    af: 'Kennisgewings',
    st: 'Ditsebiso',
    ts: 'Switiviso',
    nso: 'Ditsebišo',
    tn: 'Ditsebiso',
    ss: 'Taziso',
    ve: 'Ndivhadzo',
    nr: 'Izaziso'
  },
  dark_mode: {
    en: 'Dark Mode',
    zu: 'Imodi Emnyama',
    xh: 'Imo Emnyama',
    af: 'Donker modus',
    st: 'Mokgoa o mofitshwana',
    ts: 'Maendlelo ya munyama',
    nso: 'Mokgwa o mofifiri',
    tn: 'Mokgwa o montsho',
    ss: 'Imodi Lemnyama',
    ve: 'Ndi nzhi ya swiswi',
    nr: 'Ihlelo eliMnyama'
  },
  help_center: {
    en: 'Help Center',
    zu: 'Isikhungo Sosizo',
    xh: 'Iziko loNcedo',
    af: 'Hulpsentrum',
    st: 'Setsi sa Thuso',
    ts: 'Xitichi xa Mpfuno',
    nso: 'Lefelo la Thuso',
    tn: 'Lefelo la Thuso',
    ss: 'Sikhungo Selusito',
    ve: 'Senthara ya Thikhiso',
    nr: 'Izinzo zeSizo'
  },
  terms_conditions: {
    en: 'Terms & Conditions',
    zu: 'Migomo nemibandela',
    xh: 'Imimiselo nemiqathango',
    af: 'Bepalings en Voorwaardes',
    st: 'Dipehelo le Maemo',
    ts: 'Milawu na Swipimelo',
    nso: 'Melao le Mabaka',
    tn: 'Dipehelo le Maemo',
    ss: 'Migomo nemibandela',
    ve: 'Milayo na Maemo',
    nr: 'Imithetho nesiVunyelwano'
  },
  privacy_policy: {
    en: 'Privacy Policy',
    zu: 'Inqubomgomo Yemfihlo',
    xh: 'Ipolisi yoBucala',
    af: 'Privaatheidsbeleid',
    st: 'Pholisi ya Boporayefete',
    ts: 'Pholisi ya Xihundla',
    nso: 'Molao wa Sephiri',
    tn: 'Pholisi ya Boporofete',
    ss: 'Inqubomgomo Yemfihlo',
    ve: 'Pholisi ya tshiphiri',
    nr: 'Inqubomgomo yeMifihlo'
  },
  app_version: {
    en: 'App Version',
    zu: 'Inguqulo ye-App',
    xh: 'Uhlobo lwesicelo',
    af: 'Weergawe van Toep',
    st: 'Mofuta wa Lenaneo',
    ts: 'Vhexini ya Aplikhayixini',
    nso: 'Tlhamo ya Lenaneo',
    tn: 'Mofuta wa Lenaneo',
    ss: 'Inguqulo ye-App',
    ve: 'Mofuta wa Phurogiramu',
    nr: 'Inguqulo ye-App'
  },
  logout: {
    en: 'Logout',
    zu: 'Phuma',
    xh: 'Phuma',
    af: 'Meld uit',
    st: 'Tswa',
    ts: 'Huma',
    nso: 'Tšwa',
    tn: 'Tswa',
    ss: 'Phuma',
    ve: 'Buda',
    nr: 'Phuma'
  },
  home: {
    en: 'Home',
    zu: 'Ikhaya',
    xh: 'Ikhaya',
    af: 'Tuis',
    st: 'Gae',
    ts: 'Kaya',
    nso: 'Gae',
    tn: 'Gae',
    ss: 'Ekhaya',
    ve: 'Hayani',
    nr: 'Ikhaya'
  },
  profile: {
    en: 'Profile',
    zu: 'Iphrofayela',
    xh: 'Iprofayile',
    af: 'Profiel',
    st: 'Phrofayele',
    ts: 'Phrofayili',
    nso: 'Phrofayele',
    tn: 'Phrofayele',
    ss: 'Iphrofayela',
    ve: 'Phurofaele',
    nr: 'Iphrofayili'
  },
  save: {
    en: 'Save',
    zu: 'Gcina',
    xh: 'Gcina',
    af: 'Stoor',
    st: 'Boloka',
    ts: 'Hlayisa',
    nso: 'Boloka',
    tn: 'Boloka',
    ss: 'Gcina',
    ve: 'Vhala',
    nr: 'Gcina'
  },
  discover: {
    en: 'Discover',
    zu: 'Thola',
    xh: 'Fumanisa',
    af: 'Ontdek',
    st: 'Tswela Pele',
    ts: 'Tshubula',
    nso: 'Utulla',
    tn: 'Utulla',
    ss: 'Tfolisisa',
    ve: 'Wana',
    nr: 'Thola'
  },
  explore: {
    en: 'Explore',
    zu: 'Hlola',
    xh: 'Hlola',
    af: 'Verken',
    st: 'Hlahloba',
    ts: 'Valanga',
    nso: 'Hlahloba',
    tn: 'Hlahloba',
    ss: 'Hlola',
    ve: 'Tshimbila',
    nr: 'Hlola'
  },
  map: {
    en: 'Map',
    zu: 'Imephu',
    xh: 'Imephu',
    af: 'Kaart',
    st: 'Mepe',
    ts: 'Mepe',
    nso: 'Mepe',
    tn: 'Mepe',
    ss: 'Imephu',
    ve: 'Mepe',
    nr: 'Imephu'
  },
  order_history: {
    en: 'Order History',
    zu: 'Umlando we-oda',
    xh: 'Imbali ye-Oda',
    af: 'Bestelling Geskiedenis',
    st: 'Nalane ya ditaelo',
    ts: 'Matimu ya odara',
    nso: 'Histori ya Ditaelo',
    tn: 'Nalane ya Ditaelo',
    ss: 'Umlando wema-oda',
    ve: 'Ditsiko dza Odara',
    nr: 'Umlando we-oda'
  },
  orders: {
    en: 'Orders',
    zu: 'Ama-oda',
    xh: 'Iiodolo',
    af: 'Bestellings',
    st: 'Ditaelo',
    ts: 'Tiodara',
    nso: 'Ditaelo',
    tn: 'Ditaelo',
    ss: 'Tindzaba',
    ve: 'Diodara',
    nr: 'Ama-oda'
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
