// Offline build rehearsal only. Does not produce an authorized deployable artifact.
import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=resolve(process.argv[2]||'.');
const fixtureOrigin='https://localeats-r2a1-fixture.invalid';
const flags=['VITE_PICKUP_ORDERING_ENABLED','VITE_PROFILE_WRITES_ENABLED','VITE_LOCALPAY_ENABLED','VITE_REWARDS_ENABLED','VITE_MERCHANT_FAKE_ORDERS_ENABLED','VITE_MERCHANT_ORDERS_FOCUSED_UI','PICKUP_WRITES_ENABLED','DELIVERY_WRITES_ENABLED','MERCHANT_AVAILABILITY_WRITES_ENABLED','MERCHANT_ACCOUNT_PROFILE_WRITES_ENABLED','MERCHANT_SHOP_PROFILE_WRITES_ENABLED','PROFILE_API_STAGING_WRITES_ENABLED','PROFILE_P5_ENABLE_STAGING_WRITES'];
assert.ok(!readdirSync(root).some(n=>n.startsWith('.env')&&n!=='.env.example'),'local env files forbidden');
const env={PATH:process.env.PATH,HOME:process.env.HOME,CI:'true',...Object.fromEntries(flags.map(k=>[k,'false'])),VITE_MERCHANT_PREVIEW_READ_ONLY:'true',LOCALEATS_PREVIEW_READ_ONLY:'true',VITE_LOCALEATS_API_URL:fixtureOrigin,VITE_FIREBASE_CONFIG_SOURCE:'environment',VITE_FIREBASE_API_KEY:'fixture-api-key-not-real',VITE_FIREBASE_AUTH_DOMAIN:'demo-r2a1.invalid',VITE_FIREBASE_PROJECT_ID:'demo-r2a1',VITE_FIREBASE_STORAGE_BUCKET:'demo-r2a1.invalid',VITE_FIREBASE_MESSAGING_SENDER_ID:'123456789',VITE_FIREBASE_APP_ID:'1:123456789:web:fixture',VITE_FIREBASE_FIRESTORE_DATABASE_ID:'(default)'};
const vite=resolve(root,'node_modules/vite/bin/vite.js');
assert.ok(existsSync(vite));const child=spawnSync(process.execPath,[vite,'build','--emptyOutDir'],{cwd:root,env,stdio:'inherit'});assert.equal(child.status,0);
const dist=resolve(root,'dist');assert.ok(existsSync(join(dist,'index.html')));
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(join(d,x.name)):[join(d,x.name)]);
const files=walk(dist);assert.ok(!files.some(f=>/(^|\/)(server\.(?:cjs|js|mjs)(?:\.map)?|\.env(?:\..*)?|[^/]+\.(?:pem|key))$/.test(f)),'server/private artifact');
const js=files.filter(f=>f.endsWith('.js'));assert.ok(js.length>0);assert.ok(js.some(f=>readFileSync(f,'utf8').includes(fixtureOrigin)),'fixture origin missing from output');
assert.ok(!js.some(f=>/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(readFileSync(f,'utf8'))),'private key marker in output');
console.log('R2A1_STATIC_BUILD '+JSON.stringify({files:files.length,js:js.length,fixtureOrigin:true,orderingFlags:'false',scope:'offline synthetic config, not hosted origin pairing or Firebase rules proof'}));
