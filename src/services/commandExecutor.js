// src/services/commandExecutor.js
// Execute commands parsed from natural language

import * as expenseService from './expenseService';
import * as budgetService from './budgetService';
import { findMatchingCategory, suggestCategoryFromDescription, findMultipleMatches } from './fuzzyMatcher';
import { INTENTS } from './nlpPatterns';
import {
  createConfirmationContext,
  createCategoryDisambiguationContext,
  formatCategoryChoices,
  CONFIRMATION_ACTIONS,
} from './conversationManager';

/**
 * Execute ADD_EXPENSE command
 */
async function executeAddExpense(entities, context) {
  const { amount, description, categoryText, splitRatio, date } = entities;
  const { categories, userDetails, currentBudget, budgetProgress } = context;

  if (!amount || amount <= 0) {
    return {
      success: false,
      message: "I couldn't find a valid amount. Please specify how much you spent (e.g., '$50').",
    };
  }

  // Try to match category
  let categoryKey = 'other';
  let categoryName = 'Other';
  let categoryMatch = null;

  if (categoryText) {
    // First try fuzzy matching against category names
    categoryMatch = findMatchingCategory(categoryText, categories, 0.6);

    // If no good match, try suggesting from description keywords
    if (!categoryMatch) {
      categoryMatch = suggestCategoryFromDescription(description, categories);
    }

    if (categoryMatch) {
      categoryKey = categoryMatch.key;
      categoryName = categoryMatch.category.name;
    }
  }

  // Check if this expense would exceed budget
  let budgetWarning = null;
  if (currentBudget && currentBudget.enabled && budgetProgress) {
    const categoryBudget = currentBudget.categoryBudgets[categoryKey];
    const currentSpent = budgetProgress.categoryProgress[categoryKey]?.spent || 0;
    const newTotal = currentSpent + amount;

    if (categoryBudget) {
      const percentage = (newTotal / categoryBudget) * 100;

      if (percentage >= 100) {
        budgetWarning = {
          level: 'over',
          message: `⚠️ This will put you ${Math.round(percentage - 100)}% over your ${categoryName} budget ($${categoryBudget}).`,
          currentSpent,
          budget: categoryBudget,
          newTotal,
          percentage,
        };
      } else if (percentage >= 80) {
        budgetWarning = {
          level: 'warning',
          message: `⚠️ You'll be at ${Math.round(percentage)}% of your ${categoryName} budget after this expense.`,
          currentSpent,
          budget: categoryBudget,
          newTotal,
          percentage,
        };
      }
    }
  }

  // Calculate split amounts
  const user1Percentage = splitRatio.user1Percentage || 50;
  const user2Percentage = splitRatio.user2Percentage || 50;
  const user1Amount = (amount * user1Percentage) / 100;
  const user2Amount = (amount * user2Percentage) / 100;

  // Create expense object
  const expenseData = {
    coupleId: userDetails.coupleId,
    amount,
    description,
    categoryKey,
    category: categoryName, // Legacy field
    paidBy: userDetails.uid,
    date: date || new Date().toISOString(),
    splitDetails: {
      user1Amount,
      user2Amount,
      user1Percentage,
      user2Percentage,
    },
    settledAt: null,
    settledBySettlementId: null,
  };

  try {
    // Add the expense
    const newExpense = await expenseService.addExpense(expenseData);

    let responseMessage = `✅ Added $${amount.toFixed(2)} expense for ${description}\n`;
    responseMessage += `📂 Category: ${categoryName}`;

    if (categoryMatch && !categoryMatch.exact) {
      responseMessage += ` (matched from "${categoryText}")`;
    }

    if (splitRatio.user1Percentage !== 50) {
      responseMessage += `\n💰 Split: ${user1Percentage}/${user2Percentage}`;
    }

    if (budgetWarning) {
      responseMessage += `\n\n${budgetWarning.message}`;
    }

    return {
      success: true,
      message: responseMessage,
      data: {
        expense: newExpense,
        budgetWarning,
        categoryMatch,
      },
    };
  } catch (error) {
    console.error('Error adding expense:', error);
    return {
      success: false,
      message: `❌ Failed to add expense: ${error.message}`,
      error,
    };
  }
}

