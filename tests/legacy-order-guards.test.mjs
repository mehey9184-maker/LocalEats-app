import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {once} from "node:events";
import {request} from "node:http";
import {legacyOrderGuard} from "../legacyOrderGuards.ts";
import fs from "node:fs";

test("Customer legacy mutations return update-required before auth, database or memory fallback",async()=>{
 const app=express();let downstream=0;
 app.use(legacyOrderGuard);
 app.use((_req,res)=>{downstream++;res.json({success:true,marker:"authorized-read"});});
 const server=app.listen(0,"127.0.0.1");await once(server,"listening");
 const call=(method,path)=>new Promise((resolve,reject)=>{
  const req=request({host:"127.0.0.1",port:server.address().port,path,method},res=>{
   let body="";res.on("data",chunk=>body+=chunk);res.on("end",()=>resolve({status:res.statusCode,body:JSON.parse(body),cache:res.headers["cache-control"]}));
  });req.on("error",reject);req.end();
 });
 try{
  for(const [method,path] of [["POST","/api/orders"],["PATCH","/api/orders/existing"],["PUT","/api/orders/existing"],
    ["DELETE","/api/orders/existing"],["POST","/api/v1/orders/existing/accept"],["POST","/api/v1/orders"]]){
   const result=await call(method,path);assert.equal(result.status,426);assert.equal(result.body.success,false);
   assert.equal(result.body.code,"PICKUP_CONTRACT_REQUIRED");assert.equal(result.body.order,undefined);assert.equal(result.cache,"no-store");
  }
  assert.equal(downstream,0);
  assert.equal((await call("GET","/api/orders")).status,200);assert.equal(downstream,1);
 }finally{server.close();await once(server,"close");}
 const source=fs.readFileSync(new URL("../server.ts",import.meta.url),"utf8");
 assert.ok(source.indexOf("app.use(legacyOrderGuard)")<source.indexOf('app.post("/api/orders"'));
});
