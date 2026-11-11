'use strict';
// Cache only the shipped app icon assets. HTML, emulator requests and all guest
// memory remain uncached; boot always requires a network connection.
const CACHE='losethos-icons-v1';
const ASSETS=['/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('losethos-icons-')&&name!==CACHE).map(name=>caches.delete(name))))));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method==='GET'&&url.origin===self.location.origin&&!url.search&&ASSETS.includes(url.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
