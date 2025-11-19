// src/constants/accountDefaults.js
// Default values and constants for account management

/**
 * Account types
 */
export const ACCOUNT_TYPES = {
  SOLO: 'solo',
  COUPLE: 'couple',
};

/**
 * Account roles
 */
export const ACCOUNT_ROLES = {
  OWNER: 'owner',   // User who created the account
  MEMBER: 'member', // User who joined via invite
};

/**
 * Default account names
 */
export const DEFAULT_ACCOUNT_NAMES = {
  SOLO: 'My Budget',
  COUPLE: 'Shared Budget',
  PERSONAL: 'Personal',
  HOME: 'Home',
  BUSINESS: 'Business',
  VACATION: 'Vacation Fund',
};

/**
 * Suggested account name options for user selection
 */
export const SUGGESTED_ACCOUNT_NAMES = [
  { id: 'home', name: 'Home Budget', icon: '🏠' },
  { id: 'personal', name: 'Personal Budget', icon: '👤' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'vacation', name: 'Vacation Fund', icon: '✈️' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'savings', name: 'Savings', icon: '💰' },
  { id: 'shared', name: 'Shared Expenses', icon: '🤝' },
  { id: 'custom', name: 'Custom...', icon: '✏️' },
];

/**
 * Account limits
 */
export const ACCOUNT_LIMITS = {
  MAX_ACCOUNTS: 20, // Maximum number of accounts per user
  MIN_ACCOUNT_NAME_LENGTH: 1,
  MAX_ACCOUNT_NAME_LENGTH: 50,
};

/**
 * Account validation messages
 */
export const ACCOUNT_MESSAGES = {
  NAME_REQUIRED: 'Account name is required',
  NAME_TOO_LONG: `Account name must be less than ${ACCOUNT_LIMITS.MAX_ACCOUNT_NAME_LENGTH} characters`,
  MAX_ACCOUNTS_REACHED: `You've reached the maximum of ${ACCOUNT_LIMITS.MAX_ACCOUNTS} accounts`,
  NO_ACCOUNTS: 'You don\'t have any accounts yet',
  CREATE_FIRST_ACCOUNT: 'Create your first budget account to get started',
  ACCOUNT_DELETED: 'Account removed successfully',
  ACCOUNT_CREATED: 'Account created successfully',
  ACCOUNT_RENAMED: 'Account renamed successfully',
  SWITCH_ACCOUNT_SUCCESS: 'Switched to {accountName}',
  DELETE_CONFIRMATION: 'Are you sure you want to remove this account? This action cannot be undone.',
  DELETE_LAST_ACCOUNT: 'You cannot delete your only account. Create another account first.',
};

/**
 * Get a default account name based on type and existing accounts
 * @param {string} type - Account type ('solo' or 'couple')
 * @param {string} partnerName - Partner's name (for couple accounts)
 * @param {Array} existingAccounts - User's existing accounts
 * @returns {string} Suggested account name
 */
export const getDefaultAccountName = (type, partnerName = null, existingAccounts = []) => {
  if (type === ACCOUNT_TYPES.SOLO) {
    // If user has no accounts, use "My Budget"
    if (existingAccounts.length === 0) {
      return DEFAULT_ACCOUNT_NAMES.SOLO;
    }

    // Otherwise suggest "Personal Budget"
    return DEFAULT_ACCOUNT_NAMES.PERSONAL;
  } else if (type === ACCOUNT_TYPES.COUPLE && partnerName) {
    // For couple accounts, use partner's name
    return `Budget with ${partnerName}`;
  }

  return DEFAULT_ACCOUNT_NAMES.COUPLE;
};

/**
 * Validate account name
 * @param {string} name - Account name to validate
 * @returns {object} Validation result { valid: boolean, error: string|null }
 */
export const validateAccountName = (name) => {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: ACCOUNT_MESSAGES.NAME_REQUIRED,
    };
  }

  if (name.length > ACCOUNT_LIMITS.MAX_ACCOUNT_NAME_LENGTH) {
    return {
      valid: false,
      error: ACCOUNT_MESSAGES.NAME_TOO_LONG,
    };
  }

  return { valid: true, error: null };
};

/**
 * Check if user can add more accounts
 * @param {Array} existingAccounts - User's existing accounts
 * @returns {boolean} True if user can add more accounts
 */
export const canAddMoreAccounts = (existingAccounts = []) => {
  return existingAccounts.length < ACCOUNT_LIMITS.MAX_ACCOUNTS;
};

/**
 * Format account display name
 * Shows account name and type indicator
 * @param {object} account - Account object
 * @returns {string} Formatted display name
 */
export const formatAccountDisplayName = (account) => {
  if (!account) return '';

  const { accountName, type, partnerName } = account;

  if (type === ACCOUNT_TYPES.SOLO) {
    return `${accountName} (Solo)`;
  } else if (type === ACCOUNT_TYPES.COUPLE && partnerName) {
    return `${accountName} (with ${partnerName})`;
  }

  return accountName;
};

/**
 * Get account icon based on type
 * @param {string} type - Account type
 * @returns {string} Emoji icon
 */
export const getAccountIcon = (type) => {
  return type === ACCOUNT_TYPES.SOLO ? '👤' : '👥';
};

/**
 * Sort accounts by creation date (newest first)
 * @param {Array} accounts - Array of account objects
 * @returns {Array} Sorted accounts
 */
export const sortAccountsByDate = (accounts = []) => {
  return [...accounts].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA; // Newest first
  });
};

/**
 * Sort accounts - active first, then by date
 * @param {Array} accounts - Array of account objects
 * @param {string} activeAccountId - Currently active account ID
 * @returns {Array} Sorted accounts
 */
export const sortAccountsWithActive = (accounts = [], activeAccountId = null) => {
  return [...accounts].sort((a, b) => {
    // Active account always first
    if (a.accountId === activeAccountId) return -1;
    if (b.accountId === activeAccountId) return 1;

    // Then sort by creation date (newest first)
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA;
  });
};
