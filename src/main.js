import {createWrist} from './core.js';
import {RINGS,CATALOG,TOOLKIT,LOOM_CATEGORIES,ringItems} from './catalog.js';
import {mockBTMAdapter} from './bridge.js';
import {launchExperimentalXR} from './xr.js';
const localStore=(()=>{try{return window.localStorage;}catch{return null;}})();
const wrist=createWrist({storage:localStore,host:mockBTMAdapter()});
const display=document.querySelector('#wrist-root'),workspace=document.querySelector('#workspace-root'),notice=document.querySelector('#notice'),themeSelect=document.querySelector('#theme-select');
let rocks=[],rockWon=false,marketCategory='All',xrController=null,noticeTimer=null;
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const appButton=(action,id,label,extra='')=>'<button type="button" '+(extra||'')+' data-action="'+action+'" data-id="'+escapeHTML(id)+'">'+escapeHTML(label)+'</button>';
function announce(message){notice.textContent=message;notice.classList.add('active');if(noticeTimer)clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.classList.remove('active'),4000);}
function glanceHTML(s){
 const stats=wrist.readHostStatus()||{};
 const reading=[['HEALTH',stats.health??0],['ARMOR',stats.armor??0],['ENERGY',stats.energy??0]];
 return '<div class="glance"><div class="glance-mark" aria-hidden="true">Φ</div><p class="glance-title">FIELDLINK / STANDBY</p><p class="glance-sub">BTM DEMO SIGNAL · SIMULATED</p><div class="meters">'+reading.map(([label,num])=>'<div class="meter"><label>'+escapeHTML(label)+'</label><strong>'+escapeHTML(num)+'%</strong></div>').join('')+'</div><div class="glance-foot"><button class="button" data-action="mode" data-id="field">ACTIVATE FIELD MODE</button><p>Raise wrist in a future host integration</p></div></div>';
}
function fieldHTML(s){
 const apps=ringItems(s.preferences.ring),active=s.activeApp,ring=RINGS.find(r=>r.id===s.preferences.ring);
 const tabs=RINGS.map(r=>'<button class="tab'+(r.id===ring.id?' active':'')+'" data-action="ring" data-id="'+r.id+'" aria-pressed="'+(r.id===ring.id)+'">'+r.count+' / '+r.label+'</button>').join('');
 const nodes=apps.map((app,index)=>'<button class="orbit-item'+(active===app.id?' active':'')+'" style="--angle:'+(index*360/apps.length)+'deg" data-action="app" data-id="'+app.id+'" aria-label="'+escapeHTML(app.title)+'" title="'+escapeHTML(app.title)+'"><b>'+(index+1)+'</b><small>'+escapeHTML(app.title.length>10?app.title.slice(0,9)+'…':app.title)+'</small></button>').join('');
 const selected=CATALOG.find(x=>x.id===active);
 return '<div class="field"><div class="tabs" role="group" aria-label="Gen.E.Wrist rings">'+tabs+'</div><div class="wheel" role="group" aria-label="'+escapeHTML(ring.label)+' ring">'+nodes+'<div class="wheel-center"><strong>3·6·9</strong><small>'+escapeHTML(ring.label)+'</small></div></div><div class="selection"><strong>'+escapeHTML(selected?.title||ring.hint)+'</strong><small>'+escapeHTML(selected?.description||'Choose a module around the ring.')+'</small></div></div>';
}
function renderWrist(s){
 display.innerHTML='<div class="device-head"><div><b>GEN.E / '+(s.preferences.mode==='field'?'FIELD':'GLANCE')+'</b><div class="tiny">SYSTEM STATUS · LOCAL</div></div>'+appButton('mode',s.preferences.mode==='field'?'glance':'field',s.preferences.mode==='field'?'MINIMIZE':'EXPAND','class="mode-button"')+'</div>'+(s.preferences.mode==='glance'?glanceHTML(s):fieldHTML(s));
}
function summaryHTML(){
 return '<p class="section-caption">READY FOR WORLDS</p><p class="work-description">The same wrist, shared across every connected experience. Start with the Realm Atlas or inspect the original modular apps.</p><div class="work-buttons">'+appButton('app','realm-atlas','WORLD DIRECTORY','class="chip"')+appButton('app','loom-market','LOOM MARKET','class="chip"')+'</div><p class="section-caption">BTM SAMPLE ADAPTER</p><p class="work-description">Health 86 · Armor 42 · Energy 73 · Ori online. These values are simulated and are not live readings from BTM.</p><p class="section-caption">CURRENT STATUS</p><p class="work-description">The foundation runs independently. World transitions require confirmation; integrated host controls are the next milestone.</p>';
}
function worldsHTML(s){
 const list=[...s.worlds].sort((a,b)=>Number(s.preferences.favorites.includes(b.id))-Number(s.preferences.favorites.includes(a.id)));
 return '<p class="section-caption">REALM ATLAS / WORLD DIRECTORY</p><p class="work-description">External travel leaves this website and starts a new session. Only confirmed destinations can launch.</p><div class="work-grid">'+list.map(w=>{
  const favorite=s.preferences.favorites.includes(w.id),enabled=Boolean(w.url);
  return '<div class="world-card"><div><strong>'+escapeHTML(w.title)+'</strong><small>'+escapeHTML(w.category)+' · '+escapeHTML(w.subtitle)+'</small></div><div class="world-controls">'+appButton('favorite',w.id,favorite?'★':'☆','class="icon-button'+(favorite?' fav':'')+'" aria-label="'+(favorite?'Remove favorite':'Add favorite')+'"')+(enabled?appButton('launch',w.id,'OPEN'): '<span class="status-pill">PLANNED</span>')+'</div></div>';
 }).join('')+'</div>';
}
function marketHTML(s){
 const categoryApps={
  'Creation':['sigl-designer','temple-gardens','snake-toolkit'],
  'Navigation':['realm-atlas','aether-compass'],
  'Lore':['house','resonance-stats','sovereign-weave','journey-log'],
  'Community':['tribewire'],
  'Play / Well-Being':['aether-drift','reflective-pools','glowmotes','skyfall-lanterns','laughter-forge','echo-critters','driftrocks'],
  'Fusion':['loom-market','snake-toolkit','sovereign-weave']
 };
 const ids=marketCategory==='All'?s.apps.map(a=>a.id):categoryApps[marketCategory]||[];
 const selected=s.apps.filter(a=>ids.includes(a.id));
 return '<p class="section-caption">LOOM MARKET / LOCAL CATALOG</p><p class="work-description">No downloads, remote code or purchases. Modules are bundled, informational or planned.</p><div class="work-buttons">'+['All',...LOOM_CATEGORIES].map(c=>appButton('market',c,c,'class="chip'+(marketCategory===c?' active':'')+'"')).join('')+'</div><div class="work-grid">'+selected.map(a=>'<div class="catalog-card"><div><strong>'+escapeHTML(a.title)+'</strong><small>'+escapeHTML(a.description)+'</small></div><span class="status-pill'+(a.status==='interactive-demo'?' live':'')+'">'+escapeHTML(a.status==='interactive-demo'?'DEMO':a.status.toUpperCase())+'</span></div>').join('')+'</div>';
}
function glyphHTML(){
 return '<p class="section-caption">SIGL DESIGNER / LOCAL GLYPH PAD</p><p class="work-description">Draw your own mark. Artwork stays in this browser session unless you deliberately export it.</p><canvas id="glyph-canvas" class="glyph-canvas" width="640" height="340" tabindex="0" aria-label="Draw a personal glyph with mouse, touch or stylus"></canvas><div class="work-buttons">'+appButton('glyph-clear','clear','CLEAR','class="chip"')+appButton('glyph-export','export','EXPORT PNG','class="chip"')+'</div><p class="dim">Pointer drawing demo; no handwriting or biometric data is captured or transmitted.</p>';
}
function rocksHTML(){
 const widths=rocks.map((x,i)=>95-i*7+(x==='left'?-6:6));
 return '<p class="section-caption">DRIFTROCKS / NINE STONES</p><p class="work-description">Stack nine stones. Alternate your placement to keep the tower balanced. Lean too far to one side and it topples!</p><div class="rock-stack">'+widths.map(x=>'<div class="rock" style="width:'+Math.max(30,x)+'%"></div>').join('')+'</div><p class="count">'+rocks.length+' / 9 '+(rockWon?'· TOWER COMPLETE':'')+'</p><div class="work-buttons">'+appButton('rock','left','PLACE LEFT','class="chip"')+appButton('rock','right','PLACE RIGHT','class="chip"')+appButton('rock-reset','reset','RESTART','class="chip"')+'</div><p class="dim">A playful miniature, not a mood assessment or treatment.</p>';
}
function toolkitHTML(){
 return '<p class="section-caption">S.N.A.K.E. / ORIGINAL TOOLKIT</p><p class="work-description">Machinist-inspired tools from the original Gen.E.Wrist specification. Symbolic application concepts, not real precision instruments.</p><div class="work-grid">'+TOOLKIT.map(t=>'<div class="catalog-card"><strong>'+escapeHTML(t)+'</strong><span class="status-pill">CONCEPT</span></div>').join('')+'</div>';
}
function informationalHTML(a){
 const text=a.id==='laughter-forge'?'The machinist asked the gear for its opinion. It said it needed a little time to turn things over.':a.description;
 return '<p class="section-caption">'+escapeHTML(a.title.toUpperCase())+'</p><p class="work-description">'+escapeHTML(text)+'</p><p class="status-pill">HISTORICAL CONCEPT / '+escapeHTML(a.status.toUpperCase())+'</p><p class="dim">This module is part of the source design. Additional functionality has not yet been built.</p>';
}
function renderWorkspace(s){
 const selected=s.apps.find(a=>a.id===s.activeApp);
 let html=summaryHTML();
 if(selected){
  if(selected.action==='worlds')html=worldsHTML(s);
  else if(selected.action==='market')html=marketHTML(s);
  else if(selected.action==='glyph')html=glyphHTML();
  else if(selected.action==='rocks')html=rocksHTML();
  else if(selected.id==='snake-toolkit')html=toolkitHTML();
  else html=informationalHTML(selected);
  html='<div class="work-buttons">'+appButton('close-app','close','← ALL MODULES','class="chip"')+'</div>'+html;
 }
 workspace.innerHTML=html;
 if(selected?.action==='glyph')setupGlyph();
}
function render(){
 const s=wrist.snapshot();
 document.body.dataset.theme=s.preferences.theme;document.body.classList.toggle('reduced-motion',s.preferences.reducedMotion);
 themeSelect.value=s.preferences.theme;
 renderWrist(s);renderWorkspace(s);
}
function setupGlyph(){
 const canvas=document.querySelector('#glyph-canvas');if(!canvas)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.strokeStyle='#52efea';ctx.lineWidth=4;ctx.lineJoin='round';ctx.lineCap='round';let drawing=false;
 const pos=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};};
 canvas.addEventListener('pointerdown',e=>{drawing=true;canvas.setPointerCapture(e.pointerId);const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.01,p.y+.01);ctx.stroke();});
 canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();});
 const finish=()=>{drawing=false;ctx.beginPath();};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
}
async function launchWorld(id){
 const plan=wrist.planLaunch(id);
 if(!plan.available){announce(plan.reason);return;}
 if(!window.confirm('Leave GEN.E.WRIST and open this external world? Your current session will end.'))return;
 try{if(xrController){await xrController.end();xrController=null;}}catch{}
 wrist.markVisited(id);
 window.location.assign(plan.url);
}
document.addEventListener('click',async e=>{
 const btn=e.target.closest('button[data-action]');if(!btn)return;
 const {action,id}=btn.dataset;
 try{
  switch(action){
   case 'mode':wrist.setMode(id);break;
   case 'ring':wrist.setRing(id);wrist.setMode('field');break;
   case 'app':wrist.openApp(id);break;
   case 'close-app':wrist.closeApp();break;
   case 'favorite':wrist.toggleFavorite(id);break;
   case 'launch':await launchWorld(id);break;
   case 'market':marketCategory=id;render();break;
   case 'glyph-clear':{const c=document.querySelector('#glyph-canvas');c?.getContext('2d')?.clearRect(0,0,c.width,c.height);break;}
   case 'glyph-export':{const c=document.querySelector('#glyph-canvas');if(c){const a=document.createElement('a');a.download='genewrist-sigl.png';a.href=c.toDataURL('image/png');a.click();announce('SIGL exported locally');}break;}
   case 'rock':{if(rockWon)break;rocks.push(id);const balance=rocks.reduce((n,x)=>n+(x==='left'?-1:1),0);if(Math.abs(balance)>2){rocks=[];announce('The tower toppled! Try alternating sides.');}else if(rocks.length>=9){rockWon=true;announce('Nine stones balanced!');}render();break;}
   case 'rock-reset':rocks=[];rockWon=false;render();break;
  }
 }catch(error){announce('Action unavailable: '+error.message);}
});
themeSelect.addEventListener('change',e=>wrist.setTheme(e.target.value));
document.querySelector('#reset-button').addEventListener('click',()=>{if(window.confirm('Reset Gen.E.Wrist preferences and favorites on this browser?')){wrist.reset();rocks=[];rockWon=false;marketCategory='All';announce('Local preferences reset.');}});
document.querySelector('#xr-button').addEventListener('click',async()=>{
 const button=document.querySelector('#xr-button');
 if(xrController){await xrController.end();xrController=null;button.textContent='ENTER XR ◉';return;}
 try{
  button.disabled=true;
  xrController=await launchExperimentalXR({readState:()=>wrist.snapshot(),onEnd:()=>{xrController=null;button.textContent='ENTER XR ◉';announce('XR session ended.');}});
  button.textContent='EXIT XR ×';
 }catch(error){announce('XR unavailable: '+error.message);}
 finally{button.disabled=false;}
});
wrist.subscribe(render);
render();
