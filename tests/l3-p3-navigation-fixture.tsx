/** Isolated L3-P3 real React navigation and feedback fixture.
 * Synthetic state only. Never signs in, accesses live GPS, downloads shop photos,
 * orders food, or writes to the backend.
 */
import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {BottomNavigation} from "../src/components/BottomNavigation";
import {FloatingCartButton} from "../src/components/FloatingCartButton";
import {BottomSheet} from "../src/components/BottomSheet";
import {AppNotificationToast} from "../src/components/AppNotificationToast";
import type {NotificationState,Screen} from "../src/types";
import "../src/index.css";

const demoCart=[{id:"demo-kota",shopId:"test-shop",name:"Demo Kota",price:25,quantity:1,selectedCustomizations:[]}];
function Fixture(){
 const [screen,setScreen]=useState<Screen>("home");
 const [moves,setMoves]=useState(0);
 const [haptics,setHaptics]=useState(0);
 const [sheetOpen,setSheetOpen]=useState(false);
 const [notice,setNotice]=useState<NotificationState>(null);
 const open=()=>setSheetOpen(true);
 const close=()=>setSheetOpen(false);
 return <main className="min-h-[100dvh] bg-white px-4 pt-8 pb-40 text-slate-900">
  <div data-testid="p3-ready" className="mx-auto max-w-xl space-y-3">
   <h1 className="text-2xl font-black">LocalEats P3 motion review</h1>
   <p className="text-sm">Synthetic pickup-only UI, with no account or real requests.</p>
   <div className="rounded-xl border border-slate-200 p-4 text-sm font-semibold">
    <p>Screen: <span data-testid="screen-name">{screen}</span></p>
    <p>Screen changes: <span data-testid="nav-moves">{moves}</span></p>
    <p>Haptic requests: <span data-testid="haptics">{haptics}</span></p>
   </div>
   <div className="flex flex-wrap gap-2">
    <button id="open-test-sheet" type="button" onClick={open} className="min-h-11 rounded-xl bg-orange-600 px-4 py-2 font-bold text-white">Open pickup cart</button>
    <button id="trigger-test-notice" type="button" onClick={()=>setNotice({type:"success",message:"Your demo selection was saved."})}
     className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 font-bold">Show confirmation</button>
    <button id="trigger-test-persistent" type="button" onClick={()=>setNotice({type:"info",message:"Review this synthetic pickup choice.",persistent:true,actions:[{label:"Confirm demo",onClick:()=>{}}]})}
     className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 font-bold">Show decision prompt</button>
   </div>
  </div>
  <BottomNavigation currentScreen={screen}
   onNavigate={next=>{setScreen(next);setMoves(old=>old+1);}}
   activeOrdersCount={2} triggerHaptic={()=>setHaptics(old=>old+1)} isOnline/>
  <FloatingCartButton cart={demoCart as any} shops={[]} currentScreen={screen}
   onOpenCart={open} triggerHaptic={()=>setHaptics(old=>old+1)}/>
  <BottomSheet isOpen={sheetOpen} onClose={close}
   title="Your pickup cart" subtitle="Pickup at shop · demo only">
   <p className="text-sm">Review the demo cart. No order can be created here.</p>
   <button id="sheet-primary" type="button" onClick={close}
    className="mt-4 min-h-11 rounded-xl bg-orange-600 px-4 py-2 font-bold text-white">Close and return</button>
  </BottomSheet>
  <AppNotificationToast notification={notice} onDismiss={()=>setNotice(null)}/>
 </main>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
