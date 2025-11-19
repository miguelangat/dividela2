# 🚀 Quick Analytics Setup (5 Minutes)

## Step 1: Get API Keys (2 min)

### Amplitude
1. Go to https://amplitude.com/ → Sign Up
2. Create project "Dividela"
3. Copy API Key from Settings

### Sentry  
1. Go to https://sentry.io/ → Sign Up
2. Create "React Native" project
3. Copy DSN from Settings → Client Keys

## Step 2: Configure Environment (1 min)

```bash
# Create .env file
cp .env.example .env

# Edit .env and add your keys:
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_key_here
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
EXPO_PUBLIC_ENABLE_ANALYTICS=true
```

## Step 3: Install & Run (2 min)

```bash
# Dependencies already installed!
npm start
```

## Step 4: Verify (30 sec)

1. **Check Console**: Look for:
   ```
   [Analytics] Amplitude initialized
   [Analytics] Sentry initialized
   ```

2. **Trigger Event**: Sign up or create expense

3. **Check Amplitude**: 
   - Go to https://analytics.amplitude.com/
   - Click "User Streams" 
   - See your event in real-time!

4. **Check Sentry**:
   - Go to https://sentry.io/
   - Throw a test error
   - See it appear in Issues tab

## That's it! 🎉

Now you're tracking:
✅ User signups, logins, logouts  
✅ Expense creation, updates, deletes  
✅ Feature usage  
✅ Errors and crashes  
✅ Performance metrics  
✅ Rage clicks  

## Next Steps

- Read full guide: [ANALYTICS_GUIDE.md](./ANALYTICS_GUIDE.md)
- Create custom dashboards in Amplitude
- Set up alerts in Sentry
- Track additional events as needed

---

**Questions?** Check [ANALYTICS_GUIDE.md](./ANALYTICS_GUIDE.md) for detailed documentation.
