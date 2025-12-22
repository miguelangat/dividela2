// src/config/firebase.js
// Firebase configuration and initialization

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Wrapper for AsyncStorage to handle type conversion
// Firebase Auth persistence may pass non-string values which AsyncStorage doesn't accept
const AsyncStorageWrapper = {
  async setItem(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return AsyncStorage.setItem(key, stringValue);
  },
  async getItem(key) {
    return AsyncStorage.getItem(key);
  },
  async removeItem(key) {
    return AsyncStorage.removeItem(key);
  },
};

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Debug: Log config (remove in production)
console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 10) + '...' : 'undefined'
});

// Check if all required fields are present
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error('Firebase configuration is incomplete!', firebaseConfig);
  throw new Error('Firebase configuration is missing. Check your .env file.');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with platform-specific persistence
// - Native: Use AsyncStorage wrapper for persistence (handles type conversion)
// - Web: Use getAuth which uses browser's default persistence
export const auth = Platform.OS !== 'web'
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorageWrapper),
    })
  : getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Export firebase config for service worker (web only)
export const firebaseConfigForSW = firebaseConfig;

console.log('Firebase initialized successfully');
console.log('Functions configured for region: us-central1');

export default app;
