import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const root=path.resolve(process.argv[2]||'.');
const require=createRequire(path.join(root,'package.json'));
const ts=require('typescript');
const tracked=execFileSync('git',['-C',root,'ls-files','-z','src'],{encoding:'utf8'}).split('\0').filter(p=>/\.(tsx?|jsx?)$/.test(p));
const known=new Set(tracked);
const normalize=p=>p.replaceAll('\\','/');
const files=new Map(),edges=new Map(), unresolved=new Set();
const resolve=(from,spec)=>{
 if(!spec.startsWith('.')&&!spec.startsWith('@/'))return null;
 const p=normalize(spec.startsWith('@/')?'src/'+spec.slice(2):path.posix.normalize(path.posix.join(path.posix.dirname(from),spec)));
 const stem=p.replace(/\.(js|jsx|ts|tsx)$/,'');
 return [p,stem+'.ts',stem+'.tsx',stem+'.js',stem+'.jsx',p+'/index.ts',p+'/index.tsx',p+'/index.js'].find(x=>known.has(x))||null;
};
for(const p of tracked){
 const text=fs.readFileSync(path.join(root,p),'utf8');
 const ast=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);
 files.set(p,ast);
 const deps=new Set();
 const dep=spec=>{const target=resolve(p,spec);if(target)deps.add(target);else if(spec.startsWith('.')||spec.startsWith('@/')){if(!/\.(css|scss|json|png|jpg|svg|webp|gif|woff2?|ico|mp3|wav|html)$/.test(spec))unresolved.add(p+' '+spec.split(/[?#]/)[0]);}};
 const visit=n=>{
  if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteralLike(n.moduleSpecifier))dep(n.moduleSpecifier.text);
  if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword&&n.arguments[0]&&ts.isStringLiteralLike(n.arguments[0]))dep(n.arguments[0].text);
  ts.forEachChild(n,visit);
 };
 visit(ast);edges.set(p,deps);
}
const roots=['src/main.tsx','src/main.ts','src/index.tsx','src/index.ts','src/sw.ts'].filter(p=>known.has(p));
if(!roots.length)throw Error('No frontend roots');
const reachable=new Set();
function walk(p){if(reachable.has(p))return;reachable.add(p);for(const d of edges.get(p)||[])walk(d);}
roots.forEach(walk);
const firestoreReads=new Set(['getDoc','getDocs','onSnapshot','getCountFromServer','getDocFromCache','getDocsFromCache']);
const firestoreWrites=new Set(['addDoc','setDoc','updateDoc','deleteDoc','writeBatch','runTransaction']);
const storageCalls=new Set(['uploadBytes','uploadBytesResumable','deleteObject','getDownloadURL']);
const authCalls=new Set(['getIdToken','signInWithEmailAndPassword','createUserWithEmailAndPassword','signInWithPopup','signInAnonymously','onAuthStateChanged','signOut','updateProfile','updatePassword','sendEmailVerification','sendPasswordResetEmail']);
const bridgeMethods=new Set(['from','rpc','channel']);
const chainWrites=new Set(['insert','upsert','update','delete']);
const findings=[];
const label=n=>ts.isIdentifier(n)?n.text:ts.isPropertyAccessExpression(n)?n.name.text:'';
for(const [p,ast] of files){
 const aliases=new Map(), namespaces=new Map();
 const collect=n=>{
  if(ts.isImportDeclaration(n)&&ts.isStringLiteralLike(n.moduleSpecifier)){
   const spec=n.moduleSpecifier.text,b=n.importClause?.namedBindings;
   if(b&&ts.isNamedImports(b))for(const x of b.elements)aliases.set(x.name.text,{name:x.propertyName?.text||x.name.text,spec});
   else if(b&&ts.isNamespaceImport(b))namespaces.set(b.name.text,spec);
  }
  if(ts.isVariableDeclaration(n)&&ts.isObjectBindingPattern(n.name)&&n.initializer&&ts.isAwaitExpression(n.initializer)&&ts.isCallExpression(n.initializer.expression)){
   const call=n.initializer.expression;
   if(call.expression.kind===ts.SyntaxKind.ImportKeyword&&call.arguments[0]&&ts.isStringLiteralLike(call.arguments[0]))for(const x of n.name.elements)if(ts.isIdentifier(x.name))aliases.set(x.name.text,{name:x.propertyName&&ts.isIdentifier(x.propertyName)?x.propertyName.text:x.name.text,spec:call.arguments[0].text});
  }
  ts.forEachChild(n,collect);
 };collect(ast);
 const chainHasBridge=n=>{if(!n)return false;if(ts.isCallExpression(n))return chainHasBridge(n.expression);if(ts.isPropertyAccessExpression(n))return bridgeMethods.has(n.name.text)&&/^(supabase|supabaseAdmin)$/.test(label(n.expression))||chainHasBridge(n.expression);if(ts.isParenthesizedExpression(n)||ts.isAsExpression(n)||ts.isNonNullExpression(n))return chainHasBridge(n.expression);return false;};
 const visit=n=>{
  if(ts.isCallExpression(n)){
   const e=n.expression, raw=label(e), imported=ts.isIdentifier(e)?aliases.get(raw):undefined;
   const name=imported?.name||raw,ns=ts.isPropertyAccessExpression(e)&&ts.isIdentifier(e.expression)?namespaces.get(e.expression.text):undefined;
   const spec=imported?.spec||ns||'';
   let kind=null;
   if(firestoreReads.has(name))kind='firestore-read-candidate';
   else if(firestoreWrites.has(name))kind='firestore-write-candidate';
   else if(storageCalls.has(name))kind='storage-candidate';
   else if(authCalls.has(name))kind='identity-candidate';
   else if(name==='httpsCallable')kind='firebase-callable-candidate';
   else if(bridgeMethods.has(name)&&ts.isPropertyAccessExpression(e)&&(/supabase/i.test(e.expression.getText(ast))||spec.includes('supabase')))kind='compatibility-entry';
   else if(chainWrites.has(name)&&chainHasBridge(e))kind='compatibility-write';
   else if(name==='fetch')kind='http-fetch-candidate';
   else if(ts.isPropertyAccessExpression(e)&&label(e.expression)==='FirestoreService')kind='firestore-service-candidate';
   else if(/^(get|update|create|delete|subscribeTo|migrateDataTo).*Firestore|^firebase(Sign|Reset)/.test(name))kind='firebase-wrapper-candidate';
   if(kind){const loc=ast.getLineAndCharacterOfPosition(n.getStart(ast));findings.push({file:p,line:loc.line+1,kind,symbol:name,reachable:reachable.has(p)});}
  }
  ts.forEachChild(n,visit);
 };visit(ast);
}
const totals={};for(const f of findings){const k=f.kind;totals[k]??={all:0,reachable:0};totals[k].all++;if(f.reachable)totals[k].reachable++;}
console.log('H2C_INVENTORY '+JSON.stringify({revision:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),files:tracked.length,roots,reachable:reachable.size,unresolved:unresolved.size,totals}));
for(const f of findings)console.log('H2C_SITE '+JSON.stringify(f));
for(const u of unresolved)console.log('H2C_UNRESOLVED '+u);
if(!findings.some(f=>f.kind==='identity-candidate')||!findings.some(f=>f.kind==='http-fetch-candidate')||!findings.some(f=>f.kind==='firestore-write-candidate'))throw Error('Audit coverage sanity check failed');
// Reachability is module-level only; no assertion of actual runtime execution.
// No source values, credentials, arguments, or request bodies printed.
