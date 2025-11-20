/**
 * Import result caching for duplicate detection and category suggestions
 * Reduces repeated expensive operations when users retry imports
 */

/**
 * Simple TTL-based cache for import results
 */
class ImportCache {
  constructor(ttlMinutes = 30) {
    this.cache = new Map();
    this.ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
  }

  /**
   * Generate cache key from transaction
   */
  generateKey(transaction, prefix = '') {
    const { date, amount, description } = transaction;
    // Use normalized values for consistent keys
    const normalizedDesc = description?.toLowerCase().trim() || '';
    const normalizedAmount = typeof amount === 'number' ? amount.toFixed(2) : '0.00';
    const normalizedDate = date instanceof Date ? date.toISOString().split('T')[0] : String(date);

    return `${prefix}:${normalizedDate}:${normalizedAmount}:${normalizedDesc}`;
  }

  /**
   * Set value in cache with expiration
   */
  set(key, value) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttl,
    });
  }

  /**
   * Get value from cache if not expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Clear expired entries
   */
  cleanExpired() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    return size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }

    return {
      total: this.cache.size,
      active: activeCount,
      expired: expiredCount,
      ttlMinutes: this.ttl / (60 * 1000),
    };
  }
}

/**
 * Singleton cache instances
 */
let duplicateDetectionCache = null;
let categorySuggestionCache = null;

/**
 * Get or create duplicate detection cache
 */
export function getDuplicateCache(ttlMinutes = 30) {
  if (!duplicateDetectionCache) {
    duplicateDetectionCache = new ImportCache(ttlMinutes);
  }
  return duplicateDetectionCache;
}

/**
 * Get or create category suggestion cache
 */
export function getCategoryCache(ttlMinutes = 30) {
  if (!categorySuggestionCache) {
    categorySuggestionCache = new ImportCache(ttlMinutes);
  }
  return categorySuggestionCache;
}

/**
 * Cache duplicate detection result for a transaction
 */
export function cacheDuplicateResult(transaction, duplicates) {
  const cache = getDuplicateCache();
  const key = cache.generateKey(transaction, 'dup');
  cache.set(key, {
    duplicates,
    timestamp: Date.now(),
  });
}

/**
 * Get cached duplicate detection result
 */
export function getCachedDuplicateResult(transaction) {
  const cache = getDuplicateCache();
  const key = cache.generateKey(transaction, 'dup');
  const result = cache.get(key);
  return result?.duplicates || null;
}

/**
 * Cache category suggestion for a transaction
 */
export function cacheCategorySuggestion(transaction, suggestion) {
  const cache = getCategoryCache();
  const key = cache.generateKey(transaction, 'cat');
  cache.set(key, {
    suggestion,
    timestamp: Date.now(),
  });
}

/**
 * Get cached category suggestion
 */
export function getCachedCategorySuggestion(transaction) {
  const cache = getCategoryCache();
  const key = cache.generateKey(transaction, 'cat');
  const result = cache.get(key);
  return result?.suggestion || null;
}

/**
 * Batch cache duplicate results
 */
export function batchCacheDuplicateResults(detectionResults) {
  const cache = getDuplicateCache();
  let cachedCount = 0;

  detectionResults.forEach((result) => {
    if (result.transaction && result.duplicates !== undefined) {
      const key = cache.generateKey(result.transaction, 'dup');
      cache.set(key, {
        duplicates: result.duplicates,
        hasDuplicates: result.hasDuplicates,
        highConfidenceDuplicate: result.highConfidenceDuplicate,
        timestamp: Date.now(),
      });
      cachedCount++;
    }
  });

  return cachedCount;
}

/**
 * Batch cache category suggestions
 */
export function batchCacheCategorySuggestions(suggestions) {
  const cache = getCategoryCache();
  let cachedCount = 0;

  suggestions.forEach(({ transaction, suggestion }) => {
    if (transaction && suggestion) {
      const key = cache.generateKey(transaction, 'cat');
      cache.set(key, {
        suggestion,
        timestamp: Date.now(),
      });
      cachedCount++;
    }
  });

  return cachedCount;
}

/**
 * Get cached results for batch of transactions
 */
export function getBatchCachedDuplicates(transactions) {
  const cache = getDuplicateCache();
  const results = {
    cached: [],
    uncached: [],
  };

  transactions.forEach((transaction) => {
    const key = cache.generateKey(transaction, 'dup');
    const cached = cache.get(key);

    if (cached) {
      results.cached.push({
        transaction,
        ...cached,
      });
    } else {
      results.uncached.push(transaction);
    }
  });

  return results;
}

/**
 * Get cached category suggestions for batch of transactions
 */
export function getBatchCachedCategories(transactions) {
  const cache = getCategoryCache();
  const results = {
    cached: [],
    uncached: [],
  };

  transactions.forEach((transaction) => {
    const key = cache.generateKey(transaction, 'cat');
    const cached = cache.get(key);

    if (cached) {
      results.cached.push({
        transaction,
        ...cached,
      });
    } else {
      results.uncached.push(transaction);
    }
  });

  return results;
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  const stats = {
    duplicatesCleared: 0,
    categoriesCleared: 0,
  };

  if (duplicateDetectionCache) {
    stats.duplicatesCleared = duplicateDetectionCache.clear();
  }

  if (categorySuggestionCache) {
    stats.categoriesCleared = categorySuggestionCache.clear();
  }

  return stats;
}

/**
 * Clean expired entries from all caches
 */
export function cleanAllCaches() {
  const stats = {
    duplicatesExpired: 0,
    categoriesExpired: 0,
  };

  if (duplicateDetectionCache) {
    stats.duplicatesExpired = duplicateDetectionCache.cleanExpired();
  }

  if (categorySuggestionCache) {
    stats.categoriesExpired = categorySuggestionCache.cleanExpired();
  }

  return stats;
}

/**
 * Get cache statistics for all caches
 */
export function getAllCacheStats() {
  return {
    duplicateCache: duplicateDetectionCache?.getStats() || { total: 0, active: 0, expired: 0 },
    categoryCache: categorySuggestionCache?.getStats() || { total: 0, active: 0, expired: 0 },
  };
}

export default {
  getDuplicateCache,
  getCategoryCache,
  cacheDuplicateResult,
  getCachedDuplicateResult,
  cacheCategorySuggestion,
  getCachedCategorySuggestion,
  batchCacheDuplicateResults,
  batchCacheCategorySuggestions,
  getBatchCachedDuplicates,
  getBatchCachedCategories,
  clearAllCaches,
  cleanAllCaches,
  getAllCacheStats,
};
