// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Listen for standard Push events from the server
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Order Update';
    const options = {
      body: payload.body || 'Your order status has changed.',
      icon: payload.icon || '/icon.png',
      badge: payload.badge || '/icon.png',
      data: payload.data || {},
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: payload.tag || 'order-status-update'
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error rendering push notification payload:', err);
    // Fallback text if not JSON
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Store Notification', {
        body: text,
        vibrate: [100, 50, 100]
      })
    );
  }
});

// 2. Listen for postMessage from the app (fallback/direct triggers)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, data } = event.data;
    const options = {
      body: body || 'Your order status has changed.',
      icon: '/icon.png',
      badge: '/icon.png',
      data: data || {},
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: 'order-status-update-fallback'
    };
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// 3. Handle notification click (focus tab or open link)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const orderId = event.notification.data ? event.notification.data.orderId : null;
  const targetUrl = orderId ? `${self.location.origin}/?orderId=${orderId}` : self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Find if there is already a window open with this origin
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
