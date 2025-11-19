# 🐛 Sentry Dashboard Setup Guide

Complete configuration for error tracking and performance monitoring in Sentry.

---

## Quick Links

- [Getting Started](#getting-started)
- [Error Dashboard](#1-error-dashboard)
- [Performance Dashboard](#2-performance-dashboard)
- [Alerts Configuration](#3-alerts-configuration)
- [Release Tracking](#4-release-tracking)
- [Best Practices](#best-practices)

---

## Getting Started

### Initial Setup

1. Sign up at [https://sentry.io/](https://sentry.io/)
2. Create **React Native** project: "Dividela"
3. Copy DSN from Settings → Client Keys
4. Add to `.env`: `EXPO_PUBLIC_SENTRY_DSN=your_dsn_here`
5. Run app and verify events appearing

### Sentry Concepts

- **Issues**: Grouped errors (similar errors collapsed into one)
- **Events**: Individual error occurrences
- **Releases**: Code versions for tracking regressions
- **Performance**: Transaction traces and spans

---

## 1. Error Dashboard

### Default Dashboard Setup

Sentry creates a default dashboard automatically. Let's customize it:

1. Navigate to **Dashboards** → **Dashboard**
2. Click **Edit Dashboard**
3. Add/modify widgets below

---

### Widget 1: Error Volume

**Purpose**: Track total errors over time

**Configuration**:
```
Type: Line Chart
Query: count()
Group by: time
Filter: None
Display: Last 7 days
```

**Steps**:
1. Click **Add Widget**
2. Select **Issues** → **Time Series**
3. Metric: `count()`
4. Title: "Error Volume - 7 Days"
5. Display: `Last 7 days`
6. **Add to Dashboard**

---

### Widget 2: Errors by Screen

**Purpose**: Identify which screens have the most errors

**Configuration**:
```
Type: Table
Query: count()
Group by: transaction (or custom tag: screen_name)
Sort by: Count (desc)
Limit: Top 10
```

**Steps**:
1. Add Widget → **Issues** → **Table**
2. Metric: `count()`
3. Group by: `transaction` (this captures screen/route)
4. Sort: `Count descending`
5. Rows: `10`
6. Title: "Errors by Screen"
7. **Add to Dashboard**

---

### Widget 3: Unique Users Affected

**Purpose**: Understand error impact on users

**Configuration**:
```
Type: Big Number
Query: count_unique(user)
Display: Last 24 hours
```

**Steps**:
1. Add Widget → **Issues** → **Big Number**
2. Metric: `count_unique(user)`
3. Display: `Last 24 hours`
4. Title: "Users Affected (24h)"
5. **Add to Dashboard**

---

### Widget 4: Top 5 Issues

**Purpose**: Prioritize which errors to fix first

**Configuration**:
```
Type: Table
Query: count()
Filter: is:unresolved
Sort by: Event count
Limit: 5
```

**Steps**:
1. Add Widget → **Issues** → **Table**
2. Metric: `count()`
3. Filter: Add `is:unresolved`
4. Sort: `Event Count descending`
5. Columns: `Issue`, `Event Count`, `Users Affected`, `Last Seen`
6. Rows: `5`
7. Title: "Top 5 Unresolved Issues"
8. **Add to Dashboard**

---

### Widget 5: Crash-Free Session Rate

**Purpose**: Overall app stability metric

**Configuration**:
```
Type: Big Number
Query: crash_free_rate()
Display: Last 7 days
Format: Percentage
```

**Steps**:
1. Add Widget → **Sessions** → **Big Number**
2. Metric: `crash_free_rate()`
3. Display: `Last 7 days`
4. Format: `Percentage`
5. Title: "7-Day Crash-Free Rate"
6. Goal: Display in green if >99%
7. **Add to Dashboard**

**Target**: >99% is good, >99.5% is excellent

---

### Widget 6: Error Rate by Release

**Purpose**: Track if new releases introduce more errors

**Configuration**:
```
Type: Line Chart
Query: count()
Group by: release
Display: Last 14 days
```

**Steps**:
1. Add Widget → **Issues** → **Time Series**
2. Metric: `count()`
3. Group by: `release`
4. Display: `Last 14 days`
5. Show: `Top 5 releases`
6. Title: "Errors by Release Version"
7. **Add to Dashboard**

---

### Widget 7: Error Types Distribution

**Purpose**: Categorize errors (network, TypeError, etc.)

**Configuration**:
```
Type: Pie Chart
Query: count()
Group by: error.type
Display: Last 7 days
```

**Steps**:
1. Add Widget → **Issues** → **Pie Chart**
2. Metric: `count()`
3. Group by: `error.type`
4. Display: `Last 7 days`
5. Limit: `Top 8 types`
6. Title: "Error Types"
7. **Add to Dashboard**

---

### Final Error Dashboard Layout

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│   Error Volume       │  Crash-Free Rate     │  Users Affected      │
│   (Line Chart)       │  (Big Number)        │  (Big Number)        │
├──────────────────────┴──────────────────────┴──────────────────────┤
│                     Top 5 Unresolved Issues                         │
│                          (Table)                                    │
├──────────────────────┬──────────────────────┬──────────────────────┤
│   Errors by Screen   │  Error Types         │  Errors by Release   │
│   (Table)            │  (Pie Chart)         │  (Line Chart)        │
└──────────────────────┴──────────────────────┴──────────────────────┘
```

**Save Dashboard**: Click **Save** at top right

---

## 2. Performance Dashboard

### Enable Performance Monitoring

Already enabled in your `analyticsService.js`:
```javascript
tracesSampleRate: 0.2, // 20% of transactions
```

---

### Widget 1: Average Transaction Duration

**Purpose**: Monitor overall app performance

**Configuration**:
```
Type: Line Chart
Query: avg(transaction.duration)
Group by: time
Display: Last 7 days
```

**Steps**:
1. Create **New Dashboard** → Name: "Performance Monitoring"
2. Add Widget → **Transactions** → **Time Series**
3. Metric: `avg(transaction.duration)`
4. Group by: `time`
5. Display: `Last 7 days`
6. Unit: `milliseconds`
7. Title: "Avg Screen Load Time"
8. **Add to Dashboard**

**Target**: <2000ms average

---

### Widget 2: Slowest Transactions

**Purpose**: Identify slowest screens

**Configuration**:
```
Type: Table
Query: avg(transaction.duration)
Group by: transaction
Sort by: Duration (desc)
Limit: 10
```

**Steps**:
1. Add Widget → **Transactions** → **Table**
2. Metric: `avg(transaction.duration)`
3. Group by: `transaction`
4. Sort: `Average duration descending`
5. Columns: `Transaction`, `Avg Duration`, `p95`, `Count`
6. Rows: `10`
7. Title: "Slowest Screens"
8. **Add to Dashboard**

---

### Widget 3: Transaction Volume

**Purpose**: See which screens are used most

**Configuration**:
```
Type: Bar Chart
Query: count()
Group by: transaction
Display: Last 7 days
Limit: Top 10
```

**Steps**:
1. Add Widget → **Transactions** → **Bar Chart**
2. Metric: `count()`
3. Group by: `transaction`
4. Display: `Last 7 days`
5. Limit: `Top 10`
6. Title: "Most Visited Screens"
7. **Add to Dashboard**

---

### Widget 4: P95 Response Time

**Purpose**: Track 95th percentile performance (worst 5% of users)

**Configuration**:
```
Type: Big Number
Query: p95(transaction.duration)
Display: Last 24 hours
```

**Steps**:
1. Add Widget → **Transactions** → **Big Number**
2. Metric: `p95(transaction.duration)`
3. Display: `Last 24 hours`
4. Unit: `milliseconds`
5. Title: "P95 Load Time (24h)"
6. Set threshold: Show red if >3000ms
7. **Add to Dashboard**

**Target**: <3000ms for good UX

---

### Widget 5: Apdex Score

**Purpose**: Overall user satisfaction metric (0-1 scale)

**Configuration**:
```
Type: Line Chart
Query: apdex()
Threshold: 300ms (satisfactory)
Display: Last 7 days
```

**Steps**:
1. Add Widget → **Transactions** → **Time Series**
2. Metric: `apdex(300)` (300ms threshold)
3. Display: `Last 7 days`
4. Title: "User Satisfaction (Apdex)"
5. **Add to Dashboard**

**Scale**:
- 1.0 = Perfect (all requests <300ms)
- 0.94+ = Excellent
- 0.85-0.94 = Good
- 0.70-0.85 = Fair
- <0.70 = Poor

---

### Final Performance Dashboard

```
┌──────────────────────┬──────────────────────┬──────────────────────┐
│  Avg Load Time       │  P95 Load Time       │  Apdex Score         │
│  (Line Chart)        │  (Big Number)        │  (Big Number)        │
├──────────────────────┴──────────────────────┴──────────────────────┤
│                    Slowest Screens (Table)                          │
├──────────────────────┬──────────────────────────────────────────────┤
│  Transaction Volume  │     Most Visited Screens                     │
│  (Line Chart)        │     (Bar Chart)                              │
└──────────────────────┴──────────────────────────────────────────────┘
```

**Save Dashboard**

---

## 3. Alerts Configuration

### Critical Alerts

#### Alert 1: High Error Rate

**When to trigger**: >10 errors in 1 hour

**Setup**:
1. Navigate to **Alerts** → **Create Alert**
2. Alert Type: **Issues**
3. Metric: `count()`
4. Threshold: `is above 10`
5. Time window: `1 hour`
6. Environment: `production`
7. Actions:
   - Send email to: `your@email.com`
   - Slack notification (if integrated)
8. Name: "High Error Rate Alert"
9. **Create Alert**

---

#### Alert 2: New Error Type

**When to trigger**: First occurrence of a new error

**Setup**:
1. Alerts → Create Alert
2. Alert Type: **Issues**
3. Condition: `When a new issue is created`
4. Filter: `environment:production`
5. Actions:
   - Email notification
   - Slack notification
6. Name: "New Error Detected"
7. **Create Alert**

---

#### Alert 3: Crash-Free Rate Drop

**When to trigger**: <98% crash-free rate

**Setup**:
1. Alerts → Create Alert
2. Alert Type: **Sessions**
3. Metric: `crash_free_rate()`
4. Threshold: `is below 98%`
5. Time window: `1 hour`
6. Environment: `production`
7. Actions: Email + Slack
8. Name: "Crash-Free Rate Alert"
9. **Create Alert**

---

#### Alert 4: Performance Regression

**When to trigger**: P95 load time >3 seconds

**Setup**:
1. Alerts → Create Alert
2. Alert Type: **Transactions**
3. Metric: `p95(transaction.duration)`
4. Threshold: `is above 3000ms`
5. Time window: `5 minutes`
6. Filter: `transaction:/*` (all screens)
7. Actions: Email notification
8. Name: "Slow Performance Alert"
9. **Create Alert**

---

### Recommended Alert Schedule

**Immediate alerts** (Slack/Email):
- New critical errors
- Crash-free rate <98%
- P95 performance >5 seconds

**Daily digest** (Email):
- Summary of new issues
- Top 5 errors by volume
- Performance summary

**Weekly report** (Email):
- Error trends
- Performance trends
- Fixed vs new issues

---

## 4. Release Tracking

### Configure Releases

Releases help track which version introduced bugs.

#### Option 1: Manual Release

```bash
# After deploying a new version
npx sentry-cli releases new "dividela@1.0.0"
npx sentry-cli releases finalize "dividela@1.0.0"
```

#### Option 2: Automated (GitHub Actions)

Add to your `.github/workflows/deploy.yml`:

```yaml
- name: Create Sentry Release
  uses: getsentry/action-release@v1
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: dividela
  with:
    environment: production
    version: ${{ github.sha }}
```

---

### Release Dashboard Widgets

Add to your Error Dashboard:

**Widget: Issues by Release**
- See if new releases introduce more errors
- Compare error rates across versions

**Widget: Resolved in Release**
- Track which fixes went live
- Verify bug fixes

---

## 5. Issue Management Workflow

### Triaging Issues

1. **Navigate to Issues**
2. **Filter**: `is:unresolved`
3. **Sort by**: Event count (descending)

### Prioritization Matrix

| Users Affected | Frequency | Priority | Action |
|----------------|-----------|----------|--------|
| >100 users | >50 events | P0 - Critical | Fix immediately |
| 10-100 users | >20 events | P1 - High | Fix this sprint |
| <10 users | >10 events | P2 - Medium | Fix next sprint |
| <5 users | <10 events | P3 - Low | Backlog |

### Issue Actions

For each high-priority issue:

1. **Click issue** to open details
2. **Review**:
   - Error message
   - Stack trace
   - Breadcrumbs (user actions before error)
   - Device/OS info
3. **Assign** to developer
4. **Add to sprint** (use Integrations → Jira/GitHub)
5. **Add comment** with reproduction steps
6. **Set release** (will be resolved in v1.x.x)

### Resolving Issues

When fixed:
1. Deploy fix to production
2. Go to Sentry → Issues → [Your Issue]
3. Click **Resolve** → `Resolved in Next Release`
4. Sentry will auto-reopen if error recurs

---

## 6. Integrations

### Slack Integration

**Setup**:
1. Sentry → Settings → Integrations
2. Click **Slack** → **Add to Slack**
3. Choose channel (e.g., `#alerts`)
4. Configure:
   - New issues → `#alerts`
   - Resolved issues → `#alerts`
   - Escalating issues → `#alerts`

**Benefits**:
- Real-time error notifications
- Team visibility
- Quick triage

---

### GitHub Integration

**Setup**:
1. Sentry → Settings → Integrations
2. Click **GitHub** → **Install**
3. Configure:
   - Link commits to releases
   - Auto-create issues from errors
   - Resolve errors when PR merged

**Benefits**:
- Automatic issue tracking
- Link errors to commits
- See which code caused error

---

## Best Practices

### 1. Regular Review Schedule

**Daily** (5 minutes):
- Check for new critical errors
- Review alert emails
- Triage new issues

**Weekly** (30 minutes):
- Review error trends
- Check performance metrics
- Update priorities
- Plan fixes for next sprint

**Monthly** (1 hour):
- Performance deep dive
- Compare month-over-month
- Update alert thresholds
- Clean up resolved issues

---

### 2. Context is King

Always add context to errors:

```javascript
import { addBreadcrumb, trackError } from './analyticsService';

// Before risky operation
await addBreadcrumb('Loading user expenses', {
  userId: user.id,
  coupleId: user.coupleId,
});

try {
  await loadExpenses();
} catch (error) {
  await trackError(error, {
    context: 'expense_loading',
    user_had_partner: !!user.partnerId,
  });
}
```

---

### 3. Set Performance Budgets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Avg Load Time | <1.5s | 2s | 3s |
| P95 Load Time | <2.5s | 3s | 5s |
| Crash-Free Rate | >99.5% | 99% | 98% |
| Error Rate | <0.1% | 0.5% | 1% |

---

### 4. Use Environments

Separate errors by environment:

```javascript
Sentry.init({
  dsn: SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
});
```

Benefits:
- Filter production-only errors
- Test error tracking in dev
- Different alerts per environment

---

### 5. Source Maps (Future)

Upload source maps to see unminified stack traces:

```bash
npx sentry-cli sourcemaps upload --release=1.0.0 ./dist
```

---

## Troubleshooting

### "No events showing in Sentry"

1. Check DSN is correct in `.env`
2. Verify `EXPO_PUBLIC_ENABLE_ANALYTICS=true`
3. Check console for `[Analytics] Sentry initialized`
4. Throw test error: `throw new Error('Test')`
5. Wait 1-2 minutes for event to appear

### "Too many errors"

1. Review filters - might be catching non-critical errors
2. Add `ignoreErrors` to Sentry config:
   ```javascript
   Sentry.init({
     dsn: SENTRY_DSN,
     ignoreErrors: [
       'Network request failed', // Ignore network errors
       'ResizeObserver loop limit exceeded',
     ],
   });
   ```

### "Wrong release showing"

1. Ensure releases are created properly
2. Check release name format is consistent
3. Verify release is finalized

---

## Quick Start Checklist

- [ ] Sign up for Sentry
- [ ] Configure DSN in `.env`
- [ ] Verify events appearing in Sentry
- [ ] Create Error Dashboard (20 min)
- [ ] Create Performance Dashboard (15 min)
- [ ] Set up 4 critical alerts
- [ ] Configure Slack integration
- [ ] Test alerts with test error
- [ ] Review dashboard daily for 1 week
- [ ] Establish weekly review routine

---

## Resources

- [Sentry React Native Docs](https://docs.sentry.io/platforms/react-native/)
- [Performance Monitoring Guide](https://docs.sentry.io/product/performance/)
- [Best Practices](https://blog.sentry.io/2020/07/22/best-practices-for-error-monitoring)
- [Sentry Academy](https://sentry.io/resources/academy/) - Free courses

---

**Next Steps**:
1. Set up Error Dashboard today
2. Configure critical alerts
3. Monitor for 1 week
4. Add Performance Dashboard
5. Integrate with Slack/GitHub

Your app's health is now monitored! 🛡️
