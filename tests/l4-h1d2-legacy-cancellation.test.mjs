import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('src/App.tsx');
const ast=ts.createSourceFile('App.tsx',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function declarations(name){
 const found=[];
 function visit(n){
  if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.name.text===name)found.push(n);
  ts.forEachChild(n,visit);
 }
 visit(ast);return found;
}
test('disabled legacy cancellation has only the existing alert and return, with no queued writes',async()=>{
 const ds=declarations('cancelOrder');assert.equal(ds.length,1);
 const init=ds[0].initializer;assert.ok(ts.isCallExpression(init));
 assert.equal(init.expression.getText(ast),'useCallback');
 const callback=init.arguments[0];assert.ok(ts.isArrowFunction(callback));
 assert.ok(ts.isBlock(callback.body));assert.equal(callback.body.statements.length,2);
 assert.ok(ts.isReturnStatement(callback.body.statements[1]));
 const statement=callback.body.statements[0];
 assert.ok(ts.isExpressionStatement(statement)&&ts.isCallExpression(statement.expression));
 assert.equal(statement.expression.expression.getText(ast),'showAlert');
 assert.equal(statement.expression.arguments.length,2);
 const calls=[];
 const js=ts.transpileModule('const handler = '+callback.getText(ast)+';',{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}
 }).outputText;
 const context=vm.createContext({showAlert:(...args)=>calls.push(args)});
 vm.runInContext(js,context);
 await vm.runInContext("handler('fixture-order','Changed plans')",context);
 assert.deepEqual(calls,[['Pickup ordering unavailable','Order changes require pickup database activation. No status has been changed.']]);
 assert.doesNotMatch(app,/processPendingCancellationsQueue|from\s+["']\.\/hooks\/useOfflineSync["']/);
});
test('active pickup tracking still calls authenticated server-authoritative cancellation',()=>{
 assert.match(app,/onCancel=\{cancelCustomerPickup\}/);
 assert.match(app,/changesEnabled=\{pickupOrderingEnabled\(\)\}/);
 assert.match(app,/hasPendingCancellation=\{hasPendingPickupCancellation\}/);
 const service=read('src/services/customerPickup.ts');
 assert.match(service,/cancelCustomerPickup\s*=\s*createPickupCancellation\(/);
 assert.match(service,/identity:\(\)=>auth\.currentUser\?\.uid,enabled:pickupOrderingEnabled,command:customerPickupApi\.command/);
 const tracking=read('src/screens/PickupTrackingScreen.tsx');
 assert.match(tracking,/await props\.onCancel\(order,reason\)/);
 assert.match(tracking,/Cancellation confirmed by the shop service/);
});
test('legacy queue keys still cleared on sign-out; retained legacy module is not reattached',()=>{
 assert.match(app,/"pending_review", "pending_cancellation", "offline_orders_queue"/);
 assert.match(read('src/hooks/useOfflineSync.ts'),/export async function processPendingCancellationsQueue/);
});
