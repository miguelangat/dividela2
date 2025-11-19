// src/services/nlpPatterns.js
// Natural language pattern matching and entity extraction

/**
 * Intent types that the system can recognize
 */
export const INTENTS = {
  ADD_EXPENSE: 'add_expense',
  EDIT_EXPENSE: 'edit_expense',
  QUERY_BUDGET: 'query_budget',
  QUERY_BALANCE: 'query_balance',
  QUERY_SPENDING: 'query_spending',
  SET_BUDGET: 'set_budget',
  SETTLE: 'settle',
  LIST_EXPENSES: 'list_expenses',
  DELETE_EXPENSE: 'delete_expense',
  HELP: 'help',
  UNKNOWN: 'unknown',
};

/**
 * Expense-related patterns
 */
const EXPENSE_PATTERNS = [
  // "Add $50 for groceries"
  /(?:add|spent|paid|expense)\s+\$?(\d+(?:\.\d{1,2})?)\s+(?:for|on|to|toward|towards)\s+(.+)/i,

  // "I spent 30 dollars on lunch"
  /(?:i\s+)?(?:spent|paid)\s+(\d+(?:\.\d{1,2})?)\s+(?:dollars?|bucks?|€|£)\s+(?:for|on|to|toward|towards)\s+(.+)/i,

  // "Add expense: $120 electricity bill"
  /(?:add|record|log)\s+expense[:\s]+\$?(\d+(?:\.\d{1,2})?)\s+(.+)/i,

  // "Record $15 coffee"
  /(?:record|log|add)\s+\$?(\d+(?:\.\d{1,2})?)\s+(.+)/i,

  // "$50 groceries" (simplified)
  /^\$?(\d+(?:\.\d{1,2})?)\s+(?:for\s+)?(.+)$/i,
];

/**
 * Budget query patterns
 */
