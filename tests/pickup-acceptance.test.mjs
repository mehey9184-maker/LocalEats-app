import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptanceMessage} from '../src/services/pickupAcceptance.ts';
const order={status:'pending',acceptance_deadline_at:'2026-11-19T10:05:00Z',acceptance_expired_at:null};
test('deadline display never invents a cancellation',()=>{
 assert.equal(acceptanceMessage(order,Date.parse('2026-11-19T10:04:00Z')).state,'waiting');
 const late=acceptanceMessage(order,Date.parse('2026-11-19T10:05:00Z'));
 assert.equal(late.state,'unconfirmed');assert.match(late.text,/Refresh/);
 assert.equal(late.canFindAnother,false);
});
test('only persisted expired cancellation offers another shop',()=>{
 assert.equal(acceptanceMessage({...order,status:'cancelled',acceptance_expired_at:'2026-11-19T10:05:00Z'}).canFindAnother,true);
 assert.equal(acceptanceMessage({...order,status:'preparing',acceptance_expired_at:'2026-11-19T10:05:00Z'}),null);
 assert.equal(acceptanceMessage({...order,acceptance_deadline_at:'invalid'}),null);
 assert.equal(acceptanceMessage({...order,status:'cancelled',acceptance_expired_at:'invalid'}),null);
 assert.equal(acceptanceMessage({status:'pending'}),null);
});
