/**
 * Rate limiting utilities
 * In-memory rate limiting with automatic cleanup
 *
 * OPTIMIZED: Time-based cleanup instead of counter-based
 */

export class RateLimiter {
    constructor(config = {}) {
        this.windowMs = config.windowMs || 60000; // 1 minute
        this.maxRequests = config.maxRequests || 10;
        this.cleanupInterval = config.cleanupInterval || 60000; // Clean every 60 seconds
        this.rateLimitMap = new Map();
        this.lastCleanup = Date.now();
    }

    /**
     * Check if a user/key is rate limited
     * @param {string} userId - User ID or identifier (null for anonymous)
     * @returns {boolean} True if rate limited, false otherwise
     */
    /**
     * OPTIMIZED: Reduced array filtering, time-based cleanup
     */
    isRateLimited(userId) {
        const key = userId || 'anonymous';
        const now = Date.now();
        const cutoff = now - this.windowMs;

        let userRequests = this.rateLimitMap.get(key);

        if (!userRequests) {
            userRequests = [];
        }

        // OPTIMIZATION: Remove expired requests only if needed (check oldest first)
        if (userRequests.length > 0 && userRequests[0] < cutoff) {
            // Binary search to find first valid request (since array is sorted by time)
            let left = 0;
            let right = userRequests.length;

            while (left < right) {
                const mid = Math.floor((left + right) / 2);

                if (userRequests[mid] < cutoff) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            }

            userRequests = userRequests.slice(left);
        }

        if (userRequests.length >= this.maxRequests) {
            return true;
        }

        // Add current request (maintains sorted order)
        userRequests.push(now);
        this.rateLimitMap.set(key, userRequests);

        // Time-based cleanup (runs max once per minute instead of every 100 requests)
        if (now - this.lastCleanup > this.cleanupInterval) {
            this.cleanup(now);
            this.lastCleanup = now;
        }

        return false;
    }

    /**
     * Clean up stale entries from the rate limit map
     * OPTIMIZED: Only runs periodically (time-based), removes empty entries
     * @param {number} now - Current timestamp
     * @private
     */
    cleanup(now) {
        const cutoff = now - this.windowMs;
        const keysToDelete = [];

        for (const [key, requests] of this.rateLimitMap.entries()) {
            // OPTIMIZATION: Use binary search if array is large
            if (requests.length > 10) {
                let left = 0;
                let right = requests.length;

                while (left < right) {
                    const mid = Math.floor((left + right) / 2);

                    if (requests[mid] < cutoff) {
                        left = mid + 1;
                    } else {
                        right = mid;
                    }
                }

                if (left === requests.length) {
                    keysToDelete.push(key);
                } else if (left > 0) {
                    this.rateLimitMap.set(key, requests.slice(left));
                }
            } else {
                // For small arrays, simple filter is fine
                const recentRequests = requests.filter(time => time >= cutoff);

                if (recentRequests.length === 0) {
                    keysToDelete.push(key);
                } else if (recentRequests.length !== requests.length) {
                    this.rateLimitMap.set(key, recentRequests);
                }
            }
        }

        // Batch delete empty keys
        keysToDelete.forEach(key => this.rateLimitMap.delete(key));
    }

    /**
     * Reset rate limit for a specific user (useful for testing)
     * @param {string} userId - User ID to reset
     */
    reset(userId) {
        const key = userId || 'anonymous';

        this.rateLimitMap.delete(key);
    }

    /**
     * Clear all rate limit data
     */
    resetAll() {
        this.rateLimitMap.clear();
        this.lastCleanup = Date.now();
    }

    /**
     * Get current request count for a user
     * @param {string} userId - User ID
     * @returns {number} Number of recent requests
     */
    getRequestCount(userId) {
        const key = userId || 'anonymous';
        const now = Date.now();
        const userRequests = this.rateLimitMap.get(key) || [];

        return userRequests.filter(time => now - time < this.windowMs).length;
    }
}

