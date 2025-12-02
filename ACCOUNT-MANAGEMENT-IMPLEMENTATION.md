# Account Management Implementation

## Overview
Implemented account management features in the Settings screen, allowing users to change their password and delete their account.

## Features Implemented

### 1. Change Password
- **Location**: Settings > Account Management > Change Password
- **Functionality**:
  - Only available for users who signed in with email/password (not OAuth)
  - Requires current password for security
  - Validates new password (minimum 6 characters)
  - Confirms password match before updating
  - Uses Firebase reauthentication for security

### 2. Delete Account
- **Location**: Settings > Account Management > Delete Account
- **Functionality**:
  - Available for all users (email/password and OAuth)
  - Requires password confirmation for email/password users
  - OAuth users are prompted to reauthenticate via popup
  - Requires typing "DELETE" to confirm action
  - Shows clear warning about consequences
  - Marks user document as deleted in Firestore before removing Firebase Auth account
  - Automatically signs user out after deletion

## Files Modified

### 1. `/src/contexts/AuthContext.js`
**Changes**:
- Added Firebase Auth imports: `updatePassword`, `deleteUser`, `EmailAuthProvider`, `reauthenticateWithCredential`, `reauthenticateWithPopup`
- Implemented `changePassword(currentPassword, newPassword)` function
- Implemented `deleteAccount(password)` function
- Exported both functions in the context value

**Key Features**:
- Proper error handling with user-friendly messages
- Provider detection (email/password vs OAuth)
- Reauthentication before sensitive operations
- Firestore cleanup before account deletion

### 2. `/src/screens/main/SettingsScreen.js`
**Changes**:
- Added state variables for modals and form inputs
- Implemented `handleChangePassword()` handler with validation
- Implemented `handleDeleteAccount()` handler with validation
- Created `renderAccountManagementSection()` component
- Added Change Password modal with form inputs
- Added Delete Account modal with warnings and confirmation
- Added styles for new components

**UI Components**:
- Account Management section with two options
- Change Password modal (3 password fields)
- Delete Account modal (password + confirmation text)
- Proper loading states and disabled states during operations

### 3. `/src/i18n/locales/en.json`
**Changes**:
- Added `settings.accountManagement` section
- Added `settings.changePassword` and related keys
- Added `settings.changePasswordModal` with all form labels and messages
- Added `settings.deleteAccountModal` with warnings and consequences

**Translation Keys Added**:
```json
{
  "accountManagement": "Account Management",
  "changePassword": "Change Password",
  "changePasswordDescription": "Update your account password",
  "deleteAccount": "Delete Account",
  "deleteAccountDescription": "Permanently delete your account",
  "changePasswordModal": { ... },
  "deleteAccountModal": { ... }
}
```

## Security Considerations

### Password Change
1. **Reauthentication**: User must provide current password
2. **Validation**: New password must be at least 6 characters
3. **Confirmation**: New password must be entered twice
4. **Provider Check**: Only available for email/password accounts

### Account Deletion
1. **Reauthentication**: 
   - Email/password users must enter password
   - OAuth users must sign in again via popup
2. **Double Confirmation**: User must type "DELETE" to confirm
3. **Clear Warnings**: Shows all consequences before deletion
4. **Data Cleanup**: Marks Firestore document as deleted before removing auth account
5. **Irreversible**: Clear messaging that action cannot be undone

## User Flow

### Change Password Flow
1. User navigates to Settings
2. Taps "Change Password" in Account Management section
3. Modal opens with three fields:
   - Current Password
   - New Password
   - Confirm New Password
4. User fills in all fields
5. Taps "Change Password"
6. System validates inputs
7. System reauthenticates with current password
8. System updates password
9. Success message shown, modal closes

### Delete Account Flow
1. User navigates to Settings
2. Taps "Delete Account" in Account Management section (red/danger styling)
3. Modal opens with:
   - Warning message
   - List of consequences
   - Password field (for email/password users) OR OAuth message
   - Confirmation text field (must type "DELETE")
4. User enters password (if applicable)
5. User types "DELETE" in confirmation field
6. Taps "Delete My Account" (red button)
7. System validates inputs
8. System reauthenticates user
9. System marks Firestore document as deleted
10. System deletes Firebase Auth account
11. User is automatically signed out
12. Success message shown

## Error Handling

### Change Password Errors
- Empty current password
- Empty new password
- Password too short (< 6 characters)
- Passwords don't match
- Wrong current password
- Requires recent login
- OAuth account error

### Delete Account Errors
- Empty password (for email/password users)
- Confirmation text doesn't match "DELETE"
- Wrong password
- Requires recent login
- Popup closed by user (OAuth)
- Network errors

## Testing Checklist

### Change Password
- [ ] Modal opens when tapping "Change Password"
- [ ] All three input fields work correctly
- [ ] Validation works for empty fields
- [ ] Validation works for password length
- [ ] Validation works for password mismatch
- [ ] Error shown for wrong current password
- [ ] Success message shown after successful change
- [ ] Modal closes after successful change
- [ ] Cancel button works
- [ ] Feature not shown for OAuth users

### Delete Account
- [ ] Modal opens when tapping "Delete Account"
- [ ] Warning message is clear and prominent
- [ ] All consequences are listed
- [ ] Password field shown for email/password users
- [ ] OAuth message shown for OAuth users
- [ ] Confirmation text field works
- [ ] Validation works for empty password
- [ ] Validation works for wrong confirmation text
- [ ] Error shown for wrong password
- [ ] Reauthentication popup works for OAuth users
- [ ] Account is deleted successfully
- [ ] User is signed out after deletion
- [ ] Firestore document is marked as deleted
- [ ] Cancel button works

## Future Enhancements

1. **Couple Data Cleanup**: Implement proper cleanup of couple-related data when account is deleted
2. **Partner Notification**: Notify partner when user deletes account
3. **Data Export**: Allow users to export their data before deletion
4. **Grace Period**: Implement a grace period before permanent deletion
5. **Forgot Password**: Add password reset functionality
6. **Email Verification**: Require email verification before sensitive operations
7. **Multi-language Support**: Add translations for other languages (es, fr, de, pt, it)

## Notes

- The implementation follows the existing patterns in the codebase
- All UI components match the app's design system
- Error messages are user-friendly and actionable
- The code is well-commented for maintainability
- Security best practices are followed throughout
