# Budget Onboarding Test Checklist

## Test Overview
This checklist helps verify that scrolling and navigation work correctly throughout the budget onboarding flow.

---

## ✅ Simple Mode Flow (2-3 steps)

### Step 1: Choose Budget Style
- [ ] Screen loads and displays two cards (Smart Budget, Fixed Budget)
- [ ] Can scroll content (if needed on small screens)
- [ ] Continue button is visible at bottom
- [ ] Selecting a card highlights it with purple border
- [ ] Continue button navigates correctly:
  - Smart → SimpleSmartBudgetScreen
  - Fixed → SimpleFixedBudgetScreen
- [ ] Back button in header works (returns to intro)
- [ ] "Switch to Advanced Mode" link works

### Step 2a: Smart Budget
- [ ] Screen loads with default budget preview
- [ ] Content is scrollable
- [ ] Can see all 6 categories with default amounts
- [ ] Total budget displayed correctly
- [ ] "Start Tracking" button visible at bottom
- [ ] Button saves budget and navigates to success
- [ ] Back button works (returns to step 1)
- [ ] "Customize These Amounts" link works (if implemented)

### Step 2b: Fixed Budget
- [ ] Screen loads with budget input
- [ ] Can enter custom amount
- [ ] Quick amount buttons work ($1k, $2k, $3k, $4k)
- [ ] Distribution preview updates in real-time
- [ ] Content is scrollable (see all 6 categories)
- [ ] "Start Tracking" button visible at bottom
- [ ] Button saves budget and navigates to success
- [ ] Back button works (returns to step 1)
- [ ] "Adjust Distribution" link works (if implemented)

### Step 3: Success
- [ ] Animated checkmark displays
- [ ] Summary shows correct budget type (Smart/Fixed)
- [ ] Budget details displayed correctly
- [ ] "Go to Dashboard" button works
- [ ] "View Budget Settings" link works

---

## ✅ Advanced Mode Flow (7 steps)

### Step 1: Welcome
- [ ] Screen loads with gradient background
- [ ] Animated chart icon displays
- [ ] Checklist items fade in with animation
- [ ] Content is scrollable
- [ ] "Let's Get Started" button visible at bottom
- [ ] Button navigates to timeframe screen
- [ ] "Back to Simple Mode" link works
- [ ] Back button in header works (returns to intro)

### Step 2: Timeframe
- [ ] Screen loads showing two options (Annual, Monthly)
- [ ] **Content is scrollable** ✓ FIXED
- [ ] Can select Annual or Monthly
- [ ] Annual input shows yearly amount and monthly calculation
- [ ] Monthly input shows monthly amount only
- [ ] Continue button **visible at bottom** ✓ FIXED
- [ ] Navigation logic:
  - Annual → Goes to Strategy screen (Step 3)
  - Monthly → Skips to Categories screen (Step 4)
- [ ] Back button works (returns to welcome)

### Step 3: Strategy (Only if Annual selected)
- [ ] Screen loads showing three strategy cards
- [ ] **Content is scrollable** ✓ FIXED
- [ ] All three cards visible (Equal Monthly, Seasonal, Custom)
- [ ] Can select a strategy (radio button shows selected)
- [ ] Selected card has purple border
- [ ] Info box displays at bottom
- [ ] Continue button **visible at bottom** ✓ FIXED
- [ ] Button navigates to categories screen
- [ ] Back button works (returns to timeframe)

### Step 4: Categories
- [ ] Screen loads with category selection
- [ ] **Content is scrollable** ✓ FIXED
- [ ] "Use Common Categories" toggle works
- [ ] When toggled on: all default categories selected
- [ ] When toggled off: can manually select categories
- [ ] Category cards display with icons
- [ ] Selected categories show checkmark badge
- [ ] Progress indicator shows "X of Y selected"
- [ ] "+ Add Custom Category" button opens modal
- [ ] Custom category modal:
  - [ ] Can select icon (10 options shown)
  - [ ] Can enter category name
  - [ ] "Add" button adds category to list
  - [ ] "Cancel" button closes modal
- [ ] Continue button **visible at bottom** ✓ FIXED
- [ ] Continue disabled when no categories selected
- [ ] Button navigates to allocation screen
- [ ] Back button works (returns to strategy or timeframe)

### Step 5: Allocation
- [ ] Screen loads with budget sliders
- [ ] **Content is scrollable** ✓ FIXED (already working)
- [ ] Remaining amount card shows at top
- [ ] Remaining amount updates as sliders adjust
- [ ] Each category shows:
  - [ ] Icon and name
  - [ ] Annual and monthly amounts
  - [ ] Interactive slider
  - [ ] Progress bar with color coding
  - [ ] Percentage display
- [ ] "Auto-Distribute" button works
- [ ] "Reset" button works
- [ ] Color coding works:
  - [ ] Green when under 40%
  - [ ] Yellow/Orange when 40-75%
  - [ ] Red when over 75%
- [ ] Continue button **visible at bottom** ✓ FIXED (already working)
- [ ] Continue disabled when budget not fully allocated
- [ ] Button navigates to savings screen
- [ ] Back button works (returns to categories)

