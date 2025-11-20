/**
 * Debug logging and monitoring system for bank imports
 * Provides comprehensive tracking, error reporting, and performance metrics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_STORAGE_KEY = 'dividela_import_debug_logs';
const MAX_LOGS = 1000; // Keep last 1000 log entries

// Debug levels
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  PERF: 'PERF', // Performance metrics
};

// Current debug mode state
let debugMode = __DEV__; // Auto-enable in development

/**
 * Enable or disable debug mode
 */
export function setDebugMode(enabled) {
  debugMode = enabled;
  if (enabled) {
    console.log('🔍 Import Debug Mode: ENABLED');
  } else {
    console.log('🔍 Import Debug Mode: DISABLED');
  }
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode() {
  return debugMode;
}

/**
 * Core logging function
 */
function log(level, category, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    category,
    message,
    data,
  };

  // Console output with formatting
  const emoji = {
    DEBUG: '🔍',
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    PERF: '⚡',
  }[level];

  const consoleMethod = {
    DEBUG: 'debug',
    INFO: 'log',
    WARN: 'warn',
    ERROR: 'error',
    PERF: 'log',
  }[level];

  if (debugMode || level === 'ERROR') {
    console[consoleMethod](
      `${emoji} [${level}] [${category}] ${message}`,
      data || ''
    );
  }

  // Store log for later retrieval
  if (debugMode) {
    storeLog(logEntry);
  }

  return logEntry;
}

/**
 * Store log entry in AsyncStorage
 */
async function storeLog(logEntry) {
  try {
    const existing = await AsyncStorage.getItem(LOG_STORAGE_KEY);
    const logs = existing ? JSON.parse(existing) : [];

    logs.unshift(logEntry);

    // Trim to max size
    const trimmed = logs.slice(0, MAX_LOGS);

    await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    // Don't log storage errors to avoid infinite loop
    console.error('Failed to store log:', error);
  }
}

/**
 * Debug logger
 */
export function debug(category, message, data) {
  return log(LOG_LEVELS.DEBUG, category, message, data);
}

/**
 * Info logger
 */
export function info(category, message, data) {
  return log(LOG_LEVELS.INFO, category, message, data);
}

/**
 * Warning logger
 */
export function warn(category, message, data) {
  return log(LOG_LEVELS.WARN, category, message, data);
}

/**
 * Error logger
 */
export function error(category, message, data) {
  return log(LOG_LEVELS.ERROR, category, message, data);
}

/**
 * Performance logger
 */
export function perf(category, message, data) {
  return log(LOG_LEVELS.PERF, category, message, data);
}

/**
 * Get all logs
 */
export async function getLogs(filter = {}) {
  try {
    const existing = await AsyncStorage.getItem(LOG_STORAGE_KEY);
    let logs = existing ? JSON.parse(existing) : [];

    // Apply filters
    if (filter.level) {
      logs = logs.filter(log => log.level === filter.level);
    }
    if (filter.category) {
      logs = logs.filter(log => log.category === filter.category);
    }
    if (filter.since) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filter.since));
    }

    return logs;
  } catch (error) {
    console.error('Failed to get logs:', error);
    return [];
  }
}

/**
 * Clear all logs
 */
export async function clearLogs() {
  try {
    await AsyncStorage.removeItem(LOG_STORAGE_KEY);
    info('DEBUG', 'All debug logs cleared');
    return true;
  } catch (error) {
    console.error('Failed to clear logs:', error);
    return false;
  }
}

/**
 * Export logs as text for sharing
 */
export async function exportLogsAsText() {
  try {
    const logs = await getLogs();

    const text = logs
      .map(log => {
        const data = log.data ? `\n  Data: ${JSON.stringify(log.data, null, 2)}` : '';
        return `[${log.timestamp}] ${log.level} - ${log.category}\n  ${log.message}${data}`;
      })
      .join('\n\n');

    return text;
  } catch (error) {
    console.error('Failed to export logs:', error);
    return 'Error exporting logs';
  }
}

