// No page caching: new GitHub Pages deployments remain visible without stale app caches.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
  let data={};try{data=event.data?.json()||{};}catch{}
  const title=typeof data.title==='string'?data.title.slice(0,80):'모여';
  const body=typeof data.body==='string'?data.body.slice(0,200):'새 메시지가 도착했어요.';
  // Always display a visible notification, including when the page is open (Safari requirement).
  await self.registration.showNotification(title,{
   body,icon:new URL('./icons/icon-192.png',self.registration.scope).href,
   badge:new URL('./icons/badge-96.png',self.registration.scope).href,
   tag:'moyeo-'+(typeof data.id==='string'?data.id.slice(0,80):'message'),
   timestamp:typeof data.timestamp==='number'?data.timestamp:Date.now(),
   data:{url:self.registration.scope},renotify:false
  });
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{
  const target=new URL(self.registration.scope);
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clients){const u=new URL(client.url);if(u.origin===target.origin&&u.pathname.startsWith(target.pathname)){await client.focus();return;}}
  await self.clients.openWindow(target.href);
 })());
});
