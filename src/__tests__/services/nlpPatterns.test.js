// src/__tests__/services/nlpPatterns.test.js
// Unit tests for NLP pattern matching and entity extraction

import {
  parseCommand,
  INTENTS,
  extractAmount,
  extractCategory,
  extractDate,
  extractSplitRatio,
} from '../../services/nlpPatterns';

describe('nlpPatterns.js - Natural Language Processing', () => {
  describe('Intent Recognition - ADD_EXPENSE', () => {
    it('should recognize "Add $50 for groceries"', () => {
      const result = parseCommand('Add $50 for groceries');

      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
      expect(result.entities.amount).toBe(50);
      expect(result.entities.description).toContain('groceries');
    });

    it('should recognize "I spent 30 dollars on lunch"', () => {
      const result = parseCommand('I spent 30 dollars on lunch');

      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
      expect(result.entities.amount).toBe(30);
      expect(result.entities.description).toContain('lunch');
    });

    it('should recognize "Record $120 electricity bill"', () => {
      const result = parseCommand('Record $120 electricity bill');

      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
      expect(result.entities.amount).toBe(120);
      expect(result.entities.description).toContain('electricity bill');
    });

    it('should recognize amount with decimals', () => {
      const result = parseCommand('Add $49.99 for coffee');

      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
      expect(result.entities.amount).toBe(49.99);
    });

    it('should recognize "spent" variations', () => {
      const variations = [
        'spent $20 on gas',
        'Spent 20 dollars gas',
        'I spent 20 for gas',
      ];

      variations.forEach(text => {
        const result = parseCommand(text);
        expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
        expect(result.entities.amount).toBe(20);
      });
    });

    it('should extract category from description', () => {
      const result = parseCommand('Add $50 for groceries');

      expect(result.entities.categoryText).toBeTruthy();
      expect(result.entities.categoryText.toLowerCase()).toContain('groceries');
    });
  });

  describe('Intent Recognition - EDIT_EXPENSE', () => {
    it('should recognize "Edit last expense"', () => {
      const result = parseCommand('Edit last expense');

      expect(result.intent).toBe(INTENTS.EDIT_EXPENSE);
    });

    it('should recognize "Change amount to $60"', () => {
      const result = parseCommand('Change amount to $60');

      expect(result.intent).toBe(INTENTS.EDIT_EXPENSE);
      expect(result.entities.field).toBe('amount');
      expect(result.entities.newValue).toBe(60);
    });

    it('should recognize "Change category to food"', () => {
      const result = parseCommand('Change category to food');

      expect(result.intent).toBe(INTENTS.EDIT_EXPENSE);
      expect(result.entities.field).toBe('category');
      expect(result.entities.newValue).toBe('food');
    });

    it('should recognize "Change description to dinner"', () => {
      const result = parseCommand('Change description to dinner');

      expect(result.intent).toBe(INTENTS.EDIT_EXPENSE);
      expect(result.entities.field).toBe('description');
      expect(result.entities.newValue).toBe('dinner');
    });

    it('should recognize "Update last expense"', () => {
      const result = parseCommand('Update last expense');

      expect(result.intent).toBe(INTENTS.EDIT_EXPENSE);
    });
  });

  describe('Intent Recognition - DELETE_EXPENSE', () => {
    it('should recognize "Delete last expense"', () => {
      const result = parseCommand('Delete last expense');

      expect(result.intent).toBe(INTENTS.DELETE_EXPENSE);
    });

    it('should recognize "Remove last expense"', () => {
      const result = parseCommand('Remove last expense');

      expect(result.intent).toBe(INTENTS.DELETE_EXPENSE);
    });

    it('should recognize "Undo last expense"', () => {
      const result = parseCommand('Undo last expense');

      expect(result.intent).toBe(INTENTS.DELETE_EXPENSE);
    });
  });

  describe('Intent Recognition - QUERY_BUDGET', () => {
    it('should recognize "Show my budget"', () => {
      const result = parseCommand('Show my budget');

      expect(result.intent).toBe(INTENTS.QUERY_BUDGET);
    });

    it('should recognize "What is my budget status"', () => {
      const result = parseCommand('What is my budget status');

      expect(result.intent).toBe(INTENTS.QUERY_BUDGET);
    });

    it('should recognize "Budget for groceries"', () => {
      const result = parseCommand('Budget for groceries');

      expect(result.intent).toBe(INTENTS.QUERY_BUDGET);
      expect(result.entities.categoryText).toContain('groceries');
    });

    it('should recognize "How much is left in food budget"', () => {
      const result = parseCommand('How much is left in food budget');

      expect(result.intent).toBe(INTENTS.QUERY_BUDGET);
      expect(result.entities.categoryText).toContain('food');
    });
  });

  describe('Intent Recognition - QUERY_BALANCE', () => {
    it('should recognize "What is our balance"', () => {
      const result = parseCommand('What is our balance');

      expect(result.intent).toBe(INTENTS.QUERY_BALANCE);
    });

    it('should recognize "Who owes who"', () => {
      const result = parseCommand('Who owes who');

      expect(result.intent).toBe(INTENTS.QUERY_BALANCE);
    });

    it('should recognize "Show balance"', () => {
      const result = parseCommand('Show balance');

      expect(result.intent).toBe(INTENTS.QUERY_BALANCE);
    });
  });

  describe('Intent Recognition - QUERY_SPENDING', () => {
    it('should recognize "Top spending categories"', () => {
      const result = parseCommand('Top spending categories');

      expect(result.intent).toBe(INTENTS.QUERY_SPENDING);
    });

    it('should recognize "How much did we spend on food"', () => {
      const result = parseCommand('How much did we spend on food');

      expect(result.intent).toBe(INTENTS.QUERY_SPENDING);
      expect(result.entities.categoryText).toContain('food');
    });

    it('should recognize "Show spending"', () => {
      const result = parseCommand('Show spending');

      expect(result.intent).toBe(INTENTS.QUERY_SPENDING);
    });
  });

  describe('Intent Recognition - LIST_EXPENSES', () => {
    it('should recognize "Show expenses"', () => {
      const result = parseCommand('Show expenses');

      expect(result.intent).toBe(INTENTS.LIST_EXPENSES);
    });

    it('should recognize "List all expenses"', () => {
      const result = parseCommand('List all expenses');

      expect(result.intent).toBe(INTENTS.LIST_EXPENSES);
    });

    it('should recognize "Recent expenses"', () => {
      const result = parseCommand('Recent expenses');

      expect(result.intent).toBe(INTENTS.LIST_EXPENSES);
    });
  });

  describe('Intent Recognition - HELP', () => {
    it('should recognize "help"', () => {
      const result = parseCommand('help');

      expect(result.intent).toBe(INTENTS.HELP);
    });

    it('should recognize "what can you do"', () => {
      const result = parseCommand('what can you do');

      expect(result.intent).toBe(INTENTS.HELP);
    });

    it('should recognize "commands"', () => {
      const result = parseCommand('commands');

      expect(result.intent).toBe(INTENTS.HELP);
    });
  });

  describe('Intent Recognition - SETTLE', () => {
    it('should recognize "settle up"', () => {
      const result = parseCommand('settle up');

      expect(result.intent).toBe(INTENTS.SETTLE);
    });

    it('should recognize "settle balance"', () => {
      const result = parseCommand('settle balance');

      expect(result.intent).toBe(INTENTS.SETTLE);
    });
  });

  describe('Intent Recognition - UNKNOWN', () => {
    it('should return UNKNOWN for unrecognized commands', () => {
      const result = parseCommand('xyz random text');

      expect(result.intent).toBe(INTENTS.UNKNOWN);
    });

    it('should return UNKNOWN for empty string', () => {
      const result = parseCommand('');

      expect(result.intent).toBe(INTENTS.UNKNOWN);
    });

    it('should return UNKNOWN for gibberish', () => {
      const result = parseCommand('asdfghjkl');

      expect(result.intent).toBe(INTENTS.UNKNOWN);
    });
  });

  describe('Entity Extraction - Amount', () => {
    it('should extract dollar amounts with $', () => {
      expect(extractAmount('$50')).toBe(50);
      expect(extractAmount('$49.99')).toBe(49.99);
      expect(extractAmount('$1000')).toBe(1000);
    });

    it('should extract amounts with "dollars"', () => {
      expect(extractAmount('30 dollars')).toBe(30);
      expect(extractAmount('45.50 dollars')).toBe(45.50);
    });

    it('should extract amounts with currency symbols', () => {
      expect(extractAmount('€50')).toBe(50);
      expect(extractAmount('£100')).toBe(100);
    });

    it('should return null for no amount found', () => {
      expect(extractAmount('no numbers here')).toBeNull();
    });

    it('should handle multiple amounts and return first', () => {
      const amount = extractAmount('spent $50 and $30');
      expect(amount).toBe(50);
    });
  });

  describe('Entity Extraction - Category', () => {
    it('should extract category from "for [category]"', () => {
      const category = extractCategory('spent $50 for groceries');
      expect(category.toLowerCase()).toContain('groceries');
    });

    it('should extract category from "on [category]"', () => {
      const category = extractCategory('spent $30 on lunch');
      expect(category.toLowerCase()).toContain('lunch');
    });

    it('should extract category from description', () => {
      const category = extractCategory('groceries $50');
      expect(category).toBeTruthy();
    });

    it('should return null when no category found', () => {
      const category = extractCategory('$50');
      expect(category).toBeNull();
    });
  });

  describe('Entity Extraction - Split Ratio', () => {
    it('should extract 60/40 split', () => {
      const result = extractSplitRatio('split 60/40');
      expect(result).toEqual({ user1: 60, user2: 40 });
    });

    it('should extract 70-30 split', () => {
      const result = extractSplitRatio('split 70-30');
      expect(result).toEqual({ user1: 70, user2: 30 });
    });

    it('should default to 50/50 when not specified', () => {
      const result = extractSplitRatio('Add $50 for groceries');
      expect(result).toEqual({ user1: 50, user2: 50 });
    });

    it('should handle split with spaces', () => {
      const result = extractSplitRatio('split 80 / 20');
      expect(result).toEqual({ user1: 80, user2: 20 });
    });
  });

  describe('Entity Extraction - Date', () => {
    it('should extract "today"', () => {
      const result = extractDate('spent $50 today');
      expect(result).toBeInstanceOf(Date);
      expect(result.toDateString()).toBe(new Date().toDateString());
    });

    it('should extract "yesterday"', () => {
      const result = extractDate('spent $50 yesterday');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      expect(result).toBeInstanceOf(Date);
      expect(result.toDateString()).toBe(yesterday.toDateString());
    });

    it('should default to today when not specified', () => {
      const result = extractDate('spent $50 for groceries');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle "last week"', () => {
      const result = extractDate('spent $50 last week');
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeLessThan(new Date().getTime());
    });
  });

  describe('Case Insensitivity', () => {
    it('should handle uppercase input', () => {
      const result = parseCommand('ADD $50 FOR GROCERIES');
      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
      expect(result.entities.amount).toBe(50);
    });

    it('should handle mixed case input', () => {
      const result = parseCommand('ShOw My BuDgEt');
      expect(result.intent).toBe(INTENTS.QUERY_BUDGET);
    });

    it('should handle lowercase input', () => {
      const result = parseCommand('delete last expense');
      expect(result.intent).toBe(INTENTS.DELETE_EXPENSE);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leading/trailing whitespace', () => {
      const result = parseCommand('  add $50 for groceries  ');
      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
      expect(result.entities.amount).toBe(50);
    });

    it('should handle multiple spaces', () => {
      const result = parseCommand('add    $50    for    groceries');
      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
    });

    it('should handle very large amounts', () => {
      const result = parseCommand('Add $9999999 for house');
      expect(result.entities.amount).toBe(9999999);
    });

    it('should handle very small amounts', () => {
      const result = parseCommand('Add $0.01 for candy');
      expect(result.entities.amount).toBe(0.01);
    });

    it('should preserve original text', () => {
      const original = 'Add $50 for groceries';
      const result = parseCommand(original);
      expect(result.raw).toBe(original);
    });

    it('should handle special characters in description', () => {
      const result = parseCommand('Add $50 for mom\'s gift');
      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
      expect(result.entities.description).toContain('mom');
    });
  });

  describe('Complex Patterns', () => {
    it('should extract all entities from complex command', () => {
      const result = parseCommand('Add $75.50 for groceries yesterday split 60/40');

      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
      expect(result.entities.amount).toBe(75.50);
      expect(result.entities.categoryText).toBeTruthy();
      expect(result.entities.splitRatio).toEqual({ user1: 60, user2: 40 });
      expect(result.entities.date).toBeInstanceOf(Date);
    });

    it('should handle multiple category keywords', () => {
      const result = parseCommand('spent $50 on groceries and food');
      expect(result.intent).toBe(INTENTS.ADD_EXPENSE);
      expect(result.entities.categoryText).toBeTruthy();
    });
  });
});
