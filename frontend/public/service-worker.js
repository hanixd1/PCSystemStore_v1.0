/* PCSystemStore service-worker retirement script.
 * Kept at this legacy filename so browsers update and remove old registrations.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name)))),
      self.clients.claim(),
    ])
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((windowClients) =>
        Promise.all(windowClients.map((client) => client.navigate(client.url))),
      ),
  );
});
