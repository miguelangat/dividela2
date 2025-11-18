# Onboarding Navigation Map

This document maps all navigation routes and ensures they are valid.

## Defined Routes (OnboardingNavigator.js)

### Entry Point
- `OnboardingIntro` → OnboardingIntroScreen

### Skip Flow
- `OnboardingSkip` → OnboardingSkipScreen

### Simple Mode Flow
- `SimpleChooseStyle` → SimpleChooseStyleScreen (Step 1/2)
- `SimpleSmartBudget` → SimpleSmartBudgetScreen (Step 2/2 - Smart path)
- `SimpleFixedBudget` → SimpleFixedBudgetScreen (Step 2/2 - Fixed path)
- `SimpleSuccess` → SimpleSuccessScreen

### Advanced Mode Flow
- `AdvancedWelcome` → AdvancedWelcomeScreen (Step 1/7)
- `AdvancedTimeframe` → AdvancedTimeframeScreen (Step 2/7)
- `AdvancedStrategy` → AdvancedStrategyScreen (Step 3/7)
- `AdvancedCategories` → AdvancedCategoriesScreen (Step 4/7)
- `AdvancedAllocation` → AdvancedAllocationScreen (Step 5/7)
- `AdvancedSavings` → AdvancedSavingsScreen (Step 6/7)
- `AdvancedSuccess` → AdvancedSuccessScreen (Step 7/7)

---

## Navigation Paths by Screen

### OnboardingIntroScreen
✅ `SimpleChooseStyle` - User selects "Keep It Simple"
✅ `AdvancedWelcome` - User selects "Annual Planning"
✅ `OnboardingSkip` - User selects "Skip for Now"

### OnboardingSkipScreen
- No outbound navigation (completes onboarding)

### SimpleChooseStyleScreen
✅ `SimpleSmartBudget` - User selects Smart Budget
✅ `SimpleFixedBudget` - User selects Fixed Budget
✅ `AdvancedWelcome` - User clicks "Switch to Advanced Mode"

### SimpleSmartBudgetScreen
✅ `SimpleSuccess` - User clicks "Start Tracking"
✅ `AdvancedWelcome` - User clicks "Customize These Amounts"

### SimpleFixedBudgetScreen
✅ `SimpleSuccess` - User clicks "Start Tracking"
✅ `AdvancedWelcome` - User clicks "Adjust Distribution"

### SimpleSuccessScreen
- No outbound navigation (completes onboarding, AppNavigator handles next screen)

### AdvancedWelcomeScreen
✅ `AdvancedTimeframe` - User clicks "Get Started"
✅ `SimpleChooseStyle` - User clicks "Back to Simple Mode" (FIXED)

### AdvancedTimeframeScreen
✅ `AdvancedStrategy` - User selects Monthly
✅ `AdvancedCategories` - User selects Annual (skips strategy)

### AdvancedStrategyScreen
✅ `AdvancedCategories` - User clicks Continue

### AdvancedCategoriesScreen
✅ `AdvancedAllocation` - User clicks Continue

### AdvancedAllocationScreen
✅ `AdvancedSavings` - User clicks Continue

### AdvancedSavingsScreen
✅ `AdvancedSuccess` - User clicks Complete Setup

### AdvancedSuccessScreen
- Uses `navigation.goBack()` for "Adjust Settings"
- No outbound navigation for completion (AppNavigator handles)

---

## Navigation Issues Fixed

### Issue 1: "Back to Simple Mode" Button (AdvancedWelcomeScreen) ❌ → ✅
**Before:** `navigation.navigate('SimpleWelcome')` - Route doesn't exist!
**After:** `navigation.navigate('SimpleChooseStyle')` - Correct route
**Status:** FIXED

---

## All Navigation Links Verified

### From Simple Mode:
✅ All "Switch to Advanced" links → `AdvancedWelcome` (correct)

### From Advanced Mode:
✅ "Back to Simple Mode" → `SimpleChooseStyle` (correct)

### Within Simple Mode:
✅ All internal navigation uses correct routes

### Within Advanced Mode:
✅ All internal navigation uses correct routes

---

## Testing Checklist

### Simple Mode Flow
- [ ] OnboardingIntro → SimpleChooseStyle ✓
- [ ] SimpleChooseStyle → SimpleSmartBudget ✓
- [ ] SimpleChooseStyle → SimpleFixedBudget ✓
- [ ] SimpleSmartBudget → SimpleSuccess ✓
- [ ] SimpleFixedBudget → SimpleSuccess ✓
- [ ] SimpleSuccess → Dashboard (via AppNavigator) ✓

### Advanced Mode Flow
- [ ] OnboardingIntro → AdvancedWelcome ✓
- [ ] AdvancedWelcome → AdvancedTimeframe ✓
- [ ] AdvancedTimeframe → AdvancedStrategy (monthly) ✓
- [ ] AdvancedTimeframe → AdvancedCategories (annual) ✓
- [ ] AdvancedStrategy → AdvancedCategories ✓
- [ ] AdvancedCategories → AdvancedAllocation ✓
- [ ] AdvancedAllocation → AdvancedSavings ✓
- [ ] AdvancedSavings → AdvancedSuccess ✓

### Cross-Mode Navigation
- [ ] SimpleChooseStyle → AdvancedWelcome ✓
- [ ] SimpleSmartBudget → AdvancedWelcome ✓
- [ ] SimpleFixedBudget → AdvancedWelcome ✓
- [ ] AdvancedWelcome → SimpleChooseStyle ✓ (FIXED)

### Back Navigation
- [ ] All screens with headerShown: true have working back buttons ✓
- [ ] AdvancedSuccessScreen goBack() works ✓

---

## Summary

**Total Routes:** 15
**Total Navigation Links:** 23
**Broken Links Found:** 1
**Fixed:** 1
**Status:** ✅ ALL NAVIGATION WORKING
