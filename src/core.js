import {RINGS,CATALOG} from './catalog.js';
import {DEFAULTS,loadPreferences,savePreferences,sanitizePreferences} from './storage.js';
import {WORLDS,normalizeWorld,safeWorldUrl} from './worlds.js';
export function createWrist({storage=null,worlds=WORLDS,host=null}={}){
 let preferences=loadPreferences(storage),activeApp=null,activeHost=host;
 const listeners=new Set(),worldMap=new Map(),apps=new Map(CATALOG.map(a=>[a.id,a]));
 for(const world of worlds){const record=normalizeWorld(world);if(worldMap.has(record.id))throw Error('Duplicate world');worldMap.set(record.id,record);}
 const snapshot=()=>({preferences:{...preferences,favorites:[...preferences.favorites],recent:[...preferences.recent]},activeApp,worlds:[...worldMap.values()],apps:[...apps.values()],hostId:activeHost?.id||null});
 const notify=()=>{for(const fn of [...listeners])fn(snapshot());};
 const persist=()=>{savePreferences(storage,preferences);notify();};
 return Object.freeze({
  snapshot,
  subscribe(fn){if(typeof fn!=='function')throw TypeError('Listener required');listeners.add(fn);return()=>listeners.delete(fn);},
  setRing(ring){if(!RINGS.some(x=>x.id===ring))throw Error('Unknown ring');preferences={...preferences,ring};persist();},
  setMode(mode){if(!['field','glance'].includes(mode))throw Error('Unknown mode');preferences={...preferences,mode};persist();},
  setTheme(theme){preferences=sanitizePreferences({...preferences,theme});persist();},
  setReducedMotion(value){preferences={...preferences,reducedMotion:Boolean(value)};persist();},
  openApp(id){if(!apps.has(id))throw Error('Unknown app');activeApp=id;preferences={...preferences,mode:'field'};persist();},
  closeApp(){activeApp=null;notify();},
  registerApp(value){
   if(!value||typeof value.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(value.id)||apps.has(value.id))throw Error('Invalid or duplicate app');
   if(!['outer','middle','inner'].includes(value.ring)||typeof value.title!=='string'||value.title.length<1||value.title.length>100)throw Error('Invalid app');
   const record=Object.freeze({id:value.id,title:value.title,ring:value.ring,status:'informational',description:String(value.description||'').slice(0,160),action:null});
   apps.set(record.id,record);notify();return record;
  },
  registerWorld(world){const v=normalizeWorld(world);if(worldMap.has(v.id))throw Error('Duplicate world');worldMap.set(v.id,v);notify();return v;},
  setHost(adapter){if(adapter!==null&&(!adapter||typeof adapter.readStatus!=='function'||typeof adapter.request!=='function'))throw Error('Invalid host');activeHost=adapter;notify();},
  readHostStatus(){return activeHost?activeHost.readStatus():null;},
  requestHostAction(action,payload){if(!activeHost)throw Error('No host connected');return activeHost.request(action,payload);},
  toggleFavorite(id){if(!worldMap.has(id))throw Error('Unknown world');const f=preferences.favorites;preferences={...preferences,favorites:f.includes(id)?f.filter(x=>x!==id):[...f,id]};persist();},
  getWorld(id){return worldMap.get(id)||null;},
  planLaunch(id){const world=worldMap.get(id);if(!world)throw Error('Unknown world');const url=safeWorldUrl(world.url);return url?Object.freeze({available:true,worldId:id,url,requiresSessionRestart:true,requiresConfirmation:true}):Object.freeze({available:false,worldId:id,reason:'No verified destination URL'});},
  markVisited(id){if(!worldMap.has(id))throw Error('Unknown world');preferences={...preferences,recent:[id,...preferences.recent.filter(x=>x!==id)].slice(0,10)};persist();},
  reset(){preferences={...DEFAULTS,favorites:[],recent:[]};activeApp=null;persist();}
 });
}
