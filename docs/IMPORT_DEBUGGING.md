# Bank Import Debugging & Troubleshooting Guide

This guide explains how to debug and troubleshoot issues with the bank statement import feature.

## Table of Contents

1. [Debug Mode](#debug-mode)
2. [Debug Panel](#debug-panel)
3. [Common Issues](#common-issues)
4. [Error Messages](#error-messages)
5. [Session Tracking](#session-tracking)
6. [Performance Monitoring](#performance-monitoring)
7. [Advanced Troubleshooting](#advanced-troubleshooting)

---

## Debug Mode

### Enabling Debug Mode

Debug mode is automatically enabled in development (`__DEV__ = true`). To enable it manually:

```javascript
import { setDebugMode } from './src/utils/importDebug';

// Enable debug logging
setDebugMode(true);

// Disable debug logging
setDebugMode(false);
```

### What Debug Mode Does

When enabled, debug mode:
- Logs all operations to AsyncStorage
- Tracks performance metrics
- Records validation warnings
- Stores error stack traces
- Keeps last 1000 log entries

---

## Debug Panel

### Accessing the Debug Panel

The Debug Panel is accessible from the Import screen settings menu:

1. Go to Import Expenses screen
2. Tap the settings/menu icon
3. Select "Debug Panel"

### Debug Panel Features

**Statistics Display:**
- Total imports attempted
- Success/failure counts
- Average import size
- Total expenses imported

**Log Viewing:**
- Filter by log level (ERROR, WARN, INFO, DEBUG, PERF)
- View timestamps
- See detailed error messages
- Export logs for sharing

**Actions:**
- Toggle debug mode on/off
- Clear all logs
- Export logs as text
- Refresh current data

---

## Common Issues

### 1. File Not Parsing

**Symptoms:**
- "Failed to parse file" error
- "No transactions found" message
- Empty preview screen

**Causes:**
- Incorrect file format
- Missing headers
- Encrypted/password-protected PDF
- Scanned PDF (image-based, not text)

**Solutions:**
1. **Check File Format:**
   ```
   - Ensure file is CSV or text-based PDF
   - Verify CSV has headers in first row
   - Check that columns are separated by commas
   ```

2. **Validate Column Names:**
   ```
   Required columns:
   - Date (or "Transaction Date", "Posting Date")
   - Description (or "Details", "Memo")
   - Amount (or "Debit"/"Credit" columns)
   ```

3. **Debug Steps:**
   - Enable debug mode
   - Check logs for specific parsing errors
   - Look for "PARSER" category logs
   - Verify file size and type in logs

### 2. Missing Transactions

**Symptoms:**
- Some transactions not imported
- Count doesn't match bank statement
- Gaps in date range

**Causes:**
- Transactions filtered out
- Invalid date/amount format
- Duplicate detection too aggressive
- Validation failures

**Solutions:**
1. **Check Filters:**
   - Review advanced filters settings
   - Check date range filters
   - Verify amount range filters
   - Look for keyword exclusions

2. **Review Validation Logs:**
   ```
   Filter logs by level: WARN
   Category: VALIDATION
   Look for: "Transaction X: Invalid..."
   ```

3. **Adjust Duplicate Detection:**
   - Lower confidence threshold
   - Increase date tolerance
   - Check description similarity setting

### 3. Import Fails Mid-Process

**Symptoms:**
- Import starts but doesn't complete
- "Network error" message
- Partial import (some expenses missing)

**Causes:**
- Network connectivity issues
- Firestore quota limits
- App closed/backgrounded
- Concurrent import attempt

**Solutions:**
1. **Check Network:**
   - Ensure stable internet connection
   - Verify Firestore is accessible
   - Try again with smaller batch

2. **Review Session Logs:**
   ```javascript
   import { getSession } from './src/utils/importSession';

   const session = await getSession(sessionId);
   console.log('Session state:', session.state);
   console.log('Progress:', session.progress);
   console.log('Error:', session.error);
   ```

3. **Use Rollback:**
   ```javascript
   import { rollbackImport } from './src/utils/importResilience';

   await rollbackImport(sessionId, importedIds);
   ```

### 4. Incorrect Categories

**Symptoms:**
- Most transactions categorized as "Other"
- Wrong categories assigned
- Low confidence scores

**Causes:**
- Non-standard merchant names
- Different language/locale
- Bank-specific formatting
- Insufficient training data

**Solutions:**
1. **Manual Override:**
   - Edit categories in preview screen
   - Categories are saved for future imports

2. **Check Category Mapping Logs:**
   ```
   Filter: Category: CATEGORY_MAPPING
   Look for: Confidence scores
   Review: Matched keywords
   ```

3. **Customize Keywords:**
   - Add merchant-specific keywords
   - Use transaction history for learning

---

## Error Messages

### Error Types

**1. File Validation Errors**
```
❌ File is empty (0 bytes)
❌ File is too large (max 50MB)
❌ Unsupported file type
```

**2. Parsing Errors**
```
❌ Could not find date column
❌ Could not find amount column
❌ PDF parsing failed
❌ No transactions found
```

**3. Validation Errors**
```
⚠️ Date is in the future
⚠️ Amount is very large
⚠️ Description is very long
❌ Split percentages don't add up to 100
```

**4. Network/Database Errors**
```
❌ Network error (retrying...)
❌ Failed after 3 retries
❌ Firestore quota exceeded
```

### Error Recovery

**Automatic Retry:**
- Network errors: 3 retries with exponential backoff
- Initial delay: 1 second
- Max delay: 10 seconds
- Only for retryable errors

**Manual Retry:**
1. Check debug panel for error details
2. Fix underlying issue
3. Use "Try Again" button
4. Or select file again

**Rollback:**
```javascript
// Automatic rollback on critical failures
// Manual rollback via debug panel or code:
const result = await rollbackImport(sessionId, importedIds);
```

---

## Session Tracking

### Session States

```
CREATED → PARSING → PROCESSING → IMPORTING → COMPLETED
                                          ↓
                                       FAILED
                                          ↓
                                      CANCELLED
```

### Viewing Session History

```javascript
import { getUserSessions, getSessionStats } from './src/utils/importSession';

// Get all sessions for user
const sessions = await getUserSessions(userId);

// Get statistics
const stats = await getSessionStats(userId);
console.log('Total imports:', stats.total);
console.log('Success rate:', stats.completed / stats.total);
```

### Failed Session Recovery

```javascript
import { getRetryableSessions } from './src/utils/importSession';

// Get sessions that can be retried
const retryable = await getRetryableSessions(userId);

// Retry a failed import
if (retryable.length > 0) {
  const session = retryable[0];
  // Re-import using session.fileInfo
}
```

---

## Performance Monitoring

### Performance Metrics

Debug mode tracks:
- **Parse time:** How long file parsing takes
- **Processing time:** Category mapping + duplicate detection
- **Import time:** Firestore batch operations
- **Total time:** End-to-end import duration

### Viewing Performance Data

```
Filter logs by: PERF
Look for: "⏱️ Completed: X" messages
Review: durationMs values
```

### Performance Benchmarks

| Operation | Expected Time | Concern If |
|-----------|--------------|------------|
| Parse CSV (100 transactions) | < 1s | > 5s |
| Parse PDF | 2-5s | > 15s |
| Process transactions | < 2s | > 10s |
| Import (100 expenses) | 2-3s | > 10s |
| Import (500 expenses) | 5-8s | > 20s |

### Optimization Tips

1. **For Large Files:**
   - Use CSV instead of PDF
   - Split into smaller date ranges
   - Import during off-peak hours

2. **For Slow Processing:**
   - Disable duplicate detection temporarily
   - Simplify filters
   - Clear old debug logs

---

## Advanced Troubleshooting

### Exporting Debug Logs

```javascript
import { exportLogsAsText } from './src/utils/importDebug';

const logText = await exportLogsAsText();
// Share via email, support ticket, etc.
```

### Analyzing Logs

**Look for Patterns:**
```
1. Time gaps between operations (delays)
2. Repeated errors (systemic issues)
3. Warning clusters (data quality)
4. Performance degradation over time
```

**Key Categories:**
- `PARSER`: File reading and parsing
- `VALIDATION`: Data validation issues
- `CATEGORY_MAPPING`: Auto-categorization
- `DUPLICATE_DETECTION`: Duplicate finding
- `BATCH_IMPORT`: Firestore operations
- `SESSION`: Import lifecycle
- `RETRY`: Retry attempts
- `ROLLBACK`: Undo operations

### Database Integrity Check

```javascript
import { validateImportIntegrity } from './src/utils/importResilience';

const result = await validateImportIntegrity(importedIds, coupleId);

if (!result.isValid) {
  console.error('Integrity issues:', result.errors);
  // Consider rollback
}
```

### Cleanup Old Data

```javascript
import { cleanupOldSessions } from './src/utils/importSession';
import { clearLogs } from './src/utils/importDebug';

// Clean sessions older than 30 days
await cleanupOldSessions(30);

// Clear all debug logs
await clearLogs();
```

---

## Support Information

When reporting issues, please include:

1. **Debug logs** (exported from Debug Panel)
2. **Session ID** (from import summary)
3. **File metadata** (type, size, bank name if detected)
4. **Error messages** (exact text)
5. **Steps to reproduce**
6. **Expected vs actual behavior**

### Getting Help

1. **In-App:**
   - Debug Panel → Export Logs → Share with support

2. **GitHub Issues:**
   - Include debug logs
   - Attach sample file (anonymized)
   - Specify environment (device, OS, app version)

3. **Documentation:**
   - Check bank template list for your bank
   - Review validation requirements
   - See example CSV formats

---

## Best Practices

### Before Import

✅ **DO:**
- Enable debug mode for troubleshooting
- Check file size and format
- Verify column headers
- Test with small sample first

❌ **DON'T:**
- Import very large files (>1000 transactions)
- Use scanned/image PDFs
- Import same file multiple times
- Disable duplicate detection without reviewing

### During Import

✅ **DO:**
- Keep app in foreground
- Maintain stable network connection
- Review preview before importing
- Check duplicate warnings

❌ **DON'T:**
- Close or background app
- Switch to airplane mode
- Start concurrent imports
- Ignore validation warnings

### After Import

✅ **DO:**
- Review imported expenses
- Verify amounts and dates
- Check categorization
- Clean up debug logs periodically

❌ **DON'T:**
- Delete expenses without reviewing
- Ignore integrity warnings
- Keep failed sessions indefinitely
- Disable debug mode before confirming success

---

## Appendix: Debug Code Examples

### Enable Debug Mode on App Start

```javascript
// In App.js or index.js
import { setDebugMode } from './src/utils/importDebug';

if (__DEV__) {
  setDebugMode(true);
  console.log('🔍 Import debug mode enabled');
}
```

### Custom Debug Logging

```javascript
import { debug, info, warn, error } from './src/utils/importDebug';

// Debug level (only in debug mode)
debug('MY_FEATURE', 'Detailed debug info', { data: {...} });

// Info level (always logged)
info('MY_FEATURE', 'Important information');

// Warning level
warn('MY_FEATURE', 'Something unusual', { details: {...} });

// Error level (always logged, even without debug mode)
error('MY_FEATURE', 'Something failed', { error: errorObj });
```

### Performance Timing

```javascript
import { startTimer } from './src/utils/importDebug';

async function myOperation() {
  const timer = startTimer('MY_OPERATION', 'Custom operation');

  // Do work...
  timer.checkpoint('Step 1 complete');

  // More work...
  timer.checkpoint('Step 2 complete');

  // Finish
  timer.end({ result: 'success' });
}
```

---

**Last Updated:** 2025-01-19
**Version:** 2.0.0
**Maintainer:** Dividela Development Team
