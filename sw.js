// Service Worker for StyleLink Fashion PWA
const CACHE_NAME = 'stylelink-fashion-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/camera-wardrobe.html',
    '/contact.html',
    '/login-signup.html',
    '/assets/css/sleek-theme.css',
    '/assets/js/script.js',
    '/assets/js/main.js',
    '/assets/images/Snatched.jpg',
    '/assets/images/handbag.png',
    '/assets/images/athleticClothes.png',
    '/assets/images/athleticShoes.png',
    '/assets/images/suit.png',
    '/assets/images/suits.png',
    '/assets/images/summerDresses.png',
    '/assets/images/watches.png',
    '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('StyleLink: App resources cached successfully');
                return cache.addAll(urlsToCache);
            })
            .catch(function(error) {
                console.log('StyleLink: Cache installation failed:', error);
            })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
            .catch(function(error) {
                // Handle fetch errors gracefully
                console.log('Service Worker: Fetch failed for', event.request.url, error);
                
                // For navigation requests, return a fallback page
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
                
                // For other requests, just fail silently
                return new Response('Service Worker: Resource not available offline', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Push notification support
self.addEventListener('push', function(event) {
    const options = {
        body: event.data ? event.data.text() : 'New fashion deals available!',
        icon: '/assets/images/Snatched.jpg',
        badge: '/assets/images/Snatched.jpg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Deals',
                icon: '/assets/images/Snatched.jpg'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/assets/images/Snatched.jpg'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('StyleLink - Fashion Deals!', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/camera-wardrobe.html')
        );
    }
});
