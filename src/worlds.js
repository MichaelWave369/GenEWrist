/** Only BTM has a verified destination; other entries are nonclickable placeholders. */
export const WORLDS=Object.freeze([
 {id:'btm',title:'Break the Matrix',category:'GAME',url:'https://michaelwave369.github.io/BTM/',subtitle:'First integration target'},
 {id:'infinite-porch',title:'Infinite Porch',category:'HOME',url:null,subtitle:'Planned home destination'},
 {id:'phios-xr',title:'PhiOS XR',category:'PORTAL',url:null,subtitle:'Planned application hub'},
 {id:'domistika-xr',title:'Domistika XR',category:'STUDIO',url:null,subtitle:'Planned builder'},
 {id:'spark',title:'Spark the Substrate',category:'WORLD',url:null,subtitle:'Planned experience'},
 {id:'lenz',title:'LENZ',category:'GAME',url:null,subtitle:'Planned adventure'},
 {id:'commons',title:'The Commons',category:'WORLD',url:null,subtitle:'Planned shared world'},
 {id:'pulse369',title:'Pulse369',category:'FITNESS',url:null,subtitle:'Planned VR fitness'}
]);
export function safeWorldUrl(value){
 if(typeof value!=='string'||value.length>2048)return null;
 try{const url=new URL(value);return url.protocol==='https:'&&Boolean(url.hostname)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function normalizeWorld(value){
 if(!value||typeof value!=='object'||typeof value.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(value.id))throw Error('Invalid world ID');
 if(typeof value.title!=='string'||!value.title.length||value.title.length>100)throw Error('Invalid title');
 const url=value.url==null?null:safeWorldUrl(value.url);
 if(value.url!=null&&!url)throw Error('Unsafe URL');
 return Object.freeze({id:value.id,title:value.title,category:String(value.category||'WORLD').slice(0,24),subtitle:String(value.subtitle||'').slice(0,140),url});
}
