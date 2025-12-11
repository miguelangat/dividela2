# Plan: Add Currency Selection to Budget Onboarding

## Overview
Add a currency selection/confirmation section to the OnboardingIntroScreen so users can verify or change their currency before starting the budget setup process.

## Current State
- Currency is set in FiscalYearSetupScreen (after signup, before first app use)
- Currency can be changed in SettingsScreen
- Budget onboarding screens now display the configured currency dynamically

## Implementation Approach
Add a compact currency selector section to the OnboardingIntroScreen, positioned between the header and the onboarding options. This allows users to confirm or change their currency right before setting up their budget.

## Steps

### 1. Update OnboardingIntroScreen
- Import CurrencyPicker component and required services
- Add state for currency (code, symbol, locale)
- Load current currency on mount using getPrimaryCurrency
- Add a currency selector section with:
  - Current currency display (flag + code + symbol)
  - "Change" button that opens CurrencyPicker modal
- Handle currency updates via updatePrimaryCurrency service

### 2. Add i18n translations
- Add translation keys for the currency section:
  - "onboarding.intro.currencyLabel" - Section label
  - "onboarding.intro.currencyChange" - Change button text
  - "onboarding.intro.currencyHint" - Helper text explaining currency usage

### 3. Style the currency section
- Match the existing design system (card-based, consistent spacing)
- Use subtle styling so it doesn't distract from the main onboarding options
- Include the currency flag emoji, code, and symbol

## Files to Modify
1. `src/screens/onboarding/OnboardingIntroScreen.js` - Add currency selector
2. `src/i18n/locales/en.json` - Add English translations
3. `src/i18n/locales/es.json` - Add Spanish translations
4. `src/i18n/locales/fr.json` - Add French translations
5. `src/i18n/locales/de.json` - Add German translations
6. `src/i18n/locales/it.json` - Add Italian translations
7. `src/i18n/locales/pt.json` - Add Portuguese translations

## UI Design
```
┌─────────────────────────────────────┐
│         Let's Set Up Your          │
│           Shared Budget            │
│   Choose how you want to manage    │
│      your finances together        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 💰 Currency: USD ($)  [Change]│   │
│  │   Your budget will use this  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🎯 Quick Setup (Recommended) │   │
│  │ ...                          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📊 Advanced Planning         │   │
│  │ ...                          │   │
│  └─────────────────────────────┘   │
│                                     │
│        Skip for now →              │
└─────────────────────────────────────┘
```
