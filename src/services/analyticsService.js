// analyticsService.js
// Centralized analytics service for Amplitude tracking
// Handles all user event tracking, feature usage, and funnel metrics

import * as amplitude from '@amplitude/analytics-react-native';
import * as Sentry from '@sentry/react-native';
import * as Crypto from 'expo-crypto';

// ============================================
// CONFIGURATION
// ============================================

const AMPLITUDE_API_KEY = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY || 'YOUR_AMPLITUDE_KEY';
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const ENABLE_ANALYTICS = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS !== 'false';

// ============================================
// INITIALIZATION
// ============================================

let isInitialized = false;

/**
 * Initialize analytics services (Amplitude + Sentry)
 * Call this once at app startup
 */
export const initAnalytics = async () => {
  if (isInitialized) {
    console.log('[Analytics] Already initialized');
    return;
  }

  if (!ENABLE_ANALYTICS) {
    console.log('[Analytics] Analytics disabled via env variable');
    return;
  }

  try {
    // Initialize Amplitude
    if (AMPLITUDE_API_KEY && AMPLITUDE_API_KEY !== 'YOUR_AMPLITUDE_KEY') {
      await amplitude.init(AMPLITUDE_API_KEY, {
        trackingOptions: {
          ipAddress: false, // Privacy: Don't track IP
        },
        minIdLength: 1,
      });
      console.log('[Analytics] Amplitude initialized');
    } else {
      console.warn('[Analytics] Amplitude API key not configured - skipping initialization');
    }

    // Initialize Sentry
    if (SENTRY_DSN) {
      Sentry.init({
        dsn: SENTRY_DSN,
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000, // 30 seconds
        enableNative: true,
        tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
        beforeSend(event) {
          // Privacy: Remove PII from error events
          if (event.user) {
            delete event.user.email;
            delete event.user.ip_address;
          }
          return event;
        },
      });
      console.log('[Analytics] Sentry initialized');
    } else {
      console.warn('[Analytics] Sentry DSN not configured - skipping initialization');
    }

    isInitialized = true;
  } catch (error) {
    console.error('[Analytics] Initialization failed:', error);
  }
};

// ============================================
// PRIVACY UTILITIES
// ============================================

/**
 * Hash sensitive data (emails, IDs) for privacy
 * Uses SHA-256 to create anonymous but consistent identifiers
 */
const hashValue = async (value) => {
  if (!value) return null;
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      value.toString()
    );
    return hash;
  } catch (error) {
    console.error('[Analytics] Hash failed:', error);
    // Fallback to simple hash if crypto fails
    return value.toString().split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString(16);
  }
};

/**
 * Anonymize expense amount into ranges
 * Prevents tracking exact spending amounts
 */
const anonymizeAmount = (amount) => {
  const num = parseFloat(amount);
  if (num <= 10) return '0-10';
  if (num <= 50) return '11-50';
  if (num <= 100) return '51-100';
  if (num <= 500) return '101-500';
  if (num <= 1000) return '501-1000';
  return '1000+';
};

/**
 * Clean properties to remove PII before sending
 */
const sanitizeProperties = async (properties = {}) => {
  const cleaned = { ...properties };

  // Remove or hash sensitive fields
  if (cleaned.email) {
    cleaned.emailHash = await hashValue(cleaned.email);
    delete cleaned.email;
  }

  if (cleaned.userId) {
    cleaned.userIdHash = await hashValue(cleaned.userId);
    delete cleaned.userId;
  }

  if (cleaned.amount) {
    cleaned.amountRange = anonymizeAmount(cleaned.amount);
    delete cleaned.amount; // Never send exact amounts
  }

  // Remove any other potentially sensitive fields
  delete cleaned.password;
  delete cleaned.phoneNumber;
  delete cleaned.address;

  return cleaned;
};

// ============================================
// USER IDENTIFICATION
// ============================================

/**
 * Identify user in analytics platforms
 * @param {string} userId - Unique user ID
 * @param {object} userProperties - User attributes (will be sanitized)
 */
