/* Build replaces these constants with a content-hashed same-origin shell. */
const VERSION='__SHELL_VERSION__';
const FILES=__SHELL_FILES__;
const scope=new URL(self.registration.scope);
const prefix='genewrist-shell:'+scope.pathname+':';
const cacheName=prefix+VERSION;
const urls=FILES.map(file=>new URL(file,scope).href);
const allowed=new Set(urls);
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{const cache=await caches.open(cacheName);try{await cache.addAll(urls);}catch(error){await caches.delete(cacheName);throw error;}})());
 // Updates wait for old clients to close. Never mix versions under an open editor.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{const names=await caches.keys();await Promise.all(names.filter(name=>name.startsWith(prefix)&&name!==cacheName).map(name=>caches.delete(name)));await self.clients.claim();})());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==scope.origin||url.search)return;
 const rootNavigation=request.mode==='navigate'&&(url.pathname===scope.pathname||url.pathname===scope.pathname+'index.html');
 const target=rootNavigation?new URL('index.html',scope).href:url.href;
 if(!allowed.has(target))return;
 event.respondWith((async()=>{const cache=await caches.open(cacheName);const cached=await cache.match(target);return cached||fetch(request);})());
});
