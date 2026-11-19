type AcceptanceOrder={status:string;acceptance_deadline_at?:string|null;acceptance_expired_at?:string|null};
const valid=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function acceptanceMessage(order:AcceptanceOrder,now=Date.now()){
 if(order.status==='cancelled'&&valid(order.acceptance_expired_at))return {
  state:'expired',title:'The shop didn’t accept in time',
  text:'Your request has expired. You haven’t been charged. You can try another nearby shop.',canFindAnother:true};
 if(order.status!=='pending'||!valid(order.acceptance_deadline_at))return null;
 const remaining=Date.parse(order.acceptance_deadline_at)-now;
 if(remaining<=0)return {state:'unconfirmed',title:'Checking the shop’s response',
  text:'The acceptance window has ended. Refresh to confirm the outcome before placing another order.',canFindAnother:false};
 return {state:'waiting',title:'Waiting for the shop to accept',
  text:`The shop has up to ${Math.max(1,Math.ceil(remaining/60000))} min remaining to accept. You can cancel while waiting. Pay at the shop after acceptance.`,canFindAnother:false};
}