export const identifyUser = async (userId, userProperties = {}) => {
  if (!ENABLE_ANALYTICS || !isInitialized) return;

  try {
    const hashedUserId = await hashValue(userId);
    const sanitizedProps = await sanitizeProperties(userProperties);

    // Amplitude user identification
    const identifyEvent = new amplitude.Identify();
    Object.keys(sanitizedProps).forEach((key) => {
      identifyEvent.set(key, sanitizedProps[key]);
    });
    amplitude.identify(identifyEvent);
    amplitude.setUserId(hashedUserId);

    // Sentry user context
    Sentry.setUser({
      id: hashedUserId,
      ...sanitizedProps,
    });

    console.log('[Analytics] User identified:', hashedUserId);
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
    Sentry.captureException(error);
  }
};

/**
 * Clear user identification (logout)
 */
export const clearUser = () => {
  if (!ENABLE_ANALYTICS || !isInitialized) return;

  try {
    amplitude.setUserId(null);
    amplitude.reset();
    Sentry.setUser(null);
    console.log('[Analytics] User cleared');
  } catch (error) {
    console.error('[Analytics] Failed to clear user:', error);
  }
};

// ============================================
// EVENT TRACKING
// ============================================

/**
 * Track a custom event
 * @param {string} eventName - Name of the event
 * @param {object} properties - Event properties (will be sanitized)
 */
export const trackEvent = async (eventName, properties = {}) => {
  if (!ENABLE_ANALYTICS || !isInitialized) return;

  try {
    const sanitizedProps = await sanitizeProperties(properties);
    amplitude.track(eventName, sanitizedProps);
    console.log('[Analytics] Event tracked:', eventName, sanitizedProps);
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
    Sentry.captureException(error);
  }
};

/**
 * Track screen view
 * @param {string} screenName - Name of the screen
 * @param {object} properties - Additional properties
 */
export const trackScreen = async (screenName, properties = {}) => {
  if (!ENABLE_ANALYTICS || !isInitialized) return;

  try {
    const sanitizedProps = await sanitizeProperties(properties);
    amplitude.track('screen_viewed', {
      screen_name: screenName,
      ...sanitizedProps,
    });
    console.log('[Analytics] Screen viewed:', screenName);
  } catch (error) {
    console.error('[Analytics] Failed to track screen:', error);
  }
};

// ============================================
// ERROR TRACKING
// ============================================

/**
 * Track an error with Sentry
 * @param {Error} error - Error object
 * @param {object} context - Additional context
 */
export const trackError = async (error, context = {}) => {
  try {
    const sanitizedContext = await sanitizeProperties(context);

    Sentry.captureException(error, {
      contexts: {
        custom: sanitizedContext,
      },
    });

    // Also track as Amplitude event for visibility
    await trackEvent('error_occurred', {
      error_message: error.message,
      error_type: error.name,
      ...sanitizedContext,
    });

    console.error('[Analytics] Error tracked:', error.message);
  } catch (trackingError) {
    console.error('[Analytics] Failed to track error:', trackingError);
  }
};

/**
 * Set custom breadcrumb for error context
 */
export const addBreadcrumb = async (message, data = {}) => {
  try {
    const sanitizedData = await sanitizeProperties(data);
    Sentry.addBreadcrumb({
      message,
      data: sanitizedData,
      level: 'info',
    });
  } catch (error) {
    console.error('[Analytics] Failed to add breadcrumb:', error);
  }
};

// ============================================
// RAGE CLICK DETECTION
// ============================================

let clickTimestamps = {};

/**
 * Track potential rage click (multiple rapid clicks)
 * @param {string} elementId - Identifier for the clicked element
 * @param {object} metadata - Additional context
 */
