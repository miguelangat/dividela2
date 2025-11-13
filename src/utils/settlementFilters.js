// src/utils/settlementFilters.js
// Utility functions for filtering settlements

/**
 * Get default filter state
 */
export const getDefaultSettlementFilters = () => ({
  startDate: null,
  endDate: null,
  minAmount: null,
  maxAmount: null,
  direction: 'all', // 'all', 'paid', 'received'
  budgetPerformance: 'all', // 'all', 'under', 'over', 'none'
  searchNotes: '',
});

/**
 * Filter settlements by date range
 */
export const filterSettlementsByDateRange = (settlements, startDate, endDate) => {
  if (!startDate && !endDate) return settlements;

  return settlements.filter((settlement) => {
    const settlementDate = settlement.settledAt?.toDate
      ? settlement.settledAt.toDate()
      : new Date(settlement.settledAt);

    // Start date comparison - settlements must be on or after start date
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (settlementDate < start) return false;
    }

    // End date comparison - include the entire end day (23:59:59)
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (settlementDate > end) return false;
    }

    return true;
  });
};

/**
 * Filter settlements by amount range
 */
export const filterSettlementsByAmountRange = (settlements, minAmount, maxAmount) => {
  if (minAmount === null && maxAmount === null) return settlements;

  return settlements.filter((settlement) => {
    const amount = settlement.amount || 0;

    if (minAmount !== null && amount < minAmount) return false;
    if (maxAmount !== null && amount > maxAmount) return false;

    return true;
  });
};

/**
 * Filter settlements by direction (who paid)
 */
export const filterSettlementsByDirection = (settlements, direction, currentUserId) => {
  if (direction === 'all' || !currentUserId) return settlements;

  return settlements.filter((settlement) => {
    const isPaidByUser = settlement.settledBy === currentUserId;

    if (direction === 'paid') return isPaidByUser;
    if (direction === 'received') return !isPaidByUser;

    return true;
  });
};

/**
 * Filter settlements by budget performance
 */
export const filterSettlementsByBudgetPerformance = (settlements, budgetPerformance) => {
  if (budgetPerformance === 'all') return settlements;

  return settlements.filter((settlement) => {
    const budgetSummary = settlement.budgetSummary || {};
    const hasbudget = budgetSummary.includedInBudget === true;
    const budgetRemaining = budgetSummary.budgetRemaining || 0;

    switch (budgetPerformance) {
      case 'under':
        return hasbudget && budgetRemaining >= 0;
      case 'over':
        return hasbudget && budgetRemaining < 0;
      case 'none':
        return !hasbudget;
      default:
        return true;
    }
  });
};

/**
 * Filter settlements by notes (case-insensitive search)
 */
export const filterSettlementsByNotes = (settlements, searchText) => {
  if (!searchText || searchText.trim() === '') return settlements;

  const searchLower = searchText.toLowerCase().trim();

  return settlements.filter((settlement) => {
    const notes = settlement.note || '';
    return notes.toLowerCase().includes(searchLower);
  });
};

/**
 * Apply all filters to settlements
 * Filters are applied in order of selectivity for performance
 */
export const applyAllSettlementFilters = (settlements, filters, currentUserId) => {
  // Validate settlements array
  if (!settlements || !Array.isArray(settlements)) {
    return [];
  }

  let filtered = settlements;

  // 1. Date range (usually most selective)
  filtered = filterSettlementsByDateRange(filtered, filters.startDate, filters.endDate);

  // 2. Direction filter (requires currentUserId)
  if (currentUserId) {
    filtered = filterSettlementsByDirection(filtered, filters.direction, currentUserId);
  }

  // 3. Amount range
  filtered = filterSettlementsByAmountRange(filtered, filters.minAmount, filters.maxAmount);

  // 4. Budget performance
  filtered = filterSettlementsByBudgetPerformance(filtered, filters.budgetPerformance);

  // 5. Notes search (most expensive, do last)
  filtered = filterSettlementsByNotes(filtered, filters.searchNotes);

  return filtered;
};

/**
 * Count active filters (excluding default values)
 */
export const countActiveFilters = (filters) => {
  let count = 0;

  if (filters.startDate || filters.endDate) count++;
  if (filters.minAmount !== null || filters.maxAmount !== null) count++;
  if (filters.direction !== 'all') count++;
  if (filters.budgetPerformance !== 'all') count++;
  if (filters.searchNotes && filters.searchNotes.trim() !== '') count++;

  return count;
};

/**
 * Get active filter descriptions for display
 */
export const getActiveFilterDescriptions = (filters) => {
  const descriptions = [];

  // Date range
  if (filters.startDate || filters.endDate) {
    if (filters.startDate && filters.endDate) {
      descriptions.push({
        key: 'dateRange',
        label: `${formatShortDate(filters.startDate)} - ${formatShortDate(filters.endDate)}`,
      });
    } else if (filters.startDate) {
      descriptions.push({
        key: 'dateRange',
        label: `From ${formatShortDate(filters.startDate)}`,
      });
    } else {
      descriptions.push({
        key: 'dateRange',
        label: `Until ${formatShortDate(filters.endDate)}`,
      });
    }
  }

  // Amount range
  if (filters.minAmount !== null || filters.maxAmount !== null) {
    if (filters.minAmount !== null && filters.maxAmount !== null) {
      descriptions.push({
        key: 'amountRange',
        label: `$${filters.minAmount} - $${filters.maxAmount}`,
      });
    } else if (filters.minAmount !== null) {
      descriptions.push({
        key: 'amountRange',
        label: `Over $${filters.minAmount}`,
      });
    } else {
      descriptions.push({
        key: 'amountRange',
        label: `Under $${filters.maxAmount}`,
      });
    }
  }

  // Direction
  if (filters.direction !== 'all') {
    descriptions.push({
      key: 'direction',
      label: filters.direction === 'paid' ? 'You Paid' : 'You Received',
    });
  }

  // Budget performance
  if (filters.budgetPerformance !== 'all') {
    const budgetLabels = {
      under: 'Under Budget',
      over: 'Over Budget',
      none: 'No Budget',
    };
    descriptions.push({
      key: 'budgetPerformance',
      label: budgetLabels[filters.budgetPerformance],
    });
  }

  // Notes search
  if (filters.searchNotes && filters.searchNotes.trim() !== '') {
    descriptions.push({
      key: 'searchNotes',
      label: `"${filters.searchNotes.trim()}"`,
    });
  }

  return descriptions;
};

/**
 * Helper function to format date for filter chips
 */
const formatShortDate = (date) => {
  if (!date) return '';
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

/**
 * Get predefined amount ranges for quick selection
 */
export const getPredefinedAmountRanges = () => [
  { label: 'Under $50', minAmount: null, maxAmount: 50 },
  { label: '$50 - $200', minAmount: 50, maxAmount: 200 },
  { label: '$200 - $500', minAmount: 200, maxAmount: 500 },
  { label: 'Over $500', minAmount: 500, maxAmount: null },
];

/**
 * Get predefined date ranges for quick selection
 */
export const getPredefinedDateRanges = () => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // This Month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Last 3 Months
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);

  // This Year
  const startOfYear = new Date(today.getFullYear(), 0, 1);

  return [
    { label: 'This Month', startDate: startOfMonth, endDate: null },
    { label: 'Last 3 Months', startDate: threeMonthsAgo, endDate: null },
    { label: 'This Year', startDate: startOfYear, endDate: null },
    { label: 'All Time', startDate: null, endDate: null },
  ];
};
