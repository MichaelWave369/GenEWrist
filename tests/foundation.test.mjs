import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,RINGS,TOOLKIT,catalogValid,ringItems} from '../src/catalog.js';
import {createWrist} from '../src/core.js';
import {createHostAdapter,mockBTMAdapter} from '../src/bridge.js';
import {safeWorldUrl,normalizeWorld} from '../src/worlds.js';
import {sanitizePreferences,loadPreferences,STORAGE_KEY} from '../src/storage.js';
const store=()=>{const items=new Map();return {getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v),removeItem:k=>items.delete(k)};};
test('3-6-9 rings retain exactly eighteen canonical modules',()=>{
 assert.equal(catalogValid(),true);assert.deepEqual(RINGS.map(x=>ringItems(x.id).length),[3,6,9]);assert.equal(CATALOG.length,18);assert.equal(TOOLKIT.length,7);
});
test('untrusted preference values are sanitized',()=>{
 const p=sanitizePreferences({theme:'../evil',ring:'evil',mode:'hack',favorites:['btm','btm',{},'<bad>'],reducedMotion:'true'});
 assert.equal(p.theme,'neon');assert.equal(p.ring,'middle');assert.equal(p.mode,'glance');assert.deepEqual(p.favorites,['btm']);assert.equal(p.reducedMotion,false);
});
test('broken and unavailable storage fails safely',()=>{
 const s={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const w=createWrist({storage:s});w.setMode('field');assert.equal(w.snapshot().preferences.mode,'field');assert.equal(loadPreferences(s).mode,'glance');
});
test('glance, field, ring and app navigation works',()=>{
 const w=createWrist({storage:store()});w.setMode('field');w.setRing('inner');w.openApp('driftrocks');
 assert.equal(w.snapshot().activeApp,'driftrocks');assert.equal(w.snapshot().preferences.ring,'inner');w.closeApp();w.setMode('glance');assert.equal(w.snapshot().activeApp,null);
 assert.throws(()=>w.openApp('bogus'));assert.throws(()=>w.setRing('bogus'));
});
test('settings persist without persisting game content',()=>{
 const s=store();const a=createWrist({storage:s});a.setTheme('nevora');a.toggleFavorite('btm');a.markVisited('btm');
 assert.equal(createWrist({storage:s}).snapshot().preferences.theme,'nevora');assert.deepEqual(JSON.parse(s.getItem(STORAGE_KEY)).recent,['btm']);
});
test('unknown destination is unavailable and known BTM requires confirmation',()=>{
 const w=createWrist();assert.equal(w.planLaunch('infinite-porch').available,false);const launch=w.planLaunch('btm');assert.equal(launch.available,true);assert.equal(launch.requiresSessionRestart,true);assert.equal(launch.requiresConfirmation,true);
});
test('reject unsafe world URLs including protocol and credentials',()=>{
 assert.equal(safeWorldUrl('javascript:alert(1)'),null);assert.equal(safeWorldUrl('http://example.com'),null);assert.equal(safeWorldUrl('https://user:pass@example.com'),null);
 assert.throws(()=>normalizeWorld({id:'bad',title:'No',url:'data:text/html,abc'}));
});
test('world registration requires unique normalized identifiers',()=>{
 const w=createWrist();assert.throws(()=>w.registerWorld({id:'btm',title:'Duplicate',url:null}));assert.throws(()=>w.registerWorld({id:'Bad ID',title:'Unsafe',url:null}));
 const ok=w.registerWorld({id:'example',title:'Example',url:null});assert.equal(ok.id,'example');
});
test('host actions are explicit capability-gated operations',async()=>{
 const host=createHostAdapter({id:'demo',capabilities:['scan'],readStatus:()=>({number:2}),requestAction:()=>true});
 assert.equal(host.readStatus().number,2);assert.equal(await host.request('scan'),true);await assert.rejects(host.request('read-secrets'),/Capability/);
});
test('host status distinguishes the simulated demo',()=>{
 const w=createWrist({host:mockBTMAdapter()});assert.equal(w.readHostStatus().simulated,true);
});
test('runtime app registration is metadata-only and rejects duplicates',()=>{
 const w=createWrist();w.registerApp({id:'extra',title:'Extra',ring:'middle'});assert.equal(w.snapshot().apps.length,19);assert.throws(()=>w.registerApp({id:'extra',title:'again',ring:'middle'}));
});
test('subscription and reset do not leak state',()=>{
 const s=store(),w=createWrist({storage:s});let count=0;const stop=w.subscribe(()=>count++);
 w.setMode('field');stop();w.reset();assert.equal(count,1);assert.equal(w.snapshot().preferences.mode,'glance');
});
