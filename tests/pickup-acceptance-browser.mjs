import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const entry=`import React,{useState} from 'react';import{createRoot}from'react-dom/client';
import{PickupTrackingScreen}from'/src/screens/PickupTrackingScreen';import'/src/index.css';
function Fixture(){const[orders,setOrders]=useState([]);window.setOrders=setOrders;return <PickupTrackingScreen signedIn orders={orders} error={false} refreshing={false} shops={[]} changesEnabled={false} hasPendingCancellation={()=>false} onCancel={async()=>{throw Error('No writes allowed')}} onBack={()=>{}} onRetry={()=>{window.refreshed=true}} onHistory={()=>{window.historyOpened=true}} onSignIn={()=>{}} onBrowse={()=>{window.browsed=true}}/>}createRoot(document.getElementById('root')).render(<Fixture/>);`;
const server=await createServer({server:{host:'127.0.0.1',port:4195,strictPort:true,hmr:false},plugins:[{name:'isolated-deadline-fixture',
 configureServer(s){s.middlewares.use('/__deadline',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<div id="root"></div><script type="module" src="/__fixture.tsx"></script>');});},
 resolveId(id){if(id==='/__fixture.tsx')return id;},load(id){if(id==='/__fixture.tsx')return entry;}}]});
let browser;
try{await server.listen();browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true});await mkdir('.tmp/acceptance-browser',{recursive:true});
for(const width of [320,390,1280]){
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4195/__deadline');await page.waitForFunction(()=>window.setOrders);
 const base={id:'fixture-order',shop_id:'fixture-shop',user_id:'fixture-customer',status:'pending',delivery_type:'collection',payment_status:'unpaid',revision:0,total_price:25,items:[{name:'Synthetic sample meal',quantity:1}]};
 await page.evaluate(o=>window.setOrders([{...o,acceptance_deadline_at:new Date(Date.now()-1000).toISOString()}]),base);
 await page.getByText('Checking the shop’s response',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Find another shop',exact:true}).count(),0);
 await page.getByRole('button',{name:'Refresh pickup status'}).click();assert.equal(await page.evaluate(()=>window.refreshed),true);
 await page.evaluate(o=>window.setOrders([{...o,status:'cancelled',acceptance_expired_at:new Date().toISOString()}]),base);
 const another=page.getByRole('button',{name:'Find another shop',exact:true});await another.waitFor();await another.click();
 assert.equal(await page.evaluate(()=>window.browsed),true);await page.getByRole('button',{name:'View order details',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.historyOpened),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'.tmp/acceptance-browser/expired-'+width+'.png'});
 await page.evaluate(()=>window.setOrders([]));await another.waitFor({state:'hidden'});assert.deepEqual(errors,[]);
 console.log('CUSTOMER_ACCEPTANCE_BROWSER_PASS',width,'unconfirmed deadline, persisted expiry, clickable recovery, cleared account feed');await context.close();
}}finally{await browser?.close();await server.close();}
