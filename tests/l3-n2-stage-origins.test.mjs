import test from "node:test";
import assert from "node:assert/strict";
import {isVerifiedCustomerPushStagingContext, CUSTOMER_STAGING_API_ORIGINS} from "../src/services/customerPushStaging.ts";

const valid=()=>({
  origin:"https://localeats-customer-staging-r52d.vercel.app",
  configuredOrigin:"https://localeats-customer-staging-r52d.vercel.app",
  apiUrl:"https://localeats-api-staging-r52d-mehey9184-makers-projects.vercel.app",
  configSource:"environment",
  firebaseProjectId:"localeats-staging",
  orderingEnabled:"false",
  vapidKey:"synthetic-public-vapid-key",
});

test("registered staging Customer origin and deployed stage API are accepted",()=>{
 assert.equal(isVerifiedCustomerPushStagingContext(valid()),true);
 assert.equal(CUSTOMER_STAGING_API_ORIGINS.length,4);
 assert.equal(isVerifiedCustomerPushStagingContext({...valid(),apiUrl:"https://localeats-api-staging-r52d-git-54267e-mehey9184-makers-projects.vercel.app"}),true);
 assert.equal(isVerifiedCustomerPushStagingContext({...valid(),apiUrl:"https://localeats-api-staging-r52d-git-112955-mehey9184-makers-projects.vercel.app"}),true);
 assert.equal(isVerifiedCustomerPushStagingContext({...valid(),origin:"https://localeats-customer-staging-r52d-nkto1i618.vercel.app",configuredOrigin:"https://localeats-customer-staging-r52d-nkto1i618.vercel.app"}),true);
 assert.equal(isVerifiedCustomerPushStagingContext({...valid(),apiUrl:"https://localeats-api-staging-r52d.vercel.app"}),true);
});
test("staging UI rejects Production/API crossover and arbitrary generic Vercel previews",()=>{
 const v=valid();
 const bad=[
  {origin:"https://localeatssa.co.za",configuredOrigin:"https://localeatssa.co.za"},
  {origin:"https://project-x7cvt-git-preview.vercel.app",configuredOrigin:"https://project-x7cvt-git-preview.vercel.app"},
  {apiUrl:"https://localeats-api.vercel.app"},
  {apiUrl:"https://localeats-api-staging-r52d.vercel.app.attacker.example"},
  {apiUrl:"https://localeats-api-staging-r52d.vercel.app/attacker"},
  {apiUrl:"https://localeats-api-staging-r52d.vercel.app?mode=production"},
  {firebaseProjectId:"localeats-5e26e"},
  {firebaseProjectId:"arbitrary-project"},
  {configSource:"bundle"},
  {orderingEnabled:"true"},
  {vapidKey:""},
  {configuredOrigin:"https://other-preview.vercel.app"}
 ];
 for(const value of bad) assert.equal(isVerifiedCustomerPushStagingContext({...v,...value}),false,JSON.stringify(value));
});
