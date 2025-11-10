# OAuth Setup Guide for Dividela

This guide will help you configure Google and Apple sign-in for your Dividela app in the Firebase Console.

## Prerequisites

- Firebase project already created (dividela-76aba)
- Access to Firebase Console
- (For Apple Sign-In) Apple Developer account

---

## Google Sign-In Setup

### Step 1: Enable Google Provider in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **dividela-76aba**
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** in the providers list
5. Click **Enable** toggle
6. Enter a **Project support email** (your email)
7. Click **Save**

### Step 2: Configure Authorized Domains

Firebase automatically adds common domains, but you may need to add custom ones:

1. In **Authentication** → **Settings** → **Authorized domains**
2. Ensure these domains are listed:
   - `localhost` (for local development)
   - `dividela-76aba.web.app` (your Firebase Hosting URL)
   - `dividela-76aba.firebaseapp.com` (alternate Firebase URL)
3. If you have a custom domain, add it here

### Step 3: Test Google Sign-In

That's it! Google Sign-In should now work. Test it:

1. Run your app locally: `npm start`
2. Click "Continue with Google"
3. Select a Google account
4. You should be signed in successfully

**Common Issues:**
- **Popup blocked**: Enable popups in your browser for localhost
- **Unauthorized domain**: Add the domain to Authorized domains list

---

## Apple Sign-In Setup

### Step 1: Apple Developer Account Requirements

To use Apple Sign-In, you need:

1. **Apple Developer Account** ($99/year)
   - Sign up at: https://developer.apple.com/programs/
2. **App ID** configured with Sign in with Apple capability
3. **Service ID** for web authentication

### Step 2: Create App ID (Apple Developer Console)

1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** (Add button)
4. Select **App IDs** → Click **Continue**
5. Fill in:
   - **Description**: Dividela App
   - **Bundle ID**: `com.dividela.app` (or your chosen ID)
6. Under **Capabilities**, enable **Sign In with Apple**
7. Click **Continue** → **Register**

### Step 3: Create Service ID (Apple Developer Console)

1. In **Identifiers** → Click **+** again
2. Select **Services IDs** → Click **Continue**
3. Fill in:
   - **Description**: Dividela Web
   - **Identifier**: `com.dividela.web` (must be different from App ID)
4. Click **Continue** → **Register**
5. Click on your newly created Service ID
6. Enable **Sign In with Apple**
7. Click **Configure** next to Sign In with Apple
8. Fill in:
   - **Primary App ID**: Select your App ID created earlier
   - **Web Domain**: `dividela-76aba.web.app`
   - **Return URLs**:
     - `https://dividela-76aba.firebaseapp.com/__/auth/handler`
     - Add `http://localhost:8081/__/auth/handler` for local testing
9. Click **Save** → **Continue** → **Register**

### Step 4: Create Private Key (Apple Developer Console)

1. Navigate to **Keys** → Click **+**
2. Fill in:
   - **Key Name**: Dividela Apple Sign In Key
3. Enable **Sign In with Apple**
4. Click **Configure** next to Sign In with Apple
5. Select your **Primary App ID**
6. Click **Save** → **Continue** → **Register**
7. Click **Download** to get the `.p8` key file
8. **IMPORTANT**: Save the **Key ID** (shown after download) - you can't retrieve it later
9. **IMPORTANT**: Save the `.p8` file securely - you can't download it again

### Step 5: Enable Apple Provider in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **dividela-76aba**
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Apple** in the providers list
5. Click **Enable** toggle
6. Fill in the required information:
   - **Service ID**: `com.dividela.web` (from Step 3)
   - **Apple Team ID**: Found in Apple Developer Console → Membership
   - **Key ID**: From Step 4 (when you created the key)
   - **Private Key**: Open the `.p8` file and paste contents
7. Click **Save**

### Step 6: Add OAuth Redirect Domain (if needed)

1. In Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Ensure `dividela-76aba.firebaseapp.com` is listed
3. This is required for Apple's OAuth flow

### Step 7: Test Apple Sign-In

Test the implementation:

1. Deploy to Firebase Hosting: `npm run deploy`
2. Visit your live URL: `https://dividela-76aba.web.app`
3. Click "Continue with Apple"
4. Sign in with your Apple ID
5. You should be authenticated successfully

