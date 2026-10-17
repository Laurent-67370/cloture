// La clôture — service worker (jeu jouable hors ligne)
const CACHE='cloture-v2';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-192.png','./icon-maskable-512.png','./apple-touch-icon.png','./favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request, u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin) return; // API de classement : toujours en direct
  if(r.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('.html')){
    // réseau d'abord (mises à jour), cache si hors ligne
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',cp));}return res;})
      .catch(()=>caches.match('./index.html',{ignoreSearch:true})));
    return;
  }
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;})));
});
