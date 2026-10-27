import React from "react";
import {createRoot} from "react-dom/client";
import App from "./pickup/PickupCustomerApp";
import {PickupErrorBoundary} from "./pickup/PickupErrorBoundary";
import "./index.css";

// The pilot must not activate legacy Firestore logging, cache reset or mutation replay.
createRoot(document.getElementById("root")!).render(
 <React.StrictMode><PickupErrorBoundary><App/></PickupErrorBoundary></React.StrictMode>,
);

// Compatibility for retained, unmounted legacy network helpers. Local console only.
export function pushGlobalErrorLog(type:string,message:string,stack?:string,details?:string):void {
 console.debug("[Local diagnostic]",type,message,stack,details);
}
