import React, {useState} from "react";
import {motion, useReducedMotion} from "motion/react";
import {UtensilsCrossed, Sparkles} from "lucide-react";

// Photo by Palesalepheana (2014), CC BY-SA 4.0, Wikimedia Commons.
// Keep credit visible, and do not claim this is a photograph of a live shop.
export const LOCAL_KOTA_PHOTO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/7/7f/Kota%2C_Bunnychow_sa.jpg";
export const LOCAL_KOTA_PHOTO_CREDIT =
  "https://commons.wikimedia.org/wiki/File:Kota,_Bunnychow_sa.jpg";

export function LocalKotaHeroPhoto() {
 const reduceMotion=useReducedMotion();
 const [imageFailed,setImageFailed]=useState(false);
 return (
  <figure className="relative mx-auto w-full max-w-[390px] md:max-w-[530px]">
   <div className="pointer-events-none absolute -inset-3 rounded-[36px] border border-[#fbdab7] dark:border-orange-900/35"
     aria-hidden="true"/>
   <div className="pointer-events-none absolute -right-3 -top-3 z-10 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-lg shadow-orange-950/10 dark:bg-slate-800 dark:text-orange-300"
     aria-hidden="true"><Sparkles className="h-5 w-5" strokeWidth={2.1}/></div>
   <motion.div data-testid="welcome-food-photo"
     initial={reduceMotion?false:{opacity:0, y:18, scale:0.96}}
     animate={{opacity:1,y:0,scale:1}}
     transition={{duration:0.7,ease:[0.22,1,0.36,1]}}
     className="relative aspect-[1.55/1] overflow-hidden rounded-[28px] border-4 border-white bg-[#efdbc7] shadow-[0_18px_55px_rgba(91,49,19,0.16)] dark:border-slate-800 dark:bg-slate-800 md:aspect-[1/1] md:rounded-[36px]">
    {!imageFailed ? (
     <motion.img
       src={LOCAL_KOTA_PHOTO_URL}
       alt="A real South African kota sandwich in a quarter loaf with chips and fillings"
       loading="eager"
       decoding="async"
       referrerPolicy="no-referrer"
       width={612}
       height={612}
       onError={()=>setImageFailed(true)}
       initial={reduceMotion?false:{scale:1.075}}
       animate={{scale:1}}
       transition={{duration:1.1,ease:[0.22,1,0.36,1]}}
       className="h-full w-full object-cover object-center"
     />
    ) : (
     <div role="img" aria-label="Local food image temporarily unavailable"
       className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#fae4c9] via-[#f9b678] to-[#c55b2d] text-amber-950">
      <UtensilsCrossed className="h-12 w-12" strokeWidth={1.5} aria-hidden="true"/>
      <span className="text-xs font-extrabold">Fresh local food</span>
     </div>
    )}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/45 via-slate-950/10 to-transparent" aria-hidden="true"/>
    <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/30 bg-slate-950/45 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-sm">
     <UtensilsCrossed className="h-3.5 w-3.5" strokeWidth={2.1} aria-hidden="true"/>
     South African street food
    </div>
   </motion.div>
   <figcaption className="mt-2.5 text-center text-[10px] leading-4 text-slate-500 dark:text-slate-400">
    Kota photo by <a href={LOCAL_KOTA_PHOTO_CREDIT} target="_blank" rel="noopener noreferrer"
      className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
      Palesalepheana / Wikimedia Commons
    </a>{" "}
    · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer"
      className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">CC BY-SA 4.0</a>
   </figcaption>
  </figure>
 );
}
