# Claude Code - Copy-Paste Prompts for Dividela

Ready-to-use prompts for building Dividela with Claude Code. Copy and paste these into Claude Code to get started quickly!

---

## 🎬 Initial Setup Verification

```
I've set up my Dividela project with:
- Expo React Native project created
- Firebase configured
- All dependencies installed
- .clinerules file in project root
- theme.js, categories.js, AuthContext.js, validators.js, and calculations.js created

Please verify the project structure looks correct and suggest any missing files or configurations.
```

---

## 📱 Phase 1: Authentication Screens

### Prompt 1: Welcome Screen

```
Create WelcomeScreen.js in src/screens/auth/

Requirements from .clinerules:
- Use the screen template pattern
- Import design system from theme.js
- Reference wireframe 0a from wireframes.html

The screen should have:
- Centered layout
- Large emoji or placeholder for logo (💑)
- App title: "Dividela"
- Tagline: "Track shared expenses with your partner, effortlessly"
- Primary button: "Get Started" (uses COMMON_STYLES.primaryButton)
- Text link below: "Already have an account? Sign in"
- Props: navigation

Use COLORS, SPACING, and FONTS from theme.js throughout.
No hardcoded colors or spacing values.
```

### Prompt 2: Sign Up Screen

```
Create SignUpScreen.js in src/screens/auth/

Reference wireframe 0b and the form pattern from .clinerules.

The screen should have:
1. Header with back button and "Create Account" title
2. Form with three inputs:
   - Name input
   - Email input
   - Password input (secure text entry)
3. Checkbox for Terms & Privacy with text
4. Primary button: "Create Account"
5. Divider with "or" text
6. Two social login buttons:
   - "Continue with Apple"
   - "Continue with Google"

Implementation requirements:
- Import useAuth from AuthContext
- Use validators from utils/validators.js
- Add useState for form fields and errors
- Validate on submit using validateForm
- Show inline error messages
- Disable button when loading
- Handle Firebase errors with getFirebaseErrorMessage
- Navigate to ConnectScreen on success

Use proper error handling pattern from .clinerules.
```

### Prompt 3: Sign In Screen

```
Create SignInScreen.js in src/screens/auth/

Similar to SignUpScreen but simpler:
- Email input
- Password input
- "Forgot password?" link
- "Sign In" button
- Social login options

Use the same patterns as SignUpScreen:
- Form validation
- Error handling
- Loading states
- Navigation to main app on success

The user should land on HomeScreen if they already have a partner,
or ConnectScreen if they need to pair.
```

---

## 🤝 Phase 2: Couple Pairing

### Prompt 4: Connect Screen

```
Create ConnectScreen.js in src/screens/auth/

Reference wireframe 0c from wireframes.html.

The screen should have:
1. Header: "Connect Partner"
2. Centered text explaining the process
3. Two large option cards:
   
   Card 1 (Primary/Highlighted):
   - Icon: 📤
   - Title: "Invite Partner"
   - Description: "Generate a code for your partner to join"
   - Has gradient background (COLORS.gradientStart to gradientEnd)
   - Navigates to InviteScreen
   
   Card 2:
   - Icon: 📥
   - Title: "Join Partner"  
   - Description: "Enter your partner's invite code"
   - White background with border
   - Navigates to JoinScreen

Make both cards tappable (TouchableOpacity).
Use proper spacing and the card pattern from .clinerules.
```

### Prompt 5: Invite Screen

```
Create InviteScreen.js in src/screens/auth/

Reference wireframe 0d and the invite code generation pattern.

Features needed:
1. Generate 6-digit alphanumeric code on mount
   - Use crypto.getRandomValues or similar
   - Format: ABCDEF, 123456, A7K9M2 (uppercase letters and numbers)
   
2. Display the code prominently
   - Large font (48px)
   - Monospace font family
   - In a gradient card background
   - Letter spacing for readability

3. Action buttons:
   - "Copy Code" (primary button)
   - "Share via SMS" (secondary button)
   - "Share via Email" (secondary button)

4. Status section:
   - "⏱️ Waiting for partner..." text
   - "Code expires in 7 days" subtext
   - Light blue background

5. Firestore integration:
   - Save invite code to inviteCodes collection
   - Use the InviteCode data model from .clinerules
   - Set expiration to 7 days from now

6. Real-time listener:
   - Listen for when code is used (isUsed becomes true)
   - Navigate to SuccessScreen when partner joins

Include proper error handling and loading states.
```

