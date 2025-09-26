/**
 * SmartCacheService - Intelligent caching with TTL and invalidation
 *
 * Provides smart caching strategies for different types of data.
 */

export class SmartCacheService {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = {
            models: 30 * 60 * 1000,      // 30 minutes
            images: 5 * 60 * 1000,       // 5 minutes
            users: 10 * 60 * 1000,       // 10 minutes
            counts: 2 * 60 * 1000,       // 2 minutes
            feeds: 3 * 60 * 1000         // 3 minutes
        };
    }

    /**
     * Get cached data with automatic TTL management
     * @param {string} key - Cache key
     * @param {string} type - Data type for TTL
     * @returns {*} Cached data or null
     */
    get(key, type = 'default') {
        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }

        const ttl = this.defaultTTL[type] || this.defaultTTL.default;
        if (Date.now() - cached.timestamp > ttl) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Set cached data with type-specific TTL
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     * @param {string} type - Data type for TTL
     * @param {number} customTTL - Custom TTL in milliseconds
     */
    set(key, data, type = 'default', customTTL = null) {
        const ttl = customTTL || this.defaultTTL[type] || this.defaultTTL.default;

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
            type
        });
    }

    /**
     * Cache with automatic invalidation on related data changes
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     * @param {Array} invalidationKeys - Keys to invalidate when this changes
     * @param {string} type - Data type
     */
    setWithInvalidation(key, data, invalidationKeys = [], type = 'default') {
        this.set(key, data, type);

        // Store invalidation relationships
        for (const invalidationKey of invalidationKeys) {
            const existing = this.cache.get(`_invalidation_${invalidationKey}`) || [];
            existing.push(key);
            this.cache.set(`_invalidation_${invalidationKey}`, existing);
        }
    }

    /**
     * Invalidate cache entries by pattern
     * @param {string} pattern - Pattern to match
     */
    invalidate(pattern) {
        const keysToDelete = [];

        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Invalidate related cache entries
     * @param {string} triggerKey - Key that triggered invalidation
     */
    invalidateRelated(triggerKey) {
        const relatedKeys = this.cache.get(`_invalidation_${triggerKey}`) || [];

        relatedKeys.forEach(key => {
            this.cache.delete(key);
        });

        this.cache.delete(`_invalidation_${triggerKey}`);
    }

    /**
     * Cache image feed data with smart invalidation
     * @param {string} key - Cache key
     * @param {Object} data - Feed data
     */
    cacheImageFeed(key, data) {
        this.setWithInvalidation(
            key,
            data,
            ['image_created', 'image_updated', 'image_deleted'],
            'feeds'
        );
    }

    /**
     * Cache user data with smart invalidation
     * @param {string} key - Cache key
     * @param {Object} data - User data
     */
    cacheUserData(key, data) {
        this.setWithInvalidation(
            key,
            data,
            ['user_updated', 'user_profile_changed'],
            'users'
        );
    }

    /**
     * Cache model data (longer TTL)
     * @param {string} key - Cache key
     * @param {Object} data - Model data
     */
    cacheModelData(key, data) {
        this.set(key, data, 'models');
    }

    /**
     * Cache count data (shorter TTL)
     * @param {string} key - Cache key
     * @param {number} data - Count data
     */
    cacheCountData(key, data) {
        this.set(key, data, 'counts');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const stats = {
            totalEntries: this.cache.size,
            memoryUsage: process.memoryUsage(),
            entriesByType: {},
            oldestEntry: null,
            newestEntry: null
        };

        let oldestTime = Date.now();
        let newestTime = 0;

        for (const [key, value] of this.cache.entries()) {
            if (key.startsWith('_invalidation_')) continue;

            const type = value.type || 'default';
            stats.entriesByType[type] = (stats.entriesByType[type] || 0) + 1;

            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                stats.oldestEntry = { key, age: Date.now() - value.timestamp };
            }

            if (value.timestamp > newestTime) {
                newestTime = value.timestamp;
                stats.newestEntry = { key, age: Date.now() - value.timestamp };
            }
        }

        return stats;
    }

    /**
     * Clear cache by type
     * @param {string} type - Cache type to clear
     */
    clearByType(type) {
        const keysToDelete = [];

        for (const [key, value] of this.cache.entries()) {
            if (value.type === type) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Clean up expired entries
     */
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];

        for (const [key, value] of this.cache.entries()) {
            if (key.startsWith('_invalidation_')) continue;

            const ttl = this.defaultTTL[value.type] || this.defaultTTL.default;
            if (now - value.timestamp > ttl) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
        return keysToDelete.length;
    }
}
