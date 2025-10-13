/**
 * SearchCacheManager
 * Handles search result caching with LRU eviction, TTL, and per-query limits
 * Self-contained with no external dependencies
 *
 * @class SearchCacheManager
 */
class SearchCacheManager {
    /**
     * @param {Object} config - Cache configuration
     * @param {number} config.maxSize - Maximum total cache entries
     * @param {number} config.ttlMs - Time-to-live in milliseconds
     * @param {number} config.perQueryMax - Maximum entries per query
     * @param {Function} debugFn - Debug logging function
     */
    constructor(config, debugFn = null) {
        this.config = config;
        this.isDebugEnabled = debugFn;

        // Cache with size limit (LRU with TTL)
        this.cache = new Map();
        this.timestamps = new Map();
    }

    /**
     * Generate cache key with safe delimiter
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @returns {string} Cache key (format: query::page)
     */
    getCacheKey(query, page) {
        // Normalize key: lowercase and trim, use :: delimiter to avoid conflicts
        return `${query.trim().toLowerCase()}::${page}`;
    }

    /**
     * Extract query prefix from cache key
     * @param {string} key - Cache key (format: query::page)
     * @returns {string} Query prefix
     */
    getQueryPrefix(key) {
        const lastDelimiterIndex = key.lastIndexOf('::');

        return lastDelimiterIndex > 0 ? key.substring(0, lastDelimiterIndex) : key;
    }

    /**
     * Get value from cache with TTL check
     * @param {string} key - Cache key
     * @returns {*} Cached value or null
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        const timestamp = this.timestamps.get(key);

        if (!cached) {
            return null;
        }

        // Check TTL
        if (timestamp && Date.now() - timestamp > this.config.ttlMs) {
            // Cache expired
            this.cache.delete(key);
            this.timestamps.delete(key);

            return null;
        }

        // LRU: Move to end (most recently used) but keep original timestamp
        this.cache.delete(key);
        this.cache.set(key, cached);
        this.timestamps.delete(key);
        this.timestamps.set(key, timestamp);

        return cached;
    }

    /**
     * Add value to cache with LRU and per-query eviction
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     */
    addToCache(key, value) {
        // Enforce per-query cache limit first
        const queryPrefix = this.getQueryPrefix(key);
        const queryKeys = Array.from(this.cache.keys())
            .filter(k => this.getQueryPrefix(k) === queryPrefix);

        if (queryKeys.length >= this.config.perQueryMax) {
            // Remove oldest page for this query by timestamp (deterministic)
            const [firstKey] = queryKeys;
            let oldestKey = firstKey;
            let oldestTimestamp = this.timestamps.get(oldestKey) || 0;

            for (const queryKey of queryKeys) {
                const timestamp = this.timestamps.get(queryKey) || 0;

                if (timestamp < oldestTimestamp) {
                    oldestTimestamp = timestamp;
                    oldestKey = queryKey;
                }
            }

            this.cache.delete(oldestKey);
            this.timestamps.delete(oldestKey);

            if (this.isDebugEnabled?.()) {
                console.log(`🗑️ SEARCH: Evicted oldest cache entry for query: ${oldestKey}`);
            }
        }

        // Then enforce global cache size limit
        if (this.cache.size >= this.config.maxSize) {
            // Remove oldest entry globally (first key in Map = LRU)
            const firstKey = this.cache.keys().next().value;

            this.cache.delete(firstKey);
            this.timestamps.delete(firstKey);
        }

        // Add with timestamp
        this.cache.set(key, value);
        this.timestamps.set(key, Date.now());
    }

    /**
     * Clear cache for specific query
     * @param {string} query - Query to clear
     */
    clearCacheFor(query) {
        const normalizedQuery = query.trim().toLowerCase();
        const keysToDelete = [];

        // Find all cache keys for this query (use :: delimiter)
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${normalizedQuery}::`)) {
                keysToDelete.push(key);
            }
        }

        // Delete matching keys
        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.timestamps.delete(key);
        });

        if (this.isDebugEnabled?.() && keysToDelete.length > 0) {
            console.log(`🗑️ SEARCH: Cleared ${keysToDelete.length} cached pages for query "${query}"`);
        }
    }

    /**
     * Clear all cache entries
     */
    clearAll() {
        this.cache.clear();
        this.timestamps.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            perQueryMax: this.config.perQueryMax,
            ttlMs: this.config.ttlMs
        };
    }
}

// Export for use in SearchManager
window.SearchCacheManager = SearchCacheManager;