### Prompt 6: Join Screen

```
Create JoinScreen.js in src/screens/auth/

Reference wireframe 0e from wireframes.html.

Features:
1. Large centered code input
   - Text input for 6 characters
   - Monospace font, large size (32px)
   - Center-aligned text
   - Auto-uppercase
   - Max length 6
   - Letter spacing

2. Validation:
   - Use validateInviteCode from validators.js
   - Real-time validation as user types
   - Show error if invalid format

3. Submit button:
   - "Connect" button
   - Disabled until 6 characters entered
   - Shows loading state when validating

4. Firestore integration:
   - Check if code exists in inviteCodes collection
   - Validate code (not used, not expired)
   - Create couple document
   - Update both users' partnerId and coupleId
   - Mark invite code as used
   - Navigate to SuccessScreen on success

5. Error handling:
   - "Code not found"
   - "Code already used" 
   - "Code expired"
   - Show errors below input

Use the Firebase patterns from .clinerules for validation and couple creation.
```

### Prompt 7: Success Screen

```
Create SuccessScreen.js in src/screens/auth/

Reference wireframe 0f from wireframes.html.

Celebration screen with:
1. Large success checkmark icon
   - Green circle background (COLORS.success)
   - White checkmark ✓
   - Size: 100x100

2. Success message:
   - Title: "Connected!"
   - Subtitle: "You're now connected with [Partner Name]. Ready to track expenses together!"

3. Visual representation:
   - Two avatars (user and partner initials)
   - Link icon (🔗) between them
   - Use the avatar pattern from theme.js

4. Continue button:
   - "Continue to App"
   - Navigates to main app (HomeScreen)

Fetch partner details from Firestore using getPartnerDetails from AuthContext.
Celebrate the moment - this is an important milestone!
```

---

## 🧭 Phase 3: Navigation Setup

### Prompt 8: App Navigator

```
Create AppNavigator.js in src/navigation/

Set up the main navigation structure:

1. Import necessary components:
   - NavigationContainer from @react-navigation/native
   - createStackNavigator from @react-navigation/stack
   - useAuth hook

2. Create two navigators:
   
   AuthNavigator (Stack):
   - WelcomeScreen
   - SignUpScreen  
   - SignInScreen
   - ConnectScreen
   - InviteScreen
   - JoinScreen
   - SuccessScreen
   - No header for all screens

   MainNavigator (will create next):
   - Bottom tabs for main app

3. Root navigator logic:
   - Show loading screen while checking auth
   - Show AuthNavigator if not authenticated
   - Show MainNavigator if authenticated
   - Check if user has partner (hasPartner from AuthContext)

Use the navigation patterns from .clinerules.
Configure proper screen options and transitions.
```

### Prompt 9: Main Navigator with Tabs

```
Create MainNavigator.js in src/navigation/

Set up bottom tab navigation:

1. Import createBottomTabNavigator
2. Create tabs for:
   - Home (HomeScreen)
   - Stats (StatsScreen)  
   - Settings (SettingsScreen)

3. Tab bar configuration:
   - Use icons from expo vector icons
   - Active color: COLORS.primary
   - Inactive color: COLORS.textLight
   - Hide tab bar labels on iOS (optional)

4. Create placeholder screens for now:
   - HomeScreen: Just show "Home" text
   - StatsScreen: Just show "Stats" text
   - SettingsScreen: Just show "Settings" text

We'll implement the full screens in the next phase.

Update App.js to use AppNavigator as root component.
```

