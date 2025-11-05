# Dividela - Onboarding & Invite Code System Guide

## Overview

This document explains the account creation and couple pairing system implemented in Dividela. The onboarding flow is designed to be simple, intuitive, and complete in under 2 minutes.

---

## Onboarding Flow Diagram

```
┌─────────────┐
│   Welcome   │
│   Screen    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Sign Up   │
│   Screen    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Partner Connect    │
│  (Choose Action)    │
└──┬───────────────┬──┘
   │               │
   │ Invite        │ Join
   │               │
   ▼               ▼
┌──────────┐  ┌──────────┐
│ Generate │  │  Enter   │
│   Code   │  │   Code   │
└────┬─────┘  └────┬─────┘
     │             │
     └──────┬──────┘
            ▼
     ┌─────────────┐
     │  Success!   │
     │  Connected  │
     └──────┬──────┘
            ▼
     ┌─────────────┐
     │   Main App  │
     └─────────────┘
```

---

## Detailed Screen Flows

### 1. Welcome Screen
**Purpose:** First impression and entry point

**Elements:**
- App logo/icon (💑)
- App name: "Dividela"
- Tagline: "Track shared expenses with your partner, effortlessly"
- "Get Started" button (primary CTA)
- "Already have an account? Sign in" link (secondary)

**User Actions:**
- Tap "Get Started" → Navigate to Sign Up
- Tap "Sign in" → Navigate to Login (if returning user)

---

### 2. Sign Up Screen
**Purpose:** Create user account

**Elements:**
- Back button
- Form fields:
  - Name (text input)
  - Email (email input)
  - Password (password input, with show/hide toggle)
- Terms & Privacy checkbox
- "Create Account" button
- Social sign-in options:
  - Continue with Apple
  - Continue with Google

**Validation:**
- Email format validation
- Password minimum length (8 characters)
- Terms acceptance required

**User Actions:**
- Fill form and tap "Create Account" → Create user in Firebase Auth → Navigate to Partner Connect
- Tap social sign-in → OAuth flow → Navigate to Partner Connect

**Backend Actions:**
```javascript
// Create user in Firebase Auth
const user = await createUserWithEmailAndPassword(auth, email, password);

// Create user document in Firestore
await setDoc(doc(db, 'users', user.uid), {
  displayName: name,
  email: email,
  createdAt: serverTimestamp(),
  partnerId: null,
  settings: {
    notifications: true,
    defaultSplit: 50,
    currency: 'USD'
  }
});
```

---

### 3. Partner Connect Screen
**Purpose:** Choose how to pair with partner

**Elements:**
- Two large option cards:
  1. **Invite Partner** (primary/highlighted)
     - Icon: 📤
     - Description: "Generate a code for your partner to join"
  2. **Join Partner**
     - Icon: 📥
     - Description: "Enter your partner's invite code"

**User Actions:**
- Tap "Invite Partner" → Navigate to Generate Invite Code
- Tap "Join Partner" → Navigate to Enter Invite Code

---

### 4a. Invite Partner Screen (Generate Code)
**Purpose:** Generate and share invite code

**Elements:**
- Back button
- Large display of 6-digit code (e.g., "A7K9M2")
- Copy button
- Share options:
  - Share via SMS
  - Share via Email
  - (Additional: WhatsApp, etc.)
- Status indicator: "Waiting for partner..."
- Code expiration notice: "Code expires in 7 days"

