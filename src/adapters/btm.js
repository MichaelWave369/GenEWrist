/**
 * Host integration template: BTM remains owner of all real gameplay state.
 * This is a contract, NOT a currently installed adapter in the BTM repository.
 */
import {createHostAdapter} from '../bridge.js';
const ALLOWED_STATUSES=['health','armor','energy','weapon','objective','ori'];
export function makeBTMAdapter({readSnapshot,requestScan=null}={}){
 if(typeof readSnapshot!=='function')throw TypeError('BTM readSnapshot callback required');
 const capabilities=typeof requestScan==='function'?['scan']:[];
 return createHostAdapter({
  id:'btm',
  capabilities,
  readStatus(){
   const raw=readSnapshot();
   if(!raw||typeof raw!=='object')return {};
   const out={};
   for(const key of ALLOWED_STATUSES){
    if(!(key in raw))continue;
    const value=raw[key];
    if(['health','armor','energy'].includes(key)){
     if(typeof value==='number'&&Number.isFinite(value))out[key]=Math.min(100,Math.max(0,value));
    }else if(typeof value==='string')out[key]=value.slice(0,120);
   }
   return out;
  },
  async requestAction(action,payload){
   if(action!=='scan'||!requestScan)throw Error('Action unavailable');
   return requestScan(payload);
  }
 });
}