---

## 🏠 Phase 4: Home & Expenses

### Prompt 10: Home Screen Layout

```
Create HomeScreen.js in src/screens/main/

Reference wireframe 1 from wireframes.html.

Build the shell/layout first:

1. Header with two avatars (user and partner)
   - Left: User avatar
   - Center: "Dividela" title
   - Right: Partner avatar

2. Balance card (create as separate component):
   - Gradient background
   - Current balance amount (large)
   - "X owes Y" text
   - "Settle Up" button (if balance > 0)

3. Section header: "Recent Expenses"

4. Expense list (empty state for now):
   - Show "No expenses yet" message
   - "Tap + button to add your first expense"

5. Floating action button (FAB):
   - Bottom right corner
   - Purple background
   - "+" icon
   - Opens AddExpenseScreen

Use COLORS.primary gradient for balance card.
Use the empty state pattern from .clinerules.
```

### Prompt 11: Balance Card Component

```
Create BalanceCard.js in src/components/

Props:
- balance: number (can be positive or negative)
- userName: string
- partnerName: string
- onSettleUp: function

Features:
1. Gradient background (primary gradient)
2. Display formatted balance:
   - Use formatBalance from calculations.js
   - Show absolute value with $
   - Show who owes whom

3. Settle up button:
   - Only show if balance !== 0
   - White background, primary text color
   - Calls onSettleUp when pressed

4. Handle three states:
   - Positive balance: "Partner owes you"
   - Negative balance: "You owe partner"
   - Zero balance: "You're all settled up!" (no button)

Use the card pattern from .clinerules.
Apply proper styling with theme.js constants.
```

### Prompt 12: Add Expense Screen

```
Create AddExpenseScreen.js in src/screens/main/

Reference wireframe 2 and 2b from wireframes.html.

This is a complex screen - let's build it step by step:

Step 1: Create the basic form structure with:
- Header with back button and "New Expense" title
- Amount input (large, centered, with $ symbol)
- Description input
- Category selector grid (6 categories from categories.js)
- "Paid by" selector (You / Partner)
- "Split" selector (50/50 / Custom)
- Submit button: "Add Expense"

Use the form patterns from .clinerules.
Import CATEGORIES from constants/categories.js.
Use CategoryButton components in a grid.

Once this is working, I'll ask you to add custom split functionality.
```

### Prompt 13: Add Custom Split to AddExpenseScreen

```
Update AddExpenseScreen.js to add custom split functionality.

When "Custom" split is selected:
1. Show a custom split section with:
   - Two percentage inputs (user and partner)
   - Both inputs default to 50
   - When one changes, the other auto-updates (complementary)
   - Show preview: "You: $X • Partner: $Y"

2. Validation:
   - Use validateSplitPercentage from validators.js
   - Ensure percentages add to 100
   - Show error if invalid

3. Calculate amounts:
   - Use calculateSplit from calculations.js
   - Update preview in real-time as amount or percentages change

Follow the custom split pattern from wireframe 2b.
Reference the modal pattern from .clinerules if using modal layout.
```

### Prompt 14: Expense Item Component

```
Create ExpenseItem.js in src/components/

Props:
- expense: object (with amount, description, category, paidBy, date, splitDetails)
- userName: string
- partnerName: string
- onPress: function (optional, for navigation to details)

Display:
1. Left side:
   - Category icon in a rounded square
   - Use getCategoryIcon from categories.js

2. Middle:
   - Description (bold)
   - Date + "Paid by X" (small gray text)
   - Use formatDate from calculations.js

3. Right side:
   - Amount (bold)
   - "Split 50/50" or "Split X/Y" (small gray text)

Style:
- Light gray background
- Rounded corners
- Padding
- Touchable if onPress provided
- Hover effect on press

Follow the expense item pattern from .clinerules.
Use theme.js for all styling.
```

---

## 💾 Phase 5: Firebase Integration

### Prompt 15: Expense Service