**Common Issues:**
- **"invalid_client" error**: Double-check Service ID matches in both Apple and Firebase
- **"redirect_uri_mismatch"**: Ensure Return URLs in Apple Developer Console match Firebase's auth handler URL
- **Popup blocked**: Enable popups in your browser
- **Missing Team ID**: Go to Apple Developer Console → Membership → Team ID

---

## Security Best Practices

### 1. Protect Your Private Keys

- **NEVER** commit the `.p8` file to version control
- Store it securely (password manager, secure vault)
- The `.p8` file is already in `.gitignore` for safety

### 2. Monitor Sign-In Attempts

1. Go to Firebase Console → **Authentication** → **Users**
2. Monitor for unusual sign-in patterns
3. Check the **Sign-in method** column to see which provider users chose

### 3. Handle Account Linking

If a user tries to sign in with Google but already has an account with the same email via email/password:

- Firebase will throw `auth/account-exists-with-different-credential`
- The app shows: "An account already exists with the same email. Try a different sign-in method."
- Users should use their original sign-in method

---

## Testing Checklist

### Google Sign-In
- [ ] Google provider enabled in Firebase
- [ ] Authorized domains configured
- [ ] Local testing works (localhost)
- [ ] Production testing works (Firebase Hosting URL)
- [ ] New user account creation works
- [ ] Returning user sign-in works
- [ ] Error handling works (popup blocked, cancelled)

### Apple Sign-In
- [ ] Apple Developer account active
- [ ] App ID created with Sign In with Apple capability
- [ ] Service ID created and configured
- [ ] Private key downloaded and saved
- [ ] Apple provider enabled in Firebase with correct credentials
- [ ] Return URLs match Firebase auth handler
- [ ] Production testing works (Firebase Hosting URL)
- [ ] New user account creation works
- [ ] Returning user sign-in works
- [ ] Error handling works (popup blocked, cancelled)

---

## Cost Summary

### Google Sign-In
- **Cost**: FREE
- No additional charges

### Apple Sign-In
- **Apple Developer Account**: $99/year (required)
- **Firebase**: FREE (included in Spark plan)

### Total for Both Providers
- **Year 1**: $99 (Apple Developer membership)
- **Ongoing**: $99/year

---

## Troubleshooting

### Google Issues

**Problem**: "Popup blocked" error
**Solution**: Allow popups for your domain in browser settings

**Problem**: "Unauthorized domain" error
**Solution**: Add the domain to Firebase Authentication → Settings → Authorized domains

**Problem**: User sees "Sign-in cancelled"
**Solution**: This is normal if user closes popup - not an error

### Apple Issues

**Problem**: "invalid_client" error
**Solution**:
- Verify Service ID in Firebase matches Apple Developer Console exactly
- Check that Team ID is correct
- Ensure Key ID matches the downloaded key

**Problem**: "redirect_uri_mismatch" error
**Solution**:
- Add `https://dividela-76aba.firebaseapp.com/__/auth/handler` to Return URLs in Apple Service ID configuration
- Ensure no typos in the URL

**Problem**: "invalid_grant" error
**Solution**:
- Re-check the Private Key (.p8 file contents) pasted into Firebase
- Ensure Key ID is correct

**Problem**: Apple Sign-In works on web but not locally
**Solution**:
- Add `http://localhost:8081/__/auth/handler` to Apple Service ID Return URLs
- Use the correct port that Expo is running on

---

## Next Steps

After OAuth is working:

1. **Test thoroughly** with both new and returning users
2. **Monitor authentication logs** in Firebase Console
3. **Collect user feedback** on sign-in experience
4. **Consider adding more providers** (Facebook, GitHub, etc.) if needed
5. **Implement account deletion** flow (required by Apple)

---

## Support Resources

- **Firebase Auth Docs**: https://firebase.google.com/docs/auth/web/google-signin
- **Apple Sign-In Docs**: https://firebase.google.com/docs/auth/web/apple
- **Apple Developer Console**: https://developer.apple.com/account/
- **Firebase Console**: https://console.firebase.google.com/

---

## Summary

You now have OAuth authentication configured! Users can sign in with:
- ✅ Email/Password (existing)
- ✅ Google (FREE)
- ✅ Apple ($99/year for developer account)

Remember to test thoroughly before going live!
