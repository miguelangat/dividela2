/**
 * Invite Code Generation and Validation Utilities
 *
 * Generates secure 6-character alphanumeric codes for partner pairing
 * Format: A-Z, 0-9 (uppercase only)
 * Example: A7K9M2, B3XY4K, 9M2P7Q
 */

/**
 * Generate a random 6-character invite code
 * @returns {string} 6-character uppercase alphanumeric code
 */
export function generateInviteCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars.charAt(randomIndex);
  }

  return code;
}

/**
 * Format code input to uppercase and remove invalid characters
 * @param {string} input - Raw input string
 * @returns {string} Formatted code (max 6 chars)
 */
export function formatCodeInput(input) {
  // Convert to uppercase and filter valid characters only
  const formatted = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6);

  return formatted;
}

/**
 * Check if code format is valid (6 alphanumeric characters)
 * @param {string} code - Code to validate
 * @returns {boolean} True if format is valid
 */
export function isValidCodeFormat(code) {
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Calculate expiration date (7 days from now)
 * @returns {Date} Expiration date
 */
export function calculateExpirationDate() {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 7);
  return expirationDate;
}

/**
 * Format remaining time until expiration
 * @param {Date} expiresAt - Expiration date
 * @returns {string} Human-readable time remaining
 */
export function formatTimeRemaining(expiresAt) {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    return 'Less than 1 hour';
  }
}
