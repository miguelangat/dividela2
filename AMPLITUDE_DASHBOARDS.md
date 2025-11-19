# 📊 Amplitude Dashboard Setup Guide

Complete step-by-step instructions for creating professional analytics dashboards in Amplitude.

---

## Quick Links

- [Executive Dashboard](#1-executive-dashboard) - High-level KPIs for stakeholders
- [Feature Adoption Dashboard](#2-feature-adoption-dashboard) - Track feature usage
- [Onboarding Funnel Dashboard](#3-onboarding-funnel-dashboard) - Conversion metrics
- [User Experience Dashboard](#4-user-experience-dashboard) - Rage clicks & UX issues
- [Retention Dashboard](#5-retention-dashboard) - User retention metrics
- [Error Tracking Dashboard](#6-error-tracking-dashboard) - App health monitoring

---

## Prerequisites

1. Sign up at [https://amplitude.com/](https://amplitude.com/)
2. Create a project named "Dividela"
3. Ensure analytics are running in your app
4. Wait for initial data to flow in (5-10 minutes)

---

## 1. Executive Dashboard

**Purpose**: High-level KPIs for stakeholders and investors

### Chart 1: Daily Active Users (DAU)

**Chart Type**: Line Chart

**Query**:
```
Event: Any Active Event
Segmentation: Unique users
Group by: Date (Daily)
Date Range: Last 30 days
```

**Steps in Amplitude**:
1. Click **Charts** → **New Chart**
2. Select **Event Segmentation**
3. Event: `(Select "Any Active Event")`
4. Measured As: `Uniques`
5. Group By: Select calendar icon → `Daily`
6. Date Range: `Last 30 days`
7. **Save** as "Daily Active Users"

---

### Chart 2: Monthly Active Users (MAU)

**Chart Type**: Line Chart

**Query**:
```
Event: Any Active Event
Segmentation: Unique users
Group by: Date (Monthly)
Date Range: Last 12 months
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `Any Active Event`
3. Measured As: `Uniques`
4. Group By: `Monthly`
5. Date Range: `Last 12 months`
6. **Save** as "Monthly Active Users"

---

### Chart 3: User Signups Over Time

**Chart Type**: Line Chart

**Query**:
```
Event: user_signed_up
Segmentation: Event totals
Group by: Date (Daily)
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `user_signed_up`
3. Measured As: `Event Totals`
4. Group By: `Daily`
5. Date Range: `Last 30 days`
6. **Save** as "New User Signups"

---

### Chart 4: Average Expenses Per User

**Chart Type**: Bar Chart

**Query**:
```
Event: expense_created
Segmentation: Average per user
Group by: Date (Weekly)
Date Range: Last 8 weeks
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `expense_created`
3. Measured As: `Average Per User`
4. Group By: `Weekly`
5. Date Range: `Last 8 weeks`
6. Visualization: Select `Bar Chart`
7. **Save** as "Avg Expenses Per User"

---

### Chart 5: Time to Onboard (Median)

**Chart Type**: Line Chart

**Query**:
```
Event: time_to_onboard
Property: duration_minutes
Segmentation: Median
Group by: Date (Daily)
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `time_to_onboard`
3. Click **Property** → Select `duration_minutes`
4. Measured As: `Median`
5. Group By: `Daily`
6. Date Range: `Last 30 days`
7. **Add Series** → Same event but `Percentile (95th)` for comparison
8. **Save** as "Time to Onboard Distribution"

---

### Chart 6: Partner Connection Rate

**Chart Type**: Pie Chart

**Query**:
```
User Property: hasPartner
Values: true vs false
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → User Composition
2. Select: `Group by user property`
3. Property: `hasPartner`
4. Date Range: `Last 30 days`
5. Visualization: `Pie Chart`
6. **Save** as "Users With Partners"

---

### Creating the Dashboard

1. Click **Dashboards** → **Create Dashboard**
2. Name: `Executive Dashboard`
3. Click **Add Chart**
4. Select all 6 charts created above
5. Arrange in 2x3 grid:
   ```
   [DAU]              [MAU]              [Signups]
   [Avg Expenses]     [Time to Onboard]  [Partner Rate]
   ```
6. Click **Save Dashboard**

---

## 2. Feature Adoption Dashboard

**Purpose**: Track which features are being used and adoption rates

### Chart 1: Top 10 Features Used

**Chart Type**: Bar Chart (Horizontal)

**Query**:
```
Event: feature_used
Group by: feature_name (Event Property)
Measured As: Event totals
Date Range: Last 7 days
Limit: Top 10
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `feature_used`
3. Measured As: `Event Totals`
4. **Group By** → `feature_name` (Event Property)
5. Date Range: `Last 7 days`
6. Click **Options** → Limit to `Top 10`
7. Visualization: `Horizontal Bar Chart`
8. **Save** as "Top Features This Week"

---

### Chart 2: Feature Usage Trends

**Chart Type**: Stacked Area Chart

**Query**:
```
Event: feature_used
Group by: Date (Daily)
Segment by: feature_name
Date Range: Last 30 days
Show: Top 5 features
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `feature_used`
3. Measured As: `Event Totals`
4. Group By: `Daily`
5. **Segment By** → `feature_name` (Event Property)
6. Options → Show top `5` segments
7. Date Range: `Last 30 days`
8. Visualization: `Stacked Area Chart`
9. **Save** as "Feature Usage Over Time"

---

### Chart 3: Feature Adoption Funnel

**Chart Type**: Funnel

**Query**:
```
Step 1: user_signed_up
Step 2: expense_created (Add Expense)
Step 3: budget_created (Budget Management)
Step 4: settlement_created (Settlements)
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → **Funnel Analysis**
2. Step 1: `user_signed_up`
3. Click **+ Add Step**
4. Step 2: `expense_created`
5. Step 3: `budget_created`
6. Step 4: `settlement_created`
7. Date Range: `Last 30 days`
8. Conversion Window: `30 days` (users who completed all steps within 30 days)
9. **Save** as "Feature Adoption Funnel"

---

### Chart 4: CSV Export Usage

**Chart Type**: Line Chart

**Query**:
```
Event: feature_used
Filter: feature_name = "csv_export"
Measured As: Event totals
Group by: Date (Daily)
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `feature_used`
3. Click **Filter** → `where feature_name equals "csv_export"`
4. Measured As: `Event Totals`
5. Group By: `Daily`
6. Date Range: `Last 30 days`
7. **Save** as "CSV Export Usage"

---

### Chart 5: Screen Views Distribution

**Chart Type**: Horizontal Bar Chart

**Query**:
```
Event: screen_viewed
Group by: screen_name (Event Property)
Measured As: Event totals
Date Range: Last 7 days
Limit: Top 10
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `screen_viewed`
3. Measured As: `Event Totals`
4. Group By: `screen_name` (Event Property)
5. Date Range: `Last 7 days`
6. Options → Show top `10`
7. Visualization: `Horizontal Bar Chart`
8. **Save** as "Most Viewed Screens"

---

### Creating the Dashboard

1. Dashboards → Create Dashboard
2. Name: `Feature Adoption`
3. Add all 5 charts
4. Arrange in grid layout
5. Save

---

## 3. Onboarding Funnel Dashboard

**Purpose**: Optimize user onboarding and identify drop-off points

### Chart 1: Complete Onboarding Funnel

**Chart Type**: Funnel

**Query**:
```
Step 1: user_signed_up
Step 2: partner_connected
Step 3: budget_created
Step 4: expense_created
Conversion Window: 7 days
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → **Funnel Analysis**
2. Step 1: `user_signed_up` → Label: "Sign Up"
3. Step 2: `partner_connected` → Label: "Partner Connected"
4. Step 3: `budget_created` → Label: "Budget Created"
5. Step 4: `expense_created` → Label: "First Expense"
6. Conversion Window: `7 days`
7. Date Range: `Last 30 days`
8. **Options** → Enable `Show percentages`
9. **Save** as "Full Onboarding Funnel"

**What to look for**:
- Conversion rate at each step
- Biggest drop-off point
- Overall completion rate

---

### Chart 2: Time to First Expense

**Chart Type**: Distribution Chart

**Query**:
```
Event: time_to_first_expense
Property: duration_minutes
Show: Distribution (histogram)
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `time_to_onboard` or `expense_created`
3. For custom property tracking, use:
   - Event: `expense_created`
   - Measured As: `Formula`
   - Formula: `PROPAVG(time_to_first_expense.duration_minutes)`
4. Visualization: `Distribution Chart`
5. Date Range: `Last 30 days`
6. **Save** as "Time to First Expense Distribution"

---

### Chart 3: Onboarding Step Completion Rate

**Chart Type**: Stacked Bar Chart

**Query**:
```
Event: onboarding_step_completed
Group by: step_name (Event Property)
Measured As: Unique users
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `onboarding_step_completed`
3. Measured As: `Uniques`
4. Group By: `step_name` (Event Property)
5. Date Range: `Last 30 days`
6. Visualization: `Bar Chart`
7. Sort by: `Value (descending)`
8. **Save** as "Onboarding Steps Completed"

---

### Chart 4: Onboarding Completion Over Time

**Chart Type**: Line Chart

**Query**:
```
Event: onboarding_completed (or last step)
Measured As: Unique users
Group by: Date (Daily)
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `expense_created` (as proxy for completion)
3. Filter: Add `where` user performed `user_signed_up` within `7 days`
4. Measured As: `Uniques`
5. Group By: `Daily`
6. Date Range: `Last 30 days`
7. **Save** as "Onboarding Completions Daily"

---

### Chart 5: Cohort Retention (Onboarding)

**Chart Type**: Retention Table

**Query**:
```
Starting Event: user_signed_up
Return Event: Any Active Event
Cohort by: Sign-up date (Weekly)
Date Range: Last 12 weeks
```

**Steps**:
1. Charts → New Chart → **Retention Analysis**
2. Starting Cohort: `user_signed_up`
3. Return Event: `Any Active Event`
4. Cohort By: `Weekly`
5. Date Range: `Last 12 weeks`
6. Retention Type: `Return on or after`
7. **Save** as "User Retention by Signup Week"

**What to look for**:
- Day 1, Day 7, Day 30 retention rates
- Which cohorts retain best
- Retention curve shape

---

### Creating the Dashboard

1. Dashboards → Create Dashboard
2. Name: `Onboarding & Retention`
3. Add all 5 charts
4. Arrange with funnel as primary chart
5. Save

---

## 4. User Experience Dashboard

**Purpose**: Identify UX issues and user frustration

### Chart 1: Rage Clicks by Element

**Chart Type**: Horizontal Bar Chart

**Query**:
```
Event: rage_click_detected
Group by: element_id (Event Property)
Measured As: Event totals
Date Range: Last 7 days
Limit: Top 10
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `rage_click_detected`
3. Measured As: `Event Totals`
4. Group By: `element_id` (Event Property)
5. Date Range: `Last 7 days`
6. Options → Show top `10`
7. Visualization: `Horizontal Bar Chart`
8. **Save** as "Top Rage Click Hotspots"

**What to look for**:
- Which buttons cause frustration
- Prioritize fixing top 3 elements

---

### Chart 2: Rage Clicks Over Time

**Chart Type**: Line Chart with Alert Threshold

**Query**:
```
Event: rage_click_detected
Measured As: Event totals
Group by: Date (Hourly or Daily)
Date Range: Last 7 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `rage_click_detected`
3. Measured As: `Event Totals`
4. Group By: `Hourly` (to spot spikes)
5. Date Range: `Last 7 days`
6. **Save** as "Rage Click Frequency"

**Set Alert**:
1. After saving, click **...** → **Create Alert**
2. Condition: `When value exceeds 10 per hour`
3. Notify: Your email
4. Save alert

---

### Chart 3: Error Rate Trend

**Chart Type**: Line Chart

**Query**:
```
Event: error_occurred
Measured As: Event totals
Group by: Date (Daily)
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `error_occurred`
3. Measured As: `Event Totals`
4. Group By: `Daily`
5. Date Range: `Last 30 days`
6. **Add Comparison** → `Compare to Previous Period`
7. **Save** as "Error Frequency"

---

### Chart 4: Errors by Type

**Chart Type**: Pie Chart

**Query**:
```
Event: error_occurred
Group by: error_type (Event Property)
Measured As: Event totals
Date Range: Last 7 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `error_occurred`
3. Measured As: `Event Totals`
4. Group By: `error_type` (Event Property)
5. Date Range: `Last 7 days`
6. Visualization: `Pie Chart`
7. **Save** as "Error Distribution by Type"

---

### Chart 5: User Impact of Errors

**Chart Type**: Table

**Query**:
```
Event: error_occurred
Group by: error_type
Show: Unique users affected + Event totals
Date Range: Last 7 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `error_occurred`
3. Measured As: `Uniques`
4. Group By: `error_type`
5. Click **Add Metric** → Add same event, `Event Totals`
6. Date Range: `Last 7 days`
7. Visualization: `Data Table`
8. Sort by: `Unique Users (descending)`
9. **Save** as "Error Impact Analysis"

---

### Creating the Dashboard

1. Dashboards → Create Dashboard
2. Name: `User Experience & Issues`
3. Add all 5 charts
4. Set rage click chart as prominent
5. Save

---

## 5. Retention Dashboard

**Purpose**: Measure user stickiness and engagement

### Chart 1: Classic Retention Curve

**Chart Type**: Retention Chart

**Query**:
```
Starting Event: user_signed_up
Return Event: Any Active Event
Cohort by: Daily
Retention Type: N-Day Retention
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → **Retention Analysis**
2. Starting Event: `user_signed_up`
3. Return Event: `Any Active Event`
4. Cohort By: `Daily`
5. Retention Type: `N-Day` (shows Day 0, 1, 2, 3... retention)
6. Date Range: `Last 30 days`
7. Visualization: `Line Chart`
8. **Save** as "N-Day Retention Curve"

**Key Metrics**:
- Day 1 retention (should be >40%)
- Day 7 retention (should be >20%)
- Day 30 retention (should be >10%)

---

### Chart 2: Retention by Feature Usage

**Chart Type**: Retention Comparison

**Query**:
```
Compare retention of:
A) Users who created 5+ expenses
B) Users who created <5 expenses
```

**Steps**:
1. Charts → New Chart → Retention Analysis
2. Starting Event: `user_signed_up`
3. Return Event: `Any Active Event`
4. Click **+ Compare** → **User Segment**
5. Segment A: `Where performed expense_created at least 5 times`
6. Segment B: `Where performed expense_created less than 5 times`
7. Date Range: `Last 30 days`
8. **Save** as "Retention: Active vs Passive Users"

---

### Chart 3: Engagement Frequency

**Chart Type**: Histogram

**Query**:
```
Show: Distribution of user activity
Metric: Sessions per user
Date Range: Last 30 days
```

**Steps**:
1. Charts → New Chart → **User Sessions**
2. Show: `Sessions per user`
3. Date Range: `Last 30 days`
4. Visualization: `Distribution Chart` (histogram)
5. Buckets: `0-1, 2-5, 6-10, 11-20, 21+`
6. **Save** as "User Engagement Distribution"

---

### Chart 4: DAU/MAU Ratio (Stickiness)

**Chart Type**: Line Chart

**Query**:
```
Formula: DAU / MAU
Date Range: Last 90 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `Any Active Event`
3. Measured As: `Uniques`
4. Group By: `Daily`
5. **Add Series** → Same event, Monthly uniques
6. Click **Formula** → `A / B` (DAU / MAU)
7. Date Range: `Last 90 days`
8. Format as `Percentage`
9. **Save** as "DAU/MAU Stickiness"

**Target**: >20% is good, >40% is excellent

---

### Creating the Dashboard

1. Dashboards → Create Dashboard
2. Name: `Retention & Engagement`
3. Add all 4 charts
4. Save

---

## 6. Error Tracking Dashboard

**Purpose**: Monitor application health and stability

### Chart 1: Error-Free Session Rate

**Chart Type**: Single Value (KPI)

**Query**:
```
Formula: (Total Sessions - Sessions with Errors) / Total Sessions
Date Range: Last 7 days
```

**Steps**:
1. Charts → New Chart → **Segmentation**
2. Create formula:
   - A = Total users (Any Active Event, Uniques)
   - B = Users with errors (error_occurred, Uniques)
   - Formula = `(A - B) / A`
3. Measured As: Single value
4. Format: `Percentage`
5. Date Range: `Last 7 days`
6. Visualization: `Single Number (KPI)`
7. **Save** as "Error-Free User %"

**Target**: >99%

---

### Chart 2: Errors by Screen

**Chart Type**: Bar Chart

**Query**:
```
Event: error_occurred
Group by: screen_name (from context)
Measured As: Event totals
Date Range: Last 7 days
```

**Steps**:
1. Charts → New Chart → Event Segmentation
2. Event: `error_occurred`
3. Group By: Custom property (if tracked) or `screen_viewed` correlation
4. Measured As: `Event Totals`
5. Date Range: `Last 7 days`
6. Visualization: `Horizontal Bar Chart`
7. **Save** as "Errors by Screen"

---

### Creating the Dashboard

1. Dashboards → Create Dashboard
2. Name: `App Health Monitoring`
3. Add charts
4. Configure alerts for critical thresholds
5. Save

---

## Dashboard Best Practices

### 1. Update Frequency
- **Executive Dashboard**: Check weekly
- **Feature Adoption**: Check daily during feature launches
- **Onboarding Funnel**: Check 2-3x per week
- **UX Dashboard**: Check when rage clicks spike
- **Retention**: Check weekly
- **Error Tracking**: Real-time alerts + daily review

### 2. Set Up Alerts

For each critical metric:
1. Open chart → **...** → **Create Alert**
2. Examples:
   - Rage clicks >10/hour
   - Error rate >5% of users
   - Onboarding completion <30%
   - Day 1 retention <40%

### 3. Share Dashboards

1. Open Dashboard → **Share**
2. Options:
   - Share with team (email)
   - Make public link (for investors)
   - Schedule email reports (weekly summaries)
   - Slack integration

### 4. Export Data

- Click **...** on any chart → **Export to CSV**
- Use for presentations or detailed analysis

---

## Quick Start Checklist

- [ ] Create Amplitude account
- [ ] Configure API key in app
- [ ] Generate test events
- [ ] Create Executive Dashboard (30 min)
- [ ] Create Feature Adoption Dashboard (20 min)
- [ ] Create Onboarding Funnel Dashboard (20 min)
- [ ] Create UX Dashboard (15 min)
- [ ] Create Retention Dashboard (25 min)
- [ ] Set up alerts for critical metrics
- [ ] Schedule weekly email reports
- [ ] Share with team/stakeholders

---

## Troubleshooting

### "No data showing in chart"
- Check date range (expand to "Last 90 days")
- Verify event names match exactly
- Check filters aren't too restrictive
- Ensure app is sending events (check console logs)

### "Event not appearing in dropdown"
- Events take 1-2 minutes to appear
- Refresh page
- Check event was sent with correct name
- Verify in Amplitude Debugger

### "Wrong data in chart"
- Check event property names (case-sensitive)
- Verify segmentation logic
- Review filters and conditions
- Compare with User Streams for validation

---

## Advanced Dashboards

Once comfortable, create these specialized dashboards:

### Growth Dashboard
- Week-over-week growth rate
- Viral coefficient (invites sent)
- Signup attribution sources
- User acquisition cost (if tracked)

### Revenue Dashboard (Future)
- Conversion to paid plans
- Average revenue per user
- Churn rate
- Lifetime value estimates

### Product-Market Fit Dashboard
- Feature request frequency
- NPS score tracking
- Retention by cohort
- Power user analysis (top 10% behavior)

---

## Resources

- [Amplitude Academy](https://academy.amplitude.com/) - Free courses
- [Sample Dashboards](https://amplitude.com/blog/sample-dashboards) - Inspiration
- [Amplitude Community](https://community.amplitude.com/) - Q&A forum
- [Best Practices](https://help.amplitude.com/hc/en-us/articles/229313067) - Official guide

---

**Next Steps**:
1. Start with Executive Dashboard
2. Add one new dashboard per week
3. Review metrics in team meetings
4. Iterate based on insights
5. Export for investor updates

Happy analyzing! 📊
