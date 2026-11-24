import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {once} from "node:events";
import type {AddressInfo} from "node:net";
import {makeLegacyCatalogRouter} from "../legacyCatalogRouter";

test("legacy catalog aliases use only central API, preserve compatibility and fail closed",async()=>{
 const calls:{url:string;init?:RequestInit}[]=[];
 let mode="ok";
 const transport:typeof fetch=async (url,init)=>{
   calls.push({url:String(url),init});
   if(mode==="network")throw Error("offline");
   if(mode==="invalid")return new Response("<html>");
   if(mode==="redirect")return new Response("",{status:302,headers:{Location:"https://elsewhere.invalid"}});
   if(mode==="rate")return new Response("untrusted response",{status:429,headers:{"Retry-After":"12"}});
   if(mode==="bad-rate")return new Response("untrusted response",{status:429,headers:{"Retry-After":"999999"}});
   if(mode==="missing")return new Response("{}",{status:404});
   if(String(url).endsWith("/menu"))return Response.json({success:true,menu_items:mode==="empty"?[]:[{id:"meal",shop_id:mode==="mismatch"?"other":"approved",name:"Kota",price:25,is_available:true,private_field:"hidden"}]});
   return Response.json({success:true,shops:[{id:"approved",name:"Closed Shop",is_active:false,owner_id:"hidden",approval_reason:"hidden",cash_trust_enabled:true}]});
 };
 const app=express();
 app.use("/api/v1",makeLegacyCatalogRouter("https://catalog.example.invalid",transport));
 app.use("/unconfigured",makeLegacyCatalogRouter(undefined,transport));
 const server=app.listen(0,"127.0.0.1");await once(server,"listening");
 const base="http://127.0.0.1:"+(server.address() as AddressInfo).port;
 try{
   let response=await fetch(base+"/api/v1/shops?origin=https://evil.invalid",{headers:{Authorization:"Bearer synthetic",Cookie:"session=synthetic"}});
   assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"no-store");
   assert.deepEqual(await response.json(),{success:true,shops:[{id:"approved",name:"Closed Shop",is_active:false}]});
   assert.equal(calls[0].url,"https://catalog.example.invalid/api/v1/catalog/shops");
   assert.deepEqual(calls[0].init?.headers,{Accept:"application/json"});assert.equal(calls[0].init?.redirect,"error");
   response=await fetch(base+"/api/v1/shops/approved/menu");
   assert.deepEqual(await response.json(),{success:true,items:[{id:"meal",shop_id:"approved",name:"Kota",price:25,is_available:true}]});
   mode="empty";assert.deepEqual(await (await fetch(base+"/api/v1/shops/approved/menu")).json(),{success:true,items:[]});
   mode="missing";assert.equal((await fetch(base+"/api/v1/shops/pending/menu")).status,404);
   for(const failure of ["network","invalid","redirect","mismatch"]){mode=failure;assert.equal((await fetch(base+"/api/v1/shops/approved/menu")).status,503);}
   for(const [path,modeName,seconds] of [["/api/v1/shops","rate","12"],["/api/v1/shops/approved/menu","bad-rate","60"]]){
     mode=modeName;const rate=await fetch(base+path);assert.equal(rate.status,429);assert.equal(rate.headers.get("Retry-After"),seconds);assert.equal(rate.headers.get("cache-control"),"no-store");assert.equal((await rate.json()).code,"RATE_LIMITED");
   }
   const before=calls.length;
   assert.equal((await fetch(base+"/unconfigured/shops")).status,503);
   assert.equal((await fetch(base+"/api/v1/shops/%2Fbad/menu")).status,404);
   assert.equal(calls.length,before);
 }finally{server.close();await once(server,"close");}
});
