const CACHE_NAME = 'veganizer-v13';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/veganizer_improved_logo.svg',
  '/veganizer_improved-180.png',
  '/veganizer_improved-192.png',
  '/veganizer_improved-512.png',
  '/veganizer_improved-512-maskable.png',
  '/veganizer_improved_og.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests with Network First strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets with Cache First strategy
  if (url.pathname.includes('.') || STATIC_CACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(response => {
            // Cache the response for future use
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // Handle navigation requests (SPA routes) with Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Fallback to cached root for SPA routing
          return caches.match('/');
        })
    );
    return;
  }
});

// Background sync for offline form submissions (future enhancement)
self.addEventListener('sync', event => {
  console.log('Background sync event:', event.tag);
  // Handle offline form submissions when connection is restored
});

// Push notification support (future enhancement)
self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  // Handle push notifications
});