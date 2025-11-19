# 📊 Dividela Analytics & Monitoring Guide

## Overview

Dividela now includes comprehensive functional monitoring to track:
- Feature usage and adoption
- User behavior and journey
- Rage clicks and frustration signals
- Time-to-value metrics
- Error tracking and performance
- Onboarding funnel conversion

## 🎯 Tech Stack

| Tool | Purpose | Cost |
|------|---------|------|
| **Amplitude** | Product analytics & event tracking | Free (10M events/month) |
| **Sentry** | Error tracking & performance monitoring | Free (5K errors/month) |
| **Firebase Analytics** | Backup tracking (optional) | Free (unlimited) |

---

## 🚀 Quick Start

### 1. Get Your API Keys

#### Amplitude Setup:
1. Sign up at [https://amplitude.com/](https://amplitude.com/)
2. Create a new project: "Dividela"
3. Navigate to **Settings → Projects → [Your Project]**
4. Copy the **API Key**

#### Sentry Setup:
1. Sign up at [https://sentry.io/](https://sentry.io/)
2. Create a new **React Native** project
3. Navigate to **Settings → Projects → [Your Project] → Client Keys (DSN)**
4. Copy the **DSN** (looks like `https://xxx@sentry.io/xxx`)

### 2. Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Analytics & Monitoring
EXPO_PUBLIC_AMPLITUDE_API_KEY=your_amplitude_api_key_here
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
EXPO_PUBLIC_ENABLE_ANALYTICS=true  # Set to false for local development
```

### 3. Run the App

```bash
npm install
npm start
```

Analytics will automatically initialize on app startup!

---

## 📈 Tracked Events

### Authentication Events

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `user_signed_up` | `method` (email/google/apple), `timestamp` | User creates account |
| `user_signed_in` | `method` | User logs in |
| `user_signed_out` | - | User logs out |
| `partner_connected` | `coupleId` | User connects with partner |

### Expense Events

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `expense_created` | `category`, `amountRange`, `hasNote`, `split` | New expense added |
| `expense_updated` | `category`, `hasAmountChange`, `hasCategoryChange` | Expense edited |
| `expense_deleted` | - | Expense removed |

**Note**: Exact expense amounts are NEVER sent. Amounts are anonymized into ranges (e.g., "0-10", "11-50", "51-100").

### Budget Events

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `budget_created` | `period`, `totalBudget` (anonymized) | Monthly/annual budget created |
| `budget_updated` | `hasAllocationChange`, `hasTotalChange` | Budget modified |
| `budget_exceeded` | `category`, `percentOver` | Category budget exceeded |

### Settlement Events

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `settlement_created` | `amountRange`, `method` | Payment recorded |
| `settlement_history_viewed` | - | Settlement history opened |

### Onboarding Events

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `onboarding_step_completed` | `step_name`, `timestamp` | Each onboarding step |
| `onboarding_completed` | `duration_minutes` | Onboarding finished |

### Feature Usage Events

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `feature_used` | `feature_name`, `timestamp` | Any feature used |
| `screen_viewed` | `screen_name` | Screen navigated to |
| `csv_exported` | `record_count` | Data exported |
| `language_changed` | `from_lang`, `to_lang` | Language switched |

### Rage Click Events

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `rage_click_detected` | `element_id`, `click_count` | 4+ rapid clicks (within 2 seconds) |

### Error Events

| Event Name | Properties | When Triggered |
|------------|-----------|----------------|
| `error_occurred` | `error_message`, `error_type`, `component_stack` | Any JavaScript error |

---

## 🔐 Privacy & Security

### What We Track

✅ **Anonymous identifiers**: User IDs are hashed (SHA-256)  
✅ **Email hashes**: Emails are hashed before sending  
✅ **Amount ranges**: Exact amounts converted to ranges  
✅ **Feature usage**: Which features are used  
✅ **Error context**: Error messages without PII  

### What We DON'T Track

❌ **Exact expense amounts**: Only ranges (e.g., "$0-10")  
❌ **Plain email addresses**: Always hashed  
❌ **IP addresses**: Disabled in configuration  
❌ **Personal notes**: Never sent to analytics  
❌ **Partner names**: Only anonymized IDs  

### GDPR Compliance

- All PII is hashed or anonymized
- Users can opt out by setting `EXPO_PUBLIC_ENABLE_ANALYTICS=false`
- Data retention: 30-90 days (configurable in Amplitude)
- Self-hosting option available (PostHog)

---

## 📊 Key Metrics Dashboards

### 1. Executive Dashboard

**Track**:
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Retention (D1, D7, D30)
- Time to onboard (median, p95)
- Time to first expense

**Amplitude Query**:
```
Event: user_signed_up
Segmentation: Cohort Analysis
Retention: Return to Any Active Event
```

### 2. Feature Adoption

**Track**:
- Most used features
- Feature adoption rate
- Feature drop-off

**Amplitude Query**:
```
Event: feature_used
Group by: feature_name
Chart: Event Totals
```

### 3. Onboarding Funnel

**Steps**:
1. Sign Up → 2. Partner Connected → 3. Budget Created → 4. First Expense Logged

**Amplitude Query**:
```
Funnel:
1. user_signed_up
2. partner_connected  
3. budget_created
4. expense_created
```

### 4. Rage Click Analysis

**Track**:
- Where users are frustrated
- Which buttons/elements cause issues

**Amplitude Query**:
```
Event: rage_click_detected
Group by: element_id
Filter: Last 7 days
```

---

## 💻 Adding Custom Tracking

### Track a Custom Event

```javascript
import { trackEvent } from '../services/analyticsService';

// Simple event
await trackEvent('button_clicked', {
  button_name: 'export_csv',
  screen: 'settings',
});

// Event with sensitive data (will be anonymized)
await trackEvent('payment_made', {
  amount: 150.50,  // Will become "101-500"
  method: 'credit_card',
});
```

### Track Feature Usage

```javascript
import { trackFeatureUsage } from '../services/analyticsService';

await trackFeatureUsage('csv_export', {
  record_count: 42,
  format: 'csv',
});
```

### Track Rage Clicks

```javascript
import { trackRageClick } from '../services/analyticsService';

<TouchableOpacity
  onPress={() => {
    trackRageClick('submit_button', { screen: 'add_expense' });
    handleSubmit();
  }}
>
  <Text>Submit</Text>
</TouchableOpacity>
```

### Track Time-to-Value

```javascript
import { trackTimeToValue } from '../services/analyticsService';

const startTime = Date.now();
// ... user completes onboarding ...
const duration = Date.now() - startTime;

await trackTimeToValue('time_to_onboard', duration, {
  steps_completed: 5,
  had_issues: false,
});
```

### Track Screen Views

```javascript
import { trackScreen } from '../services/analyticsService';

useEffect(() => {
  trackScreen('AddExpenseScreen', {
    category_preselected: !!route.params?.category,
  });
}, []);
```

---

## 🐛 Error Tracking with Sentry

Errors are automatically captured! But you can add custom context:

```javascript
import { trackError, addBreadcrumb } from '../services/analyticsService';

// Add context before error
await addBreadcrumb('Loading user data', {
  user_id: userId,
  action: 'fetch_profile',
});

// Manual error tracking
try {
  await riskyOperation();
} catch (error) {
  await trackError(error, {
    context: 'user_profile_load',
    retry_count: 3,
  });
  throw error;
}
```

---

## 📦 Onboarding Tracking Example

```javascript
import { trackOnboardingStep, trackTimeToValue } from '../services/analyticsService';

// Track each step
await trackOnboardingStep('budget_setup', {
  budget_type: 'simple',
  has_savings_goal: true,
});

// Track completion
const onboardingDuration = Date.now() - userCreatedAt;
await trackTimeToValue('time_to_onboard', onboardingDuration, {
  steps_completed: 5,
  skipped_advanced: false,
});
```

---

## 🔍 Viewing Your Data

### Amplitude Dashboard

1. Go to [https://analytics.amplitude.com/](https://analytics.amplitude.com/)
2. Select your project
3. Navigate to:
   - **Events**: See all tracked events
   - **Charts**: Create custom visualizations
   - **Funnels**: Analyze user journeys
   - **Retention**: Measure user stickiness
   - **User Streams**: Watch individual user sessions

### Sentry Dashboard

1. Go to [https://sentry.io/](https://sentry.io/)
2. Select your project
3. Navigate to:
   - **Issues**: See all errors
   - **Performance**: Screen load times, API calls
   - **Releases**: Correlate errors with deployments
   - **Alerts**: Configure error notifications

---

## 🧪 Testing Analytics

### Development Mode

Set `EXPO_PUBLIC_ENABLE_ANALYTICS=false` to disable tracking during development.

### Testing Events

```javascript
// Enable analytics in dev
EXPO_PUBLIC_ENABLE_ANALYTICS=true

// Trigger an event
await trackEvent('test_event', { test: true });

// Check console logs
// Look for: "[Analytics] Event tracked: test_event"

// Verify in Amplitude:
// - Go to User Streams
// - Find your hashed user ID
// - See event in real-time
```

### Testing Errors

```javascript
// Throw a test error
throw new Error('Test error for Sentry');

// Check Sentry dashboard within 1 minute
```

---

## 📊 Recommended Dashboards

### 1. Product Health

```
Metrics:
- Error rate (errors per session)
- Crash-free session rate
- Average session duration
- Screen load times (p50, p95)
```

### 2. User Engagement

```
Metrics:
- DAU/MAU ratio
- Average expenses per user per week
- Budget creation rate
- Settlement frequency
```

### 3. Onboarding Performance

```
Funnel:
1. Sign Up Started
2. Sign Up Completed
3. Partner Connected
4. Fiscal Year Set
5. Budget Created
6. First Expense Logged

Conversion rates at each step
```

---

## 🚨 Alerts & Notifications

### Recommended Sentry Alerts

1. **High Error Rate**: >10 errors/hour
2. **New Error Type**: First occurrence of new error
3. **Performance Degradation**: Screen load >3 seconds

### Recommended Amplitude Alerts

1. **Onboarding Drop-Off**: <50% completion rate
2. **Feature Adoption Drop**: 20% decrease week-over-week
3. **Rage Click Spike**: >10 rage clicks per hour

---

## 🛠️ Troubleshooting

### Events Not Showing in Amplitude

1. **Check API Key**: Verify `EXPO_PUBLIC_AMPLITUDE_API_KEY` is correct
2. **Check Console**: Look for `[Analytics] Event tracked:` logs
3. **Check Initialization**: Look for `[Analytics] Amplitude initialized`
4. **Wait**: Events can take 1-2 minutes to appear
5. **Check Filter**: Ensure Amplitude dashboard filter is "Last 24 hours"

### Errors Not Showing in Sentry

1. **Check DSN**: Verify `EXPO_PUBLIC_SENTRY_DSN` is correct
2. **Check Console**: Look for `[Analytics] Sentry initialized`
3. **Check Breadcrumbs**: Sentry → Issues → [Error] → Breadcrumbs
4. **Sampling**: Check `tracesSampleRate` in analyticsService.js

### Analytics Disabled

1. **Check ENV**: Ensure `EXPO_PUBLIC_ENABLE_ANALYTICS=true`
2. **Restart App**: Changes to .env require restart
3. **Check Logs**: Look for `[Analytics] Analytics disabled via env variable`

---

## 📚 Best Practices

### Do's ✅

- Track user journeys (sign up → first expense)
- Track feature adoption over time
- Monitor error trends weekly
- Review rage clicks monthly
- Anonymize all PII before sending
- Use descriptive event names
- Add relevant context to events

### Don'ts ❌

- Don't track exact amounts (use ranges)
- Don't send plain email addresses
- Don't track personal notes/comments
- Don't create overly generic events (e.g., "click")
- Don't track every single tap/interaction
- Don't ignore privacy regulations
- Don't forget to test events

---

## 🔗 Resources

- [Amplitude Documentation](https://www.docs.developers.amplitude.com/)
- [Sentry React Native Guide](https://docs.sentry.io/platforms/react-native/)
- [Firebase Analytics](https://firebase.google.com/docs/analytics)
- [GDPR Compliance Guide](https://amplitude.com/gdpr)
- [Event Tracking Best Practices](https://amplitude.com/blog/event-tracking-best-practices)

---

## 🎯 Next Steps

1. ✅ **Set up your API keys** (Amplitude + Sentry)
2. ✅ **Test events** in development mode
3. ✅ **Create dashboards** in Amplitude
4. ✅ **Set up alerts** in Sentry
5. ✅ **Monitor weekly** for insights
6. ✅ **Iterate** based on data

---

## 📝 Event Tracking Checklist

Use this checklist to add tracking to new features:

- [ ] Identify the feature/user action
- [ ] Choose descriptive event name (verb_noun format)
- [ ] List relevant properties (anonymize PII)
- [ ] Import tracking function
- [ ] Add tracking call
- [ ] Test in development
- [ ] Verify event in Amplitude
- [ ] Update this documentation
- [ ] Create dashboard visualization

---

## 💡 Questions?

For issues or questions about analytics implementation:
1. Check console logs for `[Analytics]` messages
2. Review this guide
3. Check Amplitude/Sentry documentation
4. Review `src/services/analyticsService.js` code

---

**Built with ❤️ for privacy-first product analytics**
