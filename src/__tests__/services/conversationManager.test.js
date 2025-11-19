// src/__tests__/services/conversationManager.test.js
// Unit tests for multi-turn conversation state management

import {
  CONVERSATION_STATES,
  CONFIRMATION_ACTIONS,
  createConversationContext,
  createConfirmationContext,
  createSelectionContext,
  processConversationalInput,
  handleConfirmationResponse,
  handleSelectionResponse,
  isContextExpired,
  resetContext,
} from '../../services/conversationManager';

describe('conversationManager.js - Conversation State Management', () => {
  describe('Context Creation', () => {
    it('should create default conversation context', () => {
      const context = createConversationContext();

      expect(context.state).toBe(CONVERSATION_STATES.IDLE);
      expect(context.timestamp).toBeInstanceOf(Date);
      expect(context.data).toEqual({});
    });

    it('should create confirmation context', () => {
      const data = { expenseId: '123' };
      const message = 'Are you sure?';
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        data,
        message
      );

      expect(context.state).toBe(CONVERSATION_STATES.AWAITING_CONFIRMATION);
      expect(context.action).toBe(CONFIRMATION_ACTIONS.DELETE_EXPENSE);
      expect(context.data).toEqual(data);
      expect(context.message).toBe(message);
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it('should create selection context', () => {
      const options = ['Option 1', 'Option 2', 'Option 3'];
      const message = 'Select an option:';
      const context = createSelectionContext(options, message);

      expect(context.state).toBe(CONVERSATION_STATES.AWAITING_SELECTION);
      expect(context.options).toEqual(options);
      expect(context.message).toBe(message);
      expect(context.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Confirmation Handling', () => {
    it('should recognize "yes" as confirmation', () => {
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        { expenseId: '123' },
        'Delete?'
      );

      const yesVariations = ['yes', 'YES', 'Yes', 'y', 'yep', 'yeah', 'confirm'];

      yesVariations.forEach((input) => {
        const result = handleConfirmationResponse(input, context);
        expect(result.confirmed).toBe(true);
        expect(result.action).toBe(CONFIRMATION_ACTIONS.DELETE_EXPENSE);
      });
    });

    it('should recognize "no" as rejection', () => {
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        { expenseId: '123' },
        'Delete?'
      );

      const noVariations = ['no', 'NO', 'No', 'n', 'nope', 'cancel'];

      noVariations.forEach((input) => {
        const result = handleConfirmationResponse(input, context);
        expect(result.confirmed).toBe(false);
        expect(result.cancelled).toBe(true);
      });
    });

    it('should return confirmation data', () => {
      const data = { expenseId: '123', amount: 50 };
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        data,
        'Delete?'
      );

      const result = handleConfirmationResponse('yes', context);

      expect(result.data).toEqual(data);
    });

    it('should handle invalid confirmation input', () => {
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        {},
        'Delete?'
      );

      const result = handleConfirmationResponse('maybe', context);

      expect(result.confirmed).toBe(false);
      expect(result.needsClarification).toBe(true);
    });
  });

  describe('Selection Handling', () => {
    const options = ['Groceries', 'Dining', 'Transport'];

    it('should recognize numeric selection', () => {
      const context = createSelectionContext(options, 'Choose:');

      const result = handleSelectionResponse('1', context);

      expect(result.selected).toBe(true);
      expect(result.selectedIndex).toBe(0);
      expect(result.selectedOption).toBe('Groceries');
    });

    it('should handle different numeric inputs', () => {
      const context = createSelectionContext(options, 'Choose:');

      const result1 = handleSelectionResponse('1', context);
      const result2 = handleSelectionResponse('2', context);
      const result3 = handleSelectionResponse('3', context);

      expect(result1.selectedIndex).toBe(0);
      expect(result2.selectedIndex).toBe(1);
      expect(result3.selectedIndex).toBe(2);
    });

    it('should reject out-of-range selection', () => {
      const context = createSelectionContext(options, 'Choose:');

      const result = handleSelectionResponse('5', context);

      expect(result.selected).toBe(false);
      expect(result.needsClarification).toBe(true);
    });

    it('should reject zero selection', () => {
      const context = createSelectionContext(options, 'Choose:');

      const result = handleSelectionResponse('0', context);

      expect(result.selected).toBe(false);
    });

    it('should handle cancel keywords', () => {
      const context = createSelectionContext(options, 'Choose:');

      const cancelWords = ['cancel', 'Cancel', 'CANCEL', 'nevermind'];

      cancelWords.forEach((input) => {
        const result = handleSelectionResponse(input, context);
        expect(result.cancelled).toBe(true);
      });
    });

    it('should reject non-numeric input', () => {
      const context = createSelectionContext(options, 'Choose:');

      const result = handleSelectionResponse('abc', context);

      expect(result.selected).toBe(false);
      expect(result.needsClarification).toBe(true);
    });
  });

  describe('Conversational Input Processing', () => {
    it('should return newCommand for IDLE state', () => {
      const context = createConversationContext();

      const result = processConversationalInput('hello', context);

      expect(result.newCommand).toBe(true);
    });

    it('should process confirmation in AWAITING_CONFIRMATION state', () => {
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        { expenseId: '123' },
        'Delete?'
      );

      const result = processConversationalInput('yes', context);

      expect(result.newCommand).toBe(false);
      expect(result.confirmed).toBe(true);
    });

    it('should process selection in AWAITING_SELECTION state', () => {
      const context = createSelectionContext(['Option 1', 'Option 2'], 'Choose:');

      const result = processConversationalInput('1', context);

      expect(result.newCommand).toBe(false);
      expect(result.selected).toBe(true);
    });

    it('should handle expired context', () => {
      const context = createConversationContext();
      context.timestamp = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

      const result = processConversationalInput('hello', context);

      expect(result.newCommand).toBe(true);
      expect(result.message).toContain('timed out');
    });

    it('should treat null context as new command', () => {
      const result = processConversationalInput('hello', null);

      expect(result.newCommand).toBe(true);
    });
  });

  describe('Context Expiration', () => {
    it('should not expire fresh context', () => {
      const context = createConversationContext();

      expect(isContextExpired(context)).toBe(false);
    });

    it('should expire old context (5+ minutes)', () => {
      const context = createConversationContext();
      context.timestamp = new Date(Date.now() - 6 * 60 * 1000);

      expect(isContextExpired(context)).toBe(true);
    });

    it('should handle null context', () => {
      expect(isContextExpired(null)).toBe(true);
    });

    it('should handle context without timestamp', () => {
      const context = { state: CONVERSATION_STATES.IDLE };

      expect(isContextExpired(context)).toBe(true);
    });

    it('should use custom timeout', () => {
      const context = createConversationContext();
      context.timestamp = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago

      // Should not expire with 5 min timeout
      expect(isContextExpired(context, 5 * 60 * 1000)).toBe(false);

      // Should expire with 1 min timeout
      expect(isContextExpired(context, 1 * 60 * 1000)).toBe(true);
    });
  });

  describe('Context Reset', () => {
    it('should reset to IDLE state', () => {
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        { expenseId: '123' },
        'Delete?'
      );

      const reset = resetContext(context);

      expect(reset.state).toBe(CONVERSATION_STATES.IDLE);
      expect(reset.data).toEqual({});
    });

    it('should preserve timestamp on reset', () => {
      const context = createConversationContext();
      const beforeReset = context.timestamp;

      const reset = resetContext(context);

      expect(reset.timestamp).toBeInstanceOf(Date);
      // Should be close to original
      expect(Math.abs(reset.timestamp - beforeReset)).toBeLessThan(1000);
    });

    it('should handle null context', () => {
      const reset = resetContext(null);

      expect(reset.state).toBe(CONVERSATION_STATES.IDLE);
      expect(reset.data).toEqual({});
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string input', () => {
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        {},
        'Delete?'
      );

      const result = handleConfirmationResponse('', context);

      expect(result.confirmed).toBe(false);
      expect(result.needsClarification).toBe(true);
    });

    it('should handle whitespace input', () => {
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        {},
        'Delete?'
      );

      const result = handleConfirmationResponse('   ', context);

      expect(result.confirmed).toBe(false);
    });

    it('should handle very long input', () => {
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        {},
        'Delete?'
      );

      const longInput = 'yes '.repeat(100);
      const result = handleConfirmationResponse(longInput, context);

      // Should still recognize "yes"
      expect(result.confirmed).toBe(true);
    });

    it('should handle special characters in confirmation', () => {
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        {},
        'Delete?'
      );

      const result = handleConfirmationResponse('yes!!!', context);

      expect(result.confirmed).toBe(true);
    });

    it('should handle selection with extra text', () => {
      const context = createSelectionContext(['Option 1', 'Option 2'], 'Choose:');

      const result = handleSelectionResponse('I choose 1', context);

      expect(result.selected).toBe(true);
      expect(result.selectedIndex).toBe(0);
    });
  });

  describe('State Transitions', () => {
    it('should transition from IDLE to AWAITING_CONFIRMATION', () => {
      const initial = createConversationContext();
      expect(initial.state).toBe(CONVERSATION_STATES.IDLE);

      const confirmation = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        {},
        'Delete?'
      );
      expect(confirmation.state).toBe(CONVERSATION_STATES.AWAITING_CONFIRMATION);
    });

    it('should transition from IDLE to AWAITING_SELECTION', () => {
      const initial = createConversationContext();
      expect(initial.state).toBe(CONVERSATION_STATES.IDLE);

      const selection = createSelectionContext(['A', 'B'], 'Choose:');
      expect(selection.state).toBe(CONVERSATION_STATES.AWAITING_SELECTION);
    });

    it('should transition back to IDLE after confirmation', () => {
      const confirmation = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        {},
        'Delete?'
      );

      handleConfirmationResponse('yes', confirmation);

      const reset = resetContext(confirmation);
      expect(reset.state).toBe(CONVERSATION_STATES.IDLE);
    });

    it('should transition back to IDLE after selection', () => {
      const selection = createSelectionContext(['A', 'B'], 'Choose:');

      handleSelectionResponse('1', selection);

      const reset = resetContext(selection);
      expect(reset.state).toBe(CONVERSATION_STATES.IDLE);
    });
  });

  describe('Data Persistence', () => {
    it('should preserve data through confirmation flow', () => {
      const originalData = {
        expenseId: '123',
        amount: 50,
        description: 'Test',
      };

      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        originalData,
        'Delete?'
      );

      const result = handleConfirmationResponse('yes', context);

      expect(result.data).toEqual(originalData);
    });

    it('should handle nested data structures', () => {
      const complexData = {
        expense: {
          id: '123',
          details: {
            amount: 50,
            category: 'food',
          },
        },
        user: {
          id: 'user1',
        },
      };

      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        complexData,
        'Delete?'
      );

      expect(context.data).toEqual(complexData);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete delete expense confirmation flow', () => {
      // Step 1: Create context
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        { expenseId: '123' },
        'Are you sure you want to delete this expense?'
      );

      expect(context.state).toBe(CONVERSATION_STATES.AWAITING_CONFIRMATION);

      // Step 2: Process user input
      const result = processConversationalInput('yes', context);

      expect(result.confirmed).toBe(true);
      expect(result.action).toBe(CONFIRMATION_ACTIONS.DELETE_EXPENSE);
      expect(result.data.expenseId).toBe('123');

      // Step 3: Reset after action
      const reset = resetContext(context);
      expect(reset.state).toBe(CONVERSATION_STATES.IDLE);
    });

    it('should handle category selection flow', () => {
      // Step 1: Create selection context
      const categories = ['Groceries', 'Dining', 'Transport'];
      const context = createSelectionContext(categories, 'Which category?');

      expect(context.state).toBe(CONVERSATION_STATES.AWAITING_SELECTION);

      // Step 2: Process selection
      const result = processConversationalInput('2', context);

      expect(result.selected).toBe(true);
      expect(result.selectedOption).toBe('Dining');

      // Step 3: Reset
      const reset = resetContext(context);
      expect(reset.state).toBe(CONVERSATION_STATES.IDLE);
    });

    it('should handle timeout and retry', () => {
      // Step 1: Create context
      const context = createConfirmationContext(
        CONFIRMATION_ACTIONS.DELETE_EXPENSE,
        { expenseId: '123' },
        'Delete?'
      );

      // Step 2: Simulate timeout
      context.timestamp = new Date(Date.now() - 10 * 60 * 1000);

      // Step 3: Try to process input
      const result = processConversationalInput('yes', context);

      // Should treat as new command due to timeout
      expect(result.newCommand).toBe(true);
      expect(result.message).toContain('timed out');
    });
  });
});