/**
 * Execute QUERY_BUDGET command
 */
async function executeQueryBudget(entities, context) {
  const { categoryText } = entities;
  const { categories, currentBudget, budgetProgress } = context;

  if (!currentBudget || !currentBudget.enabled) {
    return {
      success: true,
      message: "You don't have a budget set up yet. Would you like to create one?",
    };
  }

  if (!budgetProgress) {
    return {
      success: true,
      message: "Loading budget information...",
    };
  }

  // Query for specific category
  if (categoryText) {
    const categoryMatch = findMatchingCategory(categoryText, categories, 0.6);

    if (!categoryMatch) {
      return {
        success: false,
        message: `I couldn't find a category matching "${categoryText}". Try: ${Object.values(categories).slice(0, 3).map(c => c.name).join(', ')}, etc.`,
      };
    }

    const categoryKey = categoryMatch.key;
    const category = categoryMatch.category;
    const progress = budgetProgress.categoryProgress[categoryKey];

    if (!progress) {
      return {
        success: true,
        message: `📊 ${category.name}: $0 spent (no budget set)`,
      };
    }

    const percentage = Math.round(progress.percentage);
    const emoji = percentage >= 100 ? '🔴' : percentage >= 80 ? '🟡' : '🟢';

    let message = `📊 **${category.name} Budget**\n\n`;
    message += `${emoji} $${progress.spent.toFixed(2)} / $${progress.budget.toFixed(2)} (${percentage}%)\n`;
    message += `💵 Remaining: $${progress.remaining.toFixed(2)}`;

    return {
      success: true,
      message,
      data: {
        category: categoryKey,
        progress,
      },
    };
  }

  // Query for overall budget
  const totalPercentage = Math.round(budgetProgress.percentage);
  const emoji = totalPercentage >= 100 ? '🔴' : totalPercentage >= 80 ? '🟡' : '🟢';

  let message = `📊 **Budget Overview**\n\n`;
  message += `${emoji} Total: $${budgetProgress.totalSpent.toFixed(2)} / $${budgetProgress.totalBudget.toFixed(2)} (${totalPercentage}%)\n`;
  message += `💵 Remaining: $${budgetProgress.remaining.toFixed(2)}\n\n`;

  // Top spending categories
  const topCategories = Object.entries(budgetProgress.categoryProgress)
    .filter(([_, progress]) => progress.spent > 0)
    .sort((a, b) => b[1].spent - a[1].spent)
    .slice(0, 3);

  if (topCategories.length > 0) {
    message += `**Top Spending:**\n`;
    topCategories.forEach(([key, progress]) => {
      const category = categories[key];
      const percentage = Math.round(progress.percentage);
      const icon = percentage >= 100 ? '🔴' : percentage >= 80 ? '🟡' : '🟢';
      message += `${icon} ${category.name}: $${progress.spent.toFixed(2)} (${percentage}%)\n`;
    });
  }

  return {
    success: true,
    message,
    data: {
      budgetProgress,
    },
  };
}

/**
 * Execute QUERY_BALANCE command
 */
async function executeQueryBalance(entities, context) {
  const { expenses, userDetails } = context;

  if (!expenses || expenses.length === 0) {
    return {
      success: true,
      message: "💰 No expenses yet. You're all settled up!",
    };
  }

  // Calculate balance from unsettled expenses
  let user1Total = 0;
  let user2Total = 0;

  expenses.forEach((expense) => {
    if (!expense.settledAt) {
      // Add the split amounts based on who paid
      if (expense.splitDetails) {
        if (expense.paidBy === userDetails.uid) {
          // Current user paid, partner owes their share
          user2Total += expense.splitDetails.user2Amount || 0;
        } else {
          // Partner paid, current user owes their share
          user1Total += expense.splitDetails.user1Amount || 0;
        }
      }
    }
  });

  const balance = user2Total - user1Total;
  const absBalance = Math.abs(balance);

  let message = `💰 **Current Balance**\n\n`;

  if (Math.abs(balance) < 0.01) {
    message += `✅ All settled up! No one owes anything.`;
  } else if (balance > 0) {
    message += `💵 Your partner owes you $${absBalance.toFixed(2)}`;
  } else {
    message += `💵 You owe your partner $${absBalance.toFixed(2)}`;
  }

  const unsettledCount = expenses.filter(e => !e.settledAt).length;
  if (unsettledCount > 0) {
    message += `\n\n📝 ${unsettledCount} unsettled expense${unsettledCount !== 1 ? 's' : ''}`;
  }

  return {
    success: true,
    message,
    data: {
      balance,
      unsettledCount,
    },
  };
}

