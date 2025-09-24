/**
 * Cache Manager with Debouncing
 *
 * Prevents excessive cache refreshes and log flooding
 */

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.lastRefresh = new Map();
        this.refreshInterval = 5000; // 5 seconds minimum between refreshes
        this.pendingRefreshes = new Set();
    }

    /**
     * Get cache with debouncing
     */
    async get(key, fetcher, options = {}) {
        const {
            ttl = 30000, // 30 seconds default TTL
            debounceMs = this.refreshInterval,
            forceRefresh = false
        } = options;

        const now = Date.now();
        const lastRefresh = this.lastRefresh.get(key) || 0;

        // Check if we have valid cached data
        if (!forceRefresh && this.cache.has(key)) {
            const cached = this.cache.get(key);
            if (now - cached.timestamp < ttl) {
                return cached.data;
            }
        }

        // Check if we should debounce
        if (!forceRefresh && now - lastRefresh < debounceMs) {
            // Return stale data if available, otherwise wait
            if (this.cache.has(key)) {
                return this.cache.get(key).data;
            }

            // Wait for pending refresh
            if (this.pendingRefreshes.has(key)) {
                return new Promise((resolve) => {
                    const checkPending = () => {
                        if (!this.pendingRefreshes.has(key)) {
                            resolve(this.cache.get(key)?.data);
                        } else {
                            setTimeout(checkPending, 100);
                        }
                    };
                    checkPending();
                });
            }
        }

        // Perform refresh
        return this.refresh(key, fetcher);
    }

    /**
     * Refresh cache data
     */
    async refresh(key, fetcher) {
        if (this.pendingRefreshes.has(key)) {
            // Wait for existing refresh
            return new Promise((resolve) => {
                const checkPending = () => {
                    if (!this.pendingRefreshes.has(key)) {
                        resolve(this.cache.get(key)?.data);
                    } else {
                        setTimeout(checkPending, 100);
                    }
                };
                checkPending();
            });
        }

        this.pendingRefreshes.add(key);
        this.lastRefresh.set(key, Date.now());

        try {
            const data = await fetcher();
            this.cache.set(key, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error(`❌ CACHE: Failed to refresh ${key}:`, error.message);
            throw error;
        } finally {
            this.pendingRefreshes.delete(key);
        }
    }

    /**
     * Clear cache
     */
    clear(key = null) {
        if (key) {
            this.cache.delete(key);
            this.lastRefresh.delete(key);
        } else {
            this.cache.clear();
            this.lastRefresh.clear();
        }
    }

    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            pendingRefreshes: Array.from(this.pendingRefreshes)
        };
    }
}

// Global cache manager instance
export const cacheManager = new CacheManager();

/**
 * Debounced model cache refresh
 */
export async function getModelsWithDebounce(fetcher) {
    return cacheManager.get('models', fetcher, {
        ttl: 30000, // 30 seconds
        debounceMs: 5000 // 5 seconds debounce
    });
}
