import { useState, useEffect } from 'react';

interface BlurUpImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  blurHash?: string;
  aspectRatio?: string;
}

export const BlurUpImage = ({
  src,
  alt,
  className = "",
  fallbackSrc = "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80",
}: BlurUpImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>('');

  const targetSrc = src && src.trim() ? src.trim() : fallbackSrc;

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);

    // Use high-performance WebP proxy if external HTTPS URL, else use direct target
    if (targetSrc.startsWith('http') && !targetSrc.includes('weserv.nl') && !targetSrc.startsWith('data:')) {
      setDisplaySrc(`https://images.weserv.nl/?url=${encodeURIComponent(targetSrc)}&output=webp&q=75&w=600`);
    } else {
      setDisplaySrc(targetSrc);
    }
  }, [targetSrc]);

  const handleImageError = () => {
    if (!hasError) {
      setHasError(true);
      if (displaySrc !== targetSrc) {
        setDisplaySrc(targetSrc); // Try direct URL
      } else if (targetSrc !== fallbackSrc) {
        setDisplaySrc(fallbackSrc); // Fallback to default unsplash asset
      }
    }
    setIsLoaded(true);
  };

  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}>
      {/* Low-Res Blurred Placeholder & Animated Shimmer Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-slate-800 animate-pulse">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
      )}

      {/* Main Image with Progressive Blur-Up Scale Transition */}
      <img
        src={displaySrc || fallbackSrc}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={handleImageError}
        className={`w-full h-full object-cover transition-all duration-700 ease-out ${
          isLoaded
            ? 'opacity-100 blur-0 scale-100'
            : 'opacity-40 blur-md scale-105'
        }`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
