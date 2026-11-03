import type {PickupQuote} from "../pickup/client";
// Amounts come from the authenticated quote. Menu/cart prices remain estimates until review.
export function pickupQuoteAmounts(quote:PickupQuote) {
 const {subtotal_minor:subtotal,service_fee_minor:service,delivery_fee_minor:delivery=0,discount_minor:discount=0,tip_minor:tip=0,total_minor:total}=quote;
 if(![subtotal,service,delivery,discount,tip,total].every(n=>Number.isSafeInteger(n)&&n>=0) ||
   service!==0 || delivery!==0 || tip!==0 || discount>subtotal || total!==subtotal-discount ||
   !Array.isArray(quote.lines) || quote.lines.some(l=>!Number.isSafeInteger(l.line_minor)||l.line_minor<0) ||
   quote.lines.reduce((sum,l)=>sum+l.line_minor,0)!==subtotal)
  throw new Error("The service did not confirm zero-fee pickup pricing. No order was submitted.");
 return {subtotal:subtotal/100,serviceFee:service/100,deliveryFee:delivery/100,discount:discount/100,total:total/100};
}
