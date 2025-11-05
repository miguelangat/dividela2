# Firebase Setup Instructions for Dividela

## Current Status

✅ **Project ID:** dividela-76aba
✅ **Admin SDK:** Configured (server-side)
⚠️ **Web App Config:** Needs completion

## What You Need to Do

You have a Firebase Admin SDK file, but your React Native app needs **Web App credentials**. Here's how to get them:

---

## Step-by-Step Guide

### Step 1: Access Firebase Console

1. Go to: https://console.firebase.google.com/
2. Sign in with your Google account
3. Click on the **"dividela-76aba"** project

### Step 2: Get Web App Configuration

#### Option A: If Web App Already Exists

1. Click the ⚙️ **Settings** icon (bottom left)
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Look for a web app with the </> icon
5. Click on it or click **"Config"**
6. You'll see a `firebaseConfig` object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...your_key_here",
  authDomain: "dividela-76aba.firebaseapp.com",
  projectId: "dividela-76aba",
  storageBucket: "dividela-76aba.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

7. **Copy these three values:**
   - `apiKey`
   - `messagingSenderId`
   - `appId`

#### Option B: If No Web App Exists

1. In **Project settings** > **"Your apps"** section
2. Click **"Add app"** button
3. Choose the **Web platform** icon (</>)
4. Enter app nickname: **"Dividela Web"**
5. ❌ **Do NOT** check "Also set up Firebase Hosting"
6. Click **"Register app"**
7. Copy the `firebaseConfig` values shown
8. Click **"Continue to console"**

### Step 3: Update Your .env File

Open `/home/mg/dividela2/.env` and replace these lines:

```bash
# Replace these three lines with your actual values:
EXPO_PUBLIC_FIREBASE_API_KEY=TODO_GET_FROM_CONSOLE
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=TODO_GET_FROM_CONSOLE
EXPO_PUBLIC_FIREBASE_APP_ID=TODO_GET_FROM_CONSOLE
```

With:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...your_actual_api_key
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
EXPO_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

---

## Step 4: Enable Firebase Services

### Enable Authentication

1. In Firebase Console, click **"Authentication"** (left sidebar)
2. Click **"Get started"** (if first time)
3. Go to **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. Toggle **"Enable"** switch
6. Click **"Save"**

### Create Firestore Database

1. Click **"Firestore Database"** (left sidebar)
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for now - we'll secure it later)
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.time < timestamp.date(2025, 12, 31);
       }
     }
   }
   ```
4. Select a location (choose closest to your users, e.g., `us-central`)
5. Click **"Enable"**

### Enable Cloud Storage (Optional for now)

1. Click **"Storage"** (left sidebar)
2. Click **"Get started"**
3. Choose **"Start in test mode"**
4. Use same location as Firestore
5. Click **"Done"**

---

## Step 5: Verify Configuration

After updating `.env`:

```bash
# Restart your dev server
# Press Ctrl+C to stop if running
npm start
```

### Expected Result

✅ App should start without errors
✅ No Firebase connection errors
✅ You should see the basic Dividela screen

### If You See Errors

**Error: "Invalid API key"**
- Double-check you copied the apiKey correctly
- Make sure there are no extra spaces
- Verify it starts with "AIza"

**Error: "Project not found"**
- Verify EXPO_PUBLIC_FIREBASE_PROJECT_ID is "dividela-76aba"
- Check you're using the correct Firebase project

**Error: "App not configured"**
- Make sure you created a Web app in Firebase Console
- Verify the appId matches what you copied

---

## Step 6: Test Firebase Connection

Once the app runs, you can test if Firebase is connected:

1. Open the app on your device (via Expo Go)
2. Check the terminal for any Firebase errors
3. Try signing up (once we build that screen)

---

## Quick Reference

### Your Firebase Project Details

| Setting | Value |
|---------|-------|
| Project ID | `dividela-76aba` |
| Project Name | dividela |
| Auth Domain | `dividela-76aba.firebaseapp.com` |
| Storage Bucket | `dividela-76aba.appspot.com` |
| Console URL | https://console.firebase.google.com/project/dividela-76aba |

### What Each Credential Does

| Credential | Purpose | Safe to Share? |
|------------|---------|----------------|
| `apiKey` | Identifies your Firebase project | ✅ Yes (protected by security rules) |
| `authDomain` | Domain for authentication | ✅ Yes |
| `projectId` | Unique project identifier | ✅ Yes |
| `storageBucket` | Cloud Storage location | ✅ Yes |
| `messagingSenderId` | For push notifications | ✅ Yes |
| `appId` | Identifies your specific app | ✅ Yes |

**Note:** These credentials are meant to be public in client apps. Security is enforced by Firestore Security Rules, not by hiding these values.

---

## Troubleshooting

### Can't Find Firebase Console

- Make sure you're signed in with the Google account that owns the project
- Check if you have access to the project
- Try this direct link: https://console.firebase.google.com/project/dividela-76aba/settings/general

### "Permission Denied" Errors

- Make sure you enabled Email/Password auth
- Verify Firestore is in test mode
- Check that you're signed in to the correct Google account

### App Won't Start

```bash
# Clear cache and restart
npx expo start -c
```

---

## Security Note

### Admin SDK File (dividela-76aba-firebase-adminsdk-*.json)

⚠️ **This file is for SERVER-SIDE use only!**

- ✅ Keep it in `.gitignore` (already done)
- ❌ **Never commit it to Git**
- ❌ **Never use it in React Native app**
- ❌ **Never deploy it with your app**
- ✅ Only use for backend/Cloud Functions (if needed later)

The web app credentials (what you're getting now) are safe to include in your React Native app.

---

## Next Steps

After Firebase is configured:

1. ✅ Update `.env` with real credentials
2. ✅ Enable Firebase services (Auth, Firestore)
3. ✅ Test app runs without errors
4. 🚀 **Start building screens!**

Use the prompts from `CLAUDE-CODE-PROMPTS.md` to build your first screen (WelcomeScreen.js).

---

## Need Help?

If you're stuck:
1. Check the Firebase Console for any errors
2. Verify all three credentials are copied correctly
3. Make sure Authentication and Firestore are enabled
4. Try clearing cache: `npx expo start -c`

**Ready to continue once Firebase is configured!** 🎉