const BUDGET_QUERY_PATTERNS = [
  // "How much left in food budget?"
  /(?:how\s+much|what'?s)\s+(?:left|remaining)\s+(?:in|for)\s+(.+)\s+budget/i,

  // "Show my budget status"
  /(?:show|display|check|what'?s)\s+(?:my|our|the)?\s*budget(?:\s+status)?/i,

  // "Budget for groceries"
  /budget\s+(?:for|in)\s+(.+)/i,

  // "What's my total spending?"
  /(?:what'?s|show|display)\s+(?:my|our|the)?\s*total\s+spending/i,
];

/**
 * Balance query patterns
 */
const BALANCE_QUERY_PATTERNS = [
  /(?:who\s+owes?\s+who|what'?s\s+(?:the|our)\s+balance|check\s+balance|show\s+balance)/i,
  /(?:do\s+i\s+owe|does\s+\w+\s+owe)/i,
];

/**
 * Spending query patterns
 */
const SPENDING_QUERY_PATTERNS = [
  // "How much did we spend on food this month?"
  /(?:how\s+much|what)\s+(?:did|have)\s+(?:we|i)\s+spend(?:t)?\s+(?:on|in|for)\s+(.+)\s+(?:this|last)\s+(month|week|year)/i,

  // "Top spending categories"
  /(?:top|highest|biggest)\s+spending\s+(?:categories|category)/i,

  // "Show spending for groceries"
  /(?:show|display|check)\s+spending\s+(?:for|on|in)\s+(.+)/i,
];

/**
 * Set budget patterns
 */
const SET_BUDGET_PATTERNS = [
  // "Set groceries budget to $500"
  /set\s+(.+)\s+budget\s+to\s+\$?(\d+(?:\.\d{1,2})?)/i,

  // "Budget $500 for groceries"
  /budget\s+\$?(\d+(?:\.\d{1,2})?)\s+(?:for|to)\s+(.+)/i,

  // "Change food budget to 400"
  /(?:change|update|modify)\s+(.+)\s+budget\s+to\s+\$?(\d+(?:\.\d{1,2})?)/i,
];

/**
 * Settlement patterns
 */
const SETTLEMENT_PATTERNS = [
  /(?:settle\s+up|settle|mark\s+as\s+settled|create\s+settlement)/i,
];

/**
 * List expenses patterns
 */
const LIST_EXPENSES_PATTERNS = [
  /(?:show|list|display)\s+(?:recent|all|my|our)?\s*expenses/i,
  /(?:what\s+did\s+(?:we|i)\s+spend|recent\s+spending)/i,
];

/**
 * Delete expense patterns
 */
const DELETE_EXPENSE_PATTERNS = [
  /(?:delete|remove)\s+(?:last|recent|the\s+last)\s+expense/i,
  /(?:undo|cancel)\s+(?:that|last|the\s+last)\s+expense/i,
  /(?:delete|remove)\s+expense\s+(?:number\s+)?(\d+)/i,
];

/**
 * Edit expense patterns
 */
const EDIT_EXPENSE_PATTERNS = [
  // "Edit last expense"
  /(?:edit|change|update|modify)\s+(?:last|recent|the\s+last)\s+expense/i,

  // "Edit expense to $60"
  /(?:edit|change|update)\s+(?:last\s+)?expense\s+(?:amount\s+)?to\s+\$?(\d+(?:\.\d{1,2})?)/i,

  // "Change last expense category to food"
  /(?:change|update)\s+(?:last\s+)?expense\s+category\s+to\s+(.+)/i,

  // "Update last expense description to dinner"
  /(?:change|update)\s+(?:last\s+)?expense\s+description\s+to\s+(.+)/i,
];

/**
 * Help patterns
 */
const HELP_PATTERNS = [
  /^(?:help|what\s+can\s+you\s+do|commands|how\s+to)$/i,
];

/**
 * Extract amount from text (handles $50, 50 dollars, etc.)
 */
export function extractAmount(text) {
  const patterns = [
    /\$(\d+(?:\.\d{1,2})?)/,
    /(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|€|£)/i,
    /(\d+(?:\.\d{1,2})?)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

/**
 * Extract split ratio from text (e.g., "60/40", "split evenly", "50-50")
 */
export function extractSplitRatio(text) {
  // Default split
  const defaultSplit = { user1Percentage: 50, user2Percentage: 50 };

  // "60/40" or "60-40"
  const ratioMatch = text.match(/(\d+)[/-](\d+)/);
  if (ratioMatch) {
    const ratio1 = parseInt(ratioMatch[1]);
    const ratio2 = parseInt(ratioMatch[2]);

    if (ratio1 + ratio2 === 100) {
      return {
        user1Percentage: ratio1,
        user2Percentage: ratio2,
      };
    }
  }

  // "Split evenly", "50/50", "half"
  if (/(?:split\s+evenly|50[/-]50|half|equally)/i.test(text)) {
    return defaultSplit;
  }

  // "I paid" or "paid by me" - assume 50/50 split but note who paid
  // (this is handled in command executor based on paidBy)

  return defaultSplit;
}

/**
 * Extract date from text (e.g., "yesterday", "last week", specific date)
 */
export function extractDate(text) {
  const now = new Date();

  if (/today/i.test(text)) {
    return now.toISOString();
  }

  if (/yesterday/i.test(text)) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString();
  }

  if (/last\s+week/i.test(text)) {
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    return lastWeek.toISOString();
  }

  // Default to now
  return now.toISOString();
}

/**
 * Extract category from text (returns raw text, fuzzy matching done separately)
 */
export function extractCategory(text) {
  // Remove common noise words
  const cleaned = text
    .replace(/\b(?:the|a|an|my|our|some|this|that)\b/gi, '')
    .trim();

  return cleaned || text;
}

/**
 * Main function to parse user input and extract intent and entities
 */
export function parseCommand(text) {
  if (!text || typeof text !== 'string') {
    return { intent: INTENTS.UNKNOWN, entities: {}, raw: text };
  }

  const normalizedText = text.trim();

  // Check expense patterns
  for (const pattern of EXPENSE_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      const description = match[2].trim();

      // Try to extract category from description
      // This will be fuzzy-matched against actual categories later
      const categoryText = extractCategory(description);

      return {
        intent: INTENTS.ADD_EXPENSE,
        entities: {
          amount,
          description,
          categoryText,
          splitRatio: extractSplitRatio(normalizedText),
          date: extractDate(normalizedText),
        },
        raw: text,
      };
    }
  }

  // Check set budget patterns
  for (const pattern of SET_BUDGET_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      // Handle different capture group orders
      let categoryText, amount;

      if (pattern.source.includes('set\\s+')) {
        // "Set groceries budget to $500"
        categoryText = match[1];
        amount = parseFloat(match[2]);
      } else {
        // "Budget $500 for groceries"
        amount = parseFloat(match[1]);
        categoryText = match[2];
      }

      return {
        intent: INTENTS.SET_BUDGET,
        entities: {
          categoryText: extractCategory(categoryText),
          amount,
        },
        raw: text,
      };
    }
  }

  // Check budget query patterns
  for (const pattern of BUDGET_QUERY_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      return {
        intent: INTENTS.QUERY_BUDGET,
        entities: {
          categoryText: match[1] ? extractCategory(match[1]) : null,
        },
        raw: text,
      };
    }
  }

  // Check balance patterns
  for (const pattern of BALANCE_QUERY_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return {
        intent: INTENTS.QUERY_BALANCE,
        entities: {},
        raw: text,
      };
    }
  }

  // Check spending query patterns
  for (const pattern of SPENDING_QUERY_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      return {
        intent: INTENTS.QUERY_SPENDING,
        entities: {
          categoryText: match[1] ? extractCategory(match[1]) : null,
          timeframe: match[2] || 'month',
        },
        raw: text,
      };
    }
  }

  // Check settlement patterns
  for (const pattern of SETTLEMENT_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return {
        intent: INTENTS.SETTLE,
        entities: {},
        raw: text,
      };
    }
  }

  // Check list expenses patterns
  for (const pattern of LIST_EXPENSES_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return {
        intent: INTENTS.LIST_EXPENSES,
        entities: {},
        raw: text,
      };
    }
  }

  // Check edit expense patterns
  for (const pattern of EDIT_EXPENSE_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      const entities = {};

      // Check what's being edited
      if (pattern.source.includes('amount')) {
        entities.field = 'amount';
        entities.newValue = match[1] ? parseFloat(match[1]) : null;
      } else if (pattern.source.includes('category')) {
        entities.field = 'category';
        entities.newValue = match[1] ? match[1].trim() : null;
      } else if (pattern.source.includes('description')) {
        entities.field = 'description';
        entities.newValue = match[1] ? match[1].trim() : null;
      } else {
        // General edit command, will ask user what to edit
        entities.field = null;
      }

      return {
        intent: INTENTS.EDIT_EXPENSE,
        entities,
        raw: text,
      };
    }
  }

  // Check delete expense patterns
  for (const pattern of DELETE_EXPENSE_PATTERNS) {
    const match = normalizedText.match(pattern);
    if (match) {
      const entities = {};

      // Check if specific expense number was mentioned
      if (match[1]) {
        entities.expenseNumber = parseInt(match[1], 10);
      }

      return {
        intent: INTENTS.DELETE_EXPENSE,
        entities,
        raw: text,
      };
    }
  }

  // Check help patterns
  for (const pattern of HELP_PATTERNS) {
    if (pattern.test(normalizedText)) {
      return {
        intent: INTENTS.HELP,
        entities: {},
        raw: text,
      };
    }
  }

  // Unknown intent
  return {
    intent: INTENTS.UNKNOWN,
    entities: {},
    raw: text,
  };
}
