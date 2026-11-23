/* Sketch Battle host PWA shell: pairing and scan transfer still require online access. */
const CACHE="sketch-battle-phone-v04";
const SHELL=["./phone.html","./phone.webmanifest","./icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("sketch-battle-phone-")&&key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=="GET"||url.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok&&SHELL.some(path=>url.pathname.endsWith(path.slice(1)))){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match(event.request)));
});