### Step 6: Savings
- [ ] Screen loads with savings configuration
- [ ] **Content is scrollable** ✓ FIXED
- [ ] Main card shows "Split the Savings" option
- [ ] Toggle switch for "Include in settlement"
- [ ] Example calculation displays correctly
- [ ] Secondary option "Track only, no split" shown
- [ ] Info box at bottom visible
- [ ] "Finish Setup" button **visible at bottom** ✓ FIXED
- [ ] Button saves all data and navigates to success
- [ ] Back button works (returns to allocation)

### Step 7: Success
- [ ] **Confetti animation plays** (20 particles)
- [ ] Animated checkmark in green circle
- [ ] Title "Your Budget is Ready!" displays
- [ ] Summary stats show:
  - [ ] Annual/Monthly budget
  - [ ] Number of categories
  - [ ] Savings enabled status
- [ ] Preview card shows first month:
  - [ ] First 3 categories listed
  - [ ] "+ X more categories" if applicable
- [ ] "Go to Dashboard" button works
- [ ] "Edit Budget" link works (goes back to settings)

---

## ✅ Skip Path

### Skip Confirmation
- [ ] Screen loads when "Skip" clicked from intro
- [ ] Animated checkmark displays
- [ ] Title "You're all set!" shows
- [ ] Info box with lightbulb icon
- [ ] Message about enabling budgets later
- [ ] "Go to Dashboard" button visible
- [ ] Button navigates to main dashboard
- [ ] No budget is created in database

---

## ✅ Cross-Screen Tests

### Navigation Flow
- [ ] Can complete entire Simple mode without errors
- [ ] Can complete entire Advanced mode without errors
- [ ] Can go back through any step and change selection
- [ ] State is preserved when going back
- [ ] Can switch from Simple to Advanced from step 1
- [ ] Can restart onboarding from Settings

### Scrolling Tests (CRITICAL - Just Fixed!)
- [ ] **All screens scroll smoothly**
- [ ] **Continue buttons always visible**
- [ ] Content doesn't get cut off on small screens
- [ ] Large content (allocation sliders) scrollable
- [ ] No weird jumping or layout shifts
- [ ] ScrollView indicator shows when content overflows

### Data Persistence
- [ ] Selections saved to OnboardingContext
- [ ] State persists during navigation
- [ ] State saves to AsyncStorage
- [ ] State recovers after app restart (within 24 hours)
- [ ] Completion flag saved correctly

### Settings Integration
- [ ] "Restart Budget Onboarding" option in Settings
- [ ] Confirmation dialog appears before restart
- [ ] Restarting clears previous data
- [ ] Can complete onboarding again after restart

---

## 🐛 Known Issues Fixed

1. ✅ **Continue button not visible** - Fixed by moving outside ScrollView
2. ✅ **Content not scrollable** - Fixed by removing flexGrow: 1
3. ✅ **setBudgetStyle not defined** - Fixed by adding to OnboardingContext
4. ✅ **Back navigation not working** - Fixed with proper header config

---

## 📱 Testing Tips

1. **Test on different screen sizes:**
   - Small phones (iPhone SE, Android compact)
   - Medium phones (iPhone 14, Pixel 5)
   - Large phones (iPhone 14 Pro Max, Pixel 7 Pro)
   - Tablets (iPad, Android tablet)

2. **Test both orientations:**
   - Portrait mode (primary)
   - Landscape mode (should still work)

3. **Test edge cases:**
   - Very long category names
   - Many custom categories (10+)
   - Extreme budget amounts ($0, $1M+)
   - Rapidly tapping back/forward
   - Killing app during onboarding

4. **Console logs to verify:**
   - Check for "✅ Onboarding mode set to: X"
   - Check for "✅ Recovered onboarding state"
   - Check for "✅ Budget saved successfully"
   - No errors or warnings in console

---

## ✅ Success Criteria

All tests pass when:
- ✅ Every screen loads without errors
- ✅ All content is scrollable
- ✅ All buttons are visible and functional
- ✅ Back/forward navigation works throughout
- ✅ Data saves correctly to database
- ✅ User can complete any path start to finish
- ✅ State persists appropriately
- ✅ Animations play smoothly

---

## 🚀 How to Test

1. **Reset the app state:**
   ```bash
   # Clear AsyncStorage or reinstall app
   ```

2. **Complete partner pairing:**
   - Sign up or sign in
   - Create/join couple connection

3. **Test each path:**
   - Skip path (quickest)
   - Simple mode (2-3 minutes)
   - Advanced mode (5 minutes)

4. **Check database:**
   - Verify budget documents created
   - Check complexity level saved
   - Confirm all data persisted

5. **Test from Settings:**
   - Restart onboarding
   - Complete different path
   - Verify old data replaced

---

## 📊 Commits Related to This Fix

1. `e00bf35` - Initial multi-path budget onboarding system
2. `efa5bd9` - Fix: Add budgetStyle state to OnboardingContext
3. `2fe370d` - Fix: Move continue buttons outside ScrollView
4. `e574de4` - Fix: Remove flexGrow from scrollContent to enable scrolling

---

**Last Updated:** After fixing scrolling issues (Commit e574de4)
**Status:** All critical navigation and scrolling issues resolved ✅