```
Create expenseService.js in src/services/

Implement CRUD operations for expenses using Firebase Firestore.

Functions to create:

1. createExpense(coupleId, expenseData)
   - Adds expense to 'expenses' collection
   - Returns the expense ID

2. getExpenses(coupleId)
   - Fetches all expenses for a couple
   - Sorted by date (newest first)
   - Returns array of expense objects

3. subscribeToExpenses(coupleId, callback)
   - Sets up real-time listener
   - Calls callback with updated expenses
   - Returns unsubscribe function

4. updateExpense(expenseId, updates)
   - Updates specific expense
   - Returns success boolean

5. deleteExpense(expenseId)
   - Deletes expense from Firestore
   - Returns success boolean

Use the Firebase patterns from .clinerules.
Add proper error handling for all operations.
Use the Expense data model from .clinerules.
```

### Prompt 16: Connect HomeScreen to Firebase

```
Update HomeScreen.js to load real expense data:

1. Import expenseService functions
2. Import useAuth to get coupleId
3. Use subscribeToExpenses for real-time updates
4. Calculate balance using calculateBalance from calculations.js
5. Display ExpenseItem components for each expense
6. Update empty state to only show when expenses.length === 0
7. Add loading state while fetching
8. Add error handling

Remove dummy data and use real Firestore data.
Make sure to unsubscribe from listener on unmount.
```

### Prompt 17: Connect AddExpenseScreen to Firebase

```
Update AddExpenseScreen.js to save expenses to Firestore:

1. Import createExpense from expenseService
2. Import useAuth to get user and coupleId
3. On form submit:
   - Validate all fields
   - Calculate split amounts using calculateSplit
   - Create expense object with proper structure
   - Call createExpense
   - Show loading state during save
   - Navigate back to HomeScreen on success
   - Show error message on failure

Use the Expense data model structure from .clinerules:
- coupleId
- paidBy (userId)
- amount
- description
- category
- splitType ('50-50' or 'custom')
- splitDetails (percentages and amounts)
- date
- createdAt

Add proper error handling and user feedback.
```

---

## 💰 Phase 6: Settlement

### Prompt 18: Settle Up Screen/Modal

```
Create SettleUpScreen.js in src/screens/main/ (or as a modal).

Reference wireframe 3 from wireframes.html.

Features:
1. Show the settlement amount prominently
   - Large number
   - "X pays Y" text
   - Gradient background

2. Settlement method section:
   - Title: "Settlement Method"
   - Single option card for Cash (in person)
   - Icon: 💵
   - Selected by default (with checkmark)

3. Mark as settled button:
   - Primary button
   - Creates settlement record
   - Resets balance to 0

4. Help text:
   - "Settle up in cash when convenient"

Implementation:
- Import useAuth for user details
- Calculate who pays whom based on balance
- Create settlement record in Firestore
- Update couple's currentBalance to 0
- Show success message
- Navigate back to HomeScreen

No digital payment integrations - cash only as per specs.
```

### Prompt 19: Settlement Service

```
Create settlementService.js in src/services/

Functions to create:

1. createSettlement(coupleId, settlementData)
   - Creates settlement record in Firestore
   - Updates couple's currentBalance to 0
   - Returns settlement ID

2. getSettlements(coupleId)
   - Fetches settlement history
   - Sorted by date (newest first)
   - Returns array

3. Settlement data structure:
   - coupleId
   - amount
   - paidBy (userId) 
   - paidTo (userId)
   - method: 'cash'
   - date
   - notes (optional)

Follow the Firebase patterns from .clinerules.
Use atomic operations to update balance.
```

---

## 📊 Phase 7: Statistics

### Prompt 20: Stats Screen

