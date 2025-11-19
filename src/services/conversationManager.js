// src/services/conversationManager.js
// Manages multi-turn conversation state and flow

/**
 * Conversation states
 */
export const CONVERSATION_STATES = {
  IDLE: 'idle',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  AWAITING_SELECTION: 'awaiting_selection',
  AWAITING_EXPENSE_ID: 'awaiting_expense_id',
  AWAITING_EDIT_FIELD: 'awaiting_edit_field',
  AWAITING_NEW_VALUE: 'awaiting_new_value',
  AWAITING_CATEGORY_CHOICE: 'awaiting_category_choice',
};

/**
 * Action types for confirmations
 */
export const CONFIRMATION_ACTIONS = {
  DELETE_EXPENSE: 'delete_expense',
  SETTLE_BALANCE: 'settle_balance',
  OVERRIDE_BUDGET: 'override_budget',
};

/**
 * Create a new conversation context
 */
export function createConversationContext() {
  return {
    state: CONVERSATION_STATES.IDLE,
    action: null,
    data: {},
    timestamp: Date.now(),
  };
}

/**
 * Check if input is a confirmation (yes/no)
 */
export function isConfirmation(text) {
  const normalized = text.toLowerCase().trim();

  const yesPatterns = [
    /^yes$/i,
    /^yeah$/i,
    /^yep$/i,
    /^sure$/i,
    /^ok$/i,
    /^okay$/i,
    /^confirm$/i,
    /^do it$/i,
    /^y$/i,
  ];

  const noPatterns = [
    /^no$/i,
    /^nope$/i,
    /^nah$/i,
    /^cancel$/i,
    /^nevermind$/i,
    /^never mind$/i,
    /^n$/i,
  ];

  for (const pattern of yesPatterns) {
    if (pattern.test(normalized)) {
      return { confirmed: true, type: 'yes' };
    }
  }

  for (const pattern of noPatterns) {
    if (pattern.test(normalized)) {
      return { confirmed: false, type: 'no' };
    }
  }

  return null;
}

/**
 * Check if input is a numeric selection (1, 2, 3, etc.)
 */
