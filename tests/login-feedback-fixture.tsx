/**
 * Isolated real React LoginScreen + real global toast. Never signs in,
 * creates an account, sends OTP, or calls the backend.
 */
import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {LoginScreen} from "../src/screens/auth/LoginScreen";
import {AppNotificationToast} from "../src/components/AppNotificationToast";
import type {NotificationState} from "../src/types";
import "../src/index.css";

function TestPage(){
 const [notification,setNotification]=useState<NotificationState>(null);
 return <>
  <div className="mx-auto max-w-screen-xl">
   <LoginScreen onLogin={()=>{}} onSignUp={()=>{}} onGuestBrowse={()=>{}}
    setNotification={setNotification} biometricsEnabled={false} onToggleBiometrics={()=>{}} />
  </div>
  <div className="fixed bottom-6 left-4 z-10 flex gap-2">
   <button id="trigger-test-notice" type="button" onClick={()=>
    setNotification({type:"info",message:"This is a synthetic on-screen notification."})}
    className="rounded-lg border bg-white px-3 py-2 text-xs">Test notice</button>
   <button id="trigger-test-persistent" type="button" onClick={()=>
    setNotification({type:"info",message:"This is a synthetic centered prompt.",persistent:true,
     actions:[{label:"Dismiss prompt",onClick:()=>{}}]})}
    className="rounded-lg border bg-white px-3 py-2 text-xs">Test centered prompt</button>
  </div>
  <AppNotificationToast notification={notification} onDismiss={()=>setNotification(null)}/>
 </>;
}
createRoot(document.getElementById("root")!).render(<TestPage/>);