```
Create StatsScreen.js in src/screens/main/

Reference wireframe 5 from wireframes.html.

Features:
1. Month selector (This Month / Last Month buttons)
2. Summary stats card:
   - Total expenses
   - Your share
   - Partner's share
   - Number of expenses

3. Top categories section:
   - List of categories with totals
   - Sorted by amount (highest first)
   - Show category icon, name, and amount
   - Use getCategoryIcon and getCategoryColor

4. Empty state if no expenses

Implementation:
- Import calculations functions:
  - calculateTotalExpenses
  - calculateExpensesByCategory
  - calculateUserShare
  - calculateMonthlyStats
- Get expenses from context or props
- Filter by selected month
- Calculate all statistics
- Display in clean card layout

Use the stat card pattern from .clinerules.
```

---

## ⚙️ Phase 8: Settings

### Prompt 21: Settings Screen

```
Create SettingsScreen.js in src/screens/main/

Reference the settings wireframe.

Sections:
1. Account Info (read-only cards):
   - Your name
   - Partner name

2. Preferences:
   - Currency (USD for now)
   - Default split (50/50)
   - Notifications (toggle)

3. Sign Out button:
   - Red/danger color
   - Calls signOut from AuthContext
   - Shows confirmation alert
   - Clears all local data
   - Returns to WelcomeScreen

Use the settings pattern from .clinerules.
Use proper spacing between sections.
Make it look clean and organized.
```

---

## 🎨 Phase 9: Polish

### Prompt 22: Add Loading States

```
Review all screens and add proper loading states:

1. Create LoadingSpinner.js component in src/components/
   - Centered ActivityIndicator
   - Uses COLORS.primary
   - Reusable across app

2. Add to screens:
   - HomeScreen: While loading expenses
   - AddExpenseScreen: While saving
   - SignUpScreen: While creating account
   - All Firebase operations

3. Use the loading pattern from .clinerules

Update each screen to show LoadingSpinner during async operations.
```

### Prompt 23: Improve Error Handling

```
Enhance error handling across the app:

1. Create ErrorMessage.js component in src/components/
   - Red background with error text
   - Dismiss button
   - Auto-dismiss after 5 seconds

2. Update all try-catch blocks to:
   - Use getFirebaseErrorMessage for Firebase errors
   - Show user-friendly messages
   - Log errors to console in development
   - Don't crash the app

3. Add error boundaries to main screens

Review .clinerules error handling pattern and apply everywhere.
```

---

## 🚀 Final Steps

### Prompt 24: Final Polish

```
Let's do a final polish pass:

1. Review all screens for:
   - Consistent spacing (use SPACING constants)
   - Consistent colors (use COLORS constants)
   - Consistent fonts (use FONTS constants)
   - Proper error states
   - Proper loading states
   - Proper empty states

2. Test all user flows:
   - Onboarding (sign up to pairing)
   - Adding expenses (all split types)
   - Viewing balance and expenses
   - Settling up
   - Viewing stats
   - Settings

3. Fix any remaining issues

4. Add comments to complex functions

5. Remove console.logs

Create a checklist of what's done and what (if anything) is missing.
```

---

## 🎯 Quick Commands

Copy these for quick actions:

**Check status:**
```
Show me the current project structure and what files exist.
```

**Review code:**
```
Review [filename] for:
- Adherence to .clinerules patterns
- Proper use of theme.js constants
- Error handling
- Performance issues
```

**Debug:**
```
I'm getting this error: [paste error]
In file: [filename]
Help me debug and fix it.
```

**Test:**
```
What should I test for [feature]?
List the test cases I need to cover.
```

**Optimize:**
```
Review [filename] and suggest performance optimizations.
Consider memoization, useCallback, and reducing re-renders.
```

---

## 💡 Pro Tips

1. **Start each session with:**
   ```
   I'm working on Dividela. Check .clinerules for project context.
   ```

2. **Reference docs:**
   ```
   Check wireframes.html screen [number] for the design.
   ```

3. **Build incrementally:**
   ```
   First create the layout, then add functionality, then add polish.
   ```

4. **Ask for reviews:**
   ```
   Does this follow the patterns in .clinerules?
   ```

Happy coding! 🚀
