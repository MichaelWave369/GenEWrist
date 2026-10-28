/** Canonical v2 GEN.E.WRIST registry. This is identity, not arbitrary executable plugins. */
export const RINGS=Object.freeze([
 {id:'outer',label:'IDENTITY',count:3,hint:'Who you are'},
 {id:'middle',label:'TOOLS',count:6,hint:'What you can do'},
 {id:'inner',label:'REFUGE',count:9,hint:'Play & decompress'}
]);
const item=(id,title,ring,description,status='planned',action=null)=>Object.freeze({id,title,ring,description,status,action});
export const CATALOG=Object.freeze([
 item('house','House Screen','outer','House sigil and fictional world profile.','informational'),
 item('sovereign-weave','Sovereign Weave','outer','Suit identity and cosmetic concept.','informational'),
 item('resonance-stats','R.E.S.O.N.A.N.C.E.','outer','Nine symbolic world statistics.','informational'),
 item('realm-atlas','Realm Atlas','middle','World directory and safe travel handoff.','interactive-demo','worlds'),
 item('loom-market','Loom Market','middle','Locally bundled application catalog.','interactive-demo','market'),
 item('snake-toolkit',"S.N.A.K.E.'s Toolkit",'middle','Machinist-inspired tools.','informational'),
 item('journey-log','JourneyLog','middle','Opt-in local journey memories.','planned'),
 item('tribewire','TribeWire','middle','In-world community board concept. No network.','planned'),
 item('sigl-designer','SIGL Designer','middle','Sketch a personal glyph locally.','interactive-demo','glyph'),
 item('aether-drift','Aether Drift','inner','Gentle visual play concept.','planned'),
 item('reflective-pools','Reflective Pools','inner','Reflective visual environment concept.','planned'),
 item('glowmotes','GlowMotes','inner','Colorful creature play concept.','planned'),
 item('skyfall-lanterns','Skyfall Lanterns','inner','Wish lantern worldbuilding concept.','planned'),
 item('laughter-forge','The Laughter Forge','inner','Original jokes and play.','informational'),
 item('temple-gardens','Temple Gardens','inner','Pattern gardening concept.','planned'),
 item('aether-compass','Aether Compass','inner','Fictional symbolic compass.','informational'),
 item('echo-critters','Echo Critters','inner','Companion sprites concept.','planned'),
 item('driftrocks','DriftRocks','inner','Nine stone balancing game.','interactive-demo','rocks')
]);
export const TOOLKIT=Object.freeze(['The Machinist’s Measure','The Aether Tuner','The Left-Hand Gauge','The Serpent Key','The Builder’s Level','The Etcher','The Echo Wrench']);
export const LOOM_CATEGORIES=Object.freeze(['Creation','Navigation','Lore','Community','Play / Well-Being','Fusion']);
export function ringItems(ring){return CATALOG.filter(x=>x.ring===ring);}
export function appById(id){return CATALOG.find(x=>x.id===id)||null;}
export function catalogValid(){return RINGS.every(x=>ringItems(x.id).length===x.count)&&new Set(CATALOG.map(x=>x.id)).size===18;}
