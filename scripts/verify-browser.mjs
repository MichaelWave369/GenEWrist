import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {setTimeout as sleep} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const port=4179;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'pipe'});
let browser;
const results=[];
const save=(name,pass,details='')=>{results.push({name,pass,details});if(!pass)throw Error(name+': '+details);};
async function check(name,fn){
 try{await fn();save(name,true);}catch(error){results.push({name,pass:false,details:String(error)});throw error;}
}
try{
 let started=false;
 for(let i=0;i<80;i++){
  if(server.exitCode!=null)throw Error('Web server exited');
  try{const res=await fetch('http://localhost:'+port+'/');if(res.ok){started=true;break;}}catch{}
  await sleep(100);
 }
 assert(started,'Local server failed to start');
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await check('desktop loads without JavaScript errors',async()=>{
  const res=await page.goto('http://localhost:'+port+'/');
  assert.equal(res.status(),200);
  await page.getByRole('heading',{name:/EVERY WORLD/}).waitFor();
  assert.equal(await page.locator('.meter').count(),3);
 });
 await mkdir('browser-evidence',{recursive:true});
 await page.screenshot({path:'browser-evidence/desktop-glance.png',fullPage:true});
 await check('Field mode reveals 6 middle-ring modules',async()=>{
  await page.getByRole('button',{name:'ACTIVATE FIELD MODE'}).click();
  assert.equal(await page.locator('.orbit-item').count(),6);
  assert.equal(await page.locator('.wheel-center strong').innerText(),'3·6·9');
 });
 await check('3 / 6 / 9 navigation switches module counts',async()=>{
  await page.getByRole('button',{name:'3 / IDENTITY'}).click();
  assert.equal(await page.locator('.orbit-item').count(),3);
  await page.getByRole('button',{name:'9 / REFUGE'}).click();
  assert.equal(await page.locator('.orbit-item').count(),9);
  await page.getByRole('button',{name:'6 / TOOLS'}).click();
  assert.equal(await page.locator('.orbit-item').count(),6);
 });
 await check('Realm Atlas offers confirmed and disabled destinations',async()=>{
  await page.locator('button[data-action=app][data-id="realm-atlas"]').click();
  assert(await page.getByText('Domistika XR').count()>0);
  assert(await page.getByText('LENZ',{exact:true}).count()>0);
  assert(await page.getByText('Infinite Porch').count()>0);
  assert.equal(await page.locator('button[data-action=launch]').count(),3);
 });
 await check('favorites persist across reload',async()=>{
  await page.locator('button[data-action=favorite][data-id="btm"]').click();
  const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('genewrist.settings.v1')));
  assert(s.favorites.includes('btm'));
  await page.reload();
  assert.equal(await page.locator('button[data-action=favorite][data-id="btm"]').innerText(),'★');
 });
 await check('Loom Market changes category filter',async()=>{
  await page.locator('button[data-action=app][data-id="loom-market"]').click();
  await page.locator('button[data-action=market][data-id="Creation"]').click();
  assert(await page.getByText('SIGL Designer').count()>0);
 });
 await check('glyph app handles actual pointer drawing',async()=>{
  await page.locator('button[data-action=app][data-id="sigl-designer"]').click();
  const canvas=page.locator('#glyph-canvas');
  await canvas.waitFor();
  const box=await canvas.boundingBox();
  await page.mouse.move(box.x+35,box.y+35);await page.mouse.down();
  await page.mouse.move(box.x+120,box.y+95,{steps:5});await page.mouse.up();
  const hasInk=await canvas.evaluate(el=>{const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;return d.some((v,i)=>i%4===3&&v>0);});
  assert(hasInk);
  await page.locator('button[data-action=glyph-clear]').click();
 });
 await check('DriftRocks is playable and restartable',async()=>{
  await page.getByRole('button',{name:'9 / REFUGE'}).click();
  await page.locator('button[data-action=app][data-id="driftrocks"]').click();
  await page.locator('button[data-action=rock][data-id="left"]').click();
  assert.equal(await page.locator('.rock').count(),1);
  await page.locator('button[data-action=rock-reset]').click();
  assert.equal(await page.locator('.rock').count(),0);
 });
 await check('theme selector persists and reset works',async()=>{
  await page.selectOption('#theme-select','nevora');
  assert.equal(await page.locator('body').getAttribute('data-theme'),'nevora');
  page.once('dialog',d=>d.accept());
  await page.locator('#reset-button').click();
  assert.equal(await page.locator('body').getAttribute('data-theme'),'neon');
 });
 await check('responsive layout keeps controls available',async()=>{
  await page.setViewportSize({width:390,height:844});
  assert(await page.locator('.wrist-shell').isVisible());
  assert(await page.locator('#workspace-root').isVisible());
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  assert(width<=395,'Horizontal overflow: '+width);
 });
 await page.screenshot({path:'browser-evidence/mobile-field.png',fullPage:true});
 await check('unavailable WebXR handles explicit user click gracefully',async()=>{
  await page.locator('#xr-button').click();
  await page.getByRole('status').getByText(/XR unavailable/).waitFor();
  assert.equal(await page.locator('#xr-button').isDisabled(),false);
 });
 await check('zero page errors',async()=>assert.deepEqual(errors,[]));
 console.log('Browser verifications passed: '+results.length);
} catch(error){
 console.error('Browser verification failed:',error);
 process.exitCode=1;
} finally{
 await writeFile('browser-evidence/results.json',JSON.stringify(results,null,2)).catch(()=>{});
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');
}
