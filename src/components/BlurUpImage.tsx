import { useState, useEffect } from 'react';
import { Store, UtensilsCrossed } from 'lucide-react';

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
}

export const BlurUpImage = ({
  src,
  alt,
  className = "",
  fallbackSrc,
  fallbackKind = 'food',
  priority = false,
}: BlurUpImageProps) => {
  const targetSrc = (src?.trim() || fallbackSrc?.trim() || '');
  const proxySource = targetSrc.startsWith('http') && !targetSrc.includes('weserv.nl')
    ? `https://images.weserv.nl/?url=${encodeURIComponent(targetSrc)}&output=webp&q=75&w=600`
    : targetSrc;
  const [isLoaded, setIsLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>(priority ? proxySource : '');

  useEffect(() => {
    setIsLoaded(false);
    setFailed(false);
    setDisplaySrc(proxySource);
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
      {showPlaceholder ? (
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
