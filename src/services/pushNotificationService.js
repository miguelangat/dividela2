/**
 * Push Notification Service
 *
 * Unified service for handling push notifications across all platforms:
 * - iOS/Android: Uses expo-notifications
 * - Web: Uses Firebase Cloud Messaging (FCM)
 */

import { Platform } from 'react-native';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';

// Platform detection
const isWeb = Platform.OS === 'web';
const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

// Conditionally import expo-notifications for mobile
let Notifications = null;
let Device = null;
let Constants = null;

if (isMobile) {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants');
}

// Store for notification listeners
let notificationListener = null;
let responseListener = null;
let currentToken = null;

/**
 * Configure notification handler for mobile
 */
function configureMobileNotifications() {
  if (!isMobile || !Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Setup notification channel for Android 8.0+
 * This is required for notifications to appear on Android
 */
async function setupAndroidNotificationChannel() {
  if (Platform.OS !== 'android' || !Notifications) return;

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667eea',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Create a channel for expense notifications
    await Notifications.setNotificationChannelAsync('expenses', {
      name: 'Expenses',
      description: 'Notifications about new expenses and settlements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667eea',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Create a channel for budget alerts
    await Notifications.setNotificationChannelAsync('budget', {
      name: 'Budget Alerts',
      description: 'Notifications about budget limits and reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#667eea',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    console.log('[PushService] Android notification channels created');
  } catch (error) {
    console.error('[PushService] Error creating notification channels:', error);
  }
}

/**
 * Request notification permissions
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export async function requestPermissions() {
  if (isMobile && Notifications && Device) {
    // Mobile: Use expo-notifications
    if (!Device.isDevice) {
      console.warn('Push notifications require a physical device');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } else if (isWeb) {
    // Web: Use browser Notification API
    console.log('[PushService] Requesting web notification permission...');

    if (!('Notification' in window)) {
      console.warn('[PushService] This browser does not support notifications');
      return false;
    }

    console.log('[PushService] Current permission status:', Notification.permission);

    if (Notification.permission === 'granted') {
      console.log('[PushService] Permission already granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      console.log('[PushService] Requesting permission from user...');
      const permission = await Notification.requestPermission();
      console.log('[PushService] Permission response:', permission);
      return permission === 'granted';
    }

    console.log('[PushService] Permission was previously denied');
    return false;
  }

  return false;
}

/**
 * Get the current permission status
 * @returns {Promise<string>} 'granted', 'denied', or 'undetermined'
 */
export async function getPermissionStatus() {
  if (isMobile && Notifications) {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } else if (isWeb && 'Notification' in window) {
    const permission = Notification.permission;
    if (permission === 'default') return 'undetermined';
    return permission;
  }
  return 'undetermined';
}

/**
 * Get push notification token
 * @returns {Promise<string|null>} The push token or null if unavailable
 */
async function getPushToken() {
  if (isMobile && Notifications && Constants) {
    try {
      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return tokenData.data;
    } catch (error) {
      console.error('Error getting Expo push token:', error);
      return null;
    }
  } else if (isWeb) {
    try {
      console.log('[PushService] Getting FCM token for web...');

      // Dynamically import firebase messaging for web
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('../config/firebase');

      const messaging = getMessaging(app);
      console.log('[PushService] Firebase messaging initialized');

      // Get VAPID key from environment
      const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
      console.log('[PushService] VAPID key present:', !!vapidKey, vapidKey ? `(${vapidKey.substring(0, 10)}...)` : '');

      if (!vapidKey) {
        console.warn('[PushService] VAPID key not configured for web push notifications');
        return null;
      }

      // Register service worker
      console.log('[PushService] Registering service worker...');
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[PushService] Service worker registered:', registration.scope);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[PushService] Service worker ready');

      // Get FCM token
      console.log('[PushService] Getting FCM token...');
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      console.log('[PushService] FCM token obtained:', token ? `${token.substring(0, 20)}...` : 'null');

      return token;
    } catch (error) {
      console.error('[PushService] Error getting FCM token:', error);
      console.error('[PushService] Error details:', error.message, error.code);
      return null;
    }
  }

  return null;
}

/**
 * Register for push notifications and save token to Firestore
 * @param {string} userId - The user ID to register the token for
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function registerForPushNotifications(userId) {
  if (!userId) {
    return { success: false, error: 'User ID required' };
  }

  try {
    // Request permissions first
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return { success: false, error: 'Permission not granted' };
    }

    // Get the push token
    const token = await getPushToken();
    if (!token) {
      return { success: false, error: 'Failed to get push token' };
    }

    // Store token reference
    currentToken = token;

    // Determine platform
    const platform = Platform.OS;

    // Get device info
    let deviceInfo = null;
    if (isMobile && Device) {
      deviceInfo = `${Device.modelName || Device.deviceName || 'Unknown Device'}`;
    } else if (isWeb) {
      deviceInfo = navigator.userAgent.includes('Chrome') ? 'Chrome' :
                   navigator.userAgent.includes('Firefox') ? 'Firefox' :
                   navigator.userAgent.includes('Safari') ? 'Safari' :
                   navigator.userAgent.includes('Edge') ? 'Edge' : 'Web Browser';
    }

    // Call the cloud function to register the token
    const registerToken = httpsCallable(functions, 'registerPushToken');
    await registerToken({
      token,
      platform,
      deviceInfo,
    });

    console.log('Push notification token registered successfully');

    // Configure mobile notifications
    if (isMobile) {
      configureMobileNotifications();
      // Setup Android notification channels
      await setupAndroidNotificationChannel();
    }

    return { success: true, token };
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unregister push token (call on logout)
 * @param {string} userId - The user ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function unregisterPushToken(userId) {
  if (!currentToken) {
    return { success: true }; // No token to unregister
  }

  try {
    // Call the cloud function to unregister the token
    const unregisterToken = httpsCallable(functions, 'unregisterPushToken');
    await unregisterToken({ token: currentToken });

    console.log('Push notification token unregistered successfully');
    currentToken = null;

    return { success: true };
  } catch (error) {
    console.error('Error unregistering push token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Setup notification listeners
 * @param {Function} onNotification - Callback for when a notification is received
 * @param {Function} onNotificationResponse - Callback for when user interacts with notification
 */
export function setupNotificationListeners(onNotification, onNotificationResponse) {
  if (isMobile && Notifications) {
    // Mobile: Use expo-notifications listeners

    // Listener for notifications received while app is foregrounded
    notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      if (onNotification) {
        onNotification(notification);
      }
    });

    // Listener for when user taps on notification
    responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });
  } else if (isWeb) {
    // Web: Use Firebase messaging for foreground messages
    setupWebNotificationListener(onNotification);
  }
}

