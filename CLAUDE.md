# Dividela - Development Documentation

This document outlines the design system, visual patterns, and development guidelines for the Dividela app, maintained for AI assistants and developers working on this project.

## Design System Overview

Dividela uses a modern, gradient-based design system with a focus on visual hierarchy, shadows, and brand consistency. The design emphasizes:

- **Purple gradient branding** (#667eea → #764ba2)
- **Card-based layouts** with elevated shadows
- **Icon-enhanced interactions**
- **Consistent spacing and typography**

---

## Visual Patterns

### 1. Gradient Headers

**Pattern**: All authentication screens use a consistent gradient header pattern.

**Implementation**:

```javascript
<LinearGradient
  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.gradientHeader}
>
  {/* Header content */}
</LinearGradient>
```

**Style Guidelines**:

```javascript
gradientHeader: {
  paddingTop: Platform.OS === 'ios' ? 50 : 30,
  paddingBottom: SPACING.xxlarge * 2,
  paddingHorizontal: SPACING.screenPadding,
  borderBottomLeftRadius: SIZES.borderRadius.xlarge * 2,
  borderBottomRightRadius: SIZES.borderRadius.xlarge * 2,
}
```

**Colors**:

- Start: `#667eea` (COLORS.gradientStart)
- End: `#764ba2` (COLORS.gradientEnd)

**Used In**:

- SignInScreen (src/screens/auth/SignInScreen.js:122)
- SignUpScreen (src/screens/auth/SignUpScreen.js:124)
- WelcomeScreen - full background (src/screens/auth/WelcomeScreen.js:29)

---

### 2. Form Card Pattern

**Pattern**: Elevated white card that overlaps the gradient header, creating depth.

**Implementation**:

```javascript
<View style={styles.formCard}>{/* Form inputs and buttons */}</View>
```

**Style Guidelines**:

```javascript
formCard: {
  backgroundColor: COLORS.background,
  borderRadius: SIZES.borderRadius.xlarge,
  marginHorizontal: SPACING.screenPadding,
  marginTop: -SPACING.xxlarge,  // Negative margin for overlap effect
  padding: SPACING.xlarge,
  ...SHADOWS.large,
}
```

**Key Features**:

- White background (#ffffff)
- Large border radius (20px)
- Negative top margin creates overlap with gradient header
- Large shadow for depth

**Used In**:

- SignInScreen (src/screens/auth/SignInScreen.js:157)
- SignUpScreen (src/screens/auth/SignUpScreen.js:155)
- WelcomeScreen - features card (src/screens/auth/WelcomeScreen.js:61)

---

### 3. Icon-Enhanced Input Fields

**Pattern**: Input fields with left-aligned icons for visual clarity.

**Implementation**:

```javascript
<View style={[styles.inputContainer, error && styles.inputError]}>
  <MaterialCommunityIcons
    name="email-outline"
    size={20}
    color={error ? COLORS.error : COLORS.textSecondary}
    style={styles.inputIcon}
  />
  <TextInput
    style={styles.input}
    placeholder="Enter your email"
    placeholderTextColor={COLORS.textTertiary}
    // ...other props
  />
</View>
```

**Style Guidelines**:

```javascript
inputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: COLORS.backgroundLight,
  borderWidth: 2,
  borderColor: COLORS.border,
  borderRadius: SIZES.borderRadius.medium,
  paddingHorizontal: SPACING.base,
  minHeight: SIZES.input.height,
},
inputIcon: {
  marginRight: SPACING.medium,
},
input: {
  flex: 1,
  fontSize: FONTS.sizes.body,
  color: COLORS.text,
  paddingVertical: SPACING.medium,
}
```

**Icon Mappings**:

- Name field: `account-outline`
- Email field: `email-outline`
- Password field: `lock-outline`

**Error State**:

- Changes border color to red
- Changes icon color to red
- Adds subtle red background tint

**Used In**:

- SignInScreen - email & password (src/screens/auth/SignInScreen.js:169-213)
- SignUpScreen - name, email & password (src/screens/auth/SignUpScreen.js:165-233)

---

### 4. SSO Buttons with Brand Logos

**Pattern**: Social sign-on buttons with branded colors and logos from `@expo/vector-icons`.

**Implementation**:

```javascript
<TouchableOpacity style={[styles.socialButton, styles.googleButton]} onPress={handleGoogleSignIn}>
  <View style={styles.socialIconContainer}>
    <AntDesign name="google" size={20} color="#DB4437" />
  </View>
  <Text style={styles.socialButtonText}>Continue with Google</Text>
</TouchableOpacity>
```

**Style Guidelines**:

```javascript
socialButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: COLORS.background,
  borderWidth: 2,
  borderColor: COLORS.border,
  borderRadius: SIZES.borderRadius.medium,
  paddingVertical: SPACING.buttonPadding,
  paddingHorizontal: SPACING.large,
  minHeight: SIZES.button.height,
  marginBottom: SPACING.medium,
  ...SHADOWS.small,
},
googleButton: {
  borderColor: '#DB4437' + '30',  // 30% opacity
  backgroundColor: '#DB4437' + '08',  // 8% opacity
},
appleButton: {
  borderColor: '#000000' + '30',
  backgroundColor: '#000000' + '05',
}
```

**Brand Colors**:

- Google: `#DB4437` (Google Red)
- Apple: `#000000` (Black)

**Icon Library**: `@expo/vector-icons/AntDesign`

- Google: `name="google"`
- Apple: `name="apple1"`

**Design Notes**:

- White background with subtle brand-colored tint
- Border with brand color at 30% opacity
- Brand logo on left, text on right
- Small shadow for depth

**Used In**:

- SignInScreen (src/screens/auth/SignInScreen.js:254-288)
- SignUpScreen (src/screens/auth/SignUpScreen.js:219-253)

---

### 5. Gradient Buttons

**Pattern**: Primary action buttons with gradient background.

**Implementation**:

```javascript
<TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
  <LinearGradient
    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.submitButtonGradient}
  >
    {loading ? (
      <ActivityIndicator color={COLORS.textWhite} />
    ) : (
      <Text style={styles.submitButtonText}>Sign In</Text>
    )}
  </LinearGradient>
</TouchableOpacity>
```

**Style Guidelines**:

```javascript
submitButton: {
  marginBottom: SPACING.large,
  borderRadius: SIZES.borderRadius.medium,
  overflow: 'hidden',  // Required for gradient
  ...SHADOWS.medium,
},
submitButtonGradient: {
  paddingVertical: SPACING.buttonPadding,
  paddingHorizontal: SPACING.large,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: SIZES.button.height,
},
submitButtonText: {
  color: COLORS.textWhite,
  fontSize: FONTS.sizes.body,
  fontWeight: FONTS.weights.bold,
  letterSpacing: 0.5,
}
```

**Key Features**:

- Gradient from purple to violet
- White text with bold weight
- Medium shadow for depth
- Loading state shows ActivityIndicator

**Used In**:

- SignInScreen (src/screens/auth/SignInScreen.js:226-244)
- SignUpScreen (src/screens/auth/SignUpScreen.js:254-272)

---

### 6. Error Messaging

**Pattern**: Error messages with left border accent and icon.

**Implementation**:

```javascript
{
  errors.general && (
    <View style={styles.generalErrorContainer}>
      <MaterialCommunityIcons name="alert-circle" size={20} color={COLORS.error} />
      <Text style={styles.generalErrorText}>{errors.general}</Text>
    </View>
  );
}
```

**Style Guidelines**:

```javascript
generalErrorContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: COLORS.error + '10',  // 10% opacity
  padding: SPACING.medium,
  borderRadius: SIZES.borderRadius.medium,
  marginBottom: SPACING.large,
  borderLeftWidth: 4,
  borderLeftColor: COLORS.error,
},
generalErrorText: {
  flex: 1,
  color: COLORS.error,
  fontSize: FONTS.sizes.small,
  marginLeft: SPACING.small,
}
```

**Visual Features**:

- Subtle red background (10% opacity)
- Bold left border (4px) in error red
- Alert circle icon
- Small text size

**Used In**:

- SignInScreen (src/screens/auth/SignInScreen.js:159-164)
- SignUpScreen (src/screens/auth/SignUpScreen.js:156-161)

---

### 7. Feature Cards

**Pattern**: White card showcasing app features with icons.

**Implementation**:

```javascript
<View style={styles.featuresCard}>
  <View style={styles.featureItem}>
    <MaterialCommunityIcons name="shield-check" size={24} color={COLORS.primary} />
    <Text style={styles.featureText}>Privacy Focused</Text>
  </View>
  {/* More features */}
</View>
```

**Style Guidelines**:

```javascript
featuresCard: {
  backgroundColor: COLORS.background,
  borderRadius: SIZES.borderRadius.xlarge,
  padding: SPACING.large,
  marginBottom: SPACING.xlarge,
  ...SHADOWS.large,
},
featureItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: SPACING.medium,
},
featureText: {
  fontSize: FONTS.sizes.body,
  color: COLORS.text,
  fontWeight: FONTS.weights.medium,
  marginLeft: SPACING.base,
}
```

**Icon Suggestions**:

- Privacy: `shield-check`
- Couples: `account-group`
- Tracking: `chart-line`
- Money: `cash-multiple`
- Notifications: `bell-ring`

**Used In**:

- WelcomeScreen (src/screens/auth/WelcomeScreen.js:61-74)

---

## Color System

### Brand Colors

```javascript
primary: '#667eea',        // Main purple
primaryDark: '#5568d3',    // Darker purple
primaryLight: '#8a9eff',   // Lighter purple
secondary: '#764ba2',       // Violet

// Gradients
gradientStart: '#667eea',
gradientEnd: '#764ba2',
```

### Text Colors

```javascript
text: '#333333',           // Primary text
textSecondary: '#666666',  // Secondary text
textTertiary: '#999999',   // Tertiary/placeholder text
textWhite: '#ffffff',      // White text on dark backgrounds
```

### Background Colors

```javascript
background: '#ffffff',           // Main background
backgroundSecondary: '#f8f9fa',  // Secondary background
backgroundLight: '#f0f1f3',      // Light background (inputs)
```

### Status Colors

```javascript
success: '#4caf50',  // Green
error: '#f44336',    // Red
warning: '#ffc107',  // Amber
info: '#2196f3',     // Blue
```

### SSO Brand Colors

```javascript
googleRed: '#DB4437',
appleBlack: '#000000',
```

---

## Typography System

### Font Sizes

```javascript
tiny: 11,
small: 13,
body: 15,
subtitle: 16,
title: 18,
heading: 22,
large: 28,
xlarge: 36,
xxlarge: 48,
```

### Font Weights

```javascript
regular: '400',
medium: '500',
semibold: '600',
bold: '700',
```

### Usage Guidelines

- **Labels**: small (13px), semibold, uppercase, letter-spacing: 0.5
- **Body text**: body (15px), regular
- **Headings**: heading (22px) to xxlarge (48px), bold
- **Button text**: body (15px), bold, letter-spacing: 0.5

---

## Spacing System

### Base Units

```javascript
tiny: 4,
small: 8,
medium: 12,
base: 16,
large: 20,
xlarge: 24,
xxlarge: 32,
huge: 40,
```

### Specific Use Cases

```javascript
screenPadding: 20,    // Page margins
cardPadding: 16,      // Card internal padding
buttonPadding: 14,    // Button vertical padding
inputPadding: 14,     // Input vertical padding
```

---

## Shadow System

### Depth Levels

**Small** (subtle elevation):

```javascript
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,
elevation: 2,
```

**Medium** (normal elevation):

```javascript
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.15,
shadowRadius: 8,
elevation: 4,
```

**Large** (high elevation):

```javascript
shadowColor: '#000',
shadowOffset: { width: 0, height: 8 },
shadowOpacity: 0.2,
shadowRadius: 12,
elevation: 8,
```

### Usage

- **Small**: SSO buttons, subtle cards
- **Medium**: Primary buttons, modals
- **Large**: Form cards, important elevated elements

---

## Border Radius System

```javascript
small: 8,
medium: 12,
large: 15,
xlarge: 20,
round: 999,   // Fully rounded (pills)
```

### Usage

- **Inputs & buttons**: medium (12px)
- **Cards**: xlarge (20px)
- **Headers**: xlarge \* 2 (40px) for bottom corners
- **Avatars**: round (999px)

---

## Icon Guidelines

### Icon Library

Primary: `@expo/vector-icons/MaterialCommunityIcons`
Secondary (SSO): `@expo/vector-icons/AntDesign`

### Common Icons

```javascript
// Navigation
'arrow-left'; // Back button
'arrow-right'; // Forward/next

// Actions
'account-plus'; // Sign up
'login'; // Sign in
'finance'; // App logo/branding

// Forms
'account-outline'; // Name field
'email-outline'; // Email field
'lock-outline'; // Password field

// Features
'shield-check'; // Privacy/security
'account-group'; // Multiple users/couples
'chart-line'; // Analytics/tracking

// Feedback
'alert-circle'; // Error message
'check-circle'; // Success message

// SSO (AntDesign)
'google'; // Google sign-in
'apple1'; // Apple sign-in
```

### Size Guidelines

- Small icons (input fields): 20px
- Medium icons (headers): 60-80px
- Large icons (welcome screen): 80px

---

## Animation & Interaction

### Opacity Values

```javascript
activeOpacity={0.7}  // Standard touch feedback
activeOpacity={0.8}  // Buttons with gradient
```

### Loading States

- Use `ActivityIndicator` in place of button text
- Color: white on gradient buttons, brand color on white buttons

### Disabled States

```javascript
opacity: 0.6; // Disabled buttons and inputs
```

---

## Testing Guidelines

### Visual Consistency Tests

- Verify gradient colors match across screens
- Check shadow depth consistency
- Validate icon sizes and colors
- Test responsive spacing

### Interaction Tests

- Test form validation
- Verify SSO button functionality
- Check navigation flows
- Test error state displays

### Accessibility Tests

- Verify text contrast ratios
- Check touch target sizes (min 44x44)
- Test screen reader compatibility
- Validate keyboard navigation

---

## Implementation Checklist

When creating new auth-related screens:

- [ ] Use gradient header pattern
- [ ] Implement card-based form layout
- [ ] Add icon-enhanced input fields
- [ ] Include proper error messaging
- [ ] Add loading states to async actions
- [ ] Implement proper keyboard avoiding behavior
- [ ] Test on both iOS and Android
- [ ] Verify text contrast for accessibility
- [ ] Add proper navigation handlers
- [ ] Include language selector if applicable

---

## File Locations

### Screens

- `src/screens/auth/WelcomeScreen.js` - Landing page
- `src/screens/auth/SignInScreen.js` - Login page
- `src/screens/auth/SignUpScreen.js` - Registration page

### Theme

- `src/constants/theme.js` - Design tokens

### Tests

- `src/__tests__/auth/AuthScreens.test.js` - Comprehensive tests

---

## Recent Updates

### 2025-11-19 - Modern UI Redesign

- Redesigned all authentication screens with modern gradient UI
- Added SSO buttons with Google and Apple logos
- Implemented icon-enhanced input fields
- Created consistent card-based layouts
- Added comprehensive test suite

---

## Future Enhancements

### Planned Improvements

- [ ] Add subtle animations on screen transitions
- [ ] Implement dark mode support
- [ ] Add biometric authentication
- [ ] Create password strength indicator
- [ ] Add social proof elements (testimonials)
- [ ] Implement skeleton loaders

---

## Notes for AI Assistants

When working on this project:

1. **Always maintain visual consistency** - Use the established patterns
2. **Follow the color system** - Don't introduce arbitrary colors
3. **Use existing icons** - Check the icon guidelines first
4. **Test on both platforms** - iOS and Android have subtle differences
5. **Consider accessibility** - Maintain contrast ratios and touch targets
6. **Update this document** - When adding new patterns or components

## Notes for missing work

1. Format all numbers when there is currency involvedd using currency format in both input and display
2. List categories as a dropdown
3. adding a record should display confirmation (e.g add categories, expenses, etc...
4. Delete category is not working
5. Emojis for categories are not vertically scrollable
6. Use Custom categories for budget onboarding
7. Navigation when onboarding review
8. When scanning receipts use default currency or ask customer to clarify it. Also let edit all details read from AI OCR.
9. Delete account and change password functionality
