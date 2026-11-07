import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {canManageCustomerProfile} from '../src/lib/profileAccess.ts';
import {initialCustomerProfileState,applyProfileMetadata,beginProfileRead,acceptProfileRead,failProfileRead} from '../src/lib/customerProfileState.ts';
const extract=(file,name)=>{
 const source=readFileSync(new URL(file,import.meta.url),'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let code;
 function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name){const value=n.initializer;code=ts.isCallExpression(value)?value.arguments[0].getText(ast):value.getText(ast);}ts.forEachChild(n,visit);}visit(ast);assert.ok(code);
 return ts.transpileModule(`return (${code});`,{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:'callback.ts'}).outputText;
};
const readCode=extract('../src/App.tsx','fetchUserProfile');
const loginCode=extract('../src/screens/auth/LoginScreen.tsx','handleLogin');
const metadataCode=extract('../src/App.tsx','setUserProfile');
test('late same-account Login metadata cannot replace an already verified central profile',async()=>{
 let release;const loginReply=new Promise(r=>release=r);const user={uid:'A',isAnonymous:false,email:'a@example.invalid'};
 const empty=()=>({fullName:'',email:'',phone:'',city:'Johannesburg',address:'',country:'South Africa',role:'user'});
 let state=initialCustomerProfileState(empty());const values=new Map();
 const deps={auth:{currentUser:user},canManageCustomerProfile,profileReadGeneration:{current:0},
  initialCustomerProfileState,applyProfileMetadata,beginProfileRead,acceptProfileRead,failProfileRead,
  setCustomerProfileState:next=>{state=typeof next==='function'?next(state):next;},
  readCustomerProfile:async()=>({profile:{user_id:'A',fullName:'Backend Confirmed',address:'Backend address',updated_at:'2026-11-06T18:00:00.123456+00:00'},revision:'2026-11-06T18:00:00.123456+00:00'}),
  emptyCustomerProfile:()=>({fullName:'',email:'',phone:'',city:'Johannesburg',address:'',country:'South Africa',role:'user'}),
  setUserProfile:null,setFavorites:()=>{},
  loginMounted:{current:false},identifier:'a@example.invalid',password:'synthetic-only',
  supabase:{auth:{signInWithPassword:()=>loginReply}},setAuthError:()=>{},setLoading:()=>{},setHasRememberedToken:()=>{},setIsSuccess:()=>{},
  localStorage:{setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},
  generateSecureToken:()=>'synthetic-only',rememberMe:false,registerBiometrics:async()=>{},scheduleLoginTask:()=>{},onLogin:()=>{},navigator:{onLine:true},console:{info:()=>{},warn:()=>{},debug:()=>{}},
 };
 deps.setUserProfile=new Function(...Object.keys(deps),metadataCode)(...Object.values(deps));
 const login=new Function(...Object.keys(deps),loginCode)(...Object.values(deps))();
 await new Function(...Object.keys(deps),readCode)(...Object.values(deps))('A');
 assert.equal(state.profile.fullName,'Backend Confirmed');
 release({data:{user:{id:'A',email:'a@example.invalid',user_metadata:{full_name:'Old login name'}}},error:null});await login;
 assert.equal(state.profile.fullName,'Backend Confirmed');assert.equal(state.profile.address,'Backend address');
 assert.ok(!String(values.get('userProfile')).includes('Old login name'));
});
