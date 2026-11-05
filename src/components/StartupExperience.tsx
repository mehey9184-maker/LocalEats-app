import {useCallback,useEffect,useRef,useState} from 'react';
import {MotionConfig} from 'motion/react';
import {OnboardingTour} from './OnboardingTour';
import {InteractiveTour} from './InteractiveTour';
import {PopiaLegalDrawer} from './PopiaLegalDrawer';
import {CookieConsentBanner} from './CookieConsentBanner';
import {createGuideFlow,type GuideStage} from '../services/startupGuides';

function StartupGuides({requestedStage,onConsumed}:{requestedStage:GuideStage;onConsumed:()=>void}){
 const [stage,setStage]=useState<GuideStage>(null);
 const flow=useRef<ReturnType<typeof createGuideFlow>|null>(null);
 const container=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  // Access to localStorage itself can throw in privacy-restricted browsers.
  let storage:Pick<Storage,'getItem'|'setItem'>;
  try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{}};}
  const controller=createGuideFlow({storage,onChange:setStage});flow.current=controller;
  const skip=()=>controller.skip();
  window.addEventListener('localeats_skip_all_tours',skip);
  return ()=>{controller.dispose();flow.current=null;window.removeEventListener('localeats_skip_all_tours',skip);};
 },[]);
 useEffect(()=>{if(requestedStage){flow.current?.start(requestedStage);onConsumed();}},[requestedStage,onConsumed]);
 useEffect(()=>{
  if(!stage)return;
  const previous=document.activeElement as HTMLElement|null;
  container.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();flow.current?.skip();return;}
   if(event.key!=='Tab')return;
   const buttons=Array.from(container.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []).filter(button=>button.getClientRects().length>0);
   const first=buttons[0],last=buttons.at(-1);
   if(event.shiftKey && (document.activeElement===first || !container.current?.contains(document.activeElement))){event.preventDefault();last?.focus();}
   else if(!event.shiftKey && (document.activeElement===last || !container.current?.contains(document.activeElement))){event.preventDefault();first?.focus();}
  };
  window.addEventListener('keydown',keydown);
  return ()=>{window.removeEventListener('keydown',keydown);if(previous?.isConnected)previous.focus();};
 },[stage]);
 if(!stage)return null;
 return <div ref={container} id="guide-slide-container-wrapper" role="dialog" aria-modal="true" aria-label="Pickup app guide" className="relative z-[10000]">
  <OnboardingTour isOpen={stage==='overview'} onComplete={()=>flow.current?.complete()} onSkip={()=>flow.current?.skip()}/>
  <InteractiveTour isActive={stage==='interactive'} onComplete={()=>flow.current?.complete()} onSkip={()=>flow.current?.skip()}/>
 </div>;
}

export function StartupExperience({showGuides,onRequestHome}:{showGuides:boolean;onRequestHome?:()=>void}){
 const [privacyReady,setPrivacyReady]=useState(false),[cookieReady,setCookieReady]=useState(false);
 const [requestedStage,setRequestedStage]=useState<GuideStage>(null);
 const dismissCookie=useCallback(()=>setCookieReady(true),[]);
 const consumeRequest=useCallback(()=>setRequestedStage(null),[]);
 useEffect(()=>{
  const request=(stage:Exclude<GuideStage,null>)=>{setRequestedStage(stage);onRequestHome?.();};
  const overview=()=>request('overview'),interactive=()=>request('interactive');
  window.addEventListener('localeats_restart_tour',overview);window.addEventListener('localeats_start_interactive_tour',interactive);
  return ()=>{window.removeEventListener('localeats_restart_tour',overview);window.removeEventListener('localeats_start_interactive_tour',interactive);};
 },[onRequestHome]);
 return <MotionConfig reducedMotion="user">
  <PopiaLegalDrawer onConsentChange={setPrivacyReady}/>
  <CookieConsentBanner enabled={privacyReady} onDismiss={dismissCookie}/>
  {showGuides && privacyReady && cookieReady && <StartupGuides requestedStage={requestedStage} onConsumed={consumeRequest}/>}
 </MotionConfig>;
}
