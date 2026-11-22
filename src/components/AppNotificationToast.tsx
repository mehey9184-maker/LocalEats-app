import React from "react";
import {AnimatePresence,motion,useReducedMotion} from "motion/react";
import {AlertCircle,Bell,CheckCircle2,Utensils,X} from "lucide-react";
import type {NotificationState} from "../types";

/** Global in-app feedback: transient messages appear TOP (safe-area aware).
 * Persistent prompts remain centered. No change to browser/OS push notifications.
 */
export function AppNotificationToast({notification,onDismiss,belowHeader=false}:{
 notification:NotificationState;
 onDismiss:()=>void;
 belowHeader?:boolean;
}){
 const reduceMotion=useReducedMotion();
 return <AnimatePresence mode="wait">
  {notification && (
   <motion.div
    key={notification.type+"|"+notification.message+"|"+!!notification.persistent}
    data-testid="global-notification-container"
    initial={reduceMotion ? {opacity:1,y:0} : {opacity:0,y:notification.persistent?-100:-24}}
    animate={{opacity:1,y:0}}
    exit={reduceMotion ? {opacity:1,y:0} : {opacity:0,y:notification.persistent?-100:-24}}
    transition={reduceMotion ? {duration:0} : {duration:0.22,ease:[0.22,1,0.36,1]}}
    className={notification.persistent
     ? "fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm pointer-events-none"
     : `pointer-events-none fixed inset-x-3 z-[110] flex justify-center sm:inset-x-auto sm:right-4 sm:w-[min(24rem,calc(100vw-2rem))] ${
       belowHeader
        ? "top-[calc(env(safe-area-inset-top,0px)+5rem)] sm:top-20"
        : "top-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:top-4"
      }`
    }
   >
    <motion.div
     role={notification.persistent ? "alertdialog" : notification.type==="error"?"alert":"status"}
     aria-modal={notification.persistent ? "true" : undefined}
     aria-label={notification.persistent ? "LocalEats confirmation" : undefined}
     aria-atomic="true"
     data-testid="global-notification-toast"
     {...(!notification.persistent && !reduceMotion ? {
      drag:true,
      dragDirectionLock:true,
      dragConstraints:{top:-100,bottom:32,left:-30,right:30},
      dragElastic:{top:0.25,bottom:0.08,left:0.15,right:0.15},
      onDragEnd:(_event:any,info:any)=>{
       if(info.offset.y < -50 || info.velocity.y < -150 ||
          Math.abs(info.offset.x)>100 || Math.abs(info.velocity.x)>150)onDismiss();
      },
      whileDrag:{scale:0.98,opacity:0.85},
     } : {})}
     className={`${notification.persistent
      ? "w-full max-w-xs rounded-3xl p-6"
      : "w-full max-w-sm cursor-grab select-none rounded-2xl p-4 active:cursor-grabbing"
     } pointer-events-auto relative flex flex-col gap-3 border border-slate-200 bg-white text-slate-900 shadow-[0_16px_45px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-800 dark:text-white`}
    >
     <div className="flex items-start gap-3">
      <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        notification.type==="ready"?"bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400":
        notification.type==="error"?"bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400":
        notification.type==="success"?"bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400":
        "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
       }`}>
       {notification.type==="ready"?<Utensils className="h-5 w-5"/>:
        notification.type==="error"?<AlertCircle className="h-5 w-5"/>:
        notification.type==="success"?<CheckCircle2 className="h-5 w-5"/>:
        <Bell className="h-5 w-5"/>}
      </span>
      <div className="min-w-0 flex-1">
       <p className="text-sm font-extrabold leading-tight">
        {notification.type==="ready"?"Order Ready":
         notification.type==="error"?"Something went wrong":
         notification.type==="success"?"Success":"Notification"}
       </p>
       <p className="mt-1 break-words text-sm leading-snug text-slate-600 dark:text-slate-300">
        {notification.message}
       </p>
      </div>
      {!notification.persistent && (
       <button type="button" onClick={onDismiss}
        aria-label="Dismiss notification"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white">
        <X className="h-5 w-5" aria-hidden="true"/>
       </button>
      )}
     </div>
     {notification.actions?.length ? (
      <div className="flex flex-col gap-2">
       {notification.actions.map((action,i)=>(
        <button type="button" key={i} onClick={()=>{action.onClick();onDismiss();}}
         className={`min-h-11 w-full rounded-xl px-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
          i===0?"bg-orange-600 text-white hover:bg-orange-700":
          "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
         }`}>
         {action.label}
        </button>
       ))}
      </div>
     ):null}
    </motion.div>
   </motion.div>
  )}
 </AnimatePresence>;
}
