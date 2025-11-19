# Subscription System - Edge Cases & Resilience

This document describes how the Dividela subscription system handles edge cases, network failures, and unusual scenarios.

## Table of Contents

1. [Network & Connectivity](#network--connectivity)
2. [Purchase Flow Issues](#purchase-flow-issues)
3. [Cross-Platform Scenarios](#cross-platform-scenarios)
4. [Partner/Couple Scenarios](#partnercouple-scenarios)
5. [Time & Expiration Issues](#time--expiration-issues)
6. [Platform-Specific Edge Cases](#platform-specific-edge-cases)
7. [Testing Edge Cases](#testing-edge-cases)

---

## Network & Connectivity

### ✅ Network Failure During Initialization

**Scenario**: User opens app with no internet connection

**Handling**:
1. Attempts to load from AsyncStorage cache (5-min expiry)
2. If cache exists and is fresh → Shows cached subscription status
3. Sets `isOffline: true` flag
4. Continues with cached data until connection restored
5. When app comes to foreground, reconciles with RevenueCat

**Code**: `SubscriptionContext.js:157-165`

**User Experience**: Instant load with cached data, subtle offline indicator

---

### ✅ Network Failure During Purchase

**Scenario**: User initiates purchase but loses connection mid-flow

**Handling**:
1. Purchase attempt fails at device level (handled by StoreKit/Play Billing)
2. Transaction not completed → No charge occurs
3. User sees error message
4. Can retry when connection restored
5. RevenueCat automatically handles pending transactions on next app launch

**Code**: `SubscriptionContext.js:347-385`

**User Experience**: Clear error message, safe to retry

---

### ✅ Network Failure After Successful Purchase

**Scenario**: Purchase succeeds but app can't sync to Firebase

**Handling**:
1. RevenueCat webhook delivers receipt to backend (retries automatically)
2. Local state updated to `isPremium: true`
3. Cached immediately to AsyncStorage
4. Firebase sync retries with exponential backoff (3 attempts)
5. Even if Firebase sync fails, premium features unlock (RevenueCat is source of truth)
6. Next app foreground triggers reconciliation

**Code**: `SubscriptionContext.js:357-370`, `subscriptionService.js:syncWithFirebase`

**User Experience**: Premium unlocks immediately, no user action needed

---

### ✅ Slow Network / Timeout

**Scenario**: Network very slow, requests timing out

**Handling**:
1. Retry logic with exponential backoff: 2s → 4s → 8s
2. Max 3 attempts for initialization
3. Max 2 attempts for foreground reconciliation (faster feedback)
4. Falls back to cache if all attempts fail
5. Sets `isOffline: true`

**Code**: `SubscriptionContext.js:87-104` (retryWithBackoff)

**User Experience**: Loading indicator shows progress, automatic recovery

---

## Purchase Flow Issues

### ✅ User Cancels Purchase Mid-Flow

**Scenario**: User clicks "Cancel" in App Store/Play Store payment sheet

**Handling**:
1. RevenueCat returns `{ userCancelled: true }`
2. No error shown (intentional cancellation)
3. Returns to paywall
4. No state changes

**Code**: `SubscriptionContext.js:371-372`

**User Experience**: Graceful return to paywall, no error messages

---

### ✅ App Crashes During Purchase

**Scenario**: App crashes after user authorizes payment but before confirmation

**Handling**:
1. Device-level purchase completes (handled by OS)
2. Receipt stored in App Store/Play Store
3. Next app launch: RevenueCat automatically fetches pending transactions
4. Subscription activated on next `initializeRevenueCat` call
5. User may see "Restore Purchases" prompt if needed

**Code**: RevenueCat SDK handles this automatically

**User Experience**: Premium features appear on next app launch, may need to tap "Restore"

---

### ✅ Duplicate Purchase Attempts

**Scenario**: User taps "Purchase" multiple times quickly

**Handling**:
1. First purchase starts
2. Subsequent taps ignored (button disabled while `loading: true`)
3. Only one transaction processed
4. StoreKit/Play Billing prevents duplicate charges

**Code**: `SubscriptionContext.js:354` (setLoading prevents duplicates)

**User Experience**: Button disabled during purchase, safe from double-charging

---

### ✅ Purchase on One Device, Use on Another

**Scenario**: User purchases on iPhone, then opens app on iPad

**Handling**:
1. RevenueCat syncs via user ID (Firebase UID)
2. iPad initialization fetches subscription from RevenueCat
3. Premium status automatically available
4. No manual restore needed if using same Apple ID

**Code**: `SubscriptionContext.js:168-170` (initializeRevenueCat with userId)

**User Experience**: Seamless, automatic sync

---

## Cross-Platform Scenarios

### ✅ Subscribe on iOS, Use on Android

**Scenario**: User subscribes on iPhone, opens app on Android phone

**Handling**:
1. Subscription tied to Firebase UID (not device/platform)
2. Android app calls `checkSubscriptionStatus(userId)`
3. RevenueCat returns premium status
4. Premium unlocks on Android (no additional payment)

**Code**: `SubscriptionContext.js:184-186`

**User Experience**: Subscribe once, use everywhere

---

### ✅ Subscribe on Web, Use on Mobile

**Scenario**: User subscribes via Stripe on web, then opens mobile app

**Handling**:
1. Same as above - RevenueCat syncs across all platforms
2. Mobile app fetches subscription on initialization
3. Premium active immediately

**Code**: RevenueCat handles cross-platform sync automatically

**User Experience**: Instant access on all platforms

---

### ✅ Subscription Renewal on Different Platform

**Scenario**: User subscribed on iOS monthly, renewal happens while using Android

**Handling**:
1. iOS processes renewal automatically
2. RevenueCat webhook receives renewal notification
3. Firebase updated via webhook
4. Android app detects change via:
   - Real-time subscription listener
   - Firebase userDetails sync
   - Next foreground reconciliation

**Code**: `SubscriptionContext.js:239-247` (listener), `SubscriptionContext.js:259-301` (foreground sync)

**User Experience**: Premium continues uninterrupted

---

## Partner/Couple Scenarios

### ✅ One Partner Subscribes, Both Get Premium

**Scenario**: User A subscribes, User B should also get premium

**Handling**:
1. User A's Firebase document updated: `subscriptionStatus: 'premium'`
2. User B checks `hasCoupleAccess(partnerDetails)`
3. If partner has premium → User B gets premium features
4. No separate subscription needed

**Code**: `SubscriptionContext.js:515-527`, `FeatureGate.js:55-70`

**User Experience**: One subscription, both partners benefit

---

### ✅ Partner Breakup / Remove from Couple

**Scenario**: Couple splits, one partner removes the other

**Handling**:
1. Bidirectional relationship verification in `hasCoupleAccess`
2. Checks that both users still point to each other
3. Verifies `partnerId` and `coupleId` match on both sides
4. Automatic premium revocation when relationship broken
5. Debug logging when breakup detected

**Code**: `SubscriptionContext.js:517-547`

**Logic**:
```js
// Check if no partner relationship
if (!userDetails?.partnerId || !userDetails?.coupleId) {
  debugLog('No partner relationship found');
  return false;
}

// Verify bidirectional relationship
const partnerStillPaired =
  partnerDetails.partnerId === userDetails.uid &&
  partnerDetails.coupleId === userDetails.coupleId;

if (!partnerStillPaired) {
  debugLog('Partner relationship broken');
  return false;
}
```

**User Experience**: Partner-based premium automatically revoked when couple dissolves

---

### ✅ Partner Subscribes After User Already Has App

**Scenario**: User B using free tier, User A (their partner) subscribes

**Handling**:
1. User A subscribes → Firebase updated
2. User B's app syncs Firebase userDetails
3. `hasCoupleAccess` detects partner is premium
4. User B automatically gets premium features

**Code**: `SubscriptionContext.js:323-342` (Firebase sync effect)

**User Experience**: Automatic premium upgrade when partner subscribes

---

## Time & Expiration Issues

### ✅ Subscription Expires While Offline

**Scenario**: User's subscription expires but they haven't opened app

**Handling**:
1. Cache still shows premium (until app opens)
2. Next app launch:
   - RevenueCat returns `isPremium: false`
   - Cache updated
   - Premium features locked
3. Firebase fallback checks expiration date:
   ```js
   const isExpired = userDetails.subscriptionExpiresAt < new Date();
   const shouldBePremium = premiumStatus && !isExpired;
   ```

**Code**: `SubscriptionContext.js:327-328`

**User Experience**: Premium locked on next app open after expiration

---

### ✅ Device Time Manipulation

**Scenario**: User changes device time to future/past

**Handling**:
1. RevenueCat uses server timestamps (not device time)
2. Expiration checked against server time
3. Firebase `serverTimestamp()` used for all time-sensitive data
4. Device time changes have no effect

**Code**: All timestamp fields use `serverTimestamp()`

**User Experience**: Cannot extend subscription by changing device time

---

### ✅ Grace Period (Payment Failed)

**Scenario**: Subscription renewal fails due to payment issue, but Apple/Google provides grace period

**Handling**:
1. RevenueCat reports grace period status
2. User still has premium access during grace period
3. App shows warning about payment issue (if implemented)
4. If payment resolved → subscription continues
5. If grace period expires → premium revoked

**Code**: RevenueCat SDK handles grace period automatically

**Status**: ✅ Handled by RevenueCat, app behavior follows

---

## Platform-Specific Edge Cases

### iOS: Subscription in Family Sharing

**Scenario**: User's family member has subscription, shared via Family Sharing

**Handling**:
1. StoreKit reports subscription as active for family member
2. RevenueCat detects and grants premium
3. Works automatically, no special code needed

**Code**: RevenueCat SDK handles Family Sharing

**User Experience**: Premium access via family subscription

---

### iOS: Ask to Buy (Child Account)

**Scenario**: Child user tries to purchase, requires parent approval

**Handling**:
1. StoreKit shows "Ask to Buy" dialog
2. Purchase pending until parent approves
3. App continues with free tier
4. When parent approves → purchase completes
5. Next app launch activates premium

**Code**: StoreKit handles this flow

**User Experience**: Normal flow, delayed activation

---

### Android: Promo Codes / Free Trials

**Scenario**: User redeems promo code for free months

**Handling**:
1. Play Store applies promo code
2. RevenueCat detects subscription
3. Premium activated
4. Works same as paid subscription

**Code**: RevenueCat SDK handles promo codes

**User Experience**: Seamless activation

---

### Web: Stripe Payment Failure

**Scenario**: Credit card declined during Stripe payment

**Handling**:
1. Stripe returns error immediately
2. User sees error message
3. Can update payment method and retry
4. No partial charges

**Code**: Stripe SDK handles payment failures

**User Experience**: Clear error message, easy retry

---

## Testing Edge Cases

### How to Test Offline Mode

```bash
1. Open app normally (ensure premium is cached)
2. Turn on Airplane Mode
3. Force quit and reopen app
4. Should see: "Offline Mode - Using Cached Data" banner
5. Premium features should still work (from cache)
6. Turn off Airplane Mode
7. App should reconcile within 5 seconds
```

**Debug Screen**: `SubscriptionDebugScreen` shows offline status

---

### How to Test Purchase Cancellation

```bash
1. Open PaywallScreen
2. Tap "Purchase"
3. When payment sheet appears, tap "Cancel"
4. Should return to paywall without error
5. Can retry immediately
```

---

### How to Test Subscription Expiration

```bash
# Sandbox only
1. Subscribe in sandbox mode
2. Wait for sandbox expiration (5 minutes for monthly)
3. App should automatically detect expiration
4. Premium features should lock
```

**Debug Screen**: Check "Expires At" field

---

### How to Test Cache Expiration

```bash
1. Open app (subscription cached)
2. Force quit app
3. Wait 6 minutes (cache expires after 5 minutes)
4. Turn on Airplane Mode
5. Reopen app
6. Should see loading then fallback to "free" (no cache)
```

**Debug Screen**: "View Cache" shows cache age

---

### How to Test Cross-Platform Sync

```bash
1. Subscribe on iOS device
2. Immediately open app on Android device (before sync)
3. Android should auto-sync within 10 seconds
4. Check RevenueCat dashboard for sync confirmation
```

**Debug Screen**: "Last Sync" shows last successful sync time

---

### How to Test Partner Premium

```bash
1. User A subscribes to premium
2. Pair User A with User B (couple pairing)
3. User B should automatically get premium
4. Check Settings > Subscription: "Your partner also has premium access!"
```

**Debug Screen**: Check Firebase "Partner ID" and "Subscription Status"

---

## Monitoring & Logging

### Debug Logs (Development Only)

All debug logs prefixed with `[SubscriptionContext <timestamp>]`:

```
[SubscriptionContext 2025-01-19T12:34:56.789Z] Starting initialization for user: abc123
[SubscriptionContext 2025-01-19T12:34:57.123Z] Using cached subscription status
[SubscriptionContext 2025-01-19T12:34:58.456Z] ✅ Initialization complete { isPremium: true }
```

### Error Logs (Always Active)

All errors logged with `console.error`:

```
[SubscriptionContext 2025-01-19T12:35:00.789Z] Initialization error: Network request failed
[SubscriptionContext 2025-01-19T12:35:05.123Z] Using cached data after error
```

### Using the Debug Screen

Navigate to `SubscriptionDebugScreen` (only in `__DEV__` mode):

- View real-time subscription status
- Check cache age and data
- Force manual refresh
- Clear cache for testing
- View Firebase data
- Monitor offline status

---

## Summary of Resilience Features

| Feature | Status | Fallback Behavior |
|---------|--------|-------------------|
| Offline initialization | ✅ | Uses cache (5-min expiry) |
| Network failure during purchase | ✅ | Transaction not charged, safe to retry |
| Purchase completion sync failure | ✅ | Retries with backoff, premium granted |
| App crash during purchase | ✅ | OS completes transaction, restored on relaunch |
| Cross-platform sync | ✅ | Automatic via RevenueCat user ID |
| Subscription expiration | ✅ | Checked on every sync, Firebase fallback |
| Cache expiration | ✅ | Auto-refreshes on foreground, 5-min expiry |
| Retry logic | ✅ | Exponential backoff, max 3 attempts |
| Partner breakup | ✅ | Bidirectional validation, automatic revocation |
| Grace period | ✅ | Handled by RevenueCat automatically |

---

## Next Steps for Improvement

1. ✅ Add offline indicator UI (Done)
2. ✅ Add debug screen (Done)
3. ✅ Add partner breakup handling (Done)
4. ❌ Add analytics for purchase failures
5. ❌ Add Sentry/Crashlytics error tracking
6. ❌ Add purchase flow state persistence (for crash recovery)

---

**Last Updated**: 2025-11-19
**Version**: 1.2.0