export function isNumericSelection(text) {
  const match = text.trim().match(/^(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Create a confirmation context
 */
export function createConfirmationContext(action, data, message) {
  return {
    state: CONVERSATION_STATES.AWAITING_CONFIRMATION,
    action,
    data,
    message,
    timestamp: Date.now(),
  };
}

/**
 * Create a selection context (for multiple choice)
 */
export function createSelectionContext(action, options, message) {
  return {
    state: CONVERSATION_STATES.AWAITING_SELECTION,
    action,
    options,
    message,
    timestamp: Date.now(),
  };
}

/**
 * Create a category disambiguation context
 */
export function createCategoryDisambiguationContext(categoryMatches, originalIntent, originalEntities) {
  return {
    state: CONVERSATION_STATES.AWAITING_CATEGORY_CHOICE,
    action: 'choose_category',
    categoryMatches,
    originalIntent,
    originalEntities,
    timestamp: Date.now(),
  };
}

/**
 * Create an expense editing context
 */
export function createExpenseEditContext(expenseId, expense) {
  return {
    state: CONVERSATION_STATES.AWAITING_EDIT_FIELD,
    action: 'edit_expense',
    expenseId,
    expense,
    timestamp: Date.now(),
  };
}

/**
 * Format options for display
 */
export function formatOptionsMessage(message, options) {
  let formatted = message + '\n\n';

  options.forEach((option, index) => {
    formatted += `${index + 1}. ${option.label}\n`;
  });

  formatted += '\nReply with a number or say "cancel" to cancel.';

  return formatted;
}

/**
 * Format category choices for display
 */
export function formatCategoryChoices(categories) {
  let message = '🤔 I found multiple matching categories:\n\n';

  categories.forEach((cat, index) => {
    const confidence = Math.round(cat.score * 100);
    message += `${index + 1}. ${cat.category.icon || '📌'} ${cat.category.name} (${confidence}% match)\n`;
  });

  message += '\nWhich one did you mean? Reply with a number.';

  return message;
}

/**
 * Check if conversation context is expired (older than 5 minutes)
 */
export function isContextExpired(context) {
  if (!context || !context.timestamp) {
    return true;
  }

  const FIVE_MINUTES = 5 * 60 * 1000;
  return Date.now() - context.timestamp > FIVE_MINUTES;
}

/**
 * Handle confirmation response
 */
export function handleConfirmationResponse(userInput, context) {
  const confirmation = isConfirmation(userInput);

  if (!confirmation) {
    return {
      understood: false,
      message: 'Please reply with "yes" to confirm or "no" to cancel.',
    };
  }

  return {
    understood: true,
    confirmed: confirmation.confirmed,
    action: context.action,
    data: context.data,
  };
}

/**
 * Handle selection response (numeric choice)
 */
export function handleSelectionResponse(userInput, context) {
  // Check for cancel
  if (/^cancel$/i.test(userInput.trim())) {
    return {
      understood: true,
      cancelled: true,
      message: '✅ Cancelled.',
    };
  }

  const selection = isNumericSelection(userInput);

  if (selection === null) {
    return {
      understood: false,
      message: `Please reply with a number (1-${context.options.length}) or "cancel".`,
    };
  }

  if (selection < 1 || selection > context.options.length) {
    return {
      understood: false,
      message: `Please choose a number between 1 and ${context.options.length}.`,
    };
  }

  const selectedOption = context.options[selection - 1];

  return {
    understood: true,
    selection: selection - 1,
    selectedOption,
    action: context.action,
  };
}

/**
 * Handle category disambiguation response
 */
export function handleCategoryDisambiguationResponse(userInput, context) {
  // Check for cancel
  if (/^cancel$/i.test(userInput.trim())) {
    return {
      understood: true,
      cancelled: true,
      message: '✅ Cancelled.',
    };
  }

  const selection = isNumericSelection(userInput);

  if (selection === null) {
    return {
      understood: false,
      message: `Please reply with a number (1-${context.categoryMatches.length}) or "cancel".`,
    };
  }

  if (selection < 1 || selection > context.categoryMatches.length) {
    return {
      understood: false,
      message: `Please choose a number between 1 and ${context.categoryMatches.length}.`,
    };
  }

  const selectedCategory = context.categoryMatches[selection - 1];

  return {
    understood: true,
    selectedCategory,
    originalIntent: context.originalIntent,
    originalEntities: context.originalEntities,
  };
}

/**
 * Process user input in context of current conversation state
 */
export function processConversationalInput(userInput, conversationContext) {
  // No active conversation
  if (!conversationContext || conversationContext.state === CONVERSATION_STATES.IDLE) {
    return { newCommand: true };
  }

  // Check if context is expired
  if (isContextExpired(conversationContext)) {
    return {
      newCommand: true,
      message: '⏱️ That conversation timed out. What would you like to do?',
    };
  }

  // Handle based on current state
  switch (conversationContext.state) {
    case CONVERSATION_STATES.AWAITING_CONFIRMATION:
      return handleConfirmationResponse(userInput, conversationContext);

    case CONVERSATION_STATES.AWAITING_SELECTION:
      return handleSelectionResponse(userInput, conversationContext);

    case CONVERSATION_STATES.AWAITING_CATEGORY_CHOICE:
      return handleCategoryDisambiguationResponse(userInput, conversationContext);

    default:
      return { newCommand: true };
  }
}

export default {
  CONVERSATION_STATES,
  CONFIRMATION_ACTIONS,
  createConversationContext,
  createConfirmationContext,
  createSelectionContext,
  createCategoryDisambiguationContext,
  createExpenseEditContext,
  formatOptionsMessage,
  formatCategoryChoices,
  isConfirmation,
  isNumericSelection,
  isContextExpired,
  processConversationalInput,
};
