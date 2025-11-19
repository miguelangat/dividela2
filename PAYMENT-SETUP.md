# Payment Gating Setup Guide

This guide will help you configure RevenueCat for multi-platform (iOS, Android, Web) subscription management in Dividela.

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [RevenueCat Account Setup](#revenuecat-account-setup)
4. [iOS Configuration](#ios-configuration)
5. [Android Configuration](#android-configuration)
6. [Web Configuration](#web-configuration)
7. [Environment Variables](#environment-variables)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Dividela uses **RevenueCat** as a unified subscription platform to handle payments across:
- **iOS** (via App Store / StoreKit)
- **Android** (via Google Play Billing)
- **Web** (via Stripe)

### Architecture

```
┌─────────────────────────────────────────┐
│         CLIENT LAYER                     │
├─────────────────────────────────────────┤
│  iOS App Store  │  Google Play  │  Web  │
│  (StoreKit)     │  (Billing)    │(Stripe)│
└────────┬────────┴───────┬───────┴───────┘
         │                │
    ┌────▼────────────────▼─────┐
    │   RevenueCat SDK           │
    └────────────┬───────────────┘
                 │
    ┌────────────▼───────────────┐
    │  SubscriptionService.ts    │
    │  Firebase/Firestore        │
    └────────────────────────────┘
```

### Subscription Plans

- **Free Tier**: Basic expense tracking, 1 budget, monthly view
- **Premium Tier**:
  - $4.99/month or $39.99/year (save 33%)
  - Unlimited budgets
  - Annual view
  - Advanced analytics
  - Export capabilities
  - **Shared subscription**: When one partner subscribes, both get premium

---

## Prerequisites

Before you begin, ensure you have:

- ✅ Apple Developer Account ($99/year) for iOS
- ✅ Google Play Developer Account ($25 one-time) for Android
- ✅ Stripe Account (free) for web payments
- ✅ RevenueCat Account (free up to $10k/month revenue)
- ✅ Access to Firebase project (already configured)

---

## RevenueCat Account Setup

### Step 1: Create RevenueCat Account

1. Go to https://app.revenuecat.com/signup
2. Sign up with your email
3. Create a new project: **"Dividela"**

### Step 2: Get API Keys

1. In RevenueCat dashboard, go to **Projects → Dividela → API Keys**
2. You'll see three keys:
   - **iOS App-Specific Shared Secret** (for iOS)
   - **Google Play Service Credentials** (for Android)
   - **Stripe API Key** (for Web)

3. **Copy these keys** - you'll need them later

---

## iOS Configuration

### Step 1: App Store Connect Setup

1. Go to https://appstoreconnect.apple.com
2. Navigate to **My Apps → Dividela → Features → In-App Purchases**

3. Click **"+"** to create a new subscription:

   **Monthly Subscription:**
   - Reference Name: `Dividela Premium Monthly`
   - Product ID: `dividela_premium_monthly`
   - Subscription Group: `Premium` (create if needed)
   - Subscription Duration: 1 month
   - Price: $4.99

   **Annual Subscription:**
   - Reference Name: `Dividela Premium Annual`
   - Product ID: `dividela_premium_annual`
   - Subscription Group: `Premium` (same group)
   - Subscription Duration: 1 year
   - Price: $39.99

4. Fill in required metadata:
   - Subscription Display Name: "Premium"
   - Description: "Unlock unlimited budgets, annual tracking, and advanced analytics"
   - Screenshot: (upload 1242x2688px screenshot)

5. **Submit for Review** (required before testing)

### Step 2: Link RevenueCat to App Store Connect

1. In App Store Connect, go to **Users and Access → Integrations → App Store Connect API**
2. Create a new API key:
   - Name: `RevenueCat`
   - Access: `Admin` or `App Manager`
3. **Download the API Key** (.p8 file)

4. In RevenueCat dashboard:
   - Go to **Project Settings → Apple App Store**
   - Click **Add App**
   - Bundle ID: `com.dividela.app` (or your bundle ID)
   - Upload the .p8 file
   - Enter Issuer ID and Key ID from App Store Connect

5. RevenueCat will now automatically import your products

### Step 3: Configure Entitlements

1. In RevenueCat, go to **Entitlements**
2. Create a new entitlement: **`premium`**
3. Attach both products to this entitlement:
   - `dividela_premium_monthly`
   - `dividela_premium_annual`

---

## Android Configuration

### Step 1: Google Play Console Setup

1. Go to https://play.google.com/console
2. Navigate to **Dividela → Monetize → Subscriptions**

3. Click **Create subscription**:

   **Monthly Subscription:**
   - Product ID: `dividela_premium_monthly`
   - Name: `Dividela Premium Monthly`
   - Description: "Unlock unlimited budgets, annual tracking, and advanced analytics"
   - Billing period: 1 month
   - Price: $4.99

   **Annual Subscription:**
   - Product ID: `dividela_premium_annual`
   - Name: `Dividela Premium Annual`
   - Billing period: 1 year
   - Price: $39.99

4. **Activate** both subscriptions

### Step 2: Create Service Account

1. In Google Play Console, go to **Setup → API Access**
2. Click **Create new service account**
3. Go to Google Cloud Console (link provided)
4. Create service account:
   - Name: `RevenueCat`
   - Role: `Service Account User`
5. Create and download JSON key

6. Back in Play Console:
   - Grant access to the service account
   - Permissions: **Admin** (View app information and download bulk reports)

### Step 3: Link RevenueCat to Google Play

1. In RevenueCat dashboard:
   - Go to **Project Settings → Google Play Store**
   - Click **Add App**
   - Package name: `com.dividela.app`
   - Upload the service account JSON file

2. RevenueCat will import your products automatically

3. Attach products to `premium` entitlement (same as iOS)

---

## Web Configuration

### Step 1: Stripe Setup

1. Go to https://dashboard.stripe.com
2. Create account or sign in
3. Switch to **Test Mode** (toggle in top right)

4. Go to **Products**
5. Create product: **Dividela Premium**

6. Add two prices:
   - **Monthly**: $4.99/month recurring
   - **Annual**: $39.99/year recurring

7. Copy the **Price IDs** (starts with `price_...`)

### Step 2: Link RevenueCat to Stripe

1. In RevenueCat dashboard:
   - Go to **Project Settings → Stripe**
   - Click **Connect Stripe**
   - Authorize the connection

2. Map Stripe products to RevenueCat:
   - Monthly Price ID → `dividela_premium_monthly`
   - Annual Price ID → `dividela_premium_annual`

3. Attach to `premium` entitlement

---

## Environment Variables

### Step 1: Create .env File

Create `.env` file in project root:

```env
# RevenueCat API Keys
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_WEB_KEY=strp_xxxxxxxxxxx
```

### Step 2: Get API Keys from RevenueCat

1. In RevenueCat dashboard, go to **API Keys**
2. Copy the **Public SDK Keys**:
   - iOS: `appl_...`
   - Android: `goog_...`
   - Stripe: `strp_...`

3. Add to `.env` file

### Step 3: Update App Configuration

The app is already configured to use these environment variables in:
- `src/services/subscriptionService.js`

No additional code changes needed!

---

## Testing

### iOS Testing (Sandbox)

1. **Create Sandbox Tester**:
   - App Store Connect → Users and Access → Sandbox Testers
   - Create test account: test@example.com

2. **Test on Device/Simulator**:
   - Sign out of App Store (Settings → iTunes & App Store)
   - Run app: `npm run ios`
   - Attempt purchase
   - Sign in with sandbox tester account when prompted

3. **Expected Flow**:
   - Paywall appears
   - Select plan → Apple Pay sheet
   - Enter sandbox password
   - Purchase succeeds
   - Premium features unlock

### Android Testing (Test Track)

1. **Add Test Users**:
   - Play Console → Dividela → Testing → License testers
   - Add Gmail addresses

2. **Deploy to Internal Testing**:
   - Build APK/AAB
   - Upload to Internal Testing track
   - Add testers
   - Testers receive email with opt-in link

3. **Test Purchases**:
   - Use test cards provided by Google
   - Purchase should complete without actual charge

### Web Testing (Stripe Test Mode)

1. **Use Test Cards**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

2. **Test Flow**:
   - Run web app: `npm run web`
   - Go to paywall
   - Enter test card details
   - Subscription succeeds

---

## Production Deployment

### Checklist Before Launch

- [ ] iOS app submitted and approved with In-App Purchases
- [ ] Android app published to Production/Closed Testing
- [ ] Stripe account activated (provide business details)
- [ ] RevenueCat set to **Production mode**
- [ ] `.env` file updated with production keys
- [ ] Firestore security rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Test purchases on all platforms
- [ ] Subscription restoration tested
- [ ] Cross-platform access verified

### Environment Variables (Production)

Update `.env` with production keys:

```env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_PROD_xxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_PROD_xxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_WEB_KEY=strp_PROD_xxxxxxxxxxx
```

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

This protects subscription fields from client tampering.

---

## Troubleshooting

### iOS: "Cannot connect to iTunes Store"

**Cause**: Using production environment in development
**Fix**: Ensure using Sandbox account, logged out of production App Store

### Android: "This version of the application is not configured for billing through Google Play"

**Cause**: APK not uploaded to Play Console or tester not added
**Fix**:
1. Upload signed APK to Internal Testing
2. Add your Gmail to license testers
3. Opt-in via email link

### RevenueCat: "No offerings available"

**Cause**: Products not configured or entitlements not set up
**Fix**:
1. Verify products exist in App Store/Play Store/Stripe
2. Check products linked in RevenueCat
3. Ensure attached to `premium` entitlement
4. Check API keys in `.env`

### Web: Stripe checkout not showing

**Cause**: Stripe not configured for web platform
**Fix**:
1. Enable Stripe in RevenueCat Project Settings
2. Map Stripe prices to products
3. Verify `EXPO_PUBLIC_REVENUECAT_WEB_KEY`

### Subscription not syncing across platforms

**Cause**: User ID mismatch
**Fix**:
- Ensure RevenueCat is initialized with Firebase `uid`:
  ```js
  await initializeRevenueCat(user.uid);
  ```
- Check RevenueCat dashboard → Customers → verify user appears

### "Permission denied" when updating subscription in Firestore

**Cause**: Firestore security rules blocking update
**Fix**:
- Deploy latest rules: `firebase deploy --only firestore:rules`
- Verify rules allow subscription field updates (lines 32-59 in `firestore.rules`)

---

## Support

### RevenueCat Documentation
- https://docs.revenuecat.com

### Platform-Specific Docs
- **iOS**: https://developer.apple.com/in-app-purchase/
- **Android**: https://developer.android.com/google/play/billing
- **Stripe**: https://stripe.com/docs/billing/subscriptions

### Dividela Support
- GitHub Issues: https://github.com/yourusername/dividela/issues
- Email: support@dividela.com

---

## Next Steps

After completing this setup:

1. ✅ Update App.js to wrap app with `<SubscriptionProvider>`
2. ✅ Add navigation routes for `Paywall` and `SubscriptionManagement` screens
3. ✅ Test feature gating on all premium features
4. ✅ Submit apps for review to App Store / Play Store
5. ✅ Launch! 🚀

---

**Last Updated**: 2025-01-19
**Version**: 1.0.0
