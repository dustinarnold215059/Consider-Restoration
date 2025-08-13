// Service Worker for Christopher's Massage Therapy Website
// Provides offline functionality, caching, and PWA capabilities

const CACHE_NAME = 'massage-therapy-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/booking.html',
    '/admin.html',
    '/user-portal.html',
    '/css/style.css',
    '/js/main.js',
    '/js/booking.js',
    '/js/admin.js',
    '/js/user-portal.js',
    '/js/auth-security.js',
    '/js/api-client.js',
    '/js/modules/admin/dashboard.js',
    '/js/modules/booking/booking-system.js',
    '/images/favicon.ico',
    '/images/christopher-logo.png',
    '/manifest.json'
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/services',
    '/api/auth/me',
    '/api/appointments'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then(cache => {
                console.log('📦 Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            }),
            self.skipWaiting()
        ])
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    console.log('✅ Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => {
                            return cacheName !== STATIC_CACHE && 
                                   cacheName !== DYNAMIC_CACHE &&
                                   cacheName !== CACHE_NAME;
                        })
                        .map(cacheName => {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            }),
            self.clients.claim()
        ])
    );
});

// Fetch event - handle requests with caching strategy
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleAPIRequest(request));
        return;
    }

    // Handle static assets
    event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('🌐 Network failed, checking cache for:', url.pathname);
        
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('📦 Serving from cache:', url.pathname);
            return cachedResponse;
        }
        
        // Return offline response for specific endpoints
        return getOfflineResponse(url.pathname);
    }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fallback to network
        const networkResponse = await fetch(request);
        
        // Cache the response
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
        
        return networkResponse;
    } catch (error) {
        console.log('🌐 Network and cache failed for:', request.url);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/offline.html') || 
                   caches.match('/index.html');
        }
        
        throw error;
    }
}

// Generate offline responses for API endpoints
function getOfflineResponse(pathname) {
    const offlineData = {
        '/api/services': {
            success: true,
            data: [
                {
                    id: 1,
                    name: 'Swedish Massage',
                    duration: 60,
                    price: 80,
                    description: 'Relaxing full-body massage'
                },
                {
                    id: 2,
                    name: 'Deep Tissue Massage',
                    duration: 60,
                    price: 90,
                    description: 'Therapeutic massage'
                }
            ]
        },
        '/api/appointments': {
            success: true,
            data: JSON.parse(localStorage.getItem('pendingBookings') || '[]')
        }
    };

    const data = offlineData[pathname] || {
        success: false,
        error: 'Service unavailable offline',
        offline: true
    };

    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'X-Offline': 'true'
        }
    });
}

// Background sync for offline bookings
self.addEventListener('sync', event => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-bookings') {
        event.waitUntil(syncOfflineBookings());
    }
});

// Sync offline bookings when connection restored
async function syncOfflineBookings() {
    try {
        const pendingBookings = JSON.parse(
            localStorage.getItem('pendingBookings') || '[]'
        );

        for (const booking of pendingBookings) {
            try {
                const response = await fetch('/api/appointments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(booking)
                });

                if (response.ok) {
                    // Remove from pending bookings
                    const updatedBookings = pendingBookings.filter(
                        b => b.id !== booking.id
                    );
                    localStorage.setItem('pendingBookings', 
                        JSON.stringify(updatedBookings)
                    );
                    
                    console.log('✅ Synced offline booking:', booking.id);
                }
            } catch (error) {
                console.error('❌ Failed to sync booking:', error);
            }
        }
    } catch (error) {
        console.error('❌ Background sync failed:', error);
    }
}

// Push notification handling
self.addEventListener('push', event => {
    console.log('📱 Push notification received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'New appointment reminder',
        icon: '/images/christopher-logo.png',
        badge: '/images/favicon.ico',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'view',
                title: 'View Details',
                icon: '/images/view-icon.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/images/close-icon.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Christopher\'s Massage Therapy', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
    console.log('📱 Notification clicked:', event);
    
    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/user-portal.html')
        );
    }
});

// Message handling from main thread
self.addEventListener('message', event => {
    console.log('📨 Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_BOOKING') {
        // Cache booking data for offline access
        const booking = event.data.booking;
        const pendingBookings = JSON.parse(
            localStorage.getItem('pendingBookings') || '[]'
        );
        
        pendingBookings.push(booking);
        localStorage.setItem('pendingBookings', JSON.stringify(pendingBookings));
        
        // Register for background sync
        self.registration.sync.register('sync-bookings');
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    console.log('⏰ Periodic sync triggered:', event.tag);
    
    if (event.tag === 'update-appointments') {
        event.waitUntil(updateAppointmentCache());
    }
});

// Update appointment cache periodically
async function updateAppointmentCache() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        
        // Fetch fresh appointment data
        const response = await fetch('/api/appointments');
        if (response.ok) {
            await cache.put('/api/appointments', response.clone());
            console.log('📅 Appointment cache updated');
        }
    } catch (error) {
        console.error('❌ Failed to update appointment cache:', error);
    }
}

// Cache storage management
async function cleanupCache() {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    
    // Remove old entries (keep last 50)
    if (requests.length > 50) {
        const requestsToDelete = requests.slice(0, requests.length - 50);
        await Promise.all(
            requestsToDelete.map(request => cache.delete(request))
        );
        console.log('🧹 Cache cleanup completed');
    }
}

// Run cache cleanup periodically
setInterval(cleanupCache, 60 * 60 * 1000); // Every hour

console.log('🚀 Service Worker loaded successfully');