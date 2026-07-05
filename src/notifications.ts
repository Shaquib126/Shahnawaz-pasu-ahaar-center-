// Helper to convert base64 VAPID public key to Uint8Array for PushManager subscription
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushSubscriptionResponse {
  success: boolean;
  subscription: any;
}

// Register service worker and subscribe to push notifications
export async function setupPushNotifications(userEmail?: string, userUid?: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications or Service Workers are not supported by this browser.');
    return null;
  }

  try {
    // 1. Register the Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    console.log('Service Worker registered successfully with scope:', registration.scope);

    // 2. Request Notification Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission was not granted by user.');
      return null;
    }

    // 3. Fetch VAPID public key from backend
    const vapidResponse = await fetch('/api/notifications/vapid-public-key');
    if (!vapidResponse.ok) {
      throw new Error('Failed to fetch VAPID public key from server');
    }
    const { publicKey } = await vapidResponse.json();
    if (!publicKey) {
      console.warn('VAPID public key not configured on server yet.');
      return null;
    }

    // 4. Subscribe the user via PushManager
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log('Successfully subscribed to Web Push:', subscription);

    // 5. Send subscription to server
    const subscribeResponse = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription,
        email: userEmail || null,
        firebaseUid: userUid || null
      })
    });

    if (!subscribeResponse.ok) {
      throw new Error('Failed to save subscription on server');
    }

    const data: PushSubscriptionResponse = await subscribeResponse.json();
    console.log('Saved push subscription on server:', data);
    return registration;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    return null;
  }
}

// Fallback: Trigger standard local notification directly via service worker message
export async function triggerLocalNotification(title: string, body: string, orderId?: string) {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        data: { orderId }
      });
    } else {
      // Direct browser notification fallback
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }
  } catch (error) {
    console.error('Error triggering local fallback notification:', error);
  }
}
