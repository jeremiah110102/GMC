/**
 * SERVICE WORKER: Auto-Approval Background Sync
 * 
 * This Service Worker enables auto-approval to work even when:
 * - Browser is completely closed
 * - Tab is closed
 * - Computer is sleeping
 * 
 * File location: /public/auto-approval-worker.js
 * Registration: In your HTML or JS, add:
 *   navigator.serviceWorker.register('auto-approval-worker.js');
 * 
 * Note: Service Workers require HTTPS (except localhost)
 */

const CACHE_NAME = 'auto-approval-v1';
const CACHE_URLS = [
    '/',
    '/index.html',
    '/member-landing.html',
    '/admin-dashboard.html'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Auto-Approval Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Cache opened');
            return cache.addAll(CACHE_URLS).catch((error) => {
                console.log('[SW] Cache addAll failed (ok if offline):', error);
            });
        }).then(() => {
            console.log('[SW] Skipping waiting - activate immediately');
            return self.skipWaiting();
        })
    );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    
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
        }).then(() => {
            console.log('[SW] Taking control of clients');
            return self.clients.claim();
        })
    );
});

// ===== SYNC EVENT =====
// Triggered when device comes back online or periodically
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync event:', event.tag);
    
    if (event.tag === 'approval-sync') {
        event.waitUntil(
            syncAutoApprovals()
                .then(() => {
                    console.log('[SW] ✅ Sync completed successfully');
                })
                .catch((error) => {
                    console.error('[SW] ❌ Sync failed:', error);
                    // Retry sync
                    return Promise.reject(error);
                })
        );
    }
});

// ===== FETCH EVENT =====
// Intercept network requests
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if available
                if (response) {
                    return response;
                }

                // Otherwise fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Cache successful responses
                        if (!response || response.status !== 200 || response.type === 'error') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                        return response;
                    })
                    .catch(() => {
                        // Return offline page if available
                        return caches.match(event.request)
                            .then((response) => {
                                return response || new Response(
                                    'Offline - please reconnect',
                                    { status: 503 }
                                );
                            });
                    });
            })
    );
});

// ===== PERIODIC BACKGROUND SYNC =====
// Runs periodically even when app is closed (if browser supports it)
if ('periodicSync' in self.registration) {
    self.addEventListener('periodicsync', (event) => {
        console.log('[SW] Periodic sync event:', event.tag);
        
        if (event.tag === 'approval-periodic') {
            event.waitUntil(
                syncAutoApprovals()
                    .then(() => {
                        console.log('[SW] ✅ Periodic sync completed');
                    })
                    .catch((error) => {
                        console.error('[SW] ❌ Periodic sync failed:', error);
                    })
            );
        }
    });
}

// ===== SYNC FUNCTION =====
async function syncAutoApprovals() {
    try {
        console.log('[SW] 🔄 Starting approval sync...');

        // Open IndexedDB to store pending approvals
        const db = await openApprovalDB();
        const pendingApprovals = await getPendingApprovals(db);

        console.log(`[SW] Found ${pendingApprovals.length} pending approvals`);

        // Try to sync each pending approval
        let syncedCount = 0;
        for (const approval of pendingApprovals) {
            try {
                const success = await syncApproval(approval);
                if (success) {
                    syncedCount++;
                    await removePendingApproval(db, approval.id);
                }
            } catch (error) {
                console.error(`[SW] Failed to sync approval ${approval.id}:`, error);
            }
        }

        console.log(`[SW] Synced ${syncedCount}/${pendingApprovals.length} approvals`);
        return { synced: syncedCount, total: pendingApprovals.length };

    } catch (error) {
        console.error('[SW] Sync error:', error);
        throw error;
    }
}

// ===== INDEXEDDB HELPERS =====
async function openApprovalDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AutoApprovalDB', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('pendingApprovals')) {
                db.createObjectStore('pendingApprovals', { keyPath: 'id' });
            }
        };
    });
}

async function getPendingApprovals(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingApprovals'], 'readonly');
        const store = transaction.objectStore('pendingApprovals');
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function removePendingApproval(db, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['pendingApprovals'], 'readwrite');
        const store = transaction.objectStore('pendingApprovals');
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// ===== SYNC APPROVAL FUNCTION =====
async function syncApproval(approval) {
    try {
        // Make API call to sync approval
        // This would typically call your backend
        const response = await fetch('/api/approve-prayer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(approval)
        });

        return response.ok;
    } catch (error) {
        console.error('[SW] Approval sync failed:', error);
        return false;
    }
}

// ===== MESSAGE HANDLING =====
// Handle messages from client
self.addEventListener('message', (event) => {
    console.log('[SW] Message from client:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_STATUS') {
        event.ports[0].postMessage({
            status: 'active',
            version: 'auto-approval-v1'
        });
    }

    if (event.data && event.data.type === 'SYNC_NOW') {
        syncAutoApprovals()
            .then((result) => {
                event.ports[0].postMessage({
                    status: 'success',
                    result: result
                });
            })
            .catch((error) => {
                event.ports[0].postMessage({
                    status: 'error',
                    error: error.message
                });
            });
    }
});

// ===== PUSH NOTIFICATIONS =====
// Handle push notifications (optional)
self.addEventListener('push', (event) => {
    if (!event.data) {
        console.log('[SW] Push received but no data');
        return;
    }

    try {
        const data = event.data.json();
        
        if (data.type === 'PRAYER_APPROVED') {
            event.waitUntil(
                self.registration.showNotification('Prayer Approved ✓', {
                    body: data.title,
                    icon: '/icon-192x192.png',
                    badge: '/badge-72x72.png',
                    tag: 'prayer-approval',
                    requireInteraction: false
                })
            );
        }
    } catch (error) {
        console.error('[SW] Push notification error:', error);
    }
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked');
    
    event.notification.close();
    
    // Open app when notification clicked
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if app is already open
            for (let client of clientList) {
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window if not open
            if (clients.openWindow) {
                return clients.openWindow('/admin-dashboard.html?section=prayerRequests');
            }
        })
    );
});

console.log('[SW] Auto-Approval Service Worker loaded');
