// src/services/fiscalPeriodService.js
// Service for managing fiscal year periods and date calculations

/**
 * Calculate fiscal year dates based on custom start month/day
 *
 * @param {number} year - The calendar year
 * @param {Object} settings - Fiscal year settings
 * @param {number} settings.startMonth - Month (1-12) when fiscal year starts
 * @param {number} settings.startDay - Day (1-31) when fiscal year starts
 * @returns {Object} Fiscal year start and end dates
 */
export const getFiscalYearDates = (year, settings = { startMonth: 1, startDay: 1 }) => {
  const { startMonth = 1, startDay = 1 } = settings;

  // Fiscal year starts on specified month/day of the given year
  const fiscalYearStart = new Date(year, startMonth - 1, startDay, 0, 0, 0, 0);

  // Fiscal year ends one day before the next fiscal year starts
  const fiscalYearEnd = new Date(year + 1, startMonth - 1, startDay - 1, 23, 59, 59, 999);

  return {
    start: fiscalYearStart,
    end: fiscalYearEnd,
  };
};

/**
 * Get current fiscal year based on today's date and settings
 *
 * @param {Object} settings - Fiscal year settings
 * @returns {Object} Current fiscal year info
 */
export const getCurrentFiscalYear = (settings = { startMonth: 1, startDay: 1 }) => {
  const today = new Date();
  const currentCalendarYear = today.getFullYear();

  const { startMonth = 1, startDay = 1 } = settings;

  // Check if today is before or after fiscal year start
  const fiscalYearStartThisYear = new Date(currentCalendarYear, startMonth - 1, startDay);

  let fiscalYear;
  if (today >= fiscalYearStartThisYear) {
    // We're in fiscal year that started this calendar year
    fiscalYear = currentCalendarYear;
  } else {
    // We're still in fiscal year that started last calendar year
    fiscalYear = currentCalendarYear - 1;
  }

  const dates = getFiscalYearDates(fiscalYear, settings);

  return {
    fiscalYear,
    fiscalYearLabel: `FY${fiscalYear}`,
    ...dates,
  };
};

/**
 * Get fiscal year for a specific date
 *
 * @param {Date} date - The date to check
 * @param {Object} settings - Fiscal year settings
 * @returns {Object} Fiscal year info for that date
 */
export const getFiscalYearForDate = (date, settings = { startMonth: 1, startDay: 1 }) => {
  const checkDate = new Date(date);
  const year = checkDate.getFullYear();

  const { startMonth = 1, startDay = 1 } = settings;

  // Get fiscal year start for this calendar year
  const fiscalYearStartThisYear = new Date(year, startMonth - 1, startDay);

  let fiscalYear;
  if (checkDate >= fiscalYearStartThisYear) {
    fiscalYear = year;
  } else {
    fiscalYear = year - 1;
  }

  const dates = getFiscalYearDates(fiscalYear, settings);

  return {
    fiscalYear,
    fiscalYearLabel: `FY${fiscalYear}`,
    ...dates,
  };
};

/**
 * Get all 12 months for a fiscal year
 * Returns array of month info with start/end dates
 *
 * @param {number} fiscalYear - The fiscal year
 * @param {Object} settings - Fiscal year settings
 * @returns {Array} Array of 12 month objects
 */
export const getFiscalMonths = (fiscalYear, settings = { startMonth: 1, startDay: 1 }) => {
  const { startMonth = 1, startDay = 1 } = settings;
  const months = [];

  for (let i = 0; i < 12; i++) {
    // Calculate which calendar month this is
    const calendarMonth = ((startMonth - 1 + i) % 12) + 1;
    const calendarYear = fiscalYear + Math.floor((startMonth - 1 + i) / 12);

    // Month starts on the same day as fiscal year
    const monthStart = new Date(calendarYear, calendarMonth - 1, startDay, 0, 0, 0, 0);

    // Month ends on day before next month starts
    let nextCalendarMonth = calendarMonth + 1;
    let nextCalendarYear = calendarYear;
    if (nextCalendarMonth > 12) {
      nextCalendarMonth = 1;
      nextCalendarYear++;
    }
    const monthEnd = new Date(nextCalendarYear, nextCalendarMonth - 1, startDay - 1, 23, 59, 59, 999);

    months.push({
      fiscalMonthIndex: i + 1, // 1-12 within fiscal year
      calendarMonth,
      calendarYear,
      monthStart,
      monthEnd,
      monthLabel: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    });
  }

  return months;
};

/**
 * Calculate days elapsed and remaining in fiscal year
 *
 * @param {Object} settings - Fiscal year settings
 * @returns {Object} Days elapsed, remaining, and total
 */