export const trackRageClick = async (elementId, metadata = {}) => {
  if (!ENABLE_ANALYTICS || !isInitialized) return;

  try {
    const now = Date.now();
    const key = elementId;

    if (!clickTimestamps[key]) {
      clickTimestamps[key] = [];
    }

    // Add current click
    clickTimestamps[key].push(now);

    // Keep only clicks from last 2 seconds
    clickTimestamps[key] = clickTimestamps[key].filter(
      (timestamp) => now - timestamp < 2000
    );

    // If 4+ clicks within 2 seconds = rage click
    if (clickTimestamps[key].length >= 4) {
      const sanitizedMetadata = await sanitizeProperties(metadata);
      await trackEvent('rage_click_detected', {
        element_id: elementId,
        click_count: clickTimestamps[key].length,
        ...sanitizedMetadata,
      });

      // Reset to avoid duplicate tracking
      clickTimestamps[key] = [];

      console.warn('[Analytics] Rage click detected:', elementId);
    }
  } catch (error) {
    console.error('[Analytics] Failed to track rage click:', error);
  }
};

// ============================================
// TIME-TO-VALUE METRICS
// ============================================

/**
 * Track time-to-value metric
 * @param {string} metric - Metric name (e.g., 'time_to_onboard')
 * @param {number} durationMs - Duration in milliseconds
 * @param {object} metadata - Additional context
 */
export const trackTimeToValue = async (metric, durationMs, metadata = {}) => {
  if (!ENABLE_ANALYTICS || !isInitialized) return;

  try {
    const sanitizedMetadata = await sanitizeProperties(metadata);
    await trackEvent(metric, {
      duration_ms: durationMs,
      duration_seconds: Math.round(durationMs / 1000),
      duration_minutes: Math.round(durationMs / 60000),
      ...sanitizedMetadata,
    });
    console.log('[Analytics] Time-to-value tracked:', metric, durationMs);
  } catch (error) {
    console.error('[Analytics] Failed to track time-to-value:', error);
  }
};

// ============================================
// USER PROPERTIES
// ============================================

/**
 * Set a user property
 * @param {string} key - Property key
 * @param {any} value - Property value (will be sanitized)
 */
export const setUserProperty = async (key, value) => {
  if (!ENABLE_ANALYTICS || !isInitialized) return;

  try {
    const sanitizedProps = await sanitizeProperties({ [key]: value });
    const sanitizedValue = sanitizedProps[key] || value;

    const identifyEvent = new amplitude.Identify();
    identifyEvent.set(key, sanitizedValue);
    amplitude.identify(identifyEvent);

    Sentry.setContext('user_properties', { [key]: sanitizedValue });

    console.log('[Analytics] User property set:', key, sanitizedValue);
  } catch (error) {
    console.error('[Analytics] Failed to set user property:', error);
  }
};

// ============================================
// ONBOARDING FUNNEL
// ============================================

/**
 * Track onboarding step completion
 * @param {string} step - Step name
 * @param {object} metadata - Additional context
 */
export const trackOnboardingStep = async (step, metadata = {}) => {
  if (!ENABLE_ANALYTICS || !isInitialized) return;

  try {
    const sanitizedMetadata = await sanitizeProperties(metadata);
    await trackEvent('onboarding_step_completed', {
      step_name: step,
      timestamp: Date.now(),
      ...sanitizedMetadata,
    });
    console.log('[Analytics] Onboarding step:', step);
  } catch (error) {
    console.error('[Analytics] Failed to track onboarding step:', error);
  }
};

// ============================================
// FEATURE USAGE
// ============================================

/**
 * Track feature usage
 * @param {string} featureName - Name of the feature
 * @param {object} metadata - Additional context
 */
export const trackFeatureUsage = async (featureName, metadata = {}) => {
  if (!ENABLE_ANALYTICS || !isInitialized) return;

  try {
    const sanitizedMetadata = await sanitizeProperties(metadata);
    await trackEvent('feature_used', {
      feature_name: featureName,
      timestamp: Date.now(),
      ...sanitizedMetadata,
    });
    console.log('[Analytics] Feature used:', featureName);
  } catch (error) {
    console.error('[Analytics] Failed to track feature usage:', error);
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  initAnalytics,
  identifyUser,
  clearUser,
  trackEvent,
  trackScreen,
  trackError,
  addBreadcrumb,
  trackRageClick,
  trackTimeToValue,
  setUserProperty,
  trackOnboardingStep,
  trackFeatureUsage,
};