**Code Generation:**
```javascript
function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**Backend Actions:**
```javascript
// Create invite code document
await setDoc(doc(db, 'inviteCodes', code), {
  code: code,
  createdBy: currentUser.uid,
  createdAt: serverTimestamp(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  isUsed: false,
  usedBy: null,
  usedAt: null
});

// Set up real-time listener for when partner joins
const unsubscribe = onSnapshot(doc(db, 'inviteCodes', code), (doc) => {
  if (doc.data().isUsed) {
    // Partner has joined!
    navigateToSuccess();
  }
});
```

**User Actions:**
- Tap "Copy Code" → Copy to clipboard, show "Copied!" feedback
- Tap share option → Open native share sheet with pre-filled message
- Wait → Real-time update when partner joins → Navigate to Success

**Share Message Template:**
```
Join me on Dividela! Use this code to connect: {CODE}

Download: [app store link]
```

---

### 4b. Join Partner Screen (Enter Code)
**Purpose:** Enter partner's invite code to connect

**Elements:**
- Back button
- Large text input field for code
  - Center-aligned
  - Monospace font
  - Auto-uppercase
  - Max length: 6 characters
- "Connect" button (disabled until 6 characters entered)
- Hint: "⚠️ Make sure to enter the code exactly as shown"

**Real-time Validation:**
```javascript
const validateCode = async (code) => {
  const codeDoc = await getDoc(doc(db, 'inviteCodes', code));
  
  if (!codeDoc.exists()) {
    return { valid: false, error: 'Code not found' };
  }
  
  const codeData = codeDoc.data();
  
  if (codeData.isUsed) {
    return { valid: false, error: 'Code already used' };
  }
  
  if (codeData.expiresAt.toDate() < new Date()) {
    return { valid: false, error: 'Code has expired' };
  }
  
  return { valid: true, partnerId: codeData.createdBy };
};
```

**User Actions:**
- Type code → Auto-format and validate
- Tap "Connect" → Validate code → Create couple → Navigate to Success

**Backend Actions:**
```javascript
// Validate and use the code
const validation = await validateCode(enteredCode);

if (!validation.valid) {
  showError(validation.error);
  return;
}

// Create couple document
const coupleId = generateId();
await setDoc(doc(db, 'couples', coupleId), {
  user1Id: validation.partnerId,
  user2Id: currentUser.uid,
  inviteCode: enteredCode,
  createdAt: serverTimestamp(),
  currentBalance: 0,
  totalExpenses: 0,
  lastActivity: serverTimestamp()
});

// Update both users' partner references
await updateDoc(doc(db, 'users', currentUser.uid), {
  partnerId: validation.partnerId,
  coupleId: coupleId
});

await updateDoc(doc(db, 'users', validation.partnerId), {
  partnerId: currentUser.uid,
  coupleId: coupleId
});

// Mark invite code as used
await updateDoc(doc(db, 'inviteCodes', enteredCode), {
  isUsed: true,
  usedBy: currentUser.uid,
  usedAt: serverTimestamp()
});

// Send notification to partner
sendNotification(validation.partnerId, {
  title: 'Partner Connected!',
  body: `${currentUser.displayName} has joined you on Dividela`
});
```

---

### 5. Success Screen
**Purpose:** Celebrate successful pairing

**Elements:**
- Large success checkmark (✓) in green circle
- "Connected!" heading
- Message: "You're now connected with {Partner Name}. Ready to track expenses together!"
- Visual representation: Both avatars with link icon between them
- "Continue to App" button

**User Actions:**
- Tap "Continue to App" → Navigate to Main App (Home Screen)

**Backend Actions:**
```javascript
// Log successful pairing event
logAnalyticsEvent('couple_paired', {
  userId: currentUser.uid,
  partnerId: partnerId,
  method: 'invite_code'
});
```

---

## Invite Code System Specifications

### Code Format
- **Length:** 6 characters
- **Character Set:** A-Z, 0-9 (alphanumeric, uppercase)
- **Example:** A7K9M2, B3XY4K, 9M2P7Q
- **Total Possible Codes:** 36^6 = 2,176,782,336 combinations

### Code Properties
- **Uniqueness:** Each code is unique across the system
- **Expiration:** 7 days from generation
- **One-time Use:** Cannot be reused after successful pairing
- **Case Insensitive:** Input automatically converted to uppercase

### Security Considerations
1. **No Sensitive Data:** Code contains no user information
2. **Limited Lifetime:** 7-day expiration reduces vulnerability window
3. **Rate Limiting:** Limit code generation to prevent abuse (e.g., 5 codes per user per day)
4. **Usage Tracking:** Log all code generation and validation attempts
5. **Revocation:** Users can invalidate unused codes from settings

### Error Handling

**Invalid Code Scenarios:**
1. **Code Not Found**
   - Error: "Invalid code. Please check and try again."
   - Action: Allow re-entry

2. **Code Already Used**
   - Error: "This code has already been used. Ask your partner for a new code."
   - Action: Navigate back to Partner Connect

3. **Code Expired**
   - Error: "This code has expired. Ask your partner for a new code."
   - Action: Navigate back to Partner Connect

4. **Self-Invite Attempt**
   - Error: "You cannot use your own invite code."
   - Action: Allow re-entry

5. **Already Paired**
   - Error: "You're already paired with a partner. To connect with a new partner, unpair first."
   - Action: Navigate to Settings

---

## Database Schema Reference

### inviteCodes Collection
```javascript
{
  code: "A7K9M2",              // Primary key
  createdBy: "user123",         // User ID who created the code
  createdAt: Timestamp,         // When code was generated
  expiresAt: Timestamp,         // When code expires (createdAt + 7 days)
  isUsed: false,                // Whether code has been used
  usedBy: null,                 // User ID who used the code (null if unused)
  usedAt: null                  // When code was used (null if unused)
}
```

### users Collection (Updated)
```javascript
{
  userId: "user123",
  displayName: "Alex",
  email: "alex@example.com",
  partnerId: "user456",         // Reference to partner's user ID
  coupleId: "couple789",        // Reference to couple document
  avatarUrl: "https://...",
  createdAt: Timestamp,
  settings: {
    notifications: true,
    defaultSplit: 50,
    currency: "USD"
  }
}
```

### couples Collection
```javascript
{
  coupleId: "couple789",
  user1Id: "user123",           // Creator of invite code
  user2Id: "user456",           // User who joined with code
  inviteCode: "A7K9M2",         // Code used to create couple
  createdAt: Timestamp,
  currentBalance: 0,            // Running balance (+ means user2 owes user1)
  totalExpenses: 0,
  lastActivity: Timestamp
}
```

---

## API Endpoints

### POST /invites/generate
**Purpose:** Generate new invite code

**Request:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "code": "A7K9M2",
  "expiresAt": "2025-11-10T09:41:00Z"
}
```

### POST /invites/validate
**Purpose:** Check if invite code is valid

**Request:**
```json
{
  "code": "A7K9M2"
}
```

**Response:**
```json
{
  "valid": true,
  "partnerId": "user123",
  "partnerName": "Alex"
}
```

**OR**

```json
{
  "valid": false,
  "error": "Code has expired"
}
```

### POST /invites/accept
**Purpose:** Accept invite and create couple

**Request:**
```json
{
  "code": "A7K9M2",
  "userId": "user456"
}
```

**Response:**
```json
{
  "success": true,
  "coupleId": "couple789",
  "partnerId": "user123",
  "partnerName": "Alex"
}
```

---

## Testing Scenarios

### Happy Path
1. User A creates account → Generates invite code "A7K9M2"
2. User A shares code with User B
3. User B creates account → Enters code "A7K9M2"
4. System validates code → Creates couple → Both users see success
5. Both users land on home screen with $0 balance

### Edge Cases

**Test 1: Expired Code**
1. User A generates code
2. Wait 7+ days
3. User B tries to use code
4. System shows "Code has expired" error
5. User A generates new code

**Test 2: Already Used Code**
1. User A generates code "A7K9M2"
2. User B uses code successfully
3. User C tries to use same code "A7K9M2"
4. System shows "Code already used" error

**Test 3: Invalid Code Format**
1. User tries to enter "123" (too short)
2. Connect button stays disabled
3. User tries to enter "ABC!@#" (invalid characters)
4. System auto-filters to valid characters only

**Test 4: Concurrent Use**
1. User A generates code "A7K9M2"
2. User B and User C try to use code simultaneously
3. System uses transaction to ensure only one succeeds
4. First user creates couple, second user sees "already used" error

---

## UI/UX Best Practices

### Visual Feedback
- ✅ Show loading states during code validation
- ✅ Animate success transitions
- ✅ Provide clear error messages
- ✅ Use haptic feedback on mobile (success/error vibrations)

### Accessibility
- ✅ Large touch targets (minimum 44x44 points)
- ✅ High contrast text
- ✅ Screen reader support for all interactive elements
- ✅ Keyboard navigation for code input

### Performance
- ✅ Real-time code validation (as user types)
- ✅ Optimistic UI updates where safe
- ✅ Preload next screen during validation
- ✅ Cache user data after authentication

---

## Future Enhancements

### Phase 2
- [ ] QR code generation for in-person pairing
- [ ] Deep links for one-tap join (dividela://join?code=A7K9M2)
- [ ] Multiple invite codes (for privacy/security)
- [ ] Revoke active codes from settings

### Phase 3
- [ ] Partner approval flow (optional)
- [ ] Multiple partner support (e.g., roommates)
- [ ] Import existing expenses from other apps
- [ ] Backup codes in case primary code is lost

---

## Analytics & Monitoring

### Key Metrics to Track
1. **Onboarding Completion Rate**
   - % who complete sign up
   - % who generate invite code
   - % who successfully pair

2. **Time to Pair**
   - Average time from code generation to acceptance
   - Drop-off points in flow

3. **Code Usage**
   - Codes generated per day
   - Codes used per day
   - Code expiration rate
   - Invalid code attempts

4. **Error Rates**
   - Invalid code errors
   - Expired code errors
   - Network failures during pairing

### Monitoring Alerts
- Alert if pairing success rate drops below 80%
- Alert if invalid code attempts spike (possible abuse)
- Alert if average time-to-pair exceeds 24 hours

---

## Support & FAQs

### Common User Questions

**Q: What if I lost my invite code?**
A: You can generate a new code from the Partner Connect screen. Only the newest code will work.

**Q: Can I pair with multiple partners?**
A: Currently, Dividela supports one partner at a time. You can unpair and pair with a new partner from Settings.

**Q: What happens to our expenses if we unpair?**
A: All expense history is preserved. You can export it before unpairing. After unpairing, neither user can access the shared data.

**Q: My partner entered the code but we're not connected. What should I do?**
A: Check that both of you have internet connection. If issues persist, generate a new code and try again.

**Q: How secure is the invite code?**
A: Codes are randomly generated and expire after 7 days. They cannot be guessed or reused. However, don't share your code publicly.

---

## Conclusion

The Dividela onboarding and invite code system is designed to be:
- **Simple:** 6-digit codes are easy to share
- **Fast:** Complete pairing in under 60 seconds
- **Secure:** Codes expire and are single-use
- **Reliable:** Real-time validation and clear error messages
- **Delightful:** Celebration screen makes pairing feel special

This system removes friction from couple pairing while maintaining security and privacy.