/**
 * Execute QUERY_SPENDING command
 */
async function executeQuerySpending(entities, context) {
  const { categoryText, timeframe } = entities;
  const { categories, expenses } = context;

  if (!expenses || expenses.length === 0) {
    return {
      success: true,
      message: "No expenses recorded yet.",
    };
  }

  // Calculate spending by category for current month
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const spending = budgetService.calculateSpendingByCategory(expenses, month, year);

  // Query for specific category
  if (categoryText) {
    const categoryMatch = findMatchingCategory(categoryText, categories, 0.6);

    if (!categoryMatch) {
      return {
        success: false,
        message: `I couldn't find a category matching "${categoryText}".`,
      };
    }

    const categoryKey = categoryMatch.key;
    const category = categoryMatch.category;
    const spent = spending[categoryKey] || 0;

    return {
      success: true,
      message: `📊 ${category.name}: $${spent.toFixed(2)} spent this month`,
      data: {
        category: categoryKey,
        spent,
      },
    };
  }

  // Show top spending categories
  const topCategories = Object.entries(spending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topCategories.length === 0) {
    return {
      success: true,
      message: "No spending recorded this month.",
    };
  }

  const total = Object.values(spending).reduce((sum, amount) => sum + amount, 0);

  let message = `📊 **Top Spending This Month**\n\n`;
  message += `💰 Total: $${total.toFixed(2)}\n\n`;

  topCategories.forEach(([key, amount]) => {
    const category = categories[key];
    const percentage = Math.round((amount / total) * 100);
    message += `${category?.icon || '📌'} ${category?.name || key}: $${amount.toFixed(2)} (${percentage}%)\n`;
  });

  return {
    success: true,
    message,
    data: {
      spending,
      total,
    },
  };
}

/**
 * Execute SET_BUDGET command
 */
async function executeSetBudget(entities, context) {
  const { categoryText, amount } = entities;
  const { categories, userDetails, currentBudget } = context;

  if (!amount || amount <= 0) {
    return {
      success: false,
      message: "Please specify a valid budget amount (e.g., '$500').",
    };
  }

  const categoryMatch = findMatchingCategory(categoryText, categories, 0.6);

  if (!categoryMatch) {
    return {
      success: false,
      message: `I couldn't find a category matching "${categoryText}". Try: ${Object.values(categories).slice(0, 3).map(c => c.name).join(', ')}, etc.`,
    };
  }

  const categoryKey = categoryMatch.key;
  const category = categoryMatch.category;

  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Update the budget
    const updatedBudgets = {
      ...currentBudget?.categoryBudgets,
      [categoryKey]: amount,
    };

    await budgetService.saveBudget(
      userDetails.coupleId,
      month,
      year,
      updatedBudgets,
      { enabled: true }
    );

    return {
      success: true,
      message: `✅ Set ${category.name} budget to $${amount.toFixed(2)} for this month`,
      data: {
        category: categoryKey,
        amount,
      },
    };
  } catch (error) {
    console.error('Error setting budget:', error);
    return {
      success: false,
      message: `❌ Failed to set budget: ${error.message}`,
      error,
    };
  }
}

/**
 * Execute HELP command
 */
