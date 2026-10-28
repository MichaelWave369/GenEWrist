import test from 'node:test';
import assert from 'node:assert/strict';
import {computePanelModel} from '../src/xr-layout.js';
import {makeBTMAdapter} from '../src/adapters/btm.js';
const matrix=()=>Float32Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const viewer={transform:{matrix:matrix(),position:{x:0,y:1.6,z:0}}};
test('stereo panel uses readable real-scale dimensions',()=>{
 const value=computePanelModel(viewer,null);
 assert.equal(value.attachedToHand,false);
 assert(Math.abs(value.model[0]-.48)<1e-5);
 assert(Math.abs(value.model[5]-.27)<1e-5);
 assert(value.model[14]<-1);
});
test('hand adjacent presentation requires a visible comfortable controller pose',()=>{
 const front={transform:{position:{x:-.25,y:1.3,z:-.88}}};
 assert.equal(computePanelModel(viewer,front).attachedToHand,true);
 const behind={transform:{position:{x:-.25,y:1.3,z:.88}}};
 assert.equal(computePanelModel(viewer,behind).attachedToHand,false);
 const near={transform:{position:{x:-.1,y:1.55,z:-.2}}};
 assert.equal(computePanelModel(viewer,near).attachedToHand,false);
});
test('panel pose reuses provided output buffer',()=>{
 const output=new Float32Array(16);
 assert.equal(computePanelModel(viewer,null,output).model,output);
});
test('BTM adapter is explicit, read-only by default and filters game status',async()=>{
 const host=makeBTMAdapter({readSnapshot:()=>({health:200,energy:-3,weapon:'Arc',secret:'do not leak'})});
 assert.deepEqual(host.readStatus(),{health:100,energy:0,weapon:'Arc'});
 assert.deepEqual(host.capabilities,[]);
 await assert.rejects(host.request('scan'),/Capability/);
});
test('BTM adapter exposes opt-in scan capability',async()=>{
 const host=makeBTMAdapter({readSnapshot:()=>({ori:'ONLINE'}),requestScan:async()=>({found:2})});
 assert.equal((await host.request('scan')).found,2);
});
