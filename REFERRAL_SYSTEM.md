# Referral Program Implementation

## Overview

This document describes the referral program implementation for Dividela. The referral program allows users to unlock Premium features by referring friends to the app.

## System Design

### Reward Structure

**Two-Tier System:**
- **Free Tier** (Default): All basic features
- **Premium Tier**: Unlocked via 1 successful referral OR $2.99/month subscription

### How It Works

1. **User signs up** → Receives unique referral code (e.g., "AB12CD")
2. **Shares referral link** → `https://dividela.co/r/AB12CD`
3. **Friend signs up** → Using the referral link/code
4. **Both friends pair** → They must complete couple pairing within 24 hours
5. **Rewards unlocked** → Referrer gets Premium forever, referred user gets 1 month free

### Attribution Window

- **24 hours** from signup to couple pairing
- After 24 hours, pending referrals expire automatically

## Technical Implementation

### Database Schema

#### User Model (Firestore `/users/{userId}`)
```javascript
{
  // ... existing fields

  // Referral fields
  referralCode: "AB12CD",           // User's unique referral code
  referredBy: "XY56ZA",             // Code they used to sign up (if any)
  referredByUserId: "uid123",       // Who referred them
  referralCompletedAt: timestamp,   // When their referral completed

  // Premium tracking
  premiumStatus: "free" | "premium",
  premiumSource: null | "referral" | "subscription" | "referral_bonus",
  premiumUnlockedAt: timestamp | null,
  premiumExpiresAt: timestamp | null,  // null = forever

  // Referral stats
  referralCount: 0,                 // Successful couple pairings
  referralsPending: [],             // Array of pending userIds
  referralsCompleted: []            // Array of completed coupleIds
}
```

#### Referrals Collection (Firestore `/referrals/{referralId}`)
```javascript
{
  id: "referrerUserId_referredUserId_timestamp",
  referrerUserId: string,           // Person who shared the link
  referredUserId: string,           // Person who signed up
  referredCoupleId: string | null,  // Couple created (null until pairing)
  status: "pending" | "completed" | "expired",
  createdAt: timestamp,             // When referred user signed up
  expiresAt: timestamp,             // createdAt + 24 hours
  completedAt: timestamp | null     // When couple paired
}
```

### Services

#### `referralService.js`

Core referral logic:

- `generateReferralCode(userId)` - Creates unique 6-char code
- `initializeUserReferral(userId, referredByCode)` - Sets up referral on signup
- `checkAndCompleteReferral(coupleId, user1Id, user2Id)` - Called on couple pairing
- `getReferralStats(userId)` - Gets user's referral progress
- `hasActivePremium(userDetails)` - Checks if user has active premium
- `getPremiumFeatures(userDetails)` - Returns feature access map

### Integration Points

#### 1. Signup Flow (`AuthContext.js`)
```javascript
// Email signup
await signUp(email, password, displayName, referralCode)

// OAuth signup
await signInWithGoogle(referralCode)
await signInWithApple(referralCode)
```

#### 2. Couple Pairing (`JoinScreen.js`)
After successful couple creation:
```javascript
const referralResult = await checkAndCompleteReferral(coupleId, partnerId, user.uid);
```

This automatically:
- Finds pending referrals
- Checks if within 24-hour window
- Awards Premium to referrer (if first successful referral)
- Grants 1-month Premium to referred user

### UI Components

#### Screens

1. **ReferralScreen** (`src/screens/main/ReferralScreen.js`)
   - Shows referral link and code
   - Progress tracker (0/1 referrals)
   - Share buttons
   - Activity history

2. **PremiumFeaturesScreen** (`src/screens/main/PremiumFeaturesScreen.js`)
   - Lists all premium features
   - Pricing options (Refer vs Subscribe)
   - FAQ section

3. **SignUpScreen** (Modified)
   - Added optional referral code input
   - Accepts code from route params (deep linking)

4. **SettingsScreen** (Modified)
   - New "Premium" section
   - Shows premium status and referral progress

#### Components

**PremiumGate** (`src/components/PremiumGate.js`)

Wrap premium features with this component:

```jsx
<PremiumGate
  featureName="Receipt OCR"
  featureDescription="Scan receipts automatically"
  onUnlock={(method) => {
    if (method === 'referral') navigation.navigate('Referral');
    if (method === 'subscribe') handleSubscribe();
  }}
>
  {/* Premium feature content */}
  <ReceiptScanner />
</PremiumGate>
```

Shows paywall for free users, renders content for premium users.

## Premium Features

Features unlocked with Premium:

- ✅ **Receipt OCR** - Scan and extract expense data from receipts
- ✅ **Advanced Analytics** - Deep insights into spending patterns
- ✅ **Recurring Expenses** - Set up automatic recurring expenses
- ✅ **Category Trends** - Visualize spending trends with charts
- ✅ **Custom Export Templates** - Export with custom formatting
- ✅ **Priority Support** - Fast customer support
- 🔜 **Custom Themes** - Personalize app colors (coming soon)
- 🔜 **Multiple Groups** - Track expenses with multiple groups (coming soon)

