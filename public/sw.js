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
  const url = new URL(event.request.url);
  
  // Only handle requests from our own origin and http(s) schemes
  if (event.request.method !== 'GET' || 
      !['http:', 'https:'].includes(url.protocol) ||
      !url.origin.includes(self.location.origin)) {
    return;
  }

  // Don't cache API calls
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses for static assets from our origin
        if (response.ok && 
            url.origin === self.location.origin && 
            url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|json|webmanifest)$/)) {
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

// Handle push notifications
self.addEventListener('push', async (event) => {
  // Check if we have permission first
  const hasPermission = await self.registration.pushManager.permissionState({ userVisibleOnly: true });
  
  if (hasPermission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  const options = {
    body: event.data?.text() ?? 'New update available',
    icon: '/android-chrome-192x192.png',
    badge: '/maskable_icon.png'
  };

  event.waitUntil(
    self.registration.showNotification('GiftHub', options)
  );
});
