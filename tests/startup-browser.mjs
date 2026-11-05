import {chromium} from 'playwright';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const root=fileURLToPath(new URL('..',import.meta.url));
const artifacts=process.env.STARTUP_ARTIFACT_DIR || path.join(tmpdir(),'localeats-startup-check');
await mkdir(artifacts,{recursive:true});
const server=await createServer({root,configFile:path.join(root,'vite.config.ts'),server:{host:'127.0.0.1',port:0}});
await server.listen();
const base=`http://127.0.0.1:${server.httpServer.address().port}`;
let browser;
const results=[];
try{
 browser=await chromium.launch({...(process.env.STARTUP_BROWSER_CHANNEL ? {channel:process.env.STARTUP_BROWSER_CHANNEL} : {}),headless:true});
 for(const [width,height,reducedMotion] of [[390,844,'no-preference'],[320,568,'reduce']]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion,serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1' ? route.continue() : route.abort());
  const page=await context.newPage();page.setDefaultTimeout(8000);
  await page.goto(base+'/tests/startup-fixture.html');
  await page.locator('#popia-legal-bar').waitFor();
  await page.waitForTimeout(3800);
  assert.equal(await page.locator('#cookie-consent-banner').count(),0);
  assert.equal(await page.getByRole('dialog',{name:'Pickup app guide'}).count(),0);
  await page.getByRole('button',{name:'Accept',exact:true}).click();
  await page.locator('#cookie-consent-banner').waitFor();
  assert.equal(await page.getByRole('dialog',{name:'Pickup app guide'}).count(),0);
  await page.getByRole('button',{name:'Essential Only',exact:true}).click();
  await page.getByRole('heading',{name:'Discover Local Food',exact:true}).waitFor();
  await page.waitForTimeout(3800);
  assert.equal(await page.locator('#interactive-tour-overlay').count(),0);
  assert.equal(await page.locator('#onboarding-guide-modal-container').count(),1);
  await page.screenshot({path:path.join(artifacts,`startup-overview-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Next Step',exact:true}).click();
  await page.getByRole('button',{name:'Next Step',exact:true}).click();
  await page.getByRole('button',{name:'Get Started',exact:true}).click();
  await page.getByText('Active Screen Guide',{exact:true}).waitFor();
  assert.equal(await page.locator('#onboarding-guide-modal-container').count(),0);
  for(let i=0;i<12;i++){
   await page.keyboard.press(i%2===0?'Tab':'Shift+Tab');
   assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('#guide-slide-container-wrapper')),true);
  }
  await page.keyboard.press('Escape');
  await page.getByRole('dialog',{name:'Pickup app guide'}).waitFor({state:'detached'});
  await page.locator('#home-action').click();
  await page.reload();await page.waitForTimeout(4000);
  assert.equal(await page.getByRole('dialog',{name:'Pickup app guide'}).count(),0);
  assert.equal(await page.locator('#cookie-consent-banner').count(),0);
  await page.locator('#home-action').click();
  assert.equal(await page.locator('#home-action').innerText(),'Other screen');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('localeats_start_interactive_tour')));
  await page.getByText('Active Screen Guide',{exact:true}).waitFor();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('localeats_restart_tour')));
  await page.getByRole('heading',{name:'Discover Local Food',exact:true}).waitFor();
  assert.equal(await page.getByText('Active Screen Guide',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Skip Tour',exact:true}).click();
  await page.waitForTimeout(4000);
  assert.equal(await page.getByRole('dialog',{name:'Pickup app guide'}).count(),0);
  // Corrupt stored choices must offer recovery instead of hiding every prompt.
  await page.evaluate(()=>localStorage.setItem('localeats_cookie_preferences','{invalid'));
  await page.reload();await page.locator('#cookie-consent-banner').waitFor();
  await page.getByRole('button',{name:'Essential Only',exact:true}).click();
  results.push({width,height,reducedMotion,passed:true});await context.close();
 }
 await writeFile(path.join(artifacts,'startup-ui-result.json'),JSON.stringify({passed:true,at:new Date().toISOString(),results,scope:'Actual startup components in isolated local browser harness; all external requests blocked.'},null,2));
 console.log('STARTUP_UI_CHECK_PASSED');
}catch(error){console.error(error);process.exitCode=1;}finally{await browser?.close();await server.close();}
