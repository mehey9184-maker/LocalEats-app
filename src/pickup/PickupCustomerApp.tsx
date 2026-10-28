import React,{useEffect,useRef,useState} from "react";
import {onAuthStateChanged,signInWithEmailAndPassword,signOut,type User} from "firebase/auth";
import {localPickupFixture,pickupAuth} from "./auth";
import {createPickupApi,PickupApiError,pickupStatus,type PickupOrder,type Location} from "./client";
import {enablePickupPush,revokePickupPush} from "./push";
import "./pickup.css";
const api=createPickupApi(localPickupFixture ? "" : import.meta.env.VITE_LOCALEATS_API_URL || "",async()=>{
 if(!pickupAuth.currentUser) throw new Error("Sign in to continue.");
 return pickupAuth.currentUser.getIdToken();
},fetch,{requireExplicitHttps:import.meta.env.PROD});
const money=(minor:number)=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(minor/100);
type Shop={id:string;name:string;location:string;distance_km:number};
type Item={id:string;name:string;price:number;is_available:boolean};
type Fact={id:string;kind:string;details?:{reason?:string};occurred_at:string};
type Quote={lines:{menu_item_id:string;name:string;quantity:number;unit_minor:number;line_minor:number}[];total_minor:number;service_fee_minor:number;subtotal_minor:number;pricing_fingerprint:string};
export default function PickupCustomerApp() {
 const [user,setUser]=useState<User|null>(null),[starting,setStarting]=useState(true),[email,setEmail]=useState(""),[password,setPassword]=useState("");
 const [location,setLocation]=useState<Location|null>(null),[shops,setShops]=useState<Shop[]>([]),[shop,setShop]=useState<Shop|null>(null);
 const [menu,setMenu]=useState<Item[]>([]),[quantities,setQuantities]=useState<Record<string,number>>({});
 const [name,setName]=useState(""),[phone,setPhone]=useState(""),[method,setMethod]=useState("cash");
 const [quote,setQuote]=useState<Quote|null>(null),[quoteIntent,setQuoteIntent]=useState<Record<string,unknown>|null>(null),[consent,setConsent]=useState(false);
 const [orders,setOrders]=useState<PickupOrder[]>([]),[facts,setFacts]=useState<Record<string,Fact[]>>({}),[notifications,setNotifications]=useState<{id:string;order_id:string}[]>([]);
 const [pending,setPending]=useState<Record<string,unknown>|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const lock=useRef(false),generation=useRef(0),draftId=useRef(crypto.randomUUID()),terminalFacts=useRef<Record<string,Fact[]>>({});
 const key=(uid:string)=>"pickup-create-v1:"+uid;
 const resetQuote=()=>{setQuote(null);setQuoteIntent(null);setConsent(false);};
 useEffect(()=>onAuthStateChanged(pickupAuth,u=>{
  generation.current++;terminalFacts.current={};setUser(u);setStarting(false);setOrders([]);setNotifications([]);setFacts({});setError("");setName(u?.displayName || "");setPhone(u?.phoneNumber || "");
  setShop(null);setMenu([]);setQuantities({});resetQuote();setPending(null);
 }),[]);
 const refresh=async()=>{
  const current=generation.current;
  const [history,inbox]=await Promise.all([api.orders(),api.notifications()]);
  if(current!==generation.current)return;
  setOrders(history.orders);setNotifications(inbox.notifications);setError(previous=>previous.startsWith("Could not refresh") ? "" : previous);
  const outcomes=await Promise.all(history.orders.filter(o=>o.status==="cancelled" && !terminalFacts.current[o.id]).map(async o=>({id:o.id,result:await api.order(o.id)})));
  if(current!==generation.current)return;
  for(const outcome of outcomes)terminalFacts.current[outcome.id]=outcome.result.events ?? [];
  if(outcomes.length)setFacts(previous=>({...previous,...terminalFacts.current}));
 };
 useEffect(()=>{
  if(!user) return;
  try{setPending(JSON.parse(sessionStorage.getItem(key(user.uid)) || "null"));}catch{setPending(null);}
  let active=true;
  const update=()=>refresh().catch(e=>{if(active)setError("Could not refresh tracking or notifications. Displayed status may be stale. "+e.message);});
  void update();const timer=setInterval(update,5000);window.addEventListener("pickup-ready",update);
  return()=>{active=false;clearInterval(timer);window.removeEventListener("pickup-ready",update);};
 },[user?.uid]);
 const run=async(task:()=>Promise<void>)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError("");setNotice("");
  try{await task();}catch(e){setError(e instanceof Error ? e.message : "The request failed. Please retry.");}
  finally{lock.current=false;setBusy(false);}
 };
 const locate=()=>void run(async()=>{
  if(pending)throw new Error("Resolve your pending order before changing location.");
  if(localPickupFixture){
   const response=await fetch("/__pickup_fixture/location");
   if(!response.ok)throw new Error("The disposable fixture server is unavailable.");
   const coords=await response.json();setLocation(coords);setShops([]);setShop(null);setMenu([]);setQuantities({});resetQuote();
   const result=await api.shops(coords);setShops(result.shops);return;
  }
  if(!navigator.geolocation)throw new Error("Location is unavailable. Pickup discovery needs your real location.");
  const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
  const coords={lat:position.coords.latitude,lng:position.coords.longitude};
  setLocation(coords);setShops([]);setShop(null);setMenu([]);setQuantities({});resetQuote();
  const result=await api.shops(coords);setShops(result.shops);
  if(!result.shops.length)setNotice("No approved, available Tembisa / Ivory Park shops found within 4 km.");
 });
 const selectShop=(selected:Shop)=>void run(async()=>{
  setShop(null);setMenu([]);setQuantities({});resetQuote();
  const result=await api.menu(selected.id);setShop(selected);setMenu(result.menu_items.filter((item:Item)=>item.is_available===true));
 });
 const getQuote=()=>void run(async()=>{
  if(!shop || !location)throw new Error("Select a nearby shop first.");
  const items=menu.filter(item=>quantities[item.id]>0).map(item=>({menu_item_id:item.id,quantity:quantities[item.id]}));
  if(!items.length)throw new Error("Choose at least one menu item.");
  const intent={contract_version:"pickup-v1",idempotency_key:draftId.current,shop_id:String(shop.id),items,delivery_type:"collection",
   delivery_schedule_mode:"standard",payment_method:method,customer_details:{name,phone},launch_location:location};
  const result=await api.quote(intent);setQuote(result.quote);setQuoteIntent(intent);setConsent(false);
 });
 const placeOrder=()=>void run(async()=>{
  if(!user)throw new Error("Sign in to place your order.");
  const current=generation.current;
  const body=pending ?? (quote && quoteIntent && consent ? {...quoteIntent,consent:{currency:"ZAR",total_minor:quote.total_minor,pricing_fingerprint:quote.pricing_fingerprint}} : null);
  if(!body)throw new Error("Review and agree to the server quote first.");
  // Store only the retry intent, never an invented order/success. Scope it to Firebase UID.
  sessionStorage.setItem(key(user.uid),JSON.stringify(body));setPending(body);
  try {
   const result=await api.create(body);
   if(current!==generation.current)return;
   setOrders(current=>[result.order,...current.filter(o=>o.id!==result.order.id)]);
   sessionStorage.removeItem(key(user.uid));setPending(null);setQuantities({});resetQuote();draftId.current=crypto.randomUUID();
   setNotice("Order confirmed: "+result.order.id+". Pay at the shop when collecting.");
   try{await refresh();}catch{setError("Your order was confirmed, but refresh failed. Refresh order history.");}
  }catch(e){
   if(e instanceof PickupApiError && [400,403,409,422,426].includes(e.status)){sessionStorage.removeItem(key(user.uid));setPending(null);resetQuote();}
   throw e;
  }
 });
 const cancel=(order:PickupOrder)=>void run(async()=>{
  if(!user)return;
  const current=generation.current;
  const storage="pickup-cancel-v1:"+user.uid+":"+order.id;
  const body=JSON.parse(sessionStorage.getItem(storage) || "null") ?? {command_id:crypto.randomUUID(),expected_revision:order.revision,reason:"Cancelled by customer"};
  sessionStorage.setItem(storage,JSON.stringify(body));
  const result=await api.command(order.id,"cancel",body,false);
  if(current!==generation.current)return;
  sessionStorage.removeItem(storage);setOrders(current=>current.map(o=>o.id===order.id ? result.order : o));setNotice("Cancellation saved.");
 });
 const detail=(order:PickupOrder)=>void run(async()=>{const result=await api.order(order.id);setFacts(current=>({...current,[order.id]:result.events ?? []}));setOrders(current=>current.map(o=>o.id===order.id ? result.order : o));});
 const login=(event:React.FormEvent)=>{event.preventDefault();void run(async()=>{await signInWithEmailAndPassword(pickupAuth,email,password);setPassword("");});};
 return <main className="pickup-app"><div className="pickup-shell">
  <header><div><h1>LocalEats</h1>{localPickupFixture && <p role="status">LOCAL FIXTURE TEST — no real orders or payments</p>}<p>Tembisa / Ivory Park · Pickup only · Within 4 km</p></div>{user && <button className="secondary" disabled={busy} onClick={()=>void run(async()=>{try{await revokePickupPush(api);}finally{await signOut(pickupAuth);}})}>Sign out</button>}</header>
  {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  {starting ? <p>Checking session…</p> : !user ? <section><h2>Sign in to order</h2><form onSubmit={login}>
   <label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button disabled={busy}>Sign in</button></form></section> : <>
   {pending && <section><h2>{busy ? "Confirming your order…" : "Order confirmation unresolved"}</h2><p>Retry the original request to recover its saved result. Do not place another order.</p><button disabled={busy} onClick={placeOrder}>Retry original order</button></section>}
   <section><h2>Find your pickup shop</h2><p>Use your location to find real approved and available shops. No delivery address is required.</p>
    <button disabled={busy || !!pending} onClick={locate}>{location ? "Refresh nearby shops" : "Use my location"}</button>
    {shops.map(candidate=><div className="row" key={candidate.id}><p>{candidate.name} · {candidate.distance_km.toFixed(1)} km · {candidate.location}</p><button disabled={busy || !!pending} onClick={()=>selectShop(candidate)}>View menu</button></div>)}
   </section>
   {shop && <section><h2>{shop.name}</h2><p>Choose quantities. Checkout prices are confirmed by the server.</p>
    {!menu.length && <p>No available menu items.</p>}
    {menu.map(item=><label className="row" key={item.id}><span>{item.name} · {money(Math.round(Number(item.price)*100))}</span>
     <select aria-label={"Quantity for "+item.name} disabled={busy || !!pending} value={quantities[item.id] || 0} onChange={e=>{setQuantities(current=>({...current,[item.id]:Number(e.target.value)}));resetQuote();}}>{Array.from({length:21},(_,i)=><option key={i} value={i}>{i}</option>)}</select></label>)}
    <h3>Pickup contact</h3><label>Name<input required maxLength={120} autoComplete="name" value={name} disabled={busy || !!pending} onChange={e=>{setName(e.target.value);resetQuote();}}/></label>
    <label>Callable phone number<input type="tel" required maxLength={30} autoComplete="tel" value={phone} disabled={busy || !!pending} onChange={e=>{setPhone(e.target.value);resetQuote();}}/></label>
    <label>Pay at shop<select value={method} disabled={busy || !!pending} onChange={e=>{setMethod(e.target.value);resetQuote();}}><option value="cash">Cash</option><option value="card_machine">Physical card machine, if the shop supports it</option></select></label>
    <p>No online payment or card details. Payment is confirmed separately by the merchant at collection.</p>
    <button disabled={busy || !!pending} onClick={getQuote}>Get exact server quote</button>
    {quote && <div><h3>Review your pickup order</h3><ul>{quote.lines.map(line=><li key={line.menu_item_id}>{line.quantity} × {line.name}: {money(line.line_minor)}</li>)}</ul>
     <p>Food: {money(quote.subtotal_minor)} · Service fee: {money(quote.service_fee_minor)}</p><p className="amount">Total at shop: {money(quote.total_minor)}</p>
     <label><input type="checkbox" checked={consent} disabled={busy || !!pending} onChange={e=>setConsent(e.target.checked)}/> I agree to these items and this exact total.</label>
     <button disabled={busy || !consent || !!pending} onClick={placeOrder}>Place pickup order · Pay at shop</button></div>}
   </section>}
   <section><div className="row"><h2>Ready notifications</h2><button className="secondary" disabled={busy} onClick={()=>void run(async()=>{setNotice(await enablePickupPush(api));})}>Enable optional push</button></div>
    <p>Ready notices stay here even without push permission. Push is best effort.</p>
    {!notifications.length && <p>No Ready notifications loaded.</p>}
    {notifications.map(n=><p className="notification" key={n.id}>Order {n.order_id} was marked Ready. Check its current status before collecting.</p>)}
   </section>
   <section><div className="row"><h2>Your orders &amp; history</h2><button className="secondary" disabled={busy} onClick={()=>void run(refresh)}>Refresh</button></div>
    {!orders.length && <p>No orders loaded.</p>}
    {orders.map(order=><article key={order.id}><h3>{pickupStatus(order,facts[order.id])}</h3><p>Order {order.id}</p>
     <p>Payment: {order.payment_status==="paid" ? "Confirmed paid at shop" : order.payment_status==="unpaid" ? "Unpaid — pay at shop" : "Unknown"}</p>
     <p className="amount">{money(Math.round(Number(order.total_price)*100))}</p>
     <ul>{Array.isArray(order.items) && order.items.map((line,i)=><li key={i}>{line.quantity} × {line.name}</li>)}</ul>
     <button className="secondary" disabled={busy} onClick={()=>detail(order)}>Refresh details &amp; history</button>
     {order.delivery_type==="collection" && order.status==="pending" && <button disabled={busy} onClick={()=>{if(window.confirm("Cancel this pending order?"))void cancel(order);}}>Cancel pending order</button>}
     {facts[order.id]?.map(fact=><p key={fact.id}>{fact.kind.replaceAll("_"," ")}{fact.details?.reason ? ": "+fact.details.reason : ""}</p>)}
    </article>)}
   </section>
  </>}
 </div></main>;
}
