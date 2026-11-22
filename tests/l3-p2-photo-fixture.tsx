/** Local React-only data-saver acceptance; no auth, GPS, API or orders. */
import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {BlurUpImage} from "../src/components/BlurUpImage";
import {OfflineShopDirectory} from "../src/components/OfflineShopDirectory";
import {DATA_SAVER_CHANGE_EVENT} from "../src/services/dataSaverPreference";
import {saveOfflineShopDirectory} from "../src/services/offlineShopDirectory";
import "../src/index.css";

function Fixture(){
 const [dataSaver,setDataSaver]=useState(true);
 const [showReference,setShowReference]=useState(false);
 useEffect(()=>{
  localStorage.setItem("data_saver_enabled",String(dataSaver));
  window.dispatchEvent(new Event(DATA_SAVER_CHANGE_EVENT));
 },[dataSaver]);
 useEffect(()=>{
  saveOfflineShopDirectory([{
   name:"My-Kota Demo",category:"Kota",
   menu:[{name:"Kota",price:25}],distance:0.8,latitude:-26,longitude:28,
   phone:"0710000000",rating:4.8,isOpen:true,
  } as any],localStorage);
  setShowReference(true);
 },[]);
 return <main className="mx-auto min-h-[100dvh] max-w-xl bg-white p-4 text-slate-900">
  <h1 className="text-2xl font-black">LocalEats Data Saver review</h1>
  <p className="mt-2 text-sm text-slate-700">Isolated UI preview — no account, real shop or order.</p>
  <label className="mt-4 flex items-center gap-3 font-bold">
   <input type="checkbox" aria-label="Enable Data Saver" checked={dataSaver} onChange={e=>setDataSaver(e.target.checked)}/>
   Data Saver
  </label>
  <div className="mt-6 size-40 overflow-hidden rounded-2xl border border-slate-200">
   <BlurUpImage src="https://uploads.example.invalid/demo-kota.jpg" alt="Demo Kota photo" className="h-full w-full"/>
  </div>
  {showReference&&<OfflineShopDirectory/>}
 </main>;
}
// Emulate an existing explicit customer preference before any photo renders.
localStorage.setItem("data_saver_enabled","true");
createRoot(document.getElementById("root")!).render(<Fixture/>);
