/**
 * Firebase Messaging Service Worker
 * Handles background push notifications for web browsers
 */

// Import Firebase scripts (compat version for service workers)
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase with your config
// These values should match your firebase.js config
firebase.initializeApp({
  apiKey: 'AIzaSyDgO_K3ORafU5mfzO_41b13SaozbEi98Yo',
  authDomain: 'dividela-76aba.firebaseapp.com',
  projectId: 'dividela-76aba',
  storageBucket: 'dividela-76aba.firebasestorage.app',
  messagingSenderId: '156140614030',
  appId: '1:156140614030:web:690820d7f6ac89510db4df',
});

const messaging = firebase.messaging();

/**
 * Handle background messages
 * Called when the app is in the background or closed
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const { title, body } = payload.notification || {};
  const data = payload.data || {};

  // Default notification options
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    tag: data.type || 'default',
    data: data,
    requireInteraction: true,
    actions: getNotificationActions(data.type),
  };

  // Show the notification
  return self.registration.showNotification(
    title || 'Dividela',
    notificationOptions
  );
});

/**
 * Get notification actions based on notification type
 */
function getNotificationActions(type) {
  switch (type) {
    case 'budgetAlert':
      return [
        { action: 'view', title: 'View Budget' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'expenseAdded':
      return [
        { action: 'view', title: 'View Expense' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'savingsMilestone':
      return [
        { action: 'view', title: 'View Goal' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    default:
      return [
        { action: 'view', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
  }
}

/**
 * Handle notification click events
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Determine target URL based on notification type
  switch (data.screen) {
    case 'BudgetDashboard':
      targetUrl = '/budget';
      break;
    case 'HomeTab':
      targetUrl = '/';
      break;
    case 'SavingsGoals':
      targetUrl = '/savings';
      break;
    default:
      targetUrl = '/';
  }

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if app is already open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Handle service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker installed');
  self.skipWaiting();
});

/**
 * Handle service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service worker activated');
  event.waitUntil(clients.claim());
});
