import { useState, useEffect } from 'react';
import { Store, UtensilsCrossed } from 'lucide-react';
import {DATA_SAVER_CHANGE_EVENT,readDataSaverEnabled} from '../services/dataSaverPreference';

interface BlurUpImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** Optional explicit image fallback. Missing photos otherwise use honest branded artwork. */
  fallbackSrc?: string;
  fallbackKind?: 'shop' | 'food';
  blurHash?: string;
  aspectRatio?: string;
  /** Opt in only for the first visible Home shop image. */
  priority?: boolean;
  /** Request pixels appropriate to this slot (e.g. 160px for an 80px thumbnail at 2x). */
  imageWidth?: 160 | 320 | 600;
  dataSaverEnabled?: boolean;
}

export const BlurUpImage = ({
  src,
  alt,
  className = "",
  fallbackSrc,
  fallbackKind = 'food',
  priority = false,
  imageWidth = 600,
  dataSaverEnabled,
}: BlurUpImageProps) => {
  const targetSrc = (src?.trim() || fallbackSrc?.trim() || '');
  const proxySource = targetSrc.startsWith('http') && !targetSrc.includes('weserv.nl')
    ? `https://images.weserv.nl/?url=${encodeURIComponent(targetSrc)}&output=webp&q=75&w=${imageWidth}`
    : targetSrc;
  const [settingsDataSaver,setSettingsDataSaver]=useState(readDataSaverEnabled);
  const [revealThisPhoto,setRevealThisPhoto]=useState(false);
  useEffect(()=>{
    const refresh=()=>setSettingsDataSaver(readDataSaverEnabled());
    window.addEventListener(DATA_SAVER_CHANGE_EVENT,refresh);
    window.addEventListener("storage",refresh);
    return ()=>{
      window.removeEventListener(DATA_SAVER_CHANGE_EVENT,refresh);
      window.removeEventListener("storage",refresh);
    };
  },[]);
  const hideForData=(dataSaverEnabled ?? settingsDataSaver)&&!!targetSrc&&!revealThisPhoto;
  const [isLoaded, setIsLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>(proxySource);

  useEffect(() => {
    setIsLoaded(false);
    setFailed(false);
    setDisplaySrc(proxySource);
    setRevealThisPhoto(false);
  }, [proxySource]);

  const handleImageError = () => {
    // The image proxy can fail independently of a real merchant upload.
    if (displaySrc !== targetSrc) {
      setDisplaySrc(targetSrc);
      return;
    }
    // Never turn a missing/broken picture into an unrelated stock food photo.
    setFailed(true);
    setIsLoaded(true);
  };

  const showPlaceholder = !targetSrc || failed;
  const isShop = fallbackKind === 'shop';

  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}>
      {hideForData ? (
        <button
          type="button"
          aria-label={`Load photo: ${alt}. Uses mobile data.`}
          onClick={event=>{event.preventDefault();event.stopPropagation();setRevealThisPhoto(true);}}
          className="absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-2 bg-emerald-50 px-2 text-center text-emerald-950 focus-visible:outline-2 focus-visible:outline-orange-600 dark:bg-slate-800 dark:text-emerald-100"
        >
          {fallbackKind==='shop'
            ? <Store aria-hidden="true" className="h-7 w-7" />
            : <UtensilsCrossed aria-hidden="true" className="h-7 w-7" />}
          <span className="text-[11px] font-extrabold">Photo hidden to save data</span>
          <span className="text-[10px] font-semibold underline">Tap to load photo</span>
        </button>
      ) : showPlaceholder ? (
        <div
          role="img"
          aria-label={`${isShop ? 'Shop' : 'Menu item'} photo not available: ${alt}`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-orange-50 via-amber-50 to-slate-100 text-orange-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 dark:text-orange-300"
        >
          {isShop
            ? <Store aria-hidden="true" className="h-[32%] max-h-11 w-auto max-w-[45%] shrink-0" strokeWidth={1.75} />
            : <UtensilsCrossed aria-hidden="true" className="h-[35%] max-h-10 w-auto max-w-[45%] shrink-0" strokeWidth={1.75} />}
          <span className="max-w-full px-1 text-center text-[10px] leading-tight font-bold line-clamp-2 break-words">
            {isShop ? alt : 'No photo yet'}
          </span>
          {isShop && <span className="max-w-full px-1 text-center text-[9px] leading-tight opacity-75">Photo coming soon</span>}
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-slate-800 animate-pulse">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            </div>
          )}
          <img
            src={displaySrc || targetSrc}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-all duration-700 ease-out ${
              isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-40 blur-md scale-105'
            }`}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </>
      )}
    </div>
  );
};
