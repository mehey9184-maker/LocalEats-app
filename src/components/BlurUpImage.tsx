import { useState } from 'react';

export const BlurUpImage = ({ src, alt, className, blurHash = "https://picsum.photos/seed/blur/10/10" }: { src: string, alt: string, className?: string, blurHash?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  // Proxy through weserv for WebP conversion and optimization
  const webpSrc = src.startsWith('data:') || error
    ? src 
    : `https://images.weserv.nl/?url=${encodeURIComponent(src)}&output=webp&q=80&w=800`;
  
  return (
    <div className={`relative overflow-hidden ${className} bg-slate-100 dark:bg-slate-800`}>
      {!isLoaded && (
        <>
          <img 
            src={blurHash} 
            alt={alt} 
            className={`w-full h-full object-cover transition-opacity duration-500 opacity-100 blur-lg scale-110`}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
        </>
      )}
      <img 
        src={webpSrc} 
        alt={alt} 
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          setIsLoaded(true);
          setError(true);
          if (!error && !src.startsWith('data:')) {
            e.currentTarget.src = src; // Fallback to original
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};
