// YoriGram service worker: принимает push, даже когда приложение закрыто
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : {};
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(list => {
      if (list.some(c => c.visibilityState === 'visible')) return; // приложение открыто — не дублируем
      return self.registration.showNotification(d.title || 'YoriGram', {
        body: d.body || 'Новое сообщение',
        tag: 'chat' + d.chat,
        renotify: true,
        data: { chat: d.chat }
      });
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const chat = e.notification.data && e.notification.data.chat;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { c.postMessage({ chat }); return c.focus(); }
      return self.clients.openWindow('./#c' + chat);
    })
  );
});