/**
 * Performance timer
 */
export class PerformanceTimer {
  constructor(category, operation) {
    this.category = category;
    this.operation = operation;
    this.startTime = Date.now();

    debug(category, `⏱️ Started: ${operation}`);
  }

  checkpoint(label) {
    const elapsed = Date.now() - this.startTime;
    debug(this.category, `⏱️ Checkpoint [${label}]: ${elapsed}ms`);
    return elapsed;
  }

  end(data) {
    const elapsed = Date.now() - this.startTime;
    perf(this.category, `⏱️ Completed: ${this.operation}`, {
      durationMs: elapsed,
      ...data,
    });
    return elapsed;
  }
}

/**
 * Create a performance timer
 */
export function startTimer(category, operation) {
  return new PerformanceTimer(category, operation);
}

/**
 * Log import session details
 */
export function logImportSession(sessionId, phase, details) {
  info('IMPORT_SESSION', `[${sessionId}] ${phase}`, details);
}

/**
 * Log parsing details
 */
export function logParsing(fileType, result) {
  if (result.success) {
    info('PARSER', `Successfully parsed ${fileType} file`, {
      transactions: result.transactions?.length,
      metadata: result.metadata,
    });
  } else {
    error('PARSER', `Failed to parse ${fileType} file`, {
      error: result.error,
    });
  }
}

/**
 * Log duplicate detection results
 */
export function logDuplicateDetection(results) {
  const hasDuplicates = results.filter(r => r.hasDuplicates).length;
  const autoSkipped = results.filter(r => r.highConfidenceDuplicate?.confidence >= 0.95).length;

  info('DUPLICATE_DETECTION', `Detected ${hasDuplicates} potential duplicates`, {
    total: results.length,
    withDuplicates: hasDuplicates,
    autoSkipped,
  });
}

/**
 * Log category suggestions
 */
export function logCategorySuggestions(suggestions) {
  const stats = {
    total: suggestions.length,
    highConfidence: suggestions.filter(s => s.suggestion.confidence > 0.7).length,
    mediumConfidence: suggestions.filter(s => s.suggestion.confidence >= 0.4 && s.suggestion.confidence <= 0.7).length,
    lowConfidence: suggestions.filter(s => s.suggestion.confidence < 0.4).length,
  };

  info('CATEGORY_MAPPING', 'Generated category suggestions', stats);
}

/**
 * Log validation results
 */
export function logValidation(validation) {
  if (!validation.allValid) {
    warn('VALIDATION', `Found ${validation.invalid} invalid expenses`, {
      valid: validation.valid,
      invalid: validation.invalid,
      errors: validation.invalidExpenses,
    });
  } else {
    info('VALIDATION', `All ${validation.valid} expenses are valid`);
  }
}

/**
 * Log batch import progress
 */
export function logBatchProgress(current, total, batchNumber) {
  const percentage = Math.round((current / total) * 100);
  info('BATCH_IMPORT', `Progress: ${current}/${total} (${percentage}%)`, {
    batch: batchNumber,
  });
}

/**
 * Get debug summary for troubleshooting
 */
export async function getDebugSummary() {
  const logs = await getLogs();

  const summary = {
    totalLogs: logs.length,
    errors: logs.filter(l => l.level === 'ERROR').length,
    warnings: logs.filter(l => l.level === 'WARN').length,
    recentErrors: logs
      .filter(l => l.level === 'ERROR')
      .slice(0, 5)
      .map(l => ({ timestamp: l.timestamp, category: l.category, message: l.message })),
    categories: [...new Set(logs.map(l => l.category))],
    debugMode,
  };

  return summary;
}

export default {
  setDebugMode,
  isDebugMode,
  debug,
  info,
  warn,
  error,
  perf,
  getLogs,
  clearLogs,
  exportLogsAsText,
  startTimer,
  logImportSession,
  logParsing,
  logDuplicateDetection,
  logCategorySuggestions,
  logValidation,
  logBatchProgress,
  getDebugSummary,
  LOG_LEVELS,
};