function executeHelp() {
  const message = `🤖 **Budget Assistant Commands**\n\n` +
    `**Add Expenses:**\n` +
    `• "Add $50 for groceries"\n` +
    `• "I spent 30 dollars on lunch"\n` +
    `• "Record $120 electricity bill"\n\n` +
    `**Edit Expenses:**\n` +
    `• "Edit last expense"\n` +
    `• "Change amount to $60"\n` +
    `• "Change category to food"\n\n` +
    `**Delete Expenses:**\n` +
    `• "Delete last expense"\n` +
    `• "Remove last expense"\n\n` +
    `**Check Budget:**\n` +
    `• "Show my budget status"\n` +
    `• "How much left in food budget?"\n` +
    `• "Budget for groceries"\n\n` +
    `**View Balance:**\n` +
    `• "What's our balance?"\n` +
    `• "Who owes who?"\n\n` +
    `**Check Spending:**\n` +
    `• "Top spending categories"\n` +
    `• "How much did we spend on food?"\n\n` +
    `**Set Budget:**\n` +
    `• "Set groceries budget to $500"\n` +
    `• "Budget $400 for food"`;

  return {
    success: true,
    message,
  };
}

/**
 * Execute LIST_EXPENSES command
 */
function executeListExpenses(entities, context) {
  const { expenses } = context;

  if (!expenses || expenses.length === 0) {
    return {
      success: true,
      message: "No expenses recorded yet.",
    };
  }

  const recentExpenses = expenses.slice(0, 5);
  let message = `📝 **Recent Expenses**\n\n`;

  recentExpenses.forEach((expense, index) => {
    const date = new Date(expense.date);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    message += `${index + 1}. $${expense.amount.toFixed(2)} - ${expense.description}\n`;
    message += `   ${dateStr} • ${expense.category || expense.categoryKey}\n\n`;
  });

  return {
    success: true,
    message,
    data: {
      expenses: recentExpenses,
    },
  };
}

/**
 * Execute EDIT_EXPENSE command
 */
async function executeEditExpense(entities, context) {
  const { field, newValue } = entities;
  const { expenses, categories, userDetails } = context;

  if (!expenses || expenses.length === 0) {
    return {
      success: false,
      message: "No expenses to edit. Add an expense first!",
    };
  }

  // Get the most recent expense
  const lastExpense = expenses[0];

  // If no specific field specified, ask what to edit
  if (!field) {
    return {
      success: true,
      message: `📝 **Edit Last Expense**\n\n` +
        `Current: $${lastExpense.amount.toFixed(2)} - ${lastExpense.description}\n` +
        `Category: ${lastExpense.category || lastExpense.categoryKey}\n\n` +
        `What would you like to change?\n` +
        `• "Change amount to $60"\n` +
        `• "Change category to food"\n` +
        `• "Change description to dinner"`,
      data: {
        needsField: true,
        expense: lastExpense,
      },
    };
  }

  try {
    const updates = {};

    if (field === 'amount') {
      if (!newValue || newValue <= 0) {
        return {
          success: false,
          message: "Please specify a valid amount (e.g., 'Change amount to $60').",
        };
      }
      updates.amount = newValue;

      // Recalculate split
      const user1Percentage = lastExpense.splitDetails?.user1Percentage || 50;
      const user2Percentage = lastExpense.splitDetails?.user2Percentage || 50;
      updates.splitDetails = {
        user1Amount: (newValue * user1Percentage) / 100,
        user2Amount: (newValue * user2Percentage) / 100,
        user1Percentage,
        user2Percentage,
      };
    } else if (field === 'category') {
      const categoryMatch = findMatchingCategory(newValue, categories, 0.6);

      if (!categoryMatch) {
        return {
          success: false,
          message: `I couldn't find a category matching "${newValue}". Try: ${Object.values(categories).slice(0, 3).map(c => c.name).join(', ')}, etc.`,
        };
      }

      updates.categoryKey = categoryMatch.key;
      updates.category = categoryMatch.category.name;
    } else if (field === 'description') {
      if (!newValue) {
        return {
          success: false,
          message: "Please specify a description (e.g., 'Change description to dinner').",
        };
      }
      updates.description = newValue;
    }

    await expenseService.updateExpense(lastExpense.id, updates);

    let message = `✅ Updated expense:\n\n`;

    if (field === 'amount') {
      message += `Amount: $${lastExpense.amount.toFixed(2)} → $${newValue.toFixed(2)}`;
    } else if (field === 'category') {
      message += `Category: ${lastExpense.category} → ${updates.category}`;
    } else if (field === 'description') {
      message += `Description: ${lastExpense.description} → ${newValue}`;
    }

    return {
      success: true,
      message,
      data: {
        expense: { ...lastExpense, ...updates },
      },
    };
  } catch (error) {
    console.error('Error editing expense:', error);
    return {
      success: false,
      message: `❌ Failed to edit expense: ${error.message}`,
      error,
    };
  }
}