## Testing the Referral Flow

### Test Scenario 1: Successful Referral

1. **User A signs up**
   - Sign up with email/password
   - Gets referral code automatically (e.g., "ABC123")
   - Navigate to Settings → Referral Program
   - Copy referral link

2. **User B signs up via referral**
   - Click referral link or enter code during signup
   - Complete signup
   - Pending referral is created in Firestore

3. **User B pairs with partner**
   - User B invites their partner OR joins partner's code
   - Couple is created
   - Within 24 hours: ✅ Referral completes
     - User A gets Premium forever
     - User B gets Premium for 1 month

4. **Verify rewards**
   - User A: Check Settings → Premium Status shows "Active"
   - User B: Check Premium Status shows "Active" with expiration date
   - Firestore: Check `/users/{userId}` for updated premium fields

### Test Scenario 2: Expired Referral

1. User B signs up with referral code
2. Waits more than 24 hours
3. Tries to pair with partner
4. Referral marked as "expired" (no rewards granted)

### Test Scenario 3: Multiple Referrals

1. User A refers User B (successful) → Gets Premium
2. User A refers User C (successful) → Already has Premium, count increases
3. Future: Could add bonus rewards for referring more than 1 couple

## Deep Linking (Future)

To enable `dividela.co/r/ABC123` deep links:

1. **Configure app.json**
```json
{
  "expo": {
    "scheme": "dividela",
    "web": {
      "bundler": "metro"
    },
    "ios": {
      "associatedDomains": ["applinks:dividela.co"]
    },
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "data": {
          "scheme": "https",
          "host": "dividela.co",
          "pathPrefix": "/r"
        }
      }]
    }
  }
}
```

2. **Handle incoming links in AppNavigator.js**
```javascript
import * as Linking from 'expo-linking';

useEffect(() => {
  const handleDeepLink = ({ url }) => {
    const { path, queryParams } = Linking.parse(url);
    if (path === 'r' && queryParams.code) {
      navigation.navigate('SignUp', { referralCode: queryParams.code });
    }
  };

  Linking.addEventListener('url', handleDeepLink);

  // Check if app was opened with a deep link
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink({ url });
  });

  return () => Linking.removeAllListeners('url');
}, []);
```

3. **Server-side redirect** (on dividela.co)
   - `/r/:code` → Redirect to app or show web landing page
   - If mobile: Open `dividela://r/:code`
   - If desktop: Show "Download Dividela" page

## Security Considerations

### Firestore Security Rules

```javascript
// Referrals collection - users can only create referrals for themselves
match /referrals/{referralId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null
    && request.resource.data.referredUserId == request.auth.uid;
  allow update: if request.auth != null; // Allow completion
}

// Users collection - protect referral stats
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId
    && (!request.resource.data.diff(resource.data).affectedKeys()
      .hasAny(['premiumStatus', 'referralCount', 'referralsCompleted']));
  // Prevent users from manually setting premium fields
}
```

### Anti-Fraud Measures

1. **Unique referral codes** - 6 characters = 2.1 billion combinations
2. **24-hour window** - Prevents gaming the system
3. **Couple pairing required** - Not just signups
4. **Email verification** - Prevent fake accounts (future)
5. **Rate limiting** - Max referrals per user (future)

## Metrics to Track

Monitor these in analytics:

- Referral signup rate (signups with code / total signups)
- Referral completion rate (completed / pending)
- Time to completion (signup → couple pairing)
- Premium unlock rate (users with premium / total users)
- Viral coefficient (referred users / referrers)

## Future Enhancements

### Phase 2
- Subscription payments via Stripe/RevenueCat
- Email notifications for referral milestones
- Referral leaderboard
- Additional rewards for 5+ referrals

### Phase 3
- Social sharing improvements (WhatsApp, Instagram stories)
- Personalized referral pages
- A/B testing referral incentives
- Team/group referral challenges

## Troubleshooting

### Referral not completing

1. Check Firestore `/referrals` collection for pending referral
2. Verify `status` is "pending" and not "expired"
3. Check `expiresAt` timestamp (must be within 24 hours)
4. Ensure couple was created successfully
5. Check console logs for `checkAndCompleteReferral` execution

### Premium not unlocking

1. Check user's `premiumStatus` field in Firestore
2. Verify `referralCount` is 1
3. Check `premiumSource` is "referral"
4. Use `hasActivePremium()` utility to debug

### Referral code collision

Very unlikely (1 in 2 billion), but if it happens:
- `generateReferralCode()` creates unique codes based on userId hash
- Add validation in `initializeUserReferral` to check for duplicates

## Support

For questions or issues:
- Check Firestore console for data issues
- Review console logs for error messages
- Test with Firestore emulator for local development
- Contact development team for assistance

---

**Implementation Date**: 2025-01-19
**Version**: 1.0.0
**Status**: ✅ Complete and Ready for Testing
