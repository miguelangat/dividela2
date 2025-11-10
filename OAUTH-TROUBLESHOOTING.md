# OAuth Troubleshooting Guide

## Quick Checklist

If Google/Apple sign-in isn't working, follow these steps:

### 1. Enable OAuth Providers in Firebase Console

**This is the MOST COMMON issue - the providers need to be enabled first!**

#### Enable Google Sign-In (5 minutes):
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **dividela-76aba**
3. Go to **Authentication** → **Sign-in method**
4. Click on **Google** in the Sign-in providers list
5. Toggle **Enable**
6. Add your email as "Project support email"
7. Click **Save**

#### Enable Apple Sign-In (requires Apple Developer account):
- Follow the complete guide in [OAUTH-SETUP-GUIDE.md](OAUTH-SETUP-GUIDE.md)
- This requires an Apple Developer account ($99/year)

### 2. Check Browser Console for Errors

Open your browser's Developer Tools (F12) and check the Console tab for errors:

**Common Error Messages:**

#### "auth/operation-not-allowed"
```
Error: Firebase: This operation is not allowed. You must enable this service in the console. (auth/operation-not-allowed)
```
**Solution**: Enable the OAuth provider in Firebase Console (see Step 1 above)

#### "auth/unauthorized-domain"
```
Error: Firebase: This domain is not authorized for OAuth operations. (auth/unauthorized-domain)
```
**Solution**:
1. Go to Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your domain:
   - For local: `localhost`
   - For production: `dividela-76aba.web.app`

#### "auth/popup-blocked"
```
Error: The popup has been blocked by the browser
```
**Solution**: Allow popups for your site in browser settings

#### "auth/popup-closed-by-user"
```
Error: The popup has been closed by the user before finalizing the operation
```
**Solution**: This is normal - user just cancelled, not an actual error

### 3. Test the OAuth Flow

1. **Open the app** in your browser (http://localhost:8081)
2. **Navigate to Sign In** screen
3. **Click "Continue with Google"** or **"Continue with Apple"**
4. **Watch the browser console** for any error messages
5. **Check if popup opens** - if not, enable popups
6. **Complete the OAuth flow** in the popup

### 4. Verify Firebase Configuration

Check that your [src/config/firebase.js](src/config/firebase.js) has valid credentials:

```javascript
const firebaseConfig = {
  apiKey: "...",  // Should be populated
  authDomain: "dividela-76aba.firebaseapp.com",
  projectId: "dividela-76aba",
  // ... other fields
};
```

If any fields are missing or say "YOUR_...", you need to add your real Firebase credentials.

### 5. Check Network Tab

1. Open browser **Developer Tools** (F12)
2. Go to **Network** tab
3. Click an OAuth button
4. Look for failed requests (red status codes)
5. Check the response for error details

### 6. Verify Code Implementation

Check that the OAuth methods are properly exported in [src/contexts/AuthContext.js](src/contexts/AuthContext.js:322-323):

```javascript
const value = {
  user,
  userDetails,
  loading,
  error,
  signUp,
  signIn,
  signOut,
  signInWithGoogle,  // ← Should be here
  signInWithApple,   // ← Should be here
  updateUserDetails,
  updatePartnerInfo,
  getPartnerDetails,
  hasPartner,
};
```

And that the buttons are wired up in [src/screens/auth/SignInScreen.js](src/screens/auth/SignInScreen.js:167-188):

```javascript
// Apple button should have onPress={handleAppleSignIn}
// Google button should have onPress={handleGoogleSignIn}
```

## Step-by-Step Debugging

### Step 1: Enable Google in Firebase Console

**Time: 2 minutes**

1. Go to: https://console.firebase.google.com/project/dividela-76aba/authentication/providers
2. Click "Google" in the list
3. Toggle "Enable" to ON
4. Enter your email in "Project support email"
5. Click "Save"

✅ **Google OAuth should now work!**

### Step 2: Test Google Sign-In

1. Refresh your app in the browser
2. Click "Continue with Google"
3. **Expected behavior**:
   - Popup opens with Google sign-in
   - Select a Google account
   - Popup closes
   - You are signed in and redirected

4. **If it doesn't work**:
   - Open browser console (F12)
   - Look for error messages
   - See "Common Error Messages" section above

### Step 3: Enable Apple (Optional - requires $99 Apple Developer account)

Follow the full guide in [OAUTH-SETUP-GUIDE.md](OAUTH-SETUP-GUIDE.md) if you want Apple sign-in.

**Apple sign-in requires**:
- Apple Developer account ($99/year)
- Creating App ID and Service ID
- Generating private key
- Configuring in both Apple and Firebase consoles
- Takes ~30 minutes first time

**You can skip this and use Google + Email/Password for now.**

## Testing Without Firebase Console Access

If you can't access Firebase Console right now, you can still test that the buttons work:

1. Click "Continue with Google" or "Continue with Apple"
2. You should see:
   - Loading spinner appears on the button
   - Error appears: "This operation is not allowed..."
   - This confirms the code is working, just needs Firebase setup

## What Should Happen When It Works

### Google Sign-In Success Flow:

1. User clicks "Continue with Google"
2. Button shows loading spinner
3. Popup window opens with Google sign-in
4. User selects Google account
5. Popup closes
6. Console logs:
   ```
   AuthContext: Auth state changed, user logged in: [user-id]
   AuthContext: Fetching user document from Firestore...
   ```
7. If new user:
   ```
   Created user document for new Google sign-in user
   ```
8. User is automatically redirected based on partner status

### Apple Sign-In Success Flow:

Same as Google, but with Apple's sign-in interface.

## Still Not Working?

### Check These:

1. **Is the code saved?** Refresh the browser
2. **Is Firebase Console setup done?** Enable providers
3. **Are there console errors?** Check browser console
4. **Is popup blocked?** Allow popups for localhost
5. **Is internet working?** OAuth requires network

### Get More Help:

1. Check Firebase Console → Authentication → Users to see if accounts are being created
2. Check Firebase Console → Authentication → Sign-in method → Errors (if any)
3. Look at browser console for the full error stack trace
4. Share the console error message for specific debugging

## Quick Test Commands

### Test if OAuth providers are available:
```javascript
// In browser console:
console.log(typeof signInWithGoogle); // Should log: "function"
console.log(typeof signInWithApple);  // Should log: "function"
```

### Test Firebase Auth instance:
```javascript
// In browser console:
import { auth } from './src/config/firebase';
console.log(auth); // Should show Firebase Auth instance
```

## Next Steps After OAuth Works

Once you get OAuth working:

1. ✅ Test with multiple accounts
2. ✅ Test new user flow (creates user document)
3. ✅ Test returning user flow (fetches existing document)
4. ✅ Test error handling (cancel popup, block popup)
5. ✅ Deploy to Firebase Hosting: `npm run deploy`
6. ✅ Test on production URL

## Summary

**Most likely issue**: OAuth providers not enabled in Firebase Console

**Solution**: Go to Firebase Console → Authentication → Sign-in method → Enable Google (and optionally Apple)

**Time to fix**: 2-5 minutes for Google, 30+ minutes for Apple

**Cost**: Google is FREE, Apple requires $99/year Developer account