/**
 * Execute DELETE_EXPENSE command
 */
async function executeDeleteExpense(entities, context) {
  const { expenseNumber } = entities;
  const { expenses } = context;

  if (!expenses || expenses.length === 0) {
    return {
      success: false,
      message: "No expenses to delete.",
    };
  }

  // Get the expense to delete
  let expenseToDelete;

  if (expenseNumber && expenseNumber > 0 && expenseNumber <= expenses.length) {
    expenseToDelete = expenses[expenseNumber - 1];
  } else {
    // Default to last expense
    expenseToDelete = expenses[0];
  }

  // Return a confirmation request
  const confirmationContext = createConfirmationContext(
    CONFIRMATION_ACTIONS.DELETE_EXPENSE,
    { expenseId: expenseToDelete.id },
    `Are you sure you want to delete this expense?\n\n$${expenseToDelete.amount.toFixed(2)} - ${expenseToDelete.description}\n\nReply "yes" to confirm or "no" to cancel.`
  );

  return {
    success: true,
    message: confirmationContext.message,
    needsConfirmation: true,
    confirmationContext,
  };
}

/**
 * Handle confirmed deletion
 */
async function handleConfirmedDeletion(expenseId) {
  try {
    await expenseService.deleteExpense(expenseId);

    return {
      success: true,
      message: "✅ Expense deleted successfully.",
    };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return {
      success: false,
      message: `❌ Failed to delete expense: ${error.message}`,
      error,
    };
  }
}

/**
 * Main command executor
 * Routes intents to appropriate handlers
 */
export async function executeCommand(intent, entities, context) {
  try {
    switch (intent) {
      case INTENTS.ADD_EXPENSE:
        return await executeAddExpense(entities, context);

      case INTENTS.QUERY_BUDGET:
        return await executeQueryBudget(entities, context);

      case INTENTS.QUERY_BALANCE:
        return await executeQueryBalance(entities, context);

      case INTENTS.QUERY_SPENDING:
        return await executeQuerySpending(entities, context);

      case INTENTS.SET_BUDGET:
        return await executeSetBudget(entities, context);

      case INTENTS.HELP:
        return executeHelp();

      case INTENTS.LIST_EXPENSES:
        return executeListExpenses(entities, context);

      case INTENTS.EDIT_EXPENSE:
        return await executeEditExpense(entities, context);

      case INTENTS.DELETE_EXPENSE:
        return await executeDeleteExpense(entities, context);

      case INTENTS.SETTLE:
        return {
          success: true,
          message: "💰 To settle up, please go to the Home tab and tap the settlement button. I can't create settlements yet, but I'm learning!",
        };

      case INTENTS.UNKNOWN:
      default:
        return {
          success: false,
          message: `I'm not sure what you want to do. Try:\n• "Add $50 for groceries"\n• "Show my budget"\n• "What's our balance?"\n\nOr type "help" for more commands.`,
        };
    }
  } catch (error) {
    console.error('Error executing command:', error);
    return {
      success: false,
      message: `❌ Something went wrong: ${error.message}`,
      error,
    };
  }
}

export {
  handleConfirmedDeletion,
};

export default {
  executeCommand,
  handleConfirmedDeletion,
};