export const getFiscalYearProgress = (settings = { startMonth: 1, startDay: 1 }) => {
  const today = new Date();
  const { start, end } = getCurrentFiscalYear(settings);

  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const daysElapsed = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  const daysRemaining = totalDays - daysElapsed;
  const progressPercentage = (daysElapsed / totalDays) * 100;

  return {
    daysElapsed,
    daysRemaining,
    totalDays,
    progressPercentage,
  };
};

/**
 * Check if we're near the end of the fiscal year
 *
 * @param {number} daysThreshold - How many days before end to trigger (default 30)
 * @param {Object} settings - Fiscal year settings
 * @returns {boolean} True if within threshold
 */
export const isNearFiscalYearEnd = (daysThreshold = 30, settings = { startMonth: 1, startDay: 1 }) => {
  const { daysRemaining } = getFiscalYearProgress(settings);
  return daysRemaining <= daysThreshold;
};

/**
 * Get list of available fiscal years for reporting
 *
 * @param {Date} coupleCreatedAt - When the couple account was created
 * @param {Object} settings - Fiscal year settings
 * @returns {Array} Array of fiscal year objects
 */
export const getAvailableFiscalYears = (coupleCreatedAt, settings = { startMonth: 1, startDay: 1 }) => {
  const createdDate = new Date(coupleCreatedAt);
  const firstFiscalYear = getFiscalYearForDate(createdDate, settings);
  const currentFiscalYear = getCurrentFiscalYear(settings);

  const years = [];
  for (let year = firstFiscalYear.fiscalYear; year <= currentFiscalYear.fiscalYear; year++) {
    const dates = getFiscalYearDates(year, settings);
    years.push({
      fiscalYear: year,
      fiscalYearLabel: `FY${year}`,
      ...dates,
    });
  }

  return years;
};

/**
 * Get the previous fiscal year
 *
 * @param {Object} settings - Fiscal year settings
 * @returns {Object} Previous fiscal year info
 */
export const getPreviousFiscalYear = (settings = { startMonth: 1, startDay: 1 }) => {
  const current = getCurrentFiscalYear(settings);
  const previousYear = current.fiscalYear - 1;
  const dates = getFiscalYearDates(previousYear, settings);

  return {
    fiscalYear: previousYear,
    fiscalYearLabel: `FY${previousYear}`,
    ...dates,
  };
};

/**
 * Format fiscal year for display
 *
 * @param {number} fiscalYear - The fiscal year number
 * @param {Object} settings - Fiscal year settings
 * @returns {string} Formatted display string
 */
export const formatFiscalYearDisplay = (fiscalYear, settings = { startMonth: 1, startDay: 1 }) => {
  const { start, end } = getFiscalYearDates(fiscalYear, settings);

  const startMonthName = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonthName = end.toLocaleDateString('en-US', { month: 'short' });

  if (settings.startMonth === 1 && settings.startDay === 1) {
    // Calendar year
    return `FY${fiscalYear}`;
  } else {
    // Custom fiscal year
    return `FY${fiscalYear} (${startMonthName} ${fiscalYear} - ${endMonthName} ${fiscalYear + 1})`;
  }
};

/**
 * Check if a date falls within a specific fiscal year
 *
 * @param {Date} date - Date to check
 * @param {number} fiscalYear - Fiscal year to check against
 * @param {Object} settings - Fiscal year settings
 * @returns {boolean} True if date is in fiscal year
 */
export const isDateInFiscalYear = (date, fiscalYear, settings = { startMonth: 1, startDay: 1 }) => {
  const checkDate = new Date(date);
  const { start, end } = getFiscalYearDates(fiscalYear, settings);

  return checkDate >= start && checkDate <= end;
};

/**
 * Get fiscal quarter for a date (Q1, Q2, Q3, Q4)
 *
 * @param {Date} date - Date to check
 * @param {Object} settings - Fiscal year settings
 * @returns {Object} Quarter info
 */
export const getFiscalQuarter = (date, settings = { startMonth: 1, startDay: 1 }) => {
  const checkDate = new Date(date);
  const fiscalYearInfo = getFiscalYearForDate(checkDate, settings);
  const fiscalMonths = getFiscalMonths(fiscalYearInfo.fiscalYear, settings);

  // Find which fiscal month this date falls in
  const fiscalMonth = fiscalMonths.find(
    (month) => checkDate >= month.monthStart && checkDate <= month.monthEnd
  );

  if (!fiscalMonth) {
    return null;
  }

  // Calculate quarter (1-12 becomes 1-4)
  const quarter = Math.ceil(fiscalMonth.fiscalMonthIndex / 3);

  return {
    quarter,
    quarterLabel: `Q${quarter}`,
    fiscalYear: fiscalYearInfo.fiscalYear,
    fiscalYearLabel: fiscalYearInfo.fiscalYearLabel,
  };
};
