// Service Worker for Snatched It PWA
const CACHE_NAME = 'snatched-it-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/best-deals.html',
    '/trending-now.html',
    '/contact.html',
    '/login-signup.html',
    '/assets/css/style.css',
    '/assets/js/script.js',
    '/assets/js/main.js',
    '/assets/images/Snatched.jpg'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
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
            }
        )
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
        self.registration.showNotification('Snatched It - New Deals!', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/best-deals.html')
        );
    }
});
