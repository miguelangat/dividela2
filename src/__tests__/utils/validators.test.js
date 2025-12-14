// src/__tests__/utils/validators.test.js
// Comprehensive unit tests for validation utilities

import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateInviteCode,
  validateExpenseAmount,
  validateExpenseDescription,
  validateSplitPercentage,
  validateSplitTotal,
  validateForm,
  validateBudgetAmount,
  validateCategoryName,
  validateBudgetAllocation,
  sanitizeBudgetAmount,
  sanitizeCategoryBudgets,
  getFirebaseErrorMessage,
} from '../../utils/validators';

describe('validators.js - Input Validation Tests', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should reject email with only spaces', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should reject email without @', () => {
      const result = validateEmail('testexample.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('test@');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should reject email without user', () => {
      const result = validateEmail('@example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should reject email with spaces', () => {
      const result = validateEmail('test @example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should reject email without TLD', () => {
      const result = validateEmail('test@example');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });
  });

  describe('validatePassword', () => {
    it('should validate password with 8 characters', () => {
      const result = validatePassword('12345678');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate password with more than 8 characters', () => {
      const result = validatePassword('password123456');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate password with special characters', () => {
      const result = validatePassword('P@ssw0rd!');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject password with only spaces', () => {
      const result = validatePassword('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password is required');
    });

    it('should reject password with less than 8 characters', () => {
      const result = validatePassword('1234567');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });

    it('should reject password with exactly 7 characters', () => {
      const result = validatePassword('Pass123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters');
    });
  });

  describe('validateDisplayName', () => {
    it('should validate normal name', () => {
      const result = validateDisplayName('John Doe');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate name with 2 characters', () => {
      const result = validateDisplayName('Jo');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate name with special characters', () => {
      const result = validateDisplayName("O'Brien");
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate name with 50 characters', () => {
      const result = validateDisplayName('a'.repeat(50));
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should reject empty name', () => {
      const result = validateDisplayName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should reject name with only spaces', () => {
      const result = validateDisplayName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name is required');
    });

    it('should reject name with 1 character', () => {
      const result = validateDisplayName('J');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name must be at least 2 characters');
    });

    it('should reject name with more than 50 characters', () => {
      const result = validateDisplayName('a'.repeat(51));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Name must be less than 50 characters');
    });

    it('should handle name with leading/trailing spaces', () => {
      const result = validateDisplayName('  Jo  ');
      expect(result).toEqual({ isValid: true, error: null });
    });
  });

  describe('validateInviteCode', () => {
    it('should validate 6-character uppercase code', () => {
      const result = validateInviteCode('ABC123');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate 6-character lowercase code (converts to uppercase)', () => {
      const result = validateInviteCode('abc123');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate 6-character all letters code', () => {
      const result = validateInviteCode('ABCDEF');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate 6-character all numbers code', () => {
      const result = validateInviteCode('123456');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should reject empty code', () => {
      const result = validateInviteCode('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invite code is required');
    });

    it('should reject code with spaces', () => {
      const result = validateInviteCode('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invite code is required');
    });

    it('should reject code with less than 6 characters', () => {
      const result = validateInviteCode('ABC12');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invite code must be 6 characters (letters and numbers)');
    });

    it('should reject code with more than 6 characters', () => {
      const result = validateInviteCode('ABC1234');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invite code must be 6 characters (letters and numbers)');
    });

    it('should reject code with special characters', () => {
      const result = validateInviteCode('ABC-12');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invite code must be 6 characters (letters and numbers)');
    });

    it('should reject code with spaces in middle', () => {
      const result = validateInviteCode('AB C12');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invite code must be 6 characters (letters and numbers)');
    });
  });

  describe('validateExpenseAmount', () => {
    it('should validate positive number', () => {
      const result = validateExpenseAmount('100');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate decimal number', () => {
      const result = validateExpenseAmount('99.99');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate small decimal', () => {
      const result = validateExpenseAmount('0.01');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate maximum allowed amount', () => {
      const result = validateExpenseAmount('999999.99');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should reject empty amount', () => {
      const result = validateExpenseAmount('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount is required');
    });

    it('should reject zero amount', () => {
      const result = validateExpenseAmount('0');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be greater than 0');
    });

    it('should reject negative amount', () => {
      const result = validateExpenseAmount('-100');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be greater than 0');
    });

    it('should reject non-numeric value', () => {
      const result = validateExpenseAmount('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid number');
    });

    it('should accept large amounts (UI handles warnings)', () => {
      // Large amount warnings are now handled at the UI level with currency-aware thresholds
      const result = validateExpenseAmount('1000000');
      expect(result.isValid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should accept numeric value without quotes', () => {
      const result = validateExpenseAmount(100);
      expect(result).toEqual({ isValid: true, error: null });
    });
  });

  describe('validateExpenseDescription', () => {
    it('should validate normal description', () => {
      const result = validateExpenseDescription('Grocery shopping');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate description with 2 characters', () => {
      const result = validateExpenseDescription('Go');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate description with 100 characters', () => {
      const result = validateExpenseDescription('a'.repeat(100));
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate description with special characters', () => {
      const result = validateExpenseDescription('Coffee @ Café');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should reject empty description', () => {
      const result = validateExpenseDescription('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description is required');
    });

    it('should reject description with only spaces', () => {
      const result = validateExpenseDescription('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description is required');
    });

    it('should reject description with 1 character', () => {
      const result = validateExpenseDescription('G');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description must be at least 2 characters');
    });

    it('should reject description with more than 100 characters', () => {
      const result = validateExpenseDescription('a'.repeat(101));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Description must be less than 100 characters');
    });
  });

  describe('validateSplitPercentage', () => {
    it('should validate 0 percentage', () => {
      const result = validateSplitPercentage('0');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate 50 percentage', () => {
      const result = validateSplitPercentage('50');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate 100 percentage', () => {
      const result = validateSplitPercentage('100');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate numeric value without quotes', () => {
      const result = validateSplitPercentage(75);
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should reject negative percentage', () => {
      const result = validateSplitPercentage('-10');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Percentage must be between 0 and 100');
    });

    it('should reject percentage over 100', () => {
      const result = validateSplitPercentage('101');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Percentage must be between 0 and 100');
    });

    it('should reject non-numeric value', () => {
      const result = validateSplitPercentage('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid number');
    });

    it('should reject decimal percentage', () => {
      const result = validateSplitPercentage('50.5');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid number');
    });
  });

  describe('validateSplitTotal', () => {
    it('should validate percentages that sum to 100', () => {
      const result = validateSplitTotal('60', '40');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate 50/50 split', () => {
      const result = validateSplitTotal('50', '50');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate 0/100 split', () => {
      const result = validateSplitTotal('0', '100');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate 100/0 split', () => {
      const result = validateSplitTotal('100', '0');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should reject percentages that sum to less than 100', () => {
      const result = validateSplitTotal('40', '40');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Split percentages must add up to 100%');
    });

    it('should reject percentages that sum to more than 100', () => {
      const result = validateSplitTotal('60', '60');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Split percentages must add up to 100%');
    });

    it('should validate numeric values without quotes', () => {
      const result = validateSplitTotal(70, 30);
      expect(result).toEqual({ isValid: true, error: null });
    });
  });

  describe('validateForm', () => {
    it('should validate all fields successfully', () => {
      const fields = {
        email: { value: 'test@example.com', validator: validateEmail },
        password: { value: 'password123', validator: validatePassword },
      };

      const result = validateForm(fields);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should collect all validation errors', () => {
      const fields = {
        email: { value: 'invalid', validator: validateEmail },
        password: { value: '123', validator: validatePassword },
      };

      const result = validateForm(fields);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Please enter a valid email address');
      expect(result.errors.password).toBe('Password must be at least 8 characters');
    });

    it('should handle empty fields object', () => {
      const result = validateForm({});
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should handle partial validation failures', () => {
      const fields = {
        email: { value: 'test@example.com', validator: validateEmail },
        password: { value: '123', validator: validatePassword },
      };

      const result = validateForm(fields);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeUndefined();
      expect(result.errors.password).toBeDefined();
    });
  });

  describe('validateBudgetAmount', () => {
    it('should validate positive number', () => {
      const result = validateBudgetAmount(100);
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate decimal number', () => {
      const result = validateBudgetAmount(99.99);
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate string number', () => {
      const result = validateBudgetAmount('100');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate maximum allowed amount', () => {
      const result = validateBudgetAmount(1000000);
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate zero with warning', () => {
      const result = validateBudgetAmount(0);
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('is set to zero');
      expect(result.error).toBe(null);
    });

    it('should warn about excessive decimal places', () => {
      const result = validateBudgetAmount(100.123);
      expect(result.isValid).toBe(true);
      expect(result.warning).toContain('more than 2 decimal places');
    });

    it('should reject null value', () => {
      const result = validateBudgetAmount(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('is required');
    });

    it('should reject undefined value', () => {
      const result = validateBudgetAmount(undefined);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('is required');
    });

    it('should reject empty string', () => {
      const result = validateBudgetAmount('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('is required');
    });

    it('should reject non-numeric string', () => {
      const result = validateBudgetAmount('abc');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a valid number');
    });

    it('should reject negative number', () => {
      const result = validateBudgetAmount(-100);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be negative');
    });

    it('should reject amount exceeding maximum', () => {
      const result = validateBudgetAmount(1000001);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed');
    });

    it('should use custom field name in error messages', () => {
      const result = validateBudgetAmount(-100, 'Food budget');
      expect(result.error).toContain('Food budget');
    });
  });

  describe('validateCategoryName', () => {
    it('should validate normal category name', () => {
      const result = validateCategoryName('Food');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate name with 2 characters', () => {
      const result = validateCategoryName('Go');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate name with 30 characters', () => {
      const result = validateCategoryName('a'.repeat(30));
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate name with numbers', () => {
      const result = validateCategoryName('Food123');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate name with spaces', () => {
      const result = validateCategoryName('Grocery Shopping');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate name with hyphens', () => {
      const result = validateCategoryName('Dining-Out');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should validate name with underscores', () => {
      const result = validateCategoryName('home_utilities');
      expect(result).toEqual({ isValid: true, error: null });
    });

    it('should reject empty name', () => {
      const result = validateCategoryName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Category name is required');
    });

    it('should reject name with only spaces', () => {
      const result = validateCategoryName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Category name is required');
    });

    it('should reject name with 1 character', () => {
      const result = validateCategoryName('F');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Category name must be at least 2 characters');
    });

    it('should reject name with more than 30 characters', () => {
      const result = validateCategoryName('a'.repeat(31));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Category name must be less than 30 characters');
    });

    it('should reject name with special characters', () => {
      const result = validateCategoryName('Food@Home');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Category name contains invalid characters');
    });

    it('should reject name with emoji', () => {
      const result = validateCategoryName('Food 🍕');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Category name contains invalid characters');
    });
  });

  describe('validateBudgetAllocation', () => {
    it('should validate correct allocation', () => {
      const categoryBudgets = {
        food: 500,
        transport: 300,
        utilities: 200,
      };
      const totalBudget = 1000;

      const result = validateBudgetAllocation(categoryBudgets, totalBudget);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.totalAllocated).toBe(1000);
      expect(result.unallocated).toBe(0);
    });

    it('should warn about unallocated budget', () => {
      const categoryBudgets = {
        food: 500,
        transport: 300,
      };
      const totalBudget = 1000;

      const result = validateBudgetAllocation(categoryBudgets, totalBudget);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('Unallocated budget');
      expect(result.unallocated).toBe(200);
    });

    it('should error when allocation exceeds total', () => {
      const categoryBudgets = {
        food: 700,
        transport: 400,
      };
      const totalBudget = 1000;

      const result = validateBudgetAllocation(categoryBudgets, totalBudget);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('exceed total budget');
    });

    it('should validate individual category budgets', () => {
      const categoryBudgets = {
        food: -100,
        transport: 500,
      };
      const totalBudget = 400;

      const result = validateBudgetAllocation(categoryBudgets, totalBudget);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'food')).toBe(true);
    });

    it('should handle string amounts', () => {
      const categoryBudgets = {
        food: '500',
        transport: '300',
      };
      const totalBudget = 800;

      const result = validateBudgetAllocation(categoryBudgets, totalBudget);
      expect(result.isValid).toBe(true);
      expect(result.totalAllocated).toBe(800);
    });

    it('should handle floating point precision', () => {
      const categoryBudgets = {
        food: 333.33,
        transport: 333.33,
        utilities: 333.34,
      };
      const totalBudget = 1000;

      const result = validateBudgetAllocation(categoryBudgets, totalBudget);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid total budget', () => {
      const categoryBudgets = { food: 500 };
      const totalBudget = -1000;

      const result = validateBudgetAllocation(categoryBudgets, totalBudget);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'totalBudget')).toBe(true);
    });

    it('should reject non-object category budgets', () => {
      const result = validateBudgetAllocation('invalid', 1000);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'categoryBudgets')).toBe(true);
    });

    it('should handle null category budgets', () => {
      const result = validateBudgetAllocation(null, 1000);
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeBudgetAmount', () => {
    it('should keep valid positive numbers', () => {
      expect(sanitizeBudgetAmount(100)).toBe(100);
    });

    it('should round to 2 decimal places', () => {
      expect(sanitizeBudgetAmount(100.123)).toBe(100.12);
      expect(sanitizeBudgetAmount(100.126)).toBe(100.13);
    });

    it('should convert string to number', () => {
      expect(sanitizeBudgetAmount('100')).toBe(100);
      expect(sanitizeBudgetAmount('99.99')).toBe(99.99);
    });

    it('should return 0 for negative numbers', () => {
      expect(sanitizeBudgetAmount(-100)).toBe(0);
    });

    it('should return 0 for invalid values', () => {
      expect(sanitizeBudgetAmount('abc')).toBe(0);
      expect(sanitizeBudgetAmount(NaN)).toBe(0);
      expect(sanitizeBudgetAmount(undefined)).toBe(0);
      expect(sanitizeBudgetAmount(null)).toBe(0);
    });

    it('should handle zero', () => {
      expect(sanitizeBudgetAmount(0)).toBe(0);
    });
  });

  describe('sanitizeCategoryBudgets', () => {
    it('should sanitize all category budgets', () => {
      const categoryBudgets = {
        food: 100.123,
        transport: '50',
        utilities: -10,
      };

      const result = sanitizeCategoryBudgets(categoryBudgets);
      expect(result).toEqual({
        food: 100.12,
        transport: 50,
        utilities: 0,
      });
    });

    it('should handle invalid amounts', () => {
      const categoryBudgets = {
        food: 'abc',
        transport: NaN,
        utilities: null,
      };

      const result = sanitizeCategoryBudgets(categoryBudgets);
      expect(result).toEqual({
        food: 0,
        transport: 0,
        utilities: 0,
      });
    });

    it('should return empty object for null input', () => {
      expect(sanitizeCategoryBudgets(null)).toEqual({});
    });

    it('should return empty object for undefined input', () => {
      expect(sanitizeCategoryBudgets(undefined)).toEqual({});
    });

    it('should return empty object for non-object input', () => {
      expect(sanitizeCategoryBudgets('invalid')).toEqual({});
      expect(sanitizeCategoryBudgets(123)).toEqual({});
    });
  });

  describe('getFirebaseErrorMessage', () => {
    it('should return message for email-already-in-use', () => {
      const message = getFirebaseErrorMessage('auth/email-already-in-use');
      expect(message).toBe('This email is already registered');
    });

    it('should return message for invalid-email', () => {
      const message = getFirebaseErrorMessage('auth/invalid-email');
      expect(message).toBe('Invalid email address');
    });

    it('should return message for user-not-found', () => {
      const message = getFirebaseErrorMessage('auth/user-not-found');
      expect(message).toBe('No account found with this email');
    });

    it('should return message for wrong-password', () => {
      const message = getFirebaseErrorMessage('auth/wrong-password');
      expect(message).toBe('Incorrect password');
    });

    it('should return message for weak-password', () => {
      const message = getFirebaseErrorMessage('auth/weak-password');
      expect(message).toBe('Password is too weak');
    });

    it('should return message for too-many-requests', () => {
      const message = getFirebaseErrorMessage('auth/too-many-requests');
      expect(message).toBe('Too many attempts. Please try again later');
    });

    it('should return message for network-request-failed', () => {
      const message = getFirebaseErrorMessage('auth/network-request-failed');
      expect(message).toBe('Network error. Please check your connection');
    });

    it('should return message for permission-denied', () => {
      const message = getFirebaseErrorMessage('permission-denied');
      expect(message).toBe('Permission denied. Please check your account permissions');
    });

    it('should return default message for unknown error', () => {
      const message = getFirebaseErrorMessage('unknown-error-code');
      expect(message).toBe('An error occurred. Please try again');
    });

    it('should handle null/undefined error codes', () => {
      expect(getFirebaseErrorMessage(null)).toBe('An error occurred. Please try again');
      expect(getFirebaseErrorMessage(undefined)).toBe('An error occurred. Please try again');
    });
  });
});
