const CACHE_NAME = 'flowia-v24.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './app.html',
  './app.js?v=24.0',
  './styles.css?v=24.0',
  './manifest.json',
  './favicon.png',
  './lily-logo.png',
  './lily-logo-sm.png'
];

// ── INSTALL: Cache all static assets & skip waiting immediately ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(e => console.warn('[SW] Failed to cache:', url, e))
        )
      );
    })
  );
});

// ── ACTIVATE: Delete ALL old caches & claim clients immediately ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Smart caching strategy ─────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // Strategy 1: Network-First for JS, CSS, HTML, and JSON (ALWAYS fetch latest code!)
  const isCodeOrApp = (
    url.pathname.match(/\.(js|css|html|json)$/) ||
    url.pathname === '/' ||
    url.pathname.endsWith('/')
  );

  if (isCodeOrApp) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then(cached => {
          return cached || caches.match('./app.html') || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Strategy 2: Cache-First for static media assets (png, jpg, fonts)
  const isStatic = (
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  );

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        }).catch(() => caches.match('./favicon.png'));
      })
    );
    return;
  }

  // Strategy 3: Stale-While-Revalidate for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => null);
      return cached || networkFetch;
    })
  );
});

// ── PUSH NOTIFICATIONS (future) ───────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'Flowia', {
    body: data.body || '',
    icon: './icon-192.png',
    badge: './icon-72.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || './' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || './'));
});
