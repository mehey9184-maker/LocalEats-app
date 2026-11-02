// Compare successive authenticated customer API snapshots. A first snapshot,
// a cached order, or an FCM data-only payload is never sufficient to claim a
// new status change. Ready alerts are handled by the server's immutable inbox.
export type CustomerStatusOrder={
 id:string; user_id?:string; delivery_type?:string; status:string;
};
export type CustomerStatusNotice={orderId:string;title:string;message:string};
export function customerOrderStatusNotices(
 previous:readonly CustomerStatusOrder[]|null,
 current:readonly CustomerStatusOrder[],
 customerId:string,
):CustomerStatusNotice[]{
 if(!previous || !customerId)return [];
 const known=new Map(previous.map(order=>[String(order.id),order]));
 const notices:CustomerStatusNotice[]=[];
 for(const order of current){
  if(order.user_id!==customerId || order.delivery_type!=="collection")continue;
  const before=known.get(String(order.id));
  if(!before || before.user_id!==customerId || before.status===order.status)continue;
  const status=String(order.status).toLowerCase();
  const title=status==="preparing" || status==="accepted" ? "Order accepted"
   : status==="collected" || status==="completed" ? "Order collected"
   : status==="cancelled" ? "Order cancelled" : null;
  if(!title)continue;
  const message=status==="preparing" || status==="accepted"
   ? "The shop confirmed your order and is preparing it."
   : status==="cancelled" ? "The shop has updated your order to cancelled. Open Orders for details."
   : "Your order has been confirmed as collected.";
  notices.push({orderId:String(order.id),title,message});
 }
 return notices;
}
