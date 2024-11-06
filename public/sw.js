const CACHE_NAME = 'gifthub-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/maskable_icon.png',
  '/site.webmanifest'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
      self.skipWaiting()
    ])
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      self.clients.claim() // Take control of all clients immediately
    ])
  );
});

// Fetch event with network-first strategy for dynamic content
self.addEventListener('fetch', (event) => {
  // Don't cache API calls or other dynamic requests
  if (event.request.url.includes('/api/') || 
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && event.request.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|json|webmanifest)$/)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If the request is for a page navigation, return the offline page
        if (event.request.mode === 'navigate') {
          const offlineResponse = await caches.match('/offline.html');
          if (offlineResponse) {
            return offlineResponse;
          }
        }
        
        return new Response('Network error happened', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

// Handle push notifications (optional)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() ?? 'New update available',
    icon: '/android-chrome-192x192.png',
    badge: '/maskable_icon.png'
  };

  event.waitUntil(
    self.registration.showNotification('GiftHub', options)
  );
});
