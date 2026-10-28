/** Explicit capability boundary for trusted host games. */
export function createHostAdapter({id,capabilities=[],readStatus=()=>({}),requestAction=()=>false}={}){
 if(typeof id!=='string'||!/^[a-z0-9-]{1,64}$/.test(id))throw Error('Invalid host ID');
 if(!Array.isArray(capabilities)||capabilities.some(x=>typeof x!=='string'||!/^[a-z0-9-]{1,64}$/.test(x)))throw Error('Invalid capabilities');
 if(typeof readStatus!=='function'||typeof requestAction!=='function')throw Error('Invalid host functions');
 const allowed=new Set(capabilities);
 return Object.freeze({
  id,capabilities:Object.freeze([...allowed]),
  readStatus(){const data=readStatus();return data&&typeof data==='object'?{...data}:{};},
  async request(action,payload={}){if(!allowed.has(action))throw Error('Capability not granted: '+action);return requestAction(action,payload);}
 });
}
export function mockBTMAdapter(){
 const demo={health:86,armor:42,energy:73,weapon:'Wake-Up Slap',objective:'Break the relays',ori:'ONLINE',simulated:true};
 return createHostAdapter({id:'btm-demo',capabilities:['scan'],readStatus:()=>({...demo}),requestAction:action=>action==='scan'});
}
