const CACHE_NAME = 'suitewaste-os-cache-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  // Add paths to your main JS/CSS bundles if they have stable names
  // Vite usually generates hashed names, so this is often handled by PWA plugins.
  // For a simple setup, we'll rely on the browser cache for versioned assets.
];
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL_URLS);
    })
  );
});
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  // For API calls, we'll use a network-first strategy.
  // This is a placeholder for a real sync API.
  if (event.request.url.includes('/api/sync')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ success: false, error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }
  // For app shell and other assets, use a cache-first strategy.
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'MANUAL_SYNC') {
        console.log('[SW] Manual sync triggered');
        const clientId = event.source.id;
        // Simulate a network sync process
        const syncProcess = new Promise(resolve => {
            setTimeout(() => {
                event.source.postMessage({ type: 'SYNC_PROGRESS', progress: 25 });
            }, 500);
            setTimeout(() => {
                event.source.postMessage({ type: 'SYNC_PROGRESS', progress: 75 });
            }, 1500);
            setTimeout(() => {
                resolve({ success: true, timestamp: new Date().toISOString() });
            }, 2500);
        });
        syncProcess.then(result => {
            event.source.postMessage({ type: 'SYNC_COMPLETE', result });
        });
    }
});