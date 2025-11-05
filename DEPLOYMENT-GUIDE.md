# Firebase Hosting Deployment Guide for Dividela

This guide will help you deploy your Dividela web app to Firebase Hosting.

## Prerequisites

1. **Firebase CLI** installed globally
2. **Firebase Project** already created (you should have this since you're using Firebase)
3. **Node.js and npm** installed

---

## Step-by-Step Deployment

### 1. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

This will open a browser window for you to authenticate with your Google account.

### 3. Configure Your Firebase Project ID

Open the `.firebaserc` file in the root directory and replace `YOUR_FIREBASE_PROJECT_ID` with your actual Firebase project ID.

You can find your project ID in the Firebase Console:
- Go to https://console.firebase.google.com/
- Select your project
- Click on Project Settings (gear icon)
- Copy the "Project ID"

Edit `.firebaserc`:
```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 4. Build Your Web App

```bash
npm run build:web
```

This will create an optimized production build in the `dist/` directory.

**Note**: The first build may take 2-3 minutes. Subsequent builds will be faster.

### 5. Deploy to Firebase Hosting

```bash
npm run deploy
```

Or manually:
```bash
firebase deploy --only hosting
```

This command will:
- Build your web app
- Upload all files to Firebase Hosting
- Deploy to your live URL

### 6. Access Your Live App

After deployment completes, you'll see output like:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR-PROJECT-ID/overview
Hosting URL: https://YOUR-PROJECT-ID.web.app
```

Your app is now live at: **`https://YOUR-PROJECT-ID.web.app`**

You'll also have: **`https://YOUR-PROJECT-ID.firebaseapp.com`**

---

## Quick Deploy (After Initial Setup)

Once you've completed the initial setup, deploying updates is simple:

```bash
npm run deploy
```

That's it! Your changes will be live in ~2 minutes.

---

## Custom Domain Setup (Optional)

If you want to use a custom domain (e.g., dividela.com):

### 1. Add Custom Domain in Firebase Console

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain name
4. Firebase will provide DNS records

### 2. Configure DNS

Add the provided DNS records to your domain registrar:
- Type: A
- Name: @ (or your subdomain)
- Value: (provided by Firebase)

### 3. Wait for SSL

Firebase automatically provisions an SSL certificate (can take up to 24 hours).

---

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clear cache and rebuild
rm -rf dist node_modules/.cache
npm run build:web
```

### Deployment Fails

```bash
# Check if you're logged in
firebase login --reauth

# Check project configuration
firebase projects:list
```

### Assets Not Loading

Make sure your `assets/` folder exists with:
- `icon.png` (512x512 px)
- `splash.png` (1242x2436 px)
- `favicon.png` (48x48 px)

If you don't have these yet, the app will still deploy but may show default icons.

---

## Deployment Checklist

- [ ] Firebase CLI installed
- [ ] Logged into Firebase (`firebase login`)
- [ ] Updated `.firebaserc` with your project ID
- [ ] Built app successfully (`npm run build:web`)
- [ ] Deployed to hosting (`npm run deploy`)
- [ ] Tested live URL
- [ ] (Optional) Configured custom domain

---

## Free Tier Limits

Firebase Hosting free tier includes:
- **Storage**: 10 GB
- **Bandwidth**: 360 MB/day (~10 GB/month)
- **SSL Certificate**: Included
- **Custom Domain**: Included

This is sufficient for:
- ~10,000 page views/month
- ~100 active users/day
- Small-to-medium sized apps

---

## Cost Estimation

### Staying Free Forever

If you stay within these limits, hosting remains **FREE**:
- < 10,000 monthly active users
- < 10 GB storage
- < 360 MB/day bandwidth

### When You Grow

If you exceed free limits, Firebase charges:
- **Storage**: $0.026/GB/month
- **Bandwidth**: $0.15/GB

Example for 50,000 users/month: ~$5-10/month

---

## CI/CD (GitHub Actions) - Optional

To auto-deploy on git push, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase Hosting
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build:web
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: YOUR-PROJECT-ID
```

---

## Support

- **Firebase Docs**: https://firebase.google.com/docs/hosting
- **Expo Web Docs**: https://docs.expo.dev/workflow/web/

---

## Summary

Your deployment is now configured! Simply run:

```bash
npm run deploy
```

And your app will be live at `https://YOUR-PROJECT-ID.web.app` ✅