/**
 * Setup web notification listener for foreground messages
 */
async function setupWebNotificationListener(onNotification) {
  try {
    const { getMessaging, onMessage } = await import('firebase/messaging');
    const { default: app } = await import('../config/firebase');

    const messaging = getMessaging(app);

    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);

      // Show notification manually for foreground
      if (Notification.permission === 'granted') {
        const { title, body } = payload.notification || {};
        new Notification(title || 'Dividela', {
          body: body || 'You have a new notification',
          icon: '/icon-192.png',
          data: payload.data,
        });
      }

      if (onNotification) {
        onNotification(payload);
      }
    });
  } catch (error) {
    console.error('Error setting up web notification listener:', error);
  }
}

/**
 * Remove notification listeners
 */
export function removeNotificationListeners() {
  if (notificationListener) {
    // In newer expo-notifications versions, use .remove() on the subscription object
    if (typeof notificationListener.remove === 'function') {
      notificationListener.remove();
    }
    notificationListener = null;
  }
  if (responseListener) {
    // In newer expo-notifications versions, use .remove() on the subscription object
    if (typeof responseListener.remove === 'function') {
      responseListener.remove();
    }
    responseListener = null;
  }
}

/**
 * Handle navigation based on notification data
 * @param {Object} data - Notification data containing screen info
 * @param {Object} navigation - React Navigation object
 */
export function handleNotificationNavigation(data, navigation) {
  if (!data || !navigation) return;

  const { screen, type } = data;

  switch (screen) {
    case 'BudgetDashboard':
      navigation.navigate('BudgetTab', { screen: 'BudgetDashboard' });
      break;
    case 'HomeTab':
      navigation.navigate('HomeTab');
      break;
    case 'SavingsGoals':
      // Navigate to savings goals if that screen exists
      navigation.navigate('BudgetTab', { screen: 'SavingsGoals' });
      break;
    default:
      // Default to home
      navigation.navigate('HomeTab');
  }
}

/**
 * Get the current push token (if registered)
 * @returns {string|null} The current push token
 */
export function getCurrentToken() {
  return currentToken;
}

/**
 * Check if push notifications are supported on this device/browser
 * @returns {boolean}
 */
export function isPushNotificationSupported() {
  if (isMobile && Device) {
    return Device.isDevice;
  } else if (isWeb) {
    // Check basic support
    const hasNotificationAPI = 'Notification' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;

    // Check if this is iOS Safari (limited push support)
    const isIOSSafari =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !window.MSStream;

    // iOS Safari only supports push in PWA mode (added to home screen) as of iOS 16.4+
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          window.navigator.standalone === true;

    if (isIOSSafari && !isStandalone) {
      console.log('[PushService] iOS Safari detected - push only works when added to home screen (PWA mode)');
      // Still return true to show the UI, but the permission request will fail
    }

    console.log('[PushService] Support check:', {
      hasNotificationAPI,
      hasServiceWorker,
      isIOSSafari,
      isStandalone
    });

    return hasNotificationAPI && hasServiceWorker;
  }
  return false;
}

/**
 * Initialize push notifications (call during app startup)
 * Sets up notification channels on Android
 */
export async function initializePushNotifications() {
  if (Platform.OS === 'android' && Notifications) {
    await setupAndroidNotificationChannel();
    configureMobileNotifications();
    console.log('[PushService] Push notifications initialized for Android');
  } else if (Platform.OS === 'ios' && Notifications) {
    configureMobileNotifications();
    console.log('[PushService] Push notifications initialized for iOS');
  }
}

export default {
  requestPermissions,
  getPermissionStatus,
  registerForPushNotifications,
  unregisterPushToken,
  setupNotificationListeners,
  removeNotificationListeners,
  handleNotificationNavigation,
  getCurrentToken,
  isPushNotificationSupported,
  initializePushNotifications,
